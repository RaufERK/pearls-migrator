# Pearls Migrator — Architecture Decisions

## Current State (as of May 2026)

| Layer | Pattern | Example |
|---|---|---|
| Source PDFs | `pearls/{year}/{originalName}.pdf` | `pearls/2026/2026Q1-1.pdf` |
| Parsed JSON | `data/parsed/{originalName}.json` | `data/parsed/2026Q1-1.json` |
| Downloads (flat) | `public/downloads/{slug}.{ext}` | `public/downloads/1994-12-25-morya.txt` |
| Downloads (year) | `public/downloads/{year}/{slug}.{ext}` | `public/downloads/2026/2026q1-1.txt` |

Problems: naming is inconsistent, `2026Q1-1` doesn't encode the month directly,
download folders mix flat files and year subdirs.

---

## 1. Canonical Slug: `YYYY-MM`

**Proposal:** every lecture is identified by `YYYY-MM` — year and zero-padded month.

```
2026-01   →  January 2026
2026-02   →  February 2026
1994-12   →  December 1994
```

Why:
- ISO-8601-ish, lexicographically sortable.
- Directly human-readable — no need to decode "Q1-1 means January".
- Globally unique across all 40+ years.
- Safe as a URL slug, filename stem, and database key.

**Historical files** (`1994_12_25_Morya.pdf`) have a day and speaker in the name
because multiple lectures existed per month in the early years. These get their own
slug format: `YYYY-MM-DD-{speaker-slug}` (e.g. `1994-12-25-morya`). Keep that as-is
for now; they are edge cases and already parsed.

---

## 2. Source PDF Folder Structure

**Keep as-is.** The source PDFs are publisher-provided and shouldn't be renamed.
The mapping from filename → `YYYY-MM` slug lives in the parser (or a small manifest).

```
pearls/
  2024/
    2024Q1-1.pdf   →  slug: 2024-01
    2024Q1-2.pdf   →  slug: 2024-02
    2024Q1-3.pdf   →  slug: 2024-03
    ...
  2026/
    2026Q1-1.pdf   →  slug: 2026-01
    ...
```

The quarterly batching (3 files per quarter) stays as the upload/delivery unit
but is irrelevant to the internal data model.

---

## 3. Parsed JSON Files

**Move to year subdirectories, use `YYYY-MM` slug as filename.**

```
data/parsed/
  2024/
    2024-01.json
    2024-02.json
    2024-03.json
    ...
  2026/
    2026-01.json
    2026-02.json
    ...
```

**JSON shape** (one file = one lecture):

```json
{
  "slug": "2026-01",
  "year": 2026,
  "month": 1,
  "title": "Жемчужины Мудрости",
  "subtitle": ["Январь 2026", "..."],
  "speaker": "Elizabeth Clare Prophet",
  "sourcePdf": "pearls/2026/2026Q1-1.pdf",
  "parsedAt": "2026-05-08T12:00:00Z",
  "paragraphs": [
    { "text": "..." }
  ]
}
```

Adding `slug`, `year`, `month`, `speaker`, `parsedAt` to the JSON makes it
self-contained — no need to decode the filename to know what lecture this is.

---

## 4. Download Files

**Option A — by-format subfolders (recommended):**

```
public/downloads/
  txt/
    2026-01.txt
    2026-02.txt
    ...
  docx/
    2026-01.docx
    ...
  epub/
    2026-01.epub
    ...
```

Why: easy to `ls` or `glob` all files of one format, clean URLs like
`/downloads/txt/2026-01.txt`, simple to add a new format (just add a folder).

**Option B — generate on demand, never store:**

Generate the file at request time from the JSON, stream it to the browser,
don't persist. Saves disk space (currently ~720 files for 20 years × 12 months × 3 formats,
growing to ~1440 for 40 years). Server CPU is cheap; disk clutter is not.

Recommendation: **Option B for now** (MVP), switch to Option A with a build step
if download latency becomes noticeable or you want to pre-warm a CDN.

---

## 5. Line-Break Normalization (Page-Span Fix)

When a sentence spans two PDF pages, `pdfjs-dist` emits the first half as one
text item and the second half as the next item, with no space or hyphen between.
This creates broken paragraphs.

**Algorithmic fix — merge heuristic (no manual editing needed):**

After grouping lines into paragraphs, walk the paragraph list and apply:

```
if paragraph[i] does NOT end with sentence-terminal punctuation
   (i.e. not ". " "! " "? " "..." "»" etc.)
   AND paragraph[i+1] starts with a lowercase letter (Cyrillic or Latin)
→ merge paragraph[i] and paragraph[i+1] with a single space
```

Edge cases to handle:
- Direct-speech quotes ending with `"` — usually safe to merge if next starts lowercase.
- Abbreviations ending with `.` — keep a list of known abbreviations (Э. К., т. д., и т. п.)
  to avoid false splits.
- Hyphenated words broken at page boundary — detect trailing `-` and merge without space.

This fix runs once during parsing, result is stored in JSON. No manual editing needed
for the common case. Keep a `raw` field in the JSON if you ever want to diff.

---

## 6. Storage Strategy

### Tier 1 — JSON files (source of truth)

- Canonical, editable, git-tracked.
- One file per lecture in `data/parsed/`.
- Everything else is derived from these files.

### Tier 2 — PostgreSQL (runtime layer, optional now / required for RAG)

Add a `lectures` table when you need:
- Fast full-text search across all lectures.
- Filtering by year, month, speaker, quarter.
- Storing embedding vectors (pgvector extension).

```sql
CREATE TABLE lectures (
  slug        TEXT PRIMARY KEY,          -- "2026-01"
  year        SMALLINT NOT NULL,
  month       SMALLINT NOT NULL,
  title       TEXT NOT NULL,
  speaker     TEXT,
  content     TEXT NOT NULL,             -- full plain text, for FTS
  parsed_at   TIMESTAMPTZ NOT NULL,
  embedding   vector(1536)               -- pgvector, added later
);
```

Populate by reading from JSON files — JSON stays the master, Postgres is the index.
Re-seeding is a single `npm run seed` command.

**Do NOT store large raw paragraph arrays in Postgres.** Keep those in JSON.
Postgres stores the flat `content` text + metadata only.

### Tier 3 — Vector store (Qdrant, for RAG)

**Use Qdrant** — it is purpose-built for vector search and the right choice here.
pgvector is fine as a quick experiment, but Qdrant gives you:
- native payload filtering (filter by year/speaker *before* ANN search, not after)
- better recall at the same speed
- clean separation of concerns: Postgres handles structured data, Qdrant handles vectors
- Qdrant Cloud has a free tier; self-hosted via Docker is trivial

**Data model inside Qdrant:**

```
Collection: "lectures"

Point:
  id:      "2026-01#chunk-3"          -- slug + chunk index
  vector:  [0.021, -0.43, ...]        -- 1536-dim OpenAI embedding
  payload:
    slug:    "2026-01"
    year:    2026
    month:   1
    speaker: "Elizabeth Clare Prophet"
    chunk:   3
    text:    "...500-token excerpt..."
```

Chunking strategy: split each lecture into ~500-token overlapping chunks (overlap ~50 tokens).
A single lecture → ~5–15 chunks. For 480 lectures → ~5,000–7,000 vectors total. Very small.

RAG query flow:
```
user question
  → embed with same model (OpenAI text-embedding-3-small)
  → Qdrant search (optionally filter by year/speaker in payload)
  → top-5 chunks returned
  → pass chunks + question to LLM (GPT-4o / Claude)
  → answer grounded in the texts
```

---

## 7. Incremental Updates (Quarterly Batch)

**Problem:** 240+ existing lectures need to be bulk-indexed once. Then every quarter
3 new lectures arrive and need to be added without re-indexing everything.

**Solution: slug-based upsert in all layers.**

Every pipeline step checks "does this slug already exist?" before doing work:

```
Postgres:  INSERT ... ON CONFLICT (slug) DO UPDATE ...
Qdrant:    upsert_points() — built-in, idempotent by point id
JSON:      skip if data/parsed/{year}/{slug}.json already exists
```

**Workflow for quarterly batch (3 new PDFs):**

```
1. Copy new PDFs into pearls/{year}/
2. npm run parse:new          # parses only PDFs with no matching JSON
3. npm run seed:new           # upserts only new slugs into Postgres
4. npm run embed:new          # embeds only new slugs into Qdrant
```

Each script reads `data/parsed/` to find slugs already processed and skips them.
No flags, no config — the filesystem is the state.

**For the initial bulk load (all 240 lectures):**

```
npm run parse:all             # parse all PDFs → JSON
npm run seed:all              # seed entire Postgres from JSON
npm run embed:all             # embed all into Qdrant (takes ~10 min for 5000 chunks)
```

These are the same scripts — they just have nothing to skip on first run.

---

## 8. MVP → Production Roadmap

### Phase 0 — Data foundation (now, ~1 week)
- [ ] Normalize parser output: `YYYY-MM` slugs, year subdirs, add metadata fields
- [x] Implement line-break merge heuristic in parser (`mergeBrokenParagraphs` in `extractPearl.ts`)
- [x] Fix subtitle bloat: case-insensitive ПРИЗЫВ detection + consecutive-long-lines heuristic for docs without prayer section; join split subtitle lines (`mergeSubtitleLines`). Result: 231/233 files ≤8 subtitle items (was ~60 files with 100+ items)
- [ ] Bulk parse all 240+ PDFs → JSON files
- [ ] Manual spot-check 5–10 random lectures for quality

### Phase 1 — App stabilization (~1–2 weeks)
- [ ] Add Postgres (Prisma schema): `lectures` table with slug, year, month, content
- [ ] Write `npm run seed` script: reads all JSON → inserts into Postgres
- [ ] Switch Express catalog/lecture routes to read from Postgres instead of JSON files
- [ ] Fix download generation: on-demand from DB content, not from files
- [ ] Add sitemap.xml + robots.txt generation from DB

### Phase 2 — Deployment (1 week)
- [ ] Provision VPS (or Railway / Render): Node.js + Postgres
- [ ] CI/CD: GitHub Actions → build + deploy on push to main
- [ ] Domain + HTTPS
- [ ] Health check endpoint

### Phase 3 — Search & RAG (~2–3 weeks)
- [ ] Set up Qdrant (Docker on same VPS, or Qdrant Cloud free tier)
- [ ] Write chunker: split lecture text into ~500-token chunks with overlap
- [ ] Write embedder: call OpenAI `text-embedding-3-small`, upsert into Qdrant
- [ ] `npm run embed:all` — initial bulk embedding
- [ ] RAG endpoint: `POST /api/ask` → embed query → Qdrant search → LLM → response
- [ ] Simple chat UI on `/chat` page

### Phase 4 — Polish (ongoing)
- [ ] Quarterly intake script: `npm run intake 2026Q3` → parse + seed + embed 3 new lectures
- [ ] Admin page: view parsed lectures, trigger re-parse, mark corrections
- [ ] Full-text search (Postgres `tsvector`) as fallback to semantic search
- [ ] Analytics (Plausible or similar, self-hosted)
- [ ] Rate limiting (see section below)

---

## 9. Rate Limiting

### Why it matters
The RAG `/api/ask` endpoint calls an LLM — one request costs money and takes time.
Without limits a single bot can drain the quota or kill response times for everyone.

### Recommended library: `express-rate-limit`

Standard, zero-infra option. Works per-IP out of the box.

```bash
npm install express-rate-limit
# for production with Redis:
npm install rate-limit-redis ioredis
```

### Different limits for different endpoints

```ts
import rateLimit from 'express-rate-limit';

// Static pages and catalog — generous
const pageLimit = rateLimit({ windowMs: 60_000, max: 120 });

// JSON API (search, catalog) — moderate
const apiLimit = rateLimit({ windowMs: 60_000, max: 40 });

// RAG chat — strict (LLM calls are expensive)
const chatLimit = rateLimit({ windowMs: 60_000, max: 10 });

app.use('/', pageLimit);
app.use('/api', apiLimit);
app.use('/api/ask', chatLimit);
```

### MVP vs Production

**MVP — in-memory store (default):**
- Zero dependencies, works immediately.
- Resets on server restart (fine for MVP).
- Does NOT work if you run multiple Node.js processes.

**Production — Redis store:**

```ts
import { RedisStore } from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

const chatLimit = rateLimit({
  windowMs: 60_000,
  max: 10,
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
  standardHeaders: true,   // returns RateLimit-* headers
  legacyHeaders: false,
  message: { error: 'Too many requests, slow down.' },
});
```

**Alternative — Upstash Redis (serverless, no self-hosted Redis needed):**
Uses `@upstash/ratelimit` with a managed Redis instance.
Good choice if deploying on Railway / Render / Vercel.

### Identifying users
- Default: rate limit by IP (`req.ip`).
- Behind a reverse proxy (Nginx, Cloudflare): set `app.set('trust proxy', 1)` so `req.ip`
  reflects the real client IP from `X-Forwarded-For`, not the proxy IP.
- Cookies / sessions: not worth it for an anonymous public site — IPs are sufficient.

---

## Summary Table

| Concern | Decision |
|---|---|
| Lecture slug | `YYYY-MM` (e.g. `2026-01`) |
| Source PDFs | Keep original names, map to slug in parser |
| Parsed JSON location | `data/parsed/{YYYY}/{YYYY-MM}.json` |
| Download files | Generate on demand; pre-generate later if needed |
| Line break fix | Algorithmic merge heuristic in parser |
| Source of truth | JSON files in `data/parsed/` |
| Runtime queries | PostgreSQL via Prisma |
| Vector search / RAG | Qdrant (Docker or Qdrant Cloud) |
| Incremental updates | Slug-based upsert in all layers |
| Rate limiting | `express-rate-limit` (in-memory MVP → Redis in prod) |
| Runtime queries | PostgreSQL (add when needed) |
| RAG / embeddings | pgvector in Postgres, chunked `lecture_chunks` table |

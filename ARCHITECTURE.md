# Pearls Migrator — Architecture

## Current State (May 2026)

| Layer | Pattern | Example |
|---|---|---|
| Source PDFs | `pearls/{year}/{originalName}.pdf` | `pearls/2026/2026Q1-1.pdf` |
| Parsed JSON | `data/parsed/{originalName}.json` | generated locally, ignored by git |
| Downloads | `public/downloads/{year}/{slug}.{ext}` | pre-generated at startup — replace with `var/downloads` cache |

**Known issues:**
- Slug is derived from filename by heuristics — fragile.
- `year`, `month`, `speaker` are not stored in JSON — inferred at runtime.
- Parsed JSON is generated output and should not be carried in git while there are no manual edits.
- All downloads are pre-generated at every server startup — slow, wasteful.
- Catalog is built by reading all 240+ full JSON files at startup — reads paragraphs just for metadata.

---

## Canonical Slug: `YYYY-MM`

Every modern lecture is identified by `YYYY-MM` — year + zero-padded month.

```
2026-01   →  January 2026
1994-12   →  December 1994
```

**Historical files** with a day in the name keep `YYYY-MM-DD-{speaker-slug}` format (e.g. `1994-12-25-morya`). Already parsed, leave as-is.

---

## JSON Shape (target)

Parsed JSON is generated from source PDFs. Keep it out of git while it is fully reproducible and has no manual corrections.

Each JSON file must be self-contained — no metadata derived from filename or path:

```json
{
  "slug": "2026-01",
  "year": 2026,
  "month": 1,
  "title": "Жемчужины Мудрости",
  "subtitle": ["Январь 2026"],
  "speaker": "Elizabeth Clare Prophet",
  "sourcePdf": "pearls/2026/2026Q1-1.pdf",
  "parsedAt": "2026-05-08T12:00:00Z",
  "paragraphs": [
    { "text": "..." }
  ]
}
```

---

## Download Strategy: On-Demand + Disk Cache

**Drop pre-generation at startup. Generate on first request, cache to disk.**

```
GET /downloads/2026/2026-01.txt
  → check var/downloads/2026/2026-01.txt exists AND is fresh
  → cache hit  → res.download()
  → cache miss → read JSON → render → write to disk → res.download()
```

Cache freshness: compare file `mtime` against JSON `parsedAt`. If JSON was re-parsed, cache is stale.

`var/downloads/` is a runtime cache, not source data and not a build artifact. Add `var/` to `.gitignore`.

Do not keep generated runtime downloads under `public/`. `public/` should contain real static assets only. Download files must go through the route so the app can validate slug/format, check freshness, regenerate stale files, and control headers.

Optional CLI: `npm run generate:downloads` for CDN pre-warm or CI.

---

## Runtime Catalog Database

**Skip `data/catalog.json` and SQLite as main architecture steps. Use Prisma + Postgres as the runtime catalog database from the start.**

Postgres should be the only real runtime database for the platform. It avoids a later SQLite → Postgres migration and matches the production shape immediately.

Local development can use Postgres through Docker Compose, a local `brew` service, or a managed dev database. PM2 only runs the Node.js app; Postgres runs separately as a service/container/managed database.

Source PDFs in `pearls/` remain the source of truth. Parsed JSON is a generated intermediate artifact. The database is a runtime index for:

- homepage catalog;
- stable sorting;
- filters;
- sitemap;
- keyword search;
- future admin and RAG flows.

### Prisma Schema

```prisma
model Lecture {
  slug            String   @id       // "2026-01" or "1994-12-25-morya"
  year            Int
  month           Int?
  day             Int?
  publishedAt     DateTime?
  sortDate        String             // "2026-01-01" or "1994-12-25"
  title           String
  subtitle        String
  description     String
  speaker         String?
  sourcePdf       String
  jsonPath        String
  pages           Int
  paragraphsCount Int
  layout          String
  content         String             // full plain text for FTS
  parsedAt        DateTime
}
```

`paragraphs` stay in generated JSON — DB stores flat `content` text + catalog metadata only.

The homepage must read from the database only. It should not scan `data/parsed/` at startup and should not read full JSON files just to render cards.

### Why DB instead of reading JSON files:

- Catalog query = `SELECT ... FROM Lecture ORDER BY sortDate DESC` — instant
- Sort by real date, not URL path or filename
- Filter by year/speaker — trivial
- Search (FTS) — add later without structural changes
- No filesystem scan for runtime catalog requests
- Historical lectures with day-level dates are handled cleanly

---

## Vector Search / RAG: Qdrant

For semantic search over lecture content.

**Data model:**
```
Collection: "lectures"
Point:
  id:      "2026-01#chunk-3"
  vector:  [0.021, -0.43, ...]   // 1536-dim OpenAI embedding
  payload: { slug, year, month, speaker, chunk, text }
```

Chunking: ~500-token overlapping chunks (~50 token overlap).
480 lectures × ~10 chunks = ~5000 vectors. Very small collection.

RAG query flow:
```
user question → embed → Qdrant search → top-5 chunks → LLM → grounded answer
```

Use **Qdrant Cloud free tier** or self-hosted via Docker on same VPS.

---

## Incremental Updates (Quarterly Batch)

Every pipeline step is idempotent — checks "does this slug exist?" before doing work:

```
Prisma:  upsert({ where: { slug }, ... })
Qdrant:  upsert_points() — built-in idempotent
JSON:    regenerate only PDFs that changed or have no parsed output
```

**Quarterly workflow (3 new PDFs):**
```
1. Copy PDFs → pearls/{year}/
2. npm run parse:new     # only PDFs with no matching JSON
3. npm run seed:new      # upserts only new slugs into DB
4. npm run embed:new     # embeds only new slugs into Qdrant
```

---

## Roadmap: MVP → Production

### Step 1 — Normalize JSON metadata (current priority)
- [ ] Add stable identity fields to every JSON file: `slug`, `year`, `month`, `day`, `publishedAt`, `sortDate`
- [ ] Add catalog metadata to every JSON file: `speaker`, `sourcePdf`, `parsedAt`
- [ ] Update parser to write these fields on output
- [ ] Write `src/cli/addDateFields.ts` migration script for existing files
- [ ] Treat `data/parsed/` as generated output and keep it ignored by git
- [ ] Make seed script derive homepage card fields from JSON: `subtitle`, `description`, `pages`, `paragraphsCount`, `layout`, `jsonPath`
- [ ] Bulk parse all remaining PDFs → JSON
- [ ] Spot-check 10 random lectures for quality

### Step 2 — Postgres + Prisma runtime catalog
- [ ] Add local Postgres setup (`docker-compose.yml` or documented local service)
- [ ] Install Prisma, create `schema.prisma` with full `Lecture` catalog model for Postgres
- [ ] Write `npm run seed` — reads all JSON → upserts into Postgres
- [ ] Switch homepage catalog route to read from DB only (`findMany` sorted by `sortDate desc`)
- [ ] Switch sitemap generation to DB
- [ ] Switch lecture lookup metadata to DB, then read full paragraphs from JSON by `jsonPath`
- [ ] Keep source PDFs as source of truth; treat parsed JSON and Postgres as rebuildable artifacts

### Step 3 — Downloads: on-demand + disk cache
- [ ] Remove `generateDownloads()` from server startup
- [ ] In `/downloads/:year/:file` route: check disk cache → miss → generate → cache → serve
- [ ] Add `parsedAt`-based cache invalidation
- [ ] Store cached files under `var/downloads/{year}/{slug}.{ext}`
- [ ] Add `var/` to `.gitignore`
- [ ] Document `var/downloads/` as disposable cache, not source data
- [ ] Add `npm run generate:downloads` CLI for optional pre-warm

### Step 4 — Deployment
- [ ] Provision VPS/Railway/Render with Node.js + Postgres
- [ ] Run Node.js with PM2 when using VPS deployment
- [ ] Run Prisma migrations against production Postgres
- [ ] Generate parsed JSON from source PDFs, then seed production Postgres
- [ ] GitHub Actions: push to main → build → deploy
- [ ] Domain + HTTPS
- [ ] Health check endpoint `/health`

### Step 5 — Search & RAG
- [ ] Set up Qdrant (Docker on VPS or Qdrant Cloud free tier)
- [ ] Write chunker + embedder scripts
- [ ] `npm run embed:all` — initial bulk embedding
- [ ] `POST /api/ask` endpoint — RAG query → LLM → response
- [ ] Simple chat UI on `/chat`
- [ ] Postgres FTS (`tsvector`) as keyword search fallback

### Step 6 — Polish
- [ ] Quarterly intake script: `npm run intake 2026Q3` → parse + seed + embed 3 lectures
- [ ] Admin page: view lectures, trigger re-parse, mark corrections
- [ ] Analytics (Plausible self-hosted or similar)
- [ ] Rate limiting (`express-rate-limit`, in-memory MVP → Redis in prod)

---

## Summary

| Concern | Decision |
|---|---|
| Lecture slug | `YYYY-MM` (modern) / `YYYY-MM-DD-speaker` (historical) |
| JSON metadata | Self-contained: slug, year, month, speaker, parsedAt in every file |
| Source of truth | Source PDFs in `pearls/` |
| Parsed JSON | Generated artifact in `data/parsed/`, ignored by git |
| Catalog index | Postgres via Prisma from the start |
| Runtime queries | Prisma ORM over Postgres |
| Homepage data | Read from DB only, sorted by `sortDate` |
| Downloads | On-demand generation + disposable disk cache in `var/downloads/` |
| Production process | Node.js under PM2, Postgres as separate service/container/managed DB |
| Vector search | Qdrant (Docker or Qdrant Cloud) |
| Incremental updates | Slug-based upsert in all layers |
| Rate limiting | `express-rate-limit` (in-memory → Redis in prod) |

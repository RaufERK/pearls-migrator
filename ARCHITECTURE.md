# Pearls Migrator — Architecture

## Current State (May 2026)

| Layer | Pattern | Example |
|---|---|---|
| Source PDFs | `pearls/{year}/{originalName}.pdf` | `pearls/2026/2026Q1-1.pdf` |
| Parsed JSON | `data/parsed/{year}/{originalName}.json` | `data/parsed/2026/2026Q1-1.json` |
| Document metadata | self-contained fields in every JSON | `documentType`, `author`, `sitePublication`, `creation`, `pearlPublication`, `parts` |
| Downloads | Post-MVP generated artifact | `var/downloads/{format}/{year}/{slug}.{ext}` |
| Bulk downloads | Post-MVP generated artifact | `var/downloads/bundles/all-{format}.zip` |

**Known issues:**
- Slug is derived from filename by heuristics — fragile.
- Legacy compatibility fields (`year`, `month`, `publishedAt`, `sortDate`, `speaker`, `paragraphs`) still exist while runtime rendering and downloads are being migrated to the richer document model.
- Document metadata is extracted by heuristics, so reviewed JSON remains the canonical source and still needs spot checks for OCR-heavy files.
- Many older source filenames do not contain month/year information (`Death_2.pdf`, `Be gone, forces of anti-Love.pdf`). For MVP catalog dates, the year must come from `pearls/{year}/`, while the month must be extracted from the beginning of the document text.
- Author, historical creation year, and document type metadata are not reliable enough for public filters until composite PDFs are segmented into internal documents.
- Downloads and bulk archives are not MVP requirements. If downloads remain available, they must not block the first public release.
- Catalog is built by reading all 240+ full JSON files at startup — reads paragraphs just for metadata.

---

## MVP Catalog Date

For the first public release, the catalog is grouped and sorted by the site publication date:

- `sitePublication.year`;
- `sitePublication.month`;
- `sitePublication.months`;
- `sitePublication.sortDate`.

The public MVP filter is only `sitePublication.year`. Month is used for grouping and ordering, not as a required public filter.

This date means when the material appeared on our site, not when the lecture/dictation was originally given and not when it appeared in the original `Жемчужины Мудрости` issue.

Date extraction priority for MVP:

1. Year from source folder: `pearls/{year}/...` and `data/parsed/{year}/...`.
2. Month from the first document/header lines, with OCR normalization (`202 6` → `2026`).
3. Quarter filename only for modern files where it exists (`2026Q1-3.pdf` → March 2026).
4. Plain filename date only for legacy day-level files if it is clearly present.

The runtime catalog must not depend on author, creation year, month, or document type filters for the first release. Those fields may stay in JSON/DB as draft metadata, but the public UI should not present them as reliable filters until the parser supports composite documents.

Composite PDFs are still part of MVP in a minimal display-only form. One source PDF remains one catalog card and one reading page, but the card should show the internal materials found inside the file: author/title/raw heading when detected. A simple card has one internal document; a composite card has two or more internal documents. Both card types should render each internal document in the same order: document type, author, title, creation date.

---

## Canonical Slug

Modern quarterly files can use `YYYY-MM` — year + zero-padded month — when one file maps cleanly to one site publication month.

```
2026-01   →  January 2026
1994-12   →  December 1994
```

Historical files and files with descriptive names may not contain a date in the filename. For them, slug generation must not assume filename metadata. Use the reviewed JSON/site publication date plus a stable readable suffix when needed.

---

## JSON Shape (current)

Parsed JSON is the committed source of truth for the application, but it is still generated output. The local workflow is: receive source PDFs, run parser locally, run the metadata pipeline when needed, inspect generated JSON quality and metadata, then commit the generated JSON together with parser/prompt changes if the output is correct.

Do not manually edit `data/parsed/` files to fix metadata, titles, authors, document types, dates, or paragraph content. Manual JSON edits hide parser defects and make testing non-representative: the next parse or AI metadata pass should be able to reproduce the improvement. If generated data is wrong, fix extraction logic, normalization rules, or `src/metadataAi.ts`, then rerun the pipeline for the target range.

Source PDFs remain the raw archive from editors. The app, database seed, search indexing, downloads, and production deploys should consume reviewed JSON rather than reparsing PDFs on the server.

Runtime pages must not read JSON files directly. JSON is the durable reviewed source, and Postgres is the runtime projection built from it. If a page or catalog card needs a field, that field must be copied into Postgres during seed. The database should not copy every possible metadata field immediately, only the working minimum needed by the current site functionality.

This keeps the architecture simple:

- PDF — raw source;
- reviewed JSON — canonical parsed and reviewed data;
- Postgres — fast runtime copy of the fields the current site needs;
- site routes — read from Postgres, not from `data/parsed/`.

It is acceptable to do a later one-time metadata improvement pass with a model, commit the improved generated JSON, and then reseed Postgres from JSON. The model output should become reviewed JSON data before it reaches runtime, but the improvement must come from the pipeline rather than hand patches inside `data/parsed/`.

Document semantics are defined in `DOCUMENTS_GUIDE.md`. The parser must preserve three document parts (`header`, `body`, `footer`) and three different date concepts:

- `sitePublication` — editorial month/year for this site catalog;
- `creation` — historical date when the dictation, lecture, sermon, or material was first given;
- `pearlPublication` — publication metadata from the original `Жемчужины Мудрости` volume/issue line when present.

Parsed JSON should mirror the source PDF folder structure:

```
pearls/
  2026/
    2026Q1-1.pdf

data/parsed/
  2026/
    2026Q1-1.json
```

The parser creates this structure automatically. Do not manually move or edit JSON files. Existing JSON should be regenerated by the parser or metadata AI pipeline when metadata rules change.

Each JSON file is self-contained — runtime code should not derive catalog metadata from filename or path:

```json
{
  "slug": "2026-01",
  "title": "Жемчужины Мудрости",
  "documentTitle": "Example Lecture Title",
  "documentType": "lecture",
  "author": {
    "name": "Elizabeth Clare Prophet",
    "slug": "elizabeth-clare-prophet",
    "raw": "Лекция Elizabeth Clare Prophet"
  },
  "sitePublication": {
    "label": "Январь 2026",
    "year": 2026,
    "month": 1,
    "months": ["2026-01"],
    "sortDate": "2026-01-01"
  },
  "creation": {
    "date": null,
    "year": null,
    "raw": null
  },
  "pearlPublication": {
    "volume": null,
    "issue": null,
    "date": null,
    "rawDate": null,
    "raw": null
  },
  "parts": {
    "header": ["Январь 2026", "Лекция Elizabeth Clare Prophet"],
    "body": [{ "text": "..." }],
    "footer": []
  },
  "containedDocuments": [
    {
      "author": "Архангел Михаил",
      "title": "Суд над Пешу Алгой",
      "rawHeader": "Том 28, № 2 – Архангел Михаил – 13 января 1985 г. · Суд над Пешу Алгой"
    }
  ],
  "paragraphs": [
    { "text": "..." }
  ],
  "sourcePdf": "pearls/2026/2026Q1-1.pdf",
  "jsonPath": "data/parsed/2026/2026Q1-1.json",
  "parsedAt": "2026-05-08T12:00:00Z"
}
```

`paragraphs` stays during the transition for existing rendering and downloads. New parsing logic should treat `parts.body` as the clean document body.

`containedDocuments` stores the display-ready internal contents of composite PDFs. It belongs in reviewed JSON first, then gets copied to Postgres for the catalog. The homepage must not recompute this from JSON at request time.

---

## Download Strategy: Deploy-Time Artifacts

Individual TXT/DOCX/EPUB downloads are generated explicitly after content updates/deploys. The server must not generate download files during request handling and should not regenerate them on every app start.

```
npm run generate:downloads
  → read Postgres runtime projection
  → generate individual TXT/DOCX/EPUB files
  → fail fast if any document cannot be rendered
```

Generated individual download files live in `public/downloads/`:

```
public/downloads/
  2026/
    2026-01.txt
    2026-01.docx
    2026-01.epub
```

`public/downloads/` is a rebuildable artifact, not source data.

Downloads still go through Express routes, not direct static serving, so the app can validate slug/format and control headers.

Bulk ZIP archives are post-MVP:

- `Скачать все файлы в TXT`
- `Скачать все файлы в EPUB`
- `Скачать все файлы в DOCX`

This is intentionally more eager than on-demand generation: after a content update, errors surface during deploy/pre-warm instead of failing for users during runtime.

---

## Runtime Catalog Database

**Skip `data/catalog.json` and SQLite as main architecture steps. Use Prisma + Postgres as the runtime catalog database from the start.**

Postgres should be the only real runtime database for the platform. It avoids a later SQLite → Postgres migration and matches the production shape immediately.

Local development can use Postgres through Docker Compose, a local `brew` service, or a managed dev database. PM2 only runs the Node.js app; Postgres runs separately as a service/container/managed database.

Parsed JSON in `data/parsed/` remains the application source of truth. The database is a rebuildable runtime projection for:

- homepage catalog;
- stable sorting;
- filters;
- sitemap;
- reading pages;
- composite-document headings shown in cards;
- keyword search;
- future admin and RAG flows.

### Prisma Schema

```prisma
model Lecture {
  slug            String   @id       // "2026-01" or "1994-12-25-morya"
  title           String
  documentTitle   String?
  documentType    String
  description     String
  authorName      String?
  authorSlug      String?
  siteYear        Int
  siteMonth       Int?
  siteMonths      String[]           // ["2026-01"], supports multi-month documents
  siteSortDate    String             // "2026-01-01"
  creationDate    DateTime?
  creationYear    Int?
  pearlVolume     Int?
  pearlIssue      String?
  pearlDate       DateTime?
  sourcePdf       String
  jsonPath        String
  pages           Int
  paragraphsCount Int
  layout          String
  content         String             // page body/plain text needed by current runtime
  containedDocs   Json               // display-ready inner materials for composite PDFs
  parsedAt        DateTime
}
```

`parts` and `paragraphs` stay in JSON as canonical reviewed structure. DB stores the working runtime projection: catalog metadata, page body content, display-ready composite headings, and any other field the current site needs to render without reading JSON files.

Metadata duplication is intentional. JSON stores the canonical reviewed values, and Postgres stores a minimal copy optimized for current runtime queries and page rendering. Data flow is one-way:

```
reviewed JSON → seed script → Postgres
```

If metadata differs between JSON and DB, JSON wins; reseed the database.

Runtime routes must read from the database only. They should not scan `data/parsed/` at startup, should not read full JSON files to render cards, and should not read JSON files to render document pages. If runtime needs a value, add it to the seed projection.

### Why DB instead of reading JSON files:

- Catalog query = `SELECT ... FROM Lecture ORDER BY siteSortDate DESC` — instant
- Sort by real date, not URL path or filename
- MVP filter by site publication year — trivial
- MVP grouping and sorting by site publication year/month — trivial
- Reading pages do not hit the filesystem for JSON
- Composite PDF headings are stored once during seed, not recomputed on every request
- Future filters by historical creation year, author, and document type — available after composite-document metadata is reliable
- Search (FTS) — add later without structural changes
- No filesystem scan for runtime catalog requests
- Historical lectures with day-level dates are handled cleanly

---

## Future Author Reference

A later release should add an author/reference subsystem based on a separate source book or curated author directory.

Target shape:

- parse or curate an `authors` dataset with canonical names, aliases, slugs, biographies, and source references;
- generate public author pages at `/authors/{slug}`;
- link author names from catalog cards and document pages once author matching is reliable;
- use the author directory as a normalization dictionary during parsing, so `Э. К. Профет`, `Элизабет Клэр Профет`, and other variants resolve to one canonical author;
- keep document ownership as a reviewed value in JSON and DB, not as a loose runtime guess.

This does not block the first release. The first release should ship with site-date grouping, reading pages, composite-document headings in the catalog, and minimal reliable navigation. Author pages and author filters belong after deploy, design cleanup, and composite-document handling.

---

## Vector Search / RAG: Qdrant

For semantic search over lecture content.

**Data model:**
```
Collection: "lectures"
Point:
  id:      "2026-01#chunk-3"
  vector:  [0.021, -0.43, ...]   // 1536-dim OpenAI embedding
  payload: { slug, siteYear, siteMonth, creationYear, authorSlug, documentType, chunk, text }
```

Chunking: ~500-token overlapping chunks (~50 token overlap).
480 lectures × ~10 chunks = ~5000 vectors. Very small collection.

RAG query flow:
```
user question → embed → Qdrant search → top-5 chunks → LLM → grounded answer
```

Use **Qdrant Cloud free tier** or self-hosted via Docker on same VPS.

---

## Frontend Rendering Strategy

Current Handlebars templates are acceptable for the MVP because they produce server-rendered HTML, which is the important SEO requirement. Do not replace the frontend while the parser, metadata model, Postgres catalog, sitemap, and download pipeline are still changing.

Target frontend rendering stack:

```
Express + TypeScript + React TSX server-rendered components
```

Use React only as a typed server-side HTML renderer, not as a client-side SPA. Pages should still return complete HTML from the server:

- homepage catalog rendered from Postgres metadata;
- lecture pages rendered from DB metadata + reviewed JSON paragraphs;
- unique SEO metadata per page;
- canonical URLs, Open Graph tags, `robots.txt`, and `sitemap.xml`;
- minimal or zero client-side JavaScript for reading pages.

This keeps the project modern and TypeScript-friendly without adopting a full Next.js app too early. React/TSX components are easier for models to edit than string templates because props are typed, component boundaries are explicit, and markup stays close to normal HTML.

Do the migration only after backend data flow is stable:

1. JSON metadata is normalized and reviewed.
2. Prisma/Postgres is the runtime catalog source.
3. Sitemap and lecture metadata read from Postgres.
4. Downloads are explicit generated artifacts, not startup work.
5. Existing Express routes and URL structure are stable.

Next.js remains a later option if the project grows beyond a simple catalog and lecture reader: moderator UI, interactive search, auth, complex client UI, or Vercel-first deployment.

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
2. npm run parse:new     # only PDFs with no matching reviewed JSON
3. Review generated JSON locally
4. Commit PDFs + reviewed JSON + parser changes if needed
5. Deploy
6. npm run seed:new      # upserts reviewed JSON into DB
7. npm run embed:new     # embeds only new slugs into Qdrant
```

---

## Roadmap: MVP → Production

### Step 1 — Normalize JSON metadata (current priority)
- [x] Add stable identity fields to every JSON file: `slug`, source paths, `parsedAt`
- [x] Add document semantics from `DOCUMENTS_GUIDE.md`: `documentType`, `author`, `sitePublication`, `creation`, `pearlPublication`
- [x] Split document text into `parts.header`, `parts.body`, `parts.footer`
- [x] Keep `paragraphs` as a transition field for current rendering and downloads
- [x] Update parser to write these fields on output
- [x] Update parser to write JSON into `data/parsed/{year}/`, mirroring `pearls/{year}/`
- [x] Regenerate existing JSON from the parser with the richer document metadata
- [x] Keep `data/parsed/` committed after local review
- [x] Make seed/catalog derive homepage card fields from JSON-backed DB fields: `subtitle`, `description`, `pages`, `paragraphsCount`, `layout`, `jsonPath`
- [x] Bulk parse all remaining PDFs → JSON
- [x] Spot-check 10 random lectures for quality

### Step 2 — Postgres + Prisma runtime catalog
- [x] Add local Postgres setup (`docker-compose.yml` or documented local service)
- [x] Install Prisma, create `schema.prisma` with full `Lecture` catalog model for Postgres
- [x] Write `npm run seed` — reads all JSON → upserts into Postgres
- [x] Switch homepage catalog route to read from DB only (`findMany` sorted by `sortDate desc`)
- [x] Switch sitemap generation to DB
- [x] Switch lecture lookup metadata to DB, then read full paragraphs from JSON by `jsonPath`
- [x] Keep JSON as source of truth; treat Postgres as a rebuildable runtime index

### Step 3 — Downloads: generated artifacts + bulk ZIPs
- [ ] Remove `generateDownloads()` from normal server startup
- [ ] Add `npm run generate:downloads` to generate individual TXT/DOCX/EPUB files
- [ ] Store generated files under `var/downloads/{format}/{year}/{slug}.{ext}`
- [ ] Generate `var/downloads/bundles/all-txt.zip`
- [ ] Generate `var/downloads/bundles/all-docx.zip`
- [ ] Generate `var/downloads/bundles/all-epub.zip`
- [ ] Add routes for individual downloads and bulk ZIP downloads
- [ ] Show three bulk download buttons at the end of the catalog page with ZIP sizes
- [ ] Add `var/` to `.gitignore`
- [ ] Document `var/downloads/` as disposable cache, not source data

### Step 4 — Frontend rendering modernization
- [ ] Keep current Handlebars templates until backend data flow is stable
- [ ] Remove `handlebars` after catalog, sitemap, lecture metadata, and downloads no longer depend on changing filesystem flow
- [ ] Add React + React DOM only for server-side TSX rendering
- [ ] Move HTML markup into typed TSX components under `src/views/`
- [ ] Render pages with `renderToStaticMarkup`, not client-side React hydration
- [ ] Keep complete lecture content in server-rendered HTML for SEO
- [ ] Preserve stable routes, canonical URLs, Open Graph tags, `robots.txt`, and `sitemap.xml`

### Step 5 — Deployment
- [ ] Provision VPS/Railway/Render with Node.js + Postgres
- [ ] Run Node.js with PM2 when using VPS deployment
- [ ] Run Prisma migrations against production Postgres
- [ ] Seed production Postgres from committed JSON
- [ ] GitHub Actions: push to main → build → deploy
- [ ] Domain + HTTPS
- [ ] Health check endpoint `/health`

### Step 6 — Search & RAG
- [ ] Set up Qdrant (Docker on VPS or Qdrant Cloud free tier)
- [ ] Write chunker + embedder scripts
- [ ] `npm run embed:all` — initial bulk embedding
- [ ] `POST /api/ask` endpoint — RAG query → LLM → response
- [ ] Simple chat UI on `/chat`
- [ ] Postgres FTS (`tsvector`) as keyword search fallback

### Step 7 — Polish
- [ ] Quarterly intake script: `npm run intake 2026Q3` → parse + seed + embed 3 lectures
- [ ] Admin page: view lectures, trigger re-parse, mark corrections
- [ ] Analytics (Plausible self-hosted or similar)
- [ ] Rate limiting (`express-rate-limit`, in-memory MVP → Redis in prod)

---

## Summary

| Concern | Decision |
|---|---|
| Lecture slug | `YYYY-MM` (modern) / `YYYY-MM-DD-speaker` (historical) |
| JSON metadata | Self-contained fields from `DOCUMENTS_GUIDE.md`: type, author, site publication, creation, pearl publication, parts |
| Raw source | Source PDFs in `pearls/` |
| Source of truth | Reviewed JSON files in `data/parsed/{year}/` |
| Metadata duplication | JSON is canonical; Postgres stores a query-optimized copy |
| Catalog index | Postgres via Prisma from the start |
| Runtime queries | Prisma ORM over Postgres |
| Homepage data | Read from DB only, sorted by `siteSortDate` |
| Frontend rendering | React TSX server-rendered components after backend flow stabilizes |
| Downloads | Explicitly generated artifacts in `var/downloads/` |
| Bulk downloads | ZIP bundles per format: TXT, DOCX, EPUB |
| Production process | Node.js under PM2, Postgres as separate service/container/managed DB |
| Vector search | Qdrant (Docker or Qdrant Cloud) |
| Incremental updates | Slug-based upsert in all layers |
| Rate limiting | `express-rate-limit` (in-memory → Redis in prod) |

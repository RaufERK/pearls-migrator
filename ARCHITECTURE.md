# Pearls Migrator — Architecture

## Current Shape

Production runtime is Next.js-only. Heavy file work stays in local/offline Node.js scripts.

```text
../SOURCE_PERALS/
  -> data/word-docx/
  -> data/parsed/
  -> Postgres
  -> web/public/downloads/
  -> Next.js public site
```

## Runtime Boundary

- `web/` owns public runtime: catalog, reading pages, SEO metadata, `robots.txt`, `sitemap.xml`, `/health`, direct Postgres reads, and static downloads.
- `src/cli/` owns offline batch work: Word preparation, Word parsing, metadata enrichment, seed, smoke checks, and download generation.
- `src/catalogLabels.ts` is the one exception allowed to cross the boundary: it is pure (no fs/Prisma/Next imports) and is imported directly by both `src/catalog.ts` and `web/lib/pearls.ts` so document-type labels, author normalization, and title helpers stay identical in both contexts.
- Production does not run Express and does not parse uploaded files.
- Runtime pages must read from Postgres, not scan `data/parsed/`.

## Source Data

- Primary source: external `SOURCE_PERALS/` repo, or `PEARLS_SOURCE_ROOT` when set.
- Canonical source layout: `<year>/Qn/word`, `<year>/Qn/pdf-mailing`, `<year>/Qn/pdf-print`, `<year>/Qn/originals`.
- Source rename manifest and audit: `SOURCE_PERALS/source-map.json` and `SOURCE_PERALS/source-audit.json`.
- Prepared parser input: ignored generated cache `data/word-docx/`.
- Reviewed generated source of truth: `data/parsed/`.
- Parser overrides: `data/word-processing-map.json`.
- Canonical public PDF source: editor-produced PDFs from `pdf-mailing` folders under each quarter. These PDFs preserve the official electronic layout and should be copied into public downloads instead of regenerated. `pdf-print` PDFs are fallback only when the matching mailing PDF is missing.

Do not edit `data/parsed/` by hand. Fix parser logic, normalization, metadata AI, or `data/word-processing-map.json`, then rerun the pipeline.

## Web App

- Framework: Next.js App Router in `web/`.
- Public routes:
  - `/`
  - `/pearls/[year]/[slug]`
  - `/downloads/[year]/[slug].pdf`
  - `/downloads/[year]/[slug].txt`
  - `/downloads/[year]/[slug].docx`
  - `/downloads/[year]/[slug].epub`
  - `/robots.txt`
  - `/sitemap.xml`
  - `/health`
- Downloads are generated ahead of time into `web/public/downloads/` and served as static files.
- Design source: `FIGMA/`. It is a read-only generated snapshot copied from Figma. Use its visual language, not its mock data, and do not edit or clean files inside it.
- Catalog search is URL-based server-side Postgres full-text search. If the `FIGMA/` prototype shows client-side live filtering, use it only as a visual reference; do not replace the real search with prototype-only live filtering.
- Download UX: catalog cards show `Читать`, visible `PDF`, and a compact `Скачать`/`Ещё` menu for `DOCX`, `EPUB`, and `TXT`. Desktop table actions are shown once per Pearl row group; mobile card actions are shown once per Pearl card. Material pages show all available formats with PDF first. Print actions are removed from the MVP UI.

## Database

Prisma/Postgres is the runtime projection of reviewed JSON.

Current models:

- `Pearl` — one site publication/container brochure.
- `PearlDocument` — one internal dictation, lecture, teaching, sermon, prayer, or material inside a pearl.

If runtime needs a field, add it to the seed projection and Prisma schema. JSON remains canonical; Postgres can be rebuilt.

## Deploy

PM2 deploy is configured in `ecosystem.config.cjs`.

Production domain:

- `https://amasters.ru`

Technical/staging domain:

- `https://amasters.tech`
- app process: `pearls-migrator`
- server port: `3021`
- server path: `/home/appuser/apps/pearls-migrator`

`npm run deploy` (run locally) does:

1. `generate:downloads` — reads Postgres and the local `SOURCE_PERALS` checkout to (re)write `web/public/downloads/{year}/{slug}.{pdf,txt,docx,epub}`. PDF generation needs the matching `pdf-mailing`/`pdf-print` source file; if it is missing, that one file is skipped (logged) without blocking the other formats/items.
2. `sync:downloads` — `rsync -az --delete web/public/downloads/` straight into the server's persistent `source/web/public/downloads/` directory (this directory is never touched by `git fetch`/`reset` since it is gitignored, so it survives across deploys).
3. `pm2 deploy ecosystem.config.cjs production`, which runs on the server:

```bash
npm ci --include=dev
npm --prefix web ci --include=dev
npm run db:generate
npm run db:deploy
npm run db:seed
npm run build:web
pm2 startOrReload ecosystem.config.cjs --env production
pm2 save
```

Step 3's `pm2 startOrReload` is what makes the server actually serve files synced in step 2: `next start` resolves the `public/` directory once per process, so files rsynced while the process is already running are invisible until the next reload. Keep `sync:downloads` before the `pm2 deploy` step for this reason.

`SOURCE_PERALS` (and its PDFs) is deliberately never pulled onto the production server — `generate:downloads` only ever runs on a developer machine that has the source archive, and only its output (`web/public/downloads/`) is shipped to the server.

## Deferred Work

- Minimal visits analytics after release.
- Mobile/responsive polish from real-device feedback.
- Optional dedicated pages for authors, material types, and creation years.
- Optional bulk ZIP downloads.
- RAG/embeddings stay in the far backlog; current Postgres search is enough for release.

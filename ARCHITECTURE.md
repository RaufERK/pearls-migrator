# Pearls Migrator — Architecture

## Current Shape

Production runtime is Next.js-only. Heavy file work stays in local/offline Node.js scripts.

```text
data/source-data/pearls-word/
  -> data/word-docx/
  -> data/parsed/
  -> Postgres
  -> web/public/downloads/
  -> Next.js public site
```

## Runtime Boundary

- `web/` owns public runtime: catalog, reading pages, SEO metadata, `robots.txt`, `sitemap.xml`, `/health`, direct Postgres reads, and static downloads.
- `src/cli/` owns offline batch work: Word preparation, Word parsing, metadata enrichment, seed, smoke checks, and download generation.
- Production does not run Express and does not parse uploaded files.
- Runtime pages must read from Postgres, not scan `data/parsed/`.

## Source Data

- Primary source: `data/source-data/pearls-word/`.
- Prepared parser input: `data/word-docx/`.
- Reviewed generated source of truth: `data/parsed/`.
- Parser overrides: `data/word-processing-map.json`.

Do not edit `data/parsed/` by hand. Fix parser logic, normalization, metadata AI, or `data/word-processing-map.json`, then rerun the pipeline.

## Web App

- Framework: Next.js App Router in `web/`.
- Public routes:
  - `/`
  - `/pearls/[year]/[slug]`
  - `/downloads/[year]/[slug].txt`
  - `/downloads/[year]/[slug].docx`
  - `/downloads/[year]/[slug].epub`
  - `/robots.txt`
  - `/sitemap.xml`
  - `/health`
- Downloads are generated ahead of time into `web/public/downloads/` and served as static files.
- Design source: `FIGMA/`. It is a read-only generated snapshot copied from Figma. Use its visual language, not its mock data, and do not edit or clean files inside it.
- Catalog search is URL-based server-side Postgres full-text search. If the `FIGMA/` prototype shows client-side live filtering, use it only as a visual reference; do not replace the real search with prototype-only live filtering.

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

Deploy sequence:

```bash
npm ci --include=dev
npm --prefix web ci --include=dev
npm run db:generate
npm run db:deploy
npm run db:seed
npm run generate:downloads
npm run build:web
pm2 startOrReload ecosystem.config.cjs --env production
pm2 save
```

## Deferred Work

- Minimal visits analytics after release.
- Mobile/responsive polish from real-device feedback.
- Optional dedicated pages for authors, material types, and creation years.
- Optional bulk ZIP downloads.
- RAG/embeddings stay in the far backlog; current Postgres search is enough for release.

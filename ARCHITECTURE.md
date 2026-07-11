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

Local npm scripts:

- `npm run deploy` / `npm run deploy:content` — `sync:downloads` + `pm2 deploy` (ship already-built downloads; no hidden full regenerate).
- `npm run deploy:code` — `pm2 deploy` only (code/schema changes).
- `npm run generate:downloads -- --year=...` — local-only; reads `data/parsed/`, needs `SOURCE_PERALS` for PDFs.
- `npm run remap:source-paths -- --write` — rewrite legacy `data/source-data/...` path fields in JSON.

`pm2 deploy` on the server runs:

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

`pm2 startOrReload` is what makes the server serve files synced by `sync:downloads`: `next start` resolves `public/` once per process. Keep rsync before reload for this reason.

`SOURCE_PERALS` is deliberately never pulled onto production. Content work is year-scoped on a developer machine (`content:year`, `prepare:docx --year`, `parse:word --year`, `metadata:ai --year`, `generate:downloads --year`). Only reviewed `data/parsed/` (git) and prebuilt `web/public/downloads/` (rsync) are shipped.

## Content / AI rules

Canonical operator flow: `WORK-FLOW.md`. Improvement backlog: `IMPROVEMENTS.md`.

- Work one year (or one file) at a time. Never default to the whole archive.
- `parse:word` never calls OpenAI. It prepares structure; it is not the authority for final titles.
- For a **new year**, always run `metadata:ai -- --year=... --write` after parse/review. This requires VPN from Russia.
- If OpenAI returns region/sanctions `403`, abort immediately (`ВКЛЮЧИ ВПН!!! МОДЕЛЬ НЕДОСТУПНА!`). Do not invent titles with local heuristics.
- AI inputs: header/footer/body preview, `SOURCE_PERALS/source-map.json`, `data/lecture-data-export.json`, plus style examples only from already-reviewed years.
- Inside `metadata:ai`, documents that already have a usable title may be skipped unless `--force`.

## Deferred Work

Pipeline follow-ups live in `IMPROVEMENTS.md` (year-batch AI titles with shared reviewed examples, richer bold/page preview, next year end-to-end with VPN).

Product backlog:

- Minimal visits analytics after release.
- Mobile/responsive polish from real-device feedback.
- Optional dedicated pages for authors, material types, and creation years.
- Optional bulk ZIP downloads.
- RAG/embeddings stay in the far backlog; current Postgres search is enough for release.

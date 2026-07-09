# Pearls Migrator

Минималистичный TypeScript/Next.js-проект для превращения Word-брошюр из внешнего `SOURCE_PERALS/` в reviewed JSON, Postgres-каталог, статические скачивания и SEO-страницы.

Канонический порядок работы: [`WORK-FLOW.md`](./WORK-FLOW.md). План улучшений: [`IMPROVEMENTS.md`](./IMPROVEMENTS.md).

## Current Architecture

- Source: sibling repo `../SOURCE_PERALS/` or `PEARLS_SOURCE_ROOT` (`year/Qn/word`, `pdf-mailing`, `pdf-print`, `originals`).
- Prepared DOCX cache: ignored `data/word-docx/`.
- Reviewed generated JSON: `data/parsed/`.
- Runtime DB: Postgres via Prisma.
- Public frontend: Next.js App Router in `web/`.
- Downloads: source PDF plus generated TXT/DOCX/EPUB in `web/public/downloads/`.
- Design source: `FIGMA/` (read-only Figma snapshot; do not edit).

Production runtime is Next-only. Word conversion, parsing, AI metadata enrichment and download generation stay on the developer machine. **`SOURCE_PERALS` never belongs on the production server.**

## Local content flow (one year at a time)

```bash
npm run content:year -- 2019
# review data/parsed/2019/
npm run metadata:ai -- --year=2019 --write
npm run generate:downloads -- --year=2019
# commit data/parsed (+ code if needed)
npm run sync:downloads
npm run deploy:code
```

Rules:

- Always pass `--year` or `--file`. Never parse or AI-enrich the whole archive by default.
- For a **new year**, always run `metadata:ai -- --year=... --write` after parse. That step is normal, not optional.
- Inside `metadata:ai`, documents that already have a usable title are **skipped** (no OpenAI call). Use `--force` only when you intentionally want to re-spend tokens.
- `parse:word` never calls OpenAI. Titles first come from heuristics and `data/word-processing-map.json`.
- `generate:downloads` reads `data/parsed/` directly (no Postgres). It still needs local `SOURCE_PERALS` for PDFs.
- Production receives reviewed `data/parsed/` (git) and prebuilt `web/public/downloads/` (rsync).

## Commands

```bash
npm run dev
```

Next frontend on `http://localhost:3000`.

```bash
npm run content:year -- 2019
npm run prepare:docx -- --year=2019
npm run parse:word -- --year=2019
npm run metadata:ai -- --year=2019 --write
npm run generate:downloads -- --year=2019
npm run remap:source-paths -- --year=2021 --write
npm run source:audit
npm run db:seed
```

Year-scoped offline content steps. `remap:source-paths` only rewrites legacy `data/source-data/...` path fields via `source-map.json`.

```bash
npm run lint
npm run build
npm run build:web
npm test
npm run smoke
```

CI (`.github/workflows/ci.yml`) runs lint, build, tests, and `build:web` on every push/PR.

```bash
npm run deploy          # sync:downloads + pm2 deploy
npm run deploy:code     # pm2 deploy only
npm run deploy:content  # same as deploy (sync + pm2); generate downloads yourself first
```

## Environment

Required:

```bash
DATABASE_URL=...
SITE_URL=...
```

Optional: `OPENAI_API_KEY` (for `metadata:ai`), `PEARLS_SOURCE_ROOT`. See `.env.example`.

Local development needs Node `>=22.12.0` and Postgres.

## Pipeline

```text
Word brochures (local SOURCE_PERALS only)
  -> prepare DOCX (--year)
  -> parse DOCX + word-processing-map (--year)  # no OpenAI
  -> review data/parsed/<year>/
  -> metadata:ai --year --write                 # always for new year data;
                                                # skips docs that already have titles
  -> generate:downloads --year                  # from data/parsed, no Postgres
  -> commit data/parsed
  -> rsync downloads + pm2 deploy (seed + Next build)
  -> Next serves Postgres + static downloads
```

Do not edit `data/parsed/` by hand. Fix parser logic, normalization, `src/metadataAi.ts`, or `data/word-processing-map.json`, then regenerate.

## Download UX

Catalog: primary `Читать`, visible `PDF`, compact `Скачать`/`Ещё` for `DOCX`/`EPUB`/`TXT`. Desktop actions once per Pearl row group; mobile once per Pearl card. Material pages list formats with PDF first. No print buttons in MVP UI.

## Deploy Notes

- Production: `https://amasters.ru`
- Staging/tech: `https://amasters.tech`

Server `post-deploy`:

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

The server never runs `prepare:docx`, `parse:word`, `metadata:ai`, or `generate:downloads`.

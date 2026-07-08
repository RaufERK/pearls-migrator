# Pearls Migrator

Минималистичный TypeScript/Next.js-проект для превращения Word-брошюр из внешнего `SOURCE_PERALS/` в reviewed JSON, Postgres-каталог, статические скачивания и SEO-страницы.

## Current Architecture

- Source: sibling repo `../SOURCE_PERALS/` or `PEARLS_SOURCE_ROOT`, structured as `year/Qn/word`, `pdf-mailing`, `pdf-print`, `originals`.
- Prepared DOCX cache: ignored `data/word-docx/`.
- Reviewed generated JSON: `data/parsed/`.
- Runtime DB: Postgres via Prisma.
- Public frontend: Next.js App Router in `web/`.
- Downloads: source PDF plus generated TXT/DOCX/EPUB files in `web/public/downloads/`.
- Design source: `FIGMA/` as a read-only generated Figma snapshot. Do not edit or clean it; it may be replaced on the next design iteration.

Production runtime is Next-only. Word conversion, parsing, metadata enrichment, seed and download generation are offline Node/TypeScript pipeline steps.

## Commands

```bash
npm run dev
```

Runs the Next frontend on `http://localhost:3000`.

```bash
npm run source:audit
npm run source:map
npm run source:normalize
npm run prepare:docx
npm run parse:word
npm run db:seed
npm run generate:downloads
```

Audits/normalizes the external source archive and runs the content pipeline.

```bash
npm run lint
npm run build
npm run build:web
npm test
npm run smoke
```

Lints `src/` and `web/`, validates offline scripts and Next build, runs parser unit tests, and runs production smoke checks. CI (`.github/workflows/ci.yml`) runs lint, build, tests, and `build:web` on every push/PR.

```bash
npm run deploy
```

Deploys through PM2 using `ecosystem.config.cjs`.

## Environment

Required:

```bash
DATABASE_URL=...
SITE_URL=...
```

Optional: `OPENAI_API_KEY` (only for `npm run metadata:ai`), `PEARLS_SOURCE_ROOT` (override for the external `SOURCE_PERALS` archive location). See `.env.example` for details.

Local development needs Node `>=22.12.0` and access to Postgres.

## Pipeline

```text
Word brochures
  -> normalize external SOURCE_PERALS paths through source-map.json
  -> prepare DOCX through LibreOffice
  -> parse prepared DOCX with OpenXML
  -> apply data/word-processing-map.json overrides
  -> write reviewed JSON into data/parsed/
  -> seed Postgres
  -> copy source PDF and generate TXT/DOCX/EPUB downloads
  -> render with Next.js
```

Do not manually edit `data/parsed/`. Fix parser logic, metadata normalization, `src/metadataAi.ts`, or `data/word-processing-map.json`, then regenerate.

## Download UX

Catalog cards use `Читать` as the primary action, visible `PDF` as the canonical editor-produced file, and a compact `Скачать`/`Ещё` menu for `DOCX`, `EPUB`, and `TXT`. Desktop table actions are shown once per Pearl row group; mobile card actions are shown once per Pearl card. Material pages show all formats with PDF first. Print buttons are removed from the MVP UI because printing is available through PDF/DOCX and direct browser print added visual noise.

## Deploy Notes

Production is `https://amasters.ru`. Technical/staging domain is `https://amasters.tech`.

PM2 deploy sequence:

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

Next non-blocking product step is simple visits analytics. Current release functionality is enough for production.

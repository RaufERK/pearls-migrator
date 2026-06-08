# Pearls Migrator

## Summary

TypeScript MVP for converting Russian Word brochures from `data/source-data/pearls-word/` into reviewed JSON, a Postgres-backed catalog, and readable web pages.

## Goals

- Keep the Word-first parser stable for all current `data/source-data/pearls-word/<year>/<quarter>/Брошюры` and `БРОШЮРЫ` folders.
- Prepare `.docx` files from raw Word brochures through `npm run prepare:docx`.
- Convert legacy `.doc` files to `.docx` through LibreOffice and store prepared files in `data/word-docx/`.
- Preserve paragraph structure and internal `documents[]` well enough for readable webpages.
- Preserve editor-reviewed document titles and split rules in `data/word-processing-map.json`.
- Finish the Next.js public UI cutover while keeping the Word/backend pipeline stable.

## Tech Stack

- Node.js
- Express backend/API during migration
- TypeScript
- React
- Next.js App Router in `web/` for public catalog and reading pages
- Tailwind CSS in `web/`
- JSZip
- LibreOffice headless for `.doc` to `.docx` conversion

## Directories

- `src/cli/` - local parsing scripts.
- `web/` - current Next.js public frontend app.
- `src/views/` - legacy Express React TSX views; remove after frontend cutover.
- `public/` - generated downloads and legacy static assets.
- `data/word-docx/` - prepared DOCX files generated from raw Word brochures.
- `data/parsed/` - generated JSON output. Do not edit these files by hand.
- `data/word-processing-map.json` - editor-reviewed Word parsing overrides: document titles, expected document counts, split markers.
- `data/source-data/pearls-word/` - primary Word brochure source archive.
- `data/source-data/pearls-pdf/` - archived PDF originals, not the primary parser input.
- `FIGMA/` - current design prototype/reference. Treat this as the canonical visual source for UI work.
- `tmp/converted/` - temporary converted DOCX files; do not treat as source data.
- `DOCUMENTS_GUIDE.md` - document semantics: types, dates, header/body/footer rules.

## Coding Rules

- Keep the project minimal and MVP-first.
- Remove obsolete modules when they no longer support the current delivery stage, so models do not waste context on dead code.
- Use functional TypeScript.
- Keep imports at the top of files.
- Do not introduce service layers or large abstractions.
- Prefer clear local functions over generic utilities.
- Code is in English.
- Project explanations are in Russian.
- Do not manually edit `data/parsed/` JSON files. They are generated artifacts and must change only through the parser, metadata normalization, seed/intake scripts, or the AI metadata pipeline.
- If parsed metadata is wrong, fix the parser logic, normalization rules, or `src/metadataAi.ts` prompt/schema, then rerun the pipeline. Manual JSON edits make parser testing non-representative.

## Naming

- Use descriptive camelCase for functions and variables.
- Use PascalCase only for exported types.
- Keep route slugs readable and stable.

## Architecture

The active parser flow is `data/source-data/pearls-word/ -> data/word-docx/ -> data/parsed/ -> Postgres -> public/downloads/`. The preparation CLI reads Russian Word brochures from every `data/source-data/pearls-word/<year>/<quarter>/Брошюры` or `БРОШЮРЫ` folder. If a brochure is `.doc`, it converts it to `.docx` through LibreOffice headless; if it is already `.docx`, it copies it into `data/word-docx/` while preserving the year/quarter structure. The JSON parser then reads prepared DOCX files through OpenXML, including body, headers, footers, bold, italic, font size, and style id. It uses formatting and `data/word-processing-map.json` to detect real document titles and split composite brochures. One monthly brochure becomes one Pearl JSON file in `data/parsed/{year}/`, and internal lectures, dictations, sermons, prayers, or teachings stay inside `documents[]`. Parsed JSON files are the generated content source of truth and should be produced by the project pipeline, not hand-edited. Next.js in `web/` renders the public catalog and reading pages as full SEO HTML. Express remains as backend/API/download support during migration and can be reduced after route parity.

`FIGMA/` is the active visual prototype with mock data. Do not copy its mock data into runtime, but use its layout, Tailwind-style classes, spacing, colors, table/detail patterns, and interaction intent as the primary design source. The previous `PearlsV27/` prototype is no longer the active design source. The goal of the Next.js frontend migration is to make future design transfer from `FIGMA/` easier than manual conversion into one large CSS file.

Document metadata rules live in `DOCUMENTS_GUIDE.md`. Parsed JSON should preserve document type, author, site publication date, historical creation date, optional Pearl publication metadata, and separated `header`, `body`, and `footer` parts.

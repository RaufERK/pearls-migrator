# Pearls Migrator

## Summary

TypeScript MVP for converting Russian Word brochures from `data/source-data/pearls-word/` into reviewed JSON, a Postgres-backed catalog, and readable web pages.

## Goals

- Parse Word brochures from `data/source-data/pearls-word/2022/<quarter>/Брошюры` and `БРОШЮРЫ` first.
- Prepare `.docx` files from all `data/source-data/pearls-word/<year>/<quarter>/Брошюры` and `БРОШЮРЫ` folders.
- Convert legacy `.doc` files to `.docx` through LibreOffice and store prepared files in `data/word-docx/`.
- Preserve paragraph structure and internal `documents[]` well enough for readable webpages.
- Prepare the code for future catalog generation from the whole `data/source-data/pearls-word/` tree.

## Tech Stack

- Node.js
- Express
- TypeScript
- Handlebars
- JSZip
- mammoth
- LibreOffice headless for `.doc` to `.docx` conversion
- pdfjs-dist remains only for legacy PDF parser code during migration

## Directories

- `src/pdf/` - legacy PDF extraction code during the Word migration.
- `src/cli/` - local parsing scripts.
- `templates/` - HTML templates.
- `public/` - static CSS and generated downloads.
- `data/word-docx/` - prepared DOCX files generated from raw Word brochures.
- `data/parsed/` - generated JSON output. Do not edit these files by hand.
- `data/source-data/pearls-word/` - primary Word brochure source archive.
- `data/source-data/pearls-pdf/` - archived PDF originals, not the primary parser input.
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

The next parser flow is `data/source-data/pearls-word/ -> data/word-docx/ -> data/parsed/ -> Postgres`. The preparation CLI must read Russian Word brochures from every `data/source-data/pearls-word/<year>/<quarter>/Брошюры` or `БРОШЮРЫ` folder. If a brochure is `.doc`, it converts it to `.docx` through LibreOffice headless; if it is already `.docx`, it copies it into `data/word-docx/` while preserving the year/quarter structure. The JSON parser then reads prepared DOCX files with `mammoth`. One monthly brochure becomes one Pearl JSON file in `data/parsed/{year}/`, and internal lectures, dictations, sermons, prayers, or teachings stay inside `documents[]`. Parsed JSON files are the generated content source of truth and should be produced by the project pipeline, not hand-edited. The Express app builds the catalog from reviewed JSON through Postgres, renders readable HTML with Handlebars, exposes JSON, generates TXT/DOCX/EPUB downloads, and serves SEO files such as `robots.txt` and `sitemap.xml`.

Document metadata rules live in `DOCUMENTS_GUIDE.md`. Parsed JSON should preserve document type, author, site publication date, historical creation date, optional Pearl publication metadata, and separated `header`, `body`, and `footer` parts.

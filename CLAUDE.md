# Pearls Migrator

## Summary

TypeScript MVP for converting PDF files from `pearls/` into readable web pages.

## Goals

- Parse one PDF first: `pearls/2006/1994_12_25_Morya.pdf`.
- Preserve paragraph structure well enough for a readable webpage.
- Prepare the code for future catalog generation from the whole `pearls/` tree.
- Support both single-column and two-column PDF layouts.

## Tech Stack

- Node.js
- Express
- TypeScript
- Handlebars
- JSZip
- pdfjs-dist

## Directories

- `src/pdf/` - PDF extraction and layout parsing.
- `src/cli/` - local parsing scripts.
- `templates/` - HTML templates.
- `public/` - static CSS and generated downloads.
- `data/parsed/` - generated JSON output. Do not edit these files by hand.
- `pearls/` - source PDF files.
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

The parser extracts text items with coordinates, detects the page layout, normalizes reading order, groups text into lines, then groups lines into paragraphs. Parsed JSON files in `data/parsed/` are the generated content source of truth and should be produced by the project pipeline, not hand-edited. The Express app builds the lecture catalog from those JSON files, renders readable HTML with Handlebars, exposes the same structure as JSON, generates TXT/DOCX/EPUB downloads, and serves SEO files such as `robots.txt` and `sitemap.xml`.

Document metadata rules live in `DOCUMENTS_GUIDE.md`. Parsed JSON should preserve document type, author, site publication date, historical creation date, optional Pearl publication metadata, and separated `header`, `body`, and `footer` parts.

# Pearls Migrator

## Summary

TypeScript MVP for converting Russian Word brochures from the external `SOURCE_PERALS/` archive into reviewed JSON, a Postgres-backed catalog, and readable web pages.

## Goals

- Keep the Word-first parser stable for the external `SOURCE_PERALS/<year>/Qn/word` source archive.
- Prepare `.docx` files from raw Word brochures through `npm run prepare:docx`.
- Convert legacy `.doc` files to `.docx` through LibreOffice and store prepared cache files in ignored `data/word-docx/`.
- Preserve paragraph structure and internal `documents[]` well enough for readable webpages.
- Preserve editor-reviewed document titles and split rules in `data/word-processing-map.json`.
- Keep production runtime Next-only while preserving the offline Node/Word pipeline.
- Keep `SOURCE_PERALS` on developer machines only; ship reviewed `data/parsed/` and prebuilt `web/public/downloads/`, never the source archive.
- Parse and AI-enrich one year (or one file) at a time. For a new year always run `metadata:ai --year --write` after parse; inside that step skip OpenAI calls for documents that already have a usable title.
- Canonical operator flow lives in `WORK-FLOW.md`; improvement backlog in `IMPROVEMENTS.md`.

## Tech Stack

- Node.js
- TypeScript
- React
- Next.js App Router in `web/` for public catalog and reading pages
- Tailwind CSS in `web/`
- JSZip
- LibreOffice headless for `.doc` to `.docx` conversion
- ESLint + typescript-eslint (flat config at repo root, covers `src/` and `web/`)
- `node:test` + `tsx` for parser unit tests (no separate test framework dependency)
- GitHub Actions CI (`.github/workflows/ci.yml`): lint, `tsc`, unit tests, `next build`

## Directories

- `src/cli/` - local parsing scripts (`content:year`, `prepare:docx`, `parse:word`, `metadata:ai`, `generate:downloads`, `remap:source-paths`, seed, smoke).
- `src/downloadCatalog.ts` - builds download jobs from reviewed `data/parsed/` JSON without Postgres.
- `src/catalogLabels.ts` - pure, dependency-free catalog constants/helpers shared between `src/catalog.ts` (offline CLI) and `web/lib/pearls.ts` (Next runtime); import it instead of redefining document-type labels or author/title normalization.
- `web/` - current Next.js public frontend app.
- `web/public/downloads/` - PDF plus generated TXT/DOCX/EPUB files served by Next.
- `../SOURCE_PERALS/` - separate source repository with canonical `year/Qn/word`, `pdf-mailing`, `pdf-print`, and `originals` folders.
- `data/word-docx/` - ignored prepared DOCX cache generated from raw Word brochures.
- `data/parsed/` - generated JSON output. Do not edit these files by hand.
- `data/word-processing-map.json` - editor-reviewed Word parsing overrides: document titles, expected document counts, split markers.
- `data/source-data/` - obsolete in-repo source archive path. Do not restore it; use `SOURCE_PERALS` or `PEARLS_SOURCE_ROOT`.
- `FIGMA/` - read-only generated design snapshot from Figma. Treat it as the canonical visual reference for UI work, but do not edit, clean up, prune, refactor, restore, or optimize files inside it.
- `tmp/converted/` - temporary converted DOCX files; do not treat as source data.
- `DOCUMENTS_GUIDE.md` - document semantics: types, dates, header/body/footer rules.
- `WORK-FLOW.md` - canonical local content + deploy operator flow (year-scoped).
- `IMPROVEMENTS.md` - running audit/improvement backlog; check it off as items land.

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
- The pure extraction/normalization helpers in `src/word/extractWordPearl.ts` and `src/metadataNormalization.ts` are exported specifically so `*.test.ts` files can cover them; keep new pure helpers exported and add regression tests when fixing parser bugs.
- Run `npm run lint`, `npm run build`, and `npm test` before considering a change to `src/` or `web/` done; CI runs the same checks plus `npm run build:web`.
- JavaScript regex `\b`/`\w` are ASCII-only. Never use `\b` next to Cyrillic literals; use `(?<![\p{L}\p{N}])`/`(?![\p{L}\p{N}])` with the `u` flag instead.
- `resolveMappedSourcePath` in `src/sourceArchive.ts` translates old, pre-migration `data/source-data/...` paths (still stored in some pre-2020 `data/parsed/*.json` `sourceWord` fields historically; current reviewed JSON should use `../SOURCE_PERALS/...` after `remap:source-paths`) into current `SOURCE_PERALS` paths via `source-map.json`. Matching is case-insensitive and tolerates `.doc`/`.docx` extension mismatches, plus both relative and absolute inputs. If you touch this function, keep it working for callers that pass an already-absolute path (e.g. `src/catalog.ts`'s `PearlCatalogItem.sourcePath`).

## Naming

- Use descriptive camelCase for functions and variables.
- Use PascalCase only for exported types.
- Keep route slugs readable and stable.

## Architecture

The active parser flow is `SOURCE_PERALS/ -> data/word-docx/ -> data/parsed/ -> Postgres -> web/public/downloads/ -> Next.js`. By default the CLI uses the sibling `../SOURCE_PERALS` repo, or `PEARLS_SOURCE_ROOT` when set, with `data/source-data/` only as a legacy fallback. The canonical source layout is `SOURCE_PERALS/<year>/Qn/word` for Word brochures, `pdf-mailing` for public editor PDFs, `pdf-print` as fallback PDFs, and `originals` for non-primary source materials. If a brochure is `.doc`, `prepare:docx` converts it to `.docx` through LibreOffice headless; if it is already `.docx`, it copies it into ignored `data/word-docx/` while preserving the canonical year/quarter structure. The JSON parser then reads prepared DOCX files through OpenXML, including body, headers, footers, bold, italic, font size, and style id. It uses formatting, `data/word-processing-map.json`, and `SOURCE_PERALS/source-map.json` path aliases to detect real document titles and split composite brochures. One monthly brochure becomes one Pearl JSON file in `data/parsed/{year}/`, and internal lectures, dictations, sermons, prayers, or teachings stay inside `documents[]`. Parsed JSON files are the generated content source of truth and should be produced by the project pipeline, not hand-edited. PDF files from `pdf-mailing` are first-class public downloads and represent the editor-produced canonical layout for electronic distribution; `pdf-print` PDFs are fallback only when the matching mailing PDF is missing. TXT/DOCX/EPUB are generated convenience formats from parsed content. Next.js in `web/` is the only production runtime: it reads Postgres directly, renders the public catalog, reading pages, robots and sitemap as full SEO HTML/XML, and serves pre-generated downloads from `web/public/downloads/`. Word parsing, file generation, seed, metadata enrichment, queues, workers, and heavy filesystem operations stay in offline Node/TypeScript scripts, not in Next route handlers.

`FIGMA/` is the active visual prototype with mock data. It is copied from the Figma site and generated by Figma AI, so it must be treated as external read-only input. Do not copy its mock data into runtime, and do not spend time cleaning, deleting, restoring, formatting, or refactoring files inside `FIGMA/`; the folder may be replaced wholesale on the next design iteration. Use only its layout, Tailwind-style classes, spacing, colors, table/detail patterns, and interaction intent as the primary design source.

If `FIGMA/` contains live filtering or other client-side prototype behavior, treat it as a visual/UX demonstration only. The real catalog search is the URL-based server-side Postgres full-text search in `web/lib/pearls.ts`; preserve that approach for SEO, shareable URLs, and minimal client JS. Match the prototype's search appearance, not its mock client-side filtering implementation.

Document metadata rules live in `DOCUMENTS_GUIDE.md`. Parsed JSON should preserve document type, author, site publication date, historical creation date, optional Pearl publication metadata, and separated `header`, `body`, and `footer` parts.

## Download UX

Catalog cards should lead with a clear `Читать` action, show `PDF` as a visible secondary action, and move `DOCX`, `EPUB`, and `TXT` into a compact `Скачать`/`Ещё` menu. Do not show `Печать` in the catalog. Desktop table actions are shown once per Pearl row group; mobile catalog cards show one shared action block per Pearl, not one block per internal material. The material page lists all available download formats with PDF first. Printing is removed from the MVP UI. Reading on the site remains the primary mobile experience because source PDFs are often two-column and inconvenient on small screens. Desktop catalog rows may use hover highlighting; mobile cards should stay simple and rely on tap/active feedback, not fake hover effects.

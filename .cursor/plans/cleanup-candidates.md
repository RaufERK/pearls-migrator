# Cleanup Candidates Before Next Stage

Этот список нужен для ручного решения перед удалением файлов. Не удалять спорные данные без подтверждения.

## High Confidence Delete Candidates

- `public/downloads/` — старый корневой каталог generated downloads, 1347 tracked files. Текущий pipeline пишет в `web/public/downloads/`, а `.gitignore` уже исключает `web/public/downloads/`. Поиск по коду показал, что runtime и генератор используют только `web/public/downloads/`.

## Keep

- `data/source-data/pearls-word/` — исходный Word-архив, нужен для локального pipeline.
- `data/word-docx/` — подготовленные DOCX для воспроизводимого парсинга.
- `data/parsed/` — reviewed JSON source of truth для seed; не редактировать руками.
- `data/word-processing-map.json` — редакторские override-правила парсинга.
- `FIGMA/` — read-only generated design snapshot; не чистить вручную.
- `src/cli/*` — offline pipeline команды: prepare, parse, seed, metadata AI, downloads, smoke.
- `web/*` — production Next.js runtime.

## Dependencies

Удалять зависимости сейчас не нужно:

- `@prisma/*`, `dotenv` — DB/runtime и pipeline.
- `jszip` — DOCX/EPUB generation и DOCX extraction.
- `openai`, `zod` — metadata AI pipeline.
- `next`, `react`, `react-dom`, Tailwind packages — web runtime.

## Generated Or Ignored Folders

Уже исключены и не должны попадать в git:

- `node_modules/`
- `dist/`
- `.next/`
- `web/.next/`
- `FIGMA/node_modules/`
- `web/public/downloads/`
- `var/`
- `tmp/`
- `src/generated/`
- `web/generated/`

## Next Cleanup Step

После подтверждения удалить из git `public/downloads/` и оставить generated downloads только в `web/public/downloads/`, где они создаются deploy pipeline.

# Pearls Migrator — Delivery Plan

Этот файл фиксирует только актуальный план работ. Исторические детали Word/PDF-миграции считаются закрытыми и не должны раздувать рабочий контекст.

## Текущее Состояние

- Word-first pipeline стабилен для текущего архива `2022-2026 Q2`.
- Raw Word source: `data/source-data/pearls-word/`.
- Prepared DOCX: `data/word-docx/`.
- Reviewed JSON: `data/parsed/`.
- Runtime index: Postgres через Prisma seed.
- Public frontend: Next.js App Router в `web/`.
- Backend/API/download слой: Express в `src/server.ts`.
- Canonical design source: `FIGMA/`.
- PDF хранится только как архив оригиналов в `data/source-data/pearls-pdf/`.

## Уже Закрыто

- [x] Подготовка DOCX из Word, включая `.doc -> .docx` через LibreOffice.
- [x] Парсинг текущих Word-брошюр в reviewed JSON.
- [x] Editor overrides в `data/word-processing-map.json`.
- [x] Prisma/Postgres seed из reviewed JSON.
- [x] TXT/DOCX/EPUB generation.
- [x] Next frontend bootstrap в `web/`.
- [x] Next catalog `/` с реальными данными, группировкой по году/месяцу и фильтром по году сайта.
- [x] Next reading page `/pearls/[year]/[slug]` с полным SEO HTML, downloads и print link.
- [x] Starry/dark visual direction перенесён из `FIGMA/`.

## Ближайший План

### 1. Проверка Parity

- [x] Проверить несколько старых и новых материалов в Next.
- [x] Проверить TXT/DOCX/EPUB downloads из Next UI.
- [x] Проверить print flow через `?print=1`.
- [x] Проверить SEO HTML через curl/browser source.
- [x] Проверить `npm run build` и `npm run build:web`.

### 2. SEO И Служебные Routes

- [x] Добавить `web/app/robots.ts`.
- [x] Добавить `web/app/sitemap.ts`.
- [x] Сохранить текущие публичные URL без redirect-шума.
- [ ] Решить, оставляем ли `/api/pearls/[year]/[slug]` на Express или переносим в Next route handler.
- [ ] Решить, оставляем ли `/downloads/[year]/[file]` на Express или переносим в Next route handler.

### 3. Cutover Cleanup

- [ ] Удалить старый Express HTML renderer, если Next parity подтверждён:
  - `src/render.tsx`;
  - `src/views/`;
  - `public/styles.css`.
- [ ] Убрать root React dependencies, если root backend больше не импортирует React.
- [ ] Упростить Express routes: оставить API/download/source files/backend health.
- [ ] Обновить `README.md`, `ARCHITECTURE.md`, `CLAUDE.md` после cutover.
- [ ] Закоммитить удаление старого UI отдельным коммитом.

## Later Backlog

- Production deploy и healthcheck.
- Bulk ZIP archives.
- Postgres full-text search.
- RAG/embeddings/Qdrant.
- Author pages and advanced filters.
- Moderator/admin UI, если понадобится.

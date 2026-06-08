# Pearls Migrator — Delivery Plan

Этот файл содержит только будущие шаги. Закрытые этапы Word-парсинга, Next-переноса и удаления старого Express UI считаются завершёнными и описаны в истории коммитов.

## Текущее Решение

- Public frontend: Next.js App Router в `web/`.
- Backend/API/download/source files: Express в `src/server.ts`.
- Data pipeline: `data/source-data/pearls-word/ -> data/word-docx/ -> data/parsed/ -> Postgres -> public/downloads/`.
- Design source: `FIGMA/`.
- PDF: только архив оригиналов в `data/source-data/pearls-pdf/`.

## Следующие Шаги

### 1. Production Deploy

- [ ] Выбрать production-площадку для связки Next frontend + Express backend + Postgres.
- [ ] Описать production env vars: `DATABASE_URL`, `SITE_URL`, API/backend URL для Next rewrites.
- [ ] Подготовить production build/start commands для root backend и `web/`.
- [ ] Добавить backend healthcheck endpoint.
- [ ] Проверить production flow: catalog, reading page, downloads, source files, robots, sitemap.

### 2. UI Polish По `FIGMA/`

- [ ] Сверить каталог с прототипом: таблицы, градиенты, spacing, responsive.
- [ ] Сверить страницу чтения: заголовок, metadata, document sections, print view.
- [ ] Убрать визуальные расхождения, которые мешают ощущению готового сайта.

### 3. Search And Content Navigation

- [ ] Добавить базовый Postgres full-text search.
- [ ] Добавить страницы авторов или фильтры по типам материалов, если это нужно для навигации.
- [ ] Вернуться к RAG/embeddings/Qdrant только после production deploy и базового поиска.

### 4. Downloads

- [ ] Решить, нужны ли bulk ZIP archives.
- [ ] Если нужны, генерировать ZIP отдельно от server startup.

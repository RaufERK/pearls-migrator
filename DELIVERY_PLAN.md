# Pearls Migrator — Delivery Plan

Этот файл содержит только будущие шаги. Закрытые этапы Word-парсинга, Next-переноса и удаления старого Express UI считаются завершёнными и описаны в истории коммитов.

## Текущее Решение

- Public frontend: Next.js App Router в `web/`.
- Production runtime target: Next.js-only.
- Offline data pipeline: local Node/TypeScript scripts prepare Word, parse JSON, seed Postgres, and generate download artifacts.
- Current state: Express runtime removed; root code is offline Node/TypeScript pipeline plus Prisma/download utilities.
- Data pipeline: `data/source-data/pearls-word/ -> data/word-docx/ -> data/parsed/ -> Postgres -> static downloads -> Next`.
- Design source: `FIGMA/`.
- PDF: только архив оригиналов в `data/source-data/pearls-pdf/`.

## Следующие Шаги

### 1. Next-only Production Cutover

- [x] Перевести Next catalog/detail/sitemap на прямое чтение Postgres без Express API.
- [x] Перевести TXT/DOCX/EPUB downloads в static artifact flow для Next.
- [x] Удалить Next rewrites на Express после переноса данных и downloads.
- [x] Подготовить production PM2/deploy flow: install, Prisma generate, seed, generate downloads, build Next, start Next.
- [x] После проверки удалить Express runtime server/scripts/dependency или оставить только offline tooling, если понадобится.

### 2. Production Deploy

- [x] Описать production env vars: `DATABASE_URL`, `SITE_URL`.
- [x] Добавить/проверить healthcheck для Next production.
- [x] Проверить production flow: catalog, reading page, downloads, robots, sitemap.
- [x] Подготовить `ecosystem.config.cjs` deploy-секцию под сервер `155.212.174.133` по `.cursor/plans/production-deploy.md`.
- [ ] Поднять новый проект на сервере через `ssh app` на порту `3021`.
- [ ] Через `ssh sw` настроить Nginx/SSL для временного домена `amasters.tech`.
- [ ] Проверить `amasters.tech` через `curl`/PM2 logs.
- [ ] После проверки переключить боевой домен через DNS/Nginx.
- [ ] Подтвердить rollback path через возврат DNS на старый сервер.

### 3. UI Polish По `FIGMA/`

- [ ] Сверить каталог с прототипом: таблицы, градиенты, spacing, responsive.
- [ ] Сверить страницу чтения: заголовок, metadata, document sections, print view.
- [ ] Убрать визуальные расхождения, которые мешают ощущению готового сайта.

### 4. Search And Content Navigation

- [ ] Добавить базовый Postgres full-text search.
- [ ] Добавить страницы авторов или фильтры по типам материалов, если это нужно для навигации.
- [ ] Вернуться к RAG/embeddings/Qdrant только после production deploy и базового поиска.

### 5. Bulk Downloads

- [ ] Решить, нужны ли bulk ZIP archives.
- [ ] Если нужны, генерировать ZIP отдельно от server startup.

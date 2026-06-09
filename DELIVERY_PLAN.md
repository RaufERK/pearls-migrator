# Pearls Migrator — Delivery Plan

Этот файл хранит только предстоящие задачи. Закрытые этапы Word-парсинга, Next-перехода, staging deploy и удаления Express runtime считаются завершёнными.

## Current State

- Public runtime: Next.js App Router in `web/`.
- Data flow: `Word -> prepared DOCX -> reviewed JSON -> Postgres -> static downloads -> Next`.
- Staging: `https://amasters.tech`.
- Design source: `FIGMA/` as read-only generated reference. Do not edit or clean it.

## Next Steps

### 1. Staging UI QA

- Проверить `https://amasters.tech` вручную: каталог, страницы чтения, downloads, печать, mobile/responsive.
- Сверить визуальные детали с `FIGMA/`: таблицы, градиенты, spacing, звёздный фон, карточку текста.
- Исправить только заметные расхождения, которые мешают ощущению готового сайта.

### 2. Main Domain Cutover

- Подменить DNS боевого домена на новый сервер.
- Добавить боевой домен в Nginx config или отдельный site.
- Выпустить SSL после DNS propagation.
- Проверить главную, страницу чтения, downloads, `robots.txt`, `sitemap.xml`, `/health`.
- Rollback: вернуть DNS на старый сервер или отключить новый Nginx site.

### 3. Search And Navigation

- Добавить базовый Postgres full-text search.
- Решить, нужны ли страницы авторов, фильтры по типам материалов или creation year.
- Вернуться к RAG/embeddings/Qdrant только после production cutover и базового поиска.

### 4. Bulk Downloads

- Решить, нужны ли ZIP archives.
- Если нужны, генерировать ZIP как отдельный artifact, не на server startup.

# Pearls Migrator — Delivery Plan

Этот файл хранит только предстоящие задачи. Закрытые этапы Word-парсинга, Next-перехода, Postgres full-text search, staging deploy, UI-переноса из `FIGMA/` и удаления Express runtime считаются завершёнными.

## Current State

- Public runtime: Next.js App Router in `web/`.
- Data flow: `Word -> prepared DOCX -> reviewed JSON -> Postgres -> static downloads -> Next`.
- Staging: `https://amasters.tech`.
- Design source: `FIGMA/` as read-only generated reference. Do not edit or clean it.
- Current feature set is enough for production cutover: catalog, search, filters, reading pages, print, downloads, SEO files, seed and deploy pipeline are ready.
- Design is ready for release. Mobile/responsive polish can continue after cutover.

## Next Steps

### 1. Final Staging QA

- Финально проверить `https://amasters.tech`: каталог, поиск, фильтры, страницы чтения, downloads, печать, SEO files.
- Исправлять только блокирующие или явно видимые расхождения перед переносом основного домена.

### 2. Main Domain Cutover

- Подменить DNS боевого домена на новый сервер.
- Добавить боевой домен в Nginx config или отдельный site.
- Выпустить SSL после DNS propagation.
- Проверить главную, страницу чтения, downloads, `robots.txt`, `sitemap.xml`, `/health`.
- Rollback: вернуть DNS на старый сервер или отключить новый Nginx site.

### 3. Post-Cutover Enhancements

- Доделать mobile/responsive polish без блокировки релиза.
- Решить, нужны ли отдельные страницы авторов, типов материалов и исторических годов создания.
- RAG/embeddings/Qdrant перенесены в дальний backlog; текущий поиск достаточен для релиза.

### 4. Bulk Downloads

- Решить, нужны ли ZIP archives.
- Если нужны, генерировать ZIP как отдельный artifact, не на server startup.

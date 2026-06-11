# Pearls Migrator — Delivery Plan

Этот файл хранит только предстоящие задачи. Закрытые этапы Word-парсинга, Next-перехода, Postgres full-text search, staging deploy, UI-переноса из `FIGMA/` и удаления Express runtime считаются завершёнными.

## Current State

- Public runtime: Next.js App Router in `web/`.
- Data flow: `Word -> prepared DOCX -> reviewed JSON -> Postgres -> static downloads -> Next`.
- Staging: `https://amasters.tech`.
- Design source: `FIGMA/` as read-only generated reference. Do not edit or clean it.

## Next Steps

### 1. Final Staging QA

- Финально проверить `https://amasters.tech`: каталог, поиск, фильтры, страницы чтения, downloads, печать, mobile/responsive.
- Исправлять только блокирующие или явно видимые расхождения перед переносом основного домена.

### 2. Main Domain Cutover

- Подменить DNS боевого домена на новый сервер.
- Добавить боевой домен в Nginx config или отдельный site.
- Выпустить SSL после DNS propagation.
- Проверить главную, страницу чтения, downloads, `robots.txt`, `sitemap.xml`, `/health`.
- Rollback: вернуть DNS на старый сервер или отключить новый Nginx site.

### 3. Post-Cutover Enhancements

- Решить, нужны ли отдельные страницы авторов, типов материалов и исторических годов создания.
- Вернуться к RAG/embeddings/Qdrant только после production cutover и стабилизации базового поиска.

### 4. Bulk Downloads

- Решить, нужны ли ZIP archives.
- Если нужны, генерировать ZIP как отдельный artifact, не на server startup.

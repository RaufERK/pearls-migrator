# Pearls Migrator — Delivery Plan

Этот файл хранит только предстоящие задачи. Закрытые этапы Word-парсинга, Next-перехода, Postgres full-text search, staging deploy, UI-переноса из `FIGMA/` и удаления Express runtime считаются завершёнными.

## Current State

- Public runtime: Next.js App Router in `web/`.
- Data flow: `Word -> prepared DOCX -> reviewed JSON -> Postgres -> static downloads -> Next`.
- Production: `https://amasters.ru`.
- Staging/technical domain: `https://amasters.tech`.
- Design source: `FIGMA/` as read-only generated reference. Do not edit or clean it.
- Current feature set is enough for production release: catalog, search, filters, reading pages, downloads, SEO files, seed and deploy pipeline are ready.
- Current `FIGMA/` design, including mobile layout, is the active visual target for `web/`.
- Next UI iteration removes print actions, promotes `Читать`, adds visible PDF downloads, and keeps TXT only as a secondary download format.

## Next Steps

### 1. Download UX Refresh

- Add first-class PDF downloads into `web/public/downloads/[year]/[slug].pdf`.
- Use source PDFs from `Рассылка` as the public site download priority because they are prepared for electronic distribution. Use `Печать/Брошюра № N.pdf` only as a fallback when the matching `Рассылка` PDF is missing.
- Remove print links and `?print=1` auto-print behavior from catalog and material pages.
- Catalog card actions: primary `Читать`, visible `PDF`, compact `Скачать` menu with `DOCX`, `EPUB`, `TXT`.
- Material page actions: list `PDF`, `DOCX`, `EPUB`, `TXT`, with PDF first.
- Fix mobile material reading layout by removing the inner dark text container and letting the text use the available viewport width with comfortable side padding.
- Update smoke checks from TXT-only download validation to include PDF availability.

### 2. Visits Analytics

Нужна простая статистика посещений после релиза. Варианты:

- **Минимально и быстро:** подключить privacy-friendly внешний счётчик вроде Plausible / Umami Cloud / GoatCounter. Плюсы: почти нет кода, есть dashboard. Минусы: внешний сервис.
- **Самостоятельно на сервере:** поставить Umami self-hosted рядом с проектом. Плюсы: свои данные. Минусы: отдельный сервис, БД, обновления.
- **Nginx/access-log аналитика:** считать посещения из Nginx logs через GoAccess. Плюсы: без JS на сайте. Минусы: менее удобные события, нужна настройка отчётов.
- **Свой минимальный счётчик:** Next route `/api/analytics` + таблица в Postgres. Плюсы: полный контроль. Минусы: надо аккуратно делать privacy, bots filtering и не раздувать БД.

Рекомендация для MVP: начать с Plausible/GoatCounter или GoAccess, не писать свой счётчик до появления конкретных требований.

### 3. Post-Release UI Polish

- Проверить мобильную вёрстку на реальных устройствах и исправлять только заметные проблемы.
- Решить, нужны ли отдельные страницы авторов, типов материалов и исторических годов создания.
- RAG/embeddings/Qdrant перенесены в дальний backlog; текущий поиск достаточен для релиза.

### 4. Bulk Downloads

- Решить, нужны ли ZIP archives.
- Если нужны, генерировать ZIP как отдельный artifact, не на server startup.

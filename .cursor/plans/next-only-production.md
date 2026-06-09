# Next-only Production Plan

## Решение

Production-сайт должен работать без Express runtime. Express/Node-часть остаётся как offline pipeline для локальной подготовки данных: Word files, DOCX preparation, parsing, reviewed JSON, Prisma seed, generated downloads.

Итоговая формула:

```text
Local/offline: Word -> DOCX -> reviewed JSON -> seed Postgres -> generate downloads
Production/runtime: Postgres + static downloads -> Next.js
```

Старый production-проект используется только как пример PM2/deploy-подхода. Новый проект должен заменить его, а не наследовать его структуру.

## Почему Так

- Файлы, LibreOffice, OpenXML, парсинг и ручная правка JSON остаются локальным процессом.
- На сервере не планируется live upload, live parsing или ручная правка Word/JSON через UI.
- После seed в Postgres у Next достаточно данных для каталога, страниц чтения, SEO metadata и sitemap.
- Downloads можно заранее сгенерировать как static artifacts.
- Поэтому production Express server не даёт пользы и только усложняет deploy.

## План Действий

### 1. Перевести Next На Прямое Чтение Postgres

- [x] Создать `web/lib/pearls.ts` для data access функций.
- [x] Вынести туда Prisma client для Next runtime.
- [x] Реализовать `getCatalog(siteYear)`.
- [x] Реализовать `getPearl(year, slug)`.
- [x] Реализовать `getSitemapPaths()`.
- [x] Заменить `fetch(API_ORIGIN + /api/catalog)` в `web/app/page.tsx`.
- [x] Заменить `fetch(API_ORIGIN + /api/pearls/...)` в `web/app/pearls/[year]/[slug]/page.tsx`.
- [x] Заменить API-зависимость в `web/app/sitemap.ts`, если она ещё есть.

### 2. Перевести Downloads В Static Artifact Flow

- [x] Решить final target для файлов: `web/public/downloads/{year}/{slug}.{ext}`.
- [x] Обновить `src/downloads.ts`, чтобы генерация писала в Next static public directory.
- [x] Проверить, что ссылки `/downloads/{year}/{slug}.txt|docx|epub` работают без Express.
- [x] Убрать on-demand download generation из runtime.

### 3. Убрать Express Из Next Runtime Path

- [x] Удалить `rewrites()` из `web/next.config.ts`.
- [x] Убрать `API_ORIGIN` из Next runtime.
- [x] Проверить, что `npm run dev:web` работает без `npm run dev:api`.
- [x] Проверить, что `npm run build:web` работает без Express server.

### 4. Подготовить Production Deploy

- [x] Создать или обновить `ecosystem.config.cjs` для запуска только Next.
- [x] Описать production env vars: `DATABASE_URL`, `SITE_URL`.
- [ ] Подготовить deploy sequence:

```bash
npm ci --include=dev
npm --prefix web ci --include=dev
npm run db:generate
npm run db:seed
npm run generate:downloads
npm run build:web
npx pm2 startOrReload ecosystem.config.cjs --env production
npx pm2 save
```

- [x] Проверить, нужен ли отдельный `npm run start:web` wrapper или PM2 должен запускать `next start` из `web/`.

### 5. Удалить Express Runtime После Проверки

- [x] Удалить или архивировать `src/server.ts`.
- [x] Удалить root dependency `express` и `@types/express`, если больше нет HTTP-server кода.
- [x] Убрать scripts `dev:api`, `start`, старый `smoke`, если они завязаны на Express.
- [x] Оставить root scripts для offline pipeline: `prepare:docx`, `parse:word`, `db:seed`, `generate:downloads`, `metadata:ai`.
- [x] Обновить backend smoke/verification под Next-only production.

### 6. Обновить Документацию

- [x] Обновить `ARCHITECTURE.md`.
- [x] Обновить `CLAUDE.md`.
- [x] Обновить `README.md`.
- [x] Обновить `DELIVERY_PLAN.md`.

## Первый Практический Шаг

Начать с пункта 1: перевести Next catalog/detail/sitemap на прямое чтение Postgres. Это самый важный шаг, потому что он убирает главную причину держать Express в production.

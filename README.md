# Pearls Migrator

Минималистичный TypeScript/Next.js-проект: Word-брошюры из `SOURCE_PERALS/` → reviewed JSON → Postgres → статические скачивания → SEO-сайт.

| Документ | Зачем |
|---|---|
| [`WORK-FLOW.md`](./WORK-FLOW.md) | Канонический порядок работы с контентом (год за годом) |
| [`DOCUMENTS_GUIDE.md`](./DOCUMENTS_GUIDE.md) | Смысловая модель документа: даты, автор, header/body/footer, `documents[]` |

## Architecture

```text
../SOURCE_PERALS/  →  data/word-docx/  →  data/parsed/  →  Postgres
                                          ↓
                                   web/public/downloads/  →  Next.js
```

- **Source:** sibling `../SOURCE_PERALS/` or `PEARLS_SOURCE_ROOT` (`year/Qn/word`, `pdf-mailing`, `pdf-print`, `originals`).
- **Prepared DOCX cache:** ignored `data/word-docx/`.
- **Source of truth:** reviewed `data/parsed/` (не править руками).
- **Overrides:** `data/word-processing-map.json`.
- **Runtime:** Next.js App Router in `web/` reads Postgres only; downloads are static under `web/public/downloads/`.
- **Shared labels:** `src/catalogLabels.ts` (pure; used by both CLI catalog and `web/`).
- **Design:** `FIGMA/` is a read-only snapshot — visual reference only, do not edit.
- **PDF:** prefer `pdf-mailing`; `pdf-print` is fallback.

Прод — только Next. LibreOffice, OpenAI и **`SOURCE_PERALS` на сервер не кладём.**

Routes: `/`, `/pearls/[year]/[slug]`, `/downloads/...`, `/robots.txt`, `/sitemap.xml`, `/health`.

Prisma models: `Pearl` (выпуск-контейнер), `PearlDocument` (внутренний материал). JSON каноничен; БД пересобирается через `db:seed`.

## Local content flow

```bash
# VPN on — one command for the whole year (prepare + parse + AI + downloads + seed)
npm run year -- 2017
# commit data/parsed
npm run deploy
```

Parse only (без AI), если нужно сначала глянуть структуру:

```bash
npm run year -- 2017 --parse-only
npm run metadata -- --year=2017
```

Полные правила и VPN-gate: [`WORK-FLOW.md`](./WORK-FLOW.md).

Кратко:

- Всегда `--year` или `--file`. Не гонять весь архив по умолчанию.
- Названия утверждает AI (`metadata`); `parse:word` только структура.
- Готовые названия пропускаются, пока нет `--force`.
- `generate:downloads` читает `data/parsed/` (не Postgres) и локальный `SOURCE_PERALS`.

## Commands

```bash
npm run dev                 # http://localhost:3000
npm run year -- 2017        # full year: prepare + parse + metadata
npm run year -- 2017 --parse-only
npm run metadata -- --year=2017
npm run metadata:ai -- --year=2017 --write   # AI-only
npm run generate:downloads -- --year=2017
npm run source:audit
npm run db:seed
npm run lint && npm test && npm run build && npm run build:web
npm run smoke
npm run deploy              # sync:downloads + pm2
npm run deploy:code         # pm2 only
```

CI (`.github/workflows/ci.yml`): lint, build, tests, `build:web`.

## Environment

```bash
DATABASE_URL=...
SITE_URL=...
```

Optional: `OPENAI_API_KEY`, `PEARLS_SOURCE_ROOT`. See `.env.example`. Node `24.18.x`, Postgres.

## Deploy

- Production: `https://amasters.ru`
- Staging/tech: `https://amasters.tech`
- Server: `155.212.174.133`, path `/home/appuser/apps/pearls-migrator`, PM2 `pearls-migrator`, port `3021`
- Shared env: `shared/.env` on the server

```bash
npm run deploy
```

Post-deploy (`ecosystem.config.cjs`):

```bash
npm ci --include=dev
npm --prefix web ci --include=dev
npm run db:generate && npm run db:deploy && npm run db:seed
npm run build:web
pm2 startOrReload ecosystem.config.cjs --env production && pm2 save
```

`sync:downloads` должен идти до reload: `next start` резолвит `public/` один раз на процесс.

Verify:

```bash
curl -I https://amasters.ru/health
curl -I https://amasters.ru/
curl -I https://amasters.ru/sitemap.xml
```

## Download UX

Каталог: `Читать`, видимый `PDF`, компактное меню `DOCX`/`EPUB`/`TXT`. Без print в MVP.

## Backlog

Pipeline:

1. Следующий год end-to-end с VPN (`WORK-FLOW.md`).
2. Year-batch AI для названий (один запрос на год + few-shot из уже утверждённых лет).
3. Более богатый page preview для AI (bold/size, ~⅓ первой страницы).

Product (после релиза):

- Простая аналитика визитов (Plausible / GoatCounter / GoAccess).
- Mobile polish на реальных устройствах.
- Опционально: страницы авторов/типов/годов создания, ZIP downloads.
- RAG/embeddings — дальний backlog; текущего Postgres search достаточно.

# Pearls Migrator — план улучшений

Зафиксировано по итогам аудита архитектуры и пайплайна (8 июля 2026). Статус MVP: рантайм-архитектура (Next читает только Postgres, тяжёлая работа офлайн в `src/cli`, JSON — источник правды) зрелая. Слабое место — офлайн-конвейер: парсер без тестов, незафиксированные версии фронтенд-зависимостей, дублирование каталожной логики.

Отмечать пункты как выполненные по мере продвижения. Не редактировать `data/parsed/` руками — этот файл про инфраструктуру и код, а не про генерируемые данные.

## Сильные стороны (не трогать, только поддерживать)

- Чёткое разделение источника правды (JSON) и rebuildable-индекса (Postgres).
- Безопасный AI-контур обогащения метаданных: dry-run по умолчанию, `confidence`, `raw` всегда сохраняется, невалидный ответ модели не затирает данные.
- Осознанный MVP-скоуп, зафиксированный в `CLAUDE.md`/`ARCHITECTURE.md`.
- Ручной override-механизм `data/word-processing-map.json` поверх эвристик парсера.
- Параметризованный полнотекстовый поиск (Prisma tagged templates) — SQL-инъекции закрыты.
- Есть smoke-проверки (`src/cli/smoke.ts`) перед релизом.

## План улучшений по приоритету

1. **[x] Зафиксировать версии зависимостей в `web/package.json`.**
   Убрали `"latest"` у `next`, `react`, `react-dom`, `tailwindcss`, `typescript`, `@types/*`, поставили версии, фактически установленные в `node_modules` (`next@16.2.7`, `react@19.2.7`, `tailwindcss@4.3.0`, `typescript@6.0.3`), обновили `web/package-lock.json`.

2. **[x] Покрыть парсер юнит-тестами.**
   Экспортировали чистые функции извлечения даты/автора/типа/заголовка/публикации из `src/word/extractWordPearl.ts` (без изменения поведения — просто добавили `export`) и написали `src/word/extractWordPearl.test.ts` + `src/metadataNormalization.test.ts` на встроенном `node:test` (запуск через `npm test`, `tsx --test`), без новых тяжёлых зависимостей. Фикстуры — реальные фрагменты из уже вычитанных `data/parsed/2020/2020Q1-1.json` и `2020Q1-3.json`, а не выдуманные строки.
   Тесты сразу нашли реальный баг: `\b` (word boundary) в JS-регулярках не матчится с кириллицей (ASCII-only определение `\w`), поэтому проверки вида `/^ПРИЗЫВ\b/`, `/^Сегодня\b/` и вырезание имени автора из заголовка (`\bМарк\s+Л\.?\s+Профет\b`) в `src/word/extractWordPearl.ts`, `src/metadataNormalization.ts` и `src/cli/enrichMetadataWithAi.ts` никогда не срабатывали. Заменили на юникод-совместимые `(?<![\p{L}\p{N}])`/`(?![\p{L}\p{N}])`. Проверили `npm run parse:word -- --year=2020` до и после фикса — диф только в `parsedAt`, содержимое всех 12 файлов не изменилось, так что фикс безопасен для уже провалидированных данных.

3. **[x] Устранить дублирование каталожной логики.**
   `documentTypeLabels` был продублирован в 3 местах (`src/catalog.ts`, `web/lib/pearls.ts`, `web/app/pearls/[year]/[slug]/page.tsx`), ещё ~6 функций/констант — в 2 местах. Вынесли общие справочники (`DOCUMENT_TYPE_LABELS`, `MONTH_NAMES`) и чистые функции (`getDocumentTypeLabel`, `normalizeAuthorDisplayName`, `toSitePublicationLabel`, `toBody`, `toStringArray`, `extractPartTitle`) в `src/catalogLabels.ts` — модуль без побочных эффектов, импортируется и из офлайн CLI (`NodeNext`), и из Next-рантайма (`bundler`-резолюция) через относительный путь. Подтверждено рабочим `tsc`, ESLint, `next build` (Turbopack) и `next dev --webpack`.

4. **[x] Добавить CI (GitHub Actions).**
   `.github/workflows/ci.yml`: на каждый push/PR ставит зависимости в корне и в `web/`, гоняет `npm run lint`, `npm run build` (tsc offline pipeline), `npm test` (25 тестов парсера), `npm run build:web` с фиктивным `DATABASE_URL`.

5. **[x] Добавить ESLint + typescript-eslint.**
   Единый flat-конфиг `eslint.config.js` в корне покрывает и `src/**/*.ts` (Node-глобалы, `projectService` на корневой `tsconfig.json`), и `web/**/*.{ts,tsx}` (Node+browser-глобалы, `projectService` на `web/tsconfig.json`), плюс `@typescript-eslint/switch-exhaustiveness-check` под workspace-правило про exhaustive switch. По ходу подключения линтер нашёл и мы почистили реальный мёртвый код (неиспользуемые импорты/переменные, лишний `ChevronDownIcon`).

6. **[x] Дополнить `.env.example`.**
   Добавили `SITE_URL`, `OPENAI_API_KEY`, `PEARLS_SOURCE_ROOT` с комментариями о том, где и для чего они используются.

## Не приоритетные, но зафиксированные наблюдения

- Один прод-инстанс без zero-downtime деплоя (`ecosystem.config.cjs`, `instances: 1`, fork mode) — приемлемо для текущего трафика.
- `src/cli/smoke.ts` использует захардкоженный slug `2026Q2-3` — может сломаться, если запись удалят из `data/parsed`.

# Pearls Migrator — план улучшений

Живой backlog после аудита архитектуры и пайплайна. Отмечать пункты по мере выполнения.

Не редактировать `data/parsed/` руками — этот файл про инфраструктуру и код, не про генерируемые данные. Канонический рабочий порядок: `WORK-FLOW.md`.

## Сильные стороны (не трогать, только поддерживать)

- Чёткое разделение источника правды (JSON) и rebuildable-индекса (Postgres).
- Безопасный AI-контур: dry-run по умолчанию, `confidence`/`raw`, невалидный ответ модели не затирает данные; готовые названия пропускаются без вызова модели.
- Осознанный MVP-скоуп в `CLAUDE.md` / `ARCHITECTURE.md` / `WORK-FLOW.md`.
- Ручной override `data/word-processing-map.json` поверх эвристик парсера.
- Параметризованный полнотекстовый поиск (Prisma tagged templates).
- Smoke-проверки (`src/cli/smoke.ts`) перед релизом.
- Локальный контент отделён от прод-рантайма: на сервере нет `SOURCE_PERALS`, LibreOffice и OpenAI.

## Сделано

1. **[x] Зафиксировать версии зависимостей в `web/package.json`.**
2. **[x] Покрыть парсер и нормализацию юнит-тестами** (`npm test`, `node:test` + `tsx`).
3. **[x] Устранить дублирование каталожной логики** → `src/catalogLabels.ts`.
4. **[x] CI (GitHub Actions):** lint, `tsc`, unit tests, `next build`.
5. **[x] ESLint + typescript-eslint** (flat config на `src/` и `web/`).
6. **[x] Дополнить `.env.example`** (`SITE_URL`, `OPENAI_API_KEY`, `PEARLS_SOURCE_ROOT`).
7. **[x] Разделить локальный контент и прод-деплой.**
   `deploy` / `deploy:code` / `deploy:content`, `content:year`, `--year` у prepare/parse/AI/downloads, skip готовых названий в `metadata:ai`.
8. **[x] Закрепить year-scoped флоу для Cursor.**
   `WORK-FLOW.md` + always-on rule `.cursor/rules/pearls-content-pipeline.mdc`.
9. **[x] Year-scoped downloads + деплой без скрытой полной пересборки.**
   `generate:downloads -- --year=...`; `deploy:content` = sync + pm2 (не гоняет regenerate all).
10. **[x] `generate:downloads` из `data/parsed/` без Postgres.**
    `src/downloadCatalog.ts` читает reviewed JSON напрямую.
11. **[x] Remap legacy `data/source-data/...` путей.**
    `npm run remap:source-paths -- --write` переписывает только `sourceWord`/`sourcePdf` через `source-map.json`, без перепарсинга текста.
12. **[x] Инвариант: `SOURCE_PERALS` не на сервере.**
    Зафиксировано в `WORK-FLOW.md` / README / ARCHITECTURE / cursor rule.
13. **[x] VPN-gate для AI названий.**
    `403 Country, region...` → немедленный abort `ВКЛЮЧИ ВПН!!! МОДЕЛЬ НЕДОСТУПНА!`; названия считает AI, не локальные эвристики.

## План дальше

1. **[ ] Следующий год end-to-end с VPN** — полный `WORK-FLOW.md` (parse → `metadata:ai` с включённым VPN → downloads).
2. **[ ] Year-batch AI для названий (рекомендуемый следующий рефактор AI)**  
   Не изолированный вызов «один документ = один запрос» без общей картины, и не свалка всего архива.  
   Один запрос на целевой год:
   - все брошюры года (header + ~1/3 первой страницы, желательно с bold/size);
   - `source-map` originalName для этих файлов;
   - `lecture-data-export.json` только по slug'ам этого года;
   - few-shot / стиль только из **уже утверждённых** годов (не из ещё не обработанных).  
   Ответ модели — список названий по slug/index. Так видна серийная логика («Живой огонь любви», части 1/2), без шума будущих лет.
3. **[ ] Богатый preview страницы для AI** — отдавать не 3 голые строки body, а треть/половину первой страницы с признаками bold/size.
4. **[ ] (По желанию) пересобрать `data/word-docx/` в каноническую раскладку `year/Qn/word`**.

### Уже зафиксированные правила (не задачи, а инварианты)

- Для **нового года** `metadata:ai -- --year=... --write` — обязательный шаг; названия утверждает модель.
- VPN обязателен. `403 Country, region...` → abort `ВКЛЮЧИ ВПН!!! МОДЕЛЬ НЕДОСТУПНА!`, без локального «угадывания» названий.
- `parse:word` не ходит в OpenAI и не считается источником правды для финальных названий.
- На прод не кладём `SOURCE_PERALS`.
- Не подмешивать в AI-контекст ещё не обработанные годы.

## Не приоритетные наблюдения

- Один прод-инстанс без zero-downtime (`ecosystem.config.cjs`, `instances: 1`) — ок для текущего трафика.
- `src/cli/smoke.ts` завязан на slug `2026Q2-3` — хрупко, если запись исчезнет из `data/parsed`.
- Продуктовый бэклог (аналитика визитов, mobile polish, страницы авторов/типов, ZIP) — см. `ARCHITECTURE.md` → Deferred Work.

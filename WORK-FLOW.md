# Рабочий флоу Pearls Migrator

Канонический порядок работы с контентом. Исходники Word/PDF живут только локально в соседнем репо `../SOURCE_PERALS`. На прод этот архив не кладём.

Обзор архитектуры и команд: [`README.md`](./README.md). Модель документа: [`DOCUMENTS_GUIDE.md`](./DOCUMENTS_GUIDE.md).

## Границы

| Где | Что |
|---|---|
| Локально | `prepare:docx`, `parse:word`, `metadata` (AI + downloads + verify + seed) |
| Git | код + reviewed `data/parsed/` |
| Rsync | готовые `web/public/downloads/` |
| Прод (pm2) | `db:seed` из `data/parsed/`, `build:web`, Next.js |

Прод читает Postgres и раздаёт уже собранные downloads. LibreOffice, OpenAI и `SOURCE_PERALS` на сервере не нужны.

## Доступ к модели (обязательно)

Мы в России. Прямой OpenAI без VPN обычно недоступен из‑за санкций.

**Предпочтительно:** Amsterdam proxy (VPN не нужен). В локальном `.env`:

```bash
OPENAI_BASE_URL=https://spoken-word.info/openai-proxy/v1
OPENAI_API_KEY=<PROXY_AUTH_TOKEN>
```

`OPENAI_API_KEY` здесь — токен прокси, не настоящий ключ OpenAI. Сервис: `amster/openai-proxy`.

**Запасной вариант:** прямой `api.openai.com` + VPN.

Если в консоли:

```text
403 Country, region, or territory not supported
```

или CLI пишет про недоступность модели — нет доступа к OpenAI (прокси/токен/VPN). Команда сразу останавливается.

В этом случае:

- не продолжаем «угадывать» названия эвристиками;
- не считаем parse без AI финальным результатом названий;
- чиним `OPENAI_BASE_URL` / токен (или VPN) и перезапускаем `metadata -- --year=...`.

## Роли parse vs AI

| Шаг | Что делает | Что НЕ делает |
|---|---|---|
| `parse:word` | режет брошюру на `documents[]`, header/body/footer, даты сайта, черновые поля | **не является источником правды для названий** |
| `metadata` | **утверждает** названия через AI, собирает downloads, проверяет файлы скачивания и засеивает локальную БД | не должна тихо деградировать в локальные догадки при 403 |

Исторически названия пытались вытаскивать сложными регэкспами и жирностью/кеглем. Это остаётся вспомогательным сигналом в кандидате для модели (header + bold/size в будущем preview), но **финальное название даёт только AI**.

Контекст, который модель уже получает / должен получать:

- header / footer / короткий body preview текущей брошюры;
- `SOURCE_PERALS/source-map.json` (`originalName`, old/new path);
- `data/lecture-data-export.json` (названия со старого сайта по slug);
- уже утверждённые названия из reviewed годов (для стиля) — только обработанные годы, не «будущие» ещё не разобранные.

## Новый / перепарсенный год (Cursor)

Всегда один год. Никогда «весь архив».

```bash
# 0. VPN ВКЛЮЧЁН

# 1. Весь год одной командой: prepare + parse + AI + downloads + verify + local seed
npm run year -- 2017

# 2. Закоммитить data/parsed (+ код при необходимости), затем выкатить
npm run deploy
```

Parse без AI (редко, только чтобы глянуть сплиты):

```bash
npm run year -- 2017 --parse-only
npm run metadata -- --year=2017
```

Уже распарсенный год (переутвердить названия):

```bash
npm run metadata -- --year=2019          # или --force
# смотреть на localhost (npm run dev)
npm run deploy
```

Низкоуровневый AI-only (без downloads/verify/seed): `npm run metadata:ai -- --year=2019 --write`.

Downloads без AI: `npm run generate:downloads -- --year=2017`, затем полная проверка каталога `npm run verify:downloads`.

## Деплой

```bash
npm run deploy          # sync:downloads + pm2
npm run deploy:code     # только код
```

## Чего не делать

- Не запускать `metadata` / `metadata:ai` без VPN.
- Не «чинить» названия руками и не полагаться на эвристики, если модель недоступна.
- Не запускать `parse:word` / `metadata` / `prepare:docx` без `--year` или `--file`.
- Не править `data/parsed/` руками.
- Не класть `SOURCE_PERALS` на прод.

# Рабочий флоу Pearls Migrator

Канонический порядок работы с контентом. Исходники Word/PDF живут только локально в соседнем репо `../SOURCE_PERALS`. На прод этот архив не кладём.

Обзор архитектуры и команд: [`README.md`](./README.md). Модель документа: [`DOCUMENTS_GUIDE.md`](./DOCUMENTS_GUIDE.md).

## Границы

| Где | Что |
|---|---|
| Локально | `prepare:docx`, `parse:word`, `metadata` (AI + downloads + seed) |
| Git | код + reviewed `data/parsed/` |
| Rsync | готовые `web/public/downloads/` |
| Прод (pm2) | `db:seed` из `data/parsed/`, `build:web`, Next.js |

Прод читает Postgres и раздаёт уже собранные downloads. LibreOffice, OpenAI и `SOURCE_PERALS` на сервере не нужны.

## VPN / доступ к модели (обязательно)

Мы в России. OpenAI без VPN обычно недоступен из‑за санкций.

**Перед `metadata` всегда включай VPN.**

Если в консоли:

```text
403 Country, region, or territory not supported
```

или CLI пишет:

```text
ВКЛЮЧИ ВПН!!! МОДЕЛЬ НЕДОСТУПНА!
```

это **100% выключенный VPN / нет доступа к модели**. Команда сразу останавливается.

В этом случае:

- не продолжаем «угадывать» названия эвристиками;
- не считаем parse без AI финальным результатом названий;
- включаем VPN и перезапускаем `metadata -- --year=...`.

## Роли parse vs AI

| Шаг | Что делает | Что НЕ делает |
|---|---|---|
| `parse:word` | режет брошюру на `documents[]`, header/body/footer, даты сайта, черновые поля | **не является источником правды для названий** |
| `metadata` | **утверждает** названия через AI, собирает downloads и засеивает локальную БД | не должна тихо деградировать в локальные догадки при 403 |

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

# 1. Подготовить DOCX и спарсить JSON только для этого года
npm run content:year -- 2019

# 2. Глазами пройти структуру data/parsed/2019/ (сплиты, count)

# 3. AI-названия + downloads + локальный seed (обязательно; без VPN бессмысленно)
npm run metadata -- --year=2019

# 4. Закоммитить data/parsed (+ код при необходимости), затем выкатить
npm run deploy
```

Уже распарсенный год (переутвердить названия):

```bash
npm run metadata -- --year=2019          # или --force
# смотреть на localhost (npm run dev)
npm run deploy
```

Низкоуровневый AI-only (без downloads/seed): `npm run metadata:ai -- --year=2019 --write`.

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

# Рабочий флоу Pearls Migrator

Канонический порядок работы с контентом. Исходники Word/PDF живут только локально в соседнем репо `../SOURCE_PERALS`. На прод этот архив не кладём.

## Границы

| Где | Что |
|---|---|
| Локально | `prepare:docx`, `parse:word`, `metadata:ai`, `generate:downloads`, `remap:source-paths` |
| Git | код + reviewed `data/parsed/` |
| Rsync | готовые `web/public/downloads/` |
| Прод (pm2) | `db:seed` из `data/parsed/`, `build:web`, Next.js |

Прод читает Postgres и раздаёт уже собранные downloads. LibreOffice, OpenAI и `SOURCE_PERALS` на сервере не нужны.

## Новый / перепарсенный год (Cursor)

Всегда один год. Никогда «весь архив».

```bash
# 1. Подготовить DOCX и спарсить JSON только для этого года
npm run content:year -- 2019

# 2. Глазами пройти data/parsed/2019/

# 3. AI-обогащение метаданных для этого года (для новых данных — всегда)
npm run metadata:ai -- --year=2019 --write

# 4. Собрать PDF/TXT/DOCX/EPUB только для этого года (читает data/parsed, Postgres не нужен)
npm run generate:downloads -- --year=2019

# 5. Закоммитить data/parsed (+ код при необходимости), затем выкатить уже готовые downloads
npm run sync:downloads
npm run deploy:code
```

Эквивалент шага 1 по частям:

```bash
npm run prepare:docx -- --year=2019
npm run parse:word -- --year=2019
```

Короткий выкат, если downloads уже собраны локально:

```bash
npm run deploy          # sync:downloads + pm2
npm run deploy:content  # то же самое (не пересобирает downloads сам)
```

## Что делает AI

`parse:word` **не** вызывает OpenAI. Он пишет JSON эвристиками и `data/word-processing-map.json`.

`metadata:ai` — отдельный шаг после parse. Для **нового года его запускаем всегда** с `--year` и `--write`.

Внутри шага модель вызывается не на каждый документ подряд:

- если у внутреннего материала уже есть нормальное название (парсер / map / header) — документ **пропускается**, токены не тратятся;
- если названия нет или оно мусорное — идёт запрос к модели;
- `--force` — переспросить модель даже при готовом названии; в обычном флоу не использовать.

## Legacy-пути в JSON

Часть старых `data/parsed` ещё хранит `sourceWord`/`sourcePdf` как `data/source-data/...`. Это чинится без перепарсинга контента:

```bash
npm run remap:source-paths                 # dry-run
npm run remap:source-paths -- --write      # все годы
npm run remap:source-paths -- --year=2021 --write
```

`preparedDocx` не трогаем: локальный кэш `data/word-docx/` у старых лет может ещё лежать в legacy-раскладке.

## Деплой

```bash
# Обычный выкат: уже готовые downloads + код/seed/build
npm run deploy

# Только код/схема, без rsync downloads
npm run deploy:code

# Алиас к обычному контентному выкату (sync + pm2).
# Downloads собери заранее: generate:downloads -- --year=...
npm run deploy:content
```

## Чего не делать

- Не запускать `parse:word` / `metadata:ai` / `prepare:docx` без `--year` или `--file`.
- Не править `data/parsed/` руками (кроме осознанного `remap:source-paths`).
- Не класть `SOURCE_PERALS` на прод «чтобы деплой сам генерил PDF».
- Не ждать, что `npm run deploy` на сервере что-то распарсит — он только сидит JSON и собирает Next.

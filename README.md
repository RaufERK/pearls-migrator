# Pearls Migrator

Минималистичный TypeScript/Next.js-проект для превращения Word-брошюр из `data/source-data/pearls-word/` в подготовленные DOCX, reviewed JSON, Postgres-каталог и SEO-страницы.

Текущее решение: PDF больше не основной источник парсинга. PDF лежат в `data/source-data/pearls-pdf/` как архив оригиналов. Рабочий pipeline читает Word-брошюры, готовит DOCX, генерирует reviewed JSON, сидит Postgres и собирает скачивания.

Первый рабочий диапазон уже пройден и затем расширен на все текущие найденные годы:

```text
data/source-data/pearls-word/2022/1-й квартал/Брошюры
data/source-data/pearls-word/2022/2-й квартал/БРОШЮРЫ
data/source-data/pearls-word/2022/3-й квартал/БРОШЮРЫ
data/source-data/pearls-word/2022/4-й квартал/Брошюры
```

## Что делает проект

- обходит все `data/source-data/pearls-word/<год>/<квартал>/Брошюры` и `БРОШЮРЫ`;
- конвертирует `.doc` в `.docx` через LibreOffice headless;
- складывает подготовленные `.docx` в `data/word-docx/`;
- читает подготовленные `.docx` через OpenXML extractor, включая тело, колонтитулы и признаки форматирования;
- сохраняет один JSON на одну месячную Word-брошюру;
- хранит внутренние материалы брошюры в `documents[]`;
- применяет редакторские override из `data/word-processing-map.json`;
- сохраняет reviewed JSON в `data/parsed/`;
- сидит reviewed JSON в Postgres для каталога;
- генерирует TXT/DOCX/EPUB скачивания в `public/downloads/`;
- отдаёт публичный каталог, страницы чтения, `robots.txt` и `sitemap.xml` как SEO HTML/XML через Next.js App Router в `web/`;
- держит Express как backend/API/download/source-file слой;
- держит PDF только как архив в `data/source-data/pearls-pdf/`.

`FIGMA/` — текущий канонический дизайн-прототип для визуального слоя. Он содержит React/Vite/Tailwind-style mock, поэтому его данные нельзя переносить в runtime, но его layout, цвета, таблицы, карточки, фон и spacing считаются основным источником дизайна. Бывший `PearlsV27/` теперь считается legacy-прототипом и не должен использоваться как актуальный источник UI.

Текущий публичный UI использует Next.js App Router в `web/`: каталог `/` и страницы чтения `/pearls/[year]/[slug]` рендерятся сервером и ближе совпадают с `FIGMA/`. Express остаётся backend-слоем для `/api/*`, `/downloads/*`, `/source-files/*` и filesystem-heavy задач.

## Команды

```bash
npm run dev
```

Запускает одновременно Next.js frontend на `http://localhost:3000` и Express backend/API на `http://localhost:3001`.

Только Express backend/API:

```bash
npm run dev:api
```

Только новый Next.js frontend:

```bash
npm run dev:web
```

Открыть новый Next.js каталог:

`http://localhost:3000/`

Открыть Next-страницу чтения:

`http://localhost:3000/pearls/2026/2026Q2-3`

Для текущего Word-flow пример будет вида:

`http://localhost:3000/pearls/2026/2026Q2-3`

JSON API:

`http://localhost:3001/api/pearls/2006/1994-12-25-morya`

Подготовить DOCX из Word-архива:

```bash
npm run prepare:docx
```

Сохранить результат Word-парсинга:

```bash
npm run parse:word
```

Сидировать Postgres:

```bash
npm run db:seed
```

Сгенерировать скачивания:

```bash
npm run generate:downloads
```

Проверка backend TypeScript:

```bash
npm run build
```

Проверка Next frontend:

```bash
npm run build:web
```

## Текущая схема парсинга

Новая схема:

1. Найти Word-брошюры во всех `data/source-data/pearls-word/<год>/<квартал>/Брошюры` или `БРОШЮРЫ`.
2. Игнорировать `Оригиналы`, временные файлы `~$...` и английские исходники.
3. Если файл `.doc`, сконвертировать его через LibreOffice в `.docx`.
4. Если файл уже `.docx`, скопировать его как подготовленный файл.
5. Сохранить подготовленные файлы в `data/word-docx/{year}/{quarter}/Брошюры/`.
6. Прочитать подготовленные `.docx` через OpenXML extractor.
7. Использовать форматирование DOCX как сигнал для названий: bold, italic, font size, style id.
8. Применить `data/word-processing-map.json` для проверенных названий и split override.
9. Разделить текст на `header`, `body`, `footer` и внутренние `documents[]`.
10. Сохранить reviewed JSON в `data/parsed/{year}/`.
11. Занести reviewed JSON в Postgres через seed.
12. Сгенерировать TXT/DOCX/EPUB скачивания.

## Что сделано сейчас

- PDF-архив хранится в `data/source-data/pearls-pdf/`;
- подготовка DOCX реализована в `data/word-docx/`;
- Word-first CLI реализован и прогнан по текущему архиву;
- все текущие 54 Word-брошюры распарсены;
- найдено 77 внутренних материалов;
- проверенные названия и разбиения сохранены в `data/word-processing-map.json`;
- Postgres и downloads пересобраны;
- Next-каталог и Next-страницы чтения перенесены в `web/`;
- `/api/*`, `/downloads/*`, `/source-files/*` оставлены на Express и проксируются через Next;
- старый Express HTML renderer удалён;
- `npm run build` и `npm run build:web` проходят.

## Что развивать дальше

- развивать визуальное совпадение Next UI с `FIGMA/`;
- добавить production deploy и healthcheck;
- развить поиск: Postgres full-text search, затем RAG/embeddings при необходимости;
- держать PDF только как архив оригиналов, без PDF-парсера в активном коде.

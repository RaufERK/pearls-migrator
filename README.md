# Pearls Migrator

Минималистичный TypeScript-проект для превращения Word-брошюр из `data/source-data/pearls-word/` в подготовленные DOCX, reviewed JSON, каталог и веб-страницы.

Текущее решение: PDF больше не основной источник парсинга. PDF лежат в `data/source-data/pearls-pdf/` как архив оригиналов. Новый pipeline должен читать Word-брошюры.

Первый рабочий диапазон:

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
- читает подготовленные `.docx` через `mammoth`;
- сохраняет один JSON на одну месячную Word-брошюру;
- хранит внутренние материалы брошюры в `documents[]`;
- сохраняет reviewed JSON в `data/parsed/`;
- сидит reviewed JSON в Postgres для каталога;
- отдаёт результат как HTML-страницу через Express и Handlebars;
- держит PDF только как архив в `data/source-data/pearls-pdf/`.

`FIGMA26/` — дизайн-прототип для будущего визуального слоя. Он не является целевой runtime-архитектурой: данные в нём mock, а React/Vite-код не нужно напрямую переносить в приложение. Сначала стабилизируем полный Word parsing/backend flow, затем отдельным этапом переносим визуальный язык прототипа на серверный UI. Текущий Handlebars остаётся рабочим MVP-вариантом; предпочтительный следующий шаг после стабилизации данных — server-rendered React TSX внутри Express. Next.js рассматривается позже, если проекту понадобятся более сложные app-возможности.

## Команды

```bash
npm run dev
```

Открыть страницу:

`http://localhost:3000/pearls/2006/1994-12-25-morya`

JSON API:

`http://localhost:3000/api/pearls/2006/1994-12-25-morya`

Сохранить результат парсинга:

```bash
npm run parse
```

На текущем этапе `npm run parse` ещё содержит старый PDF-first код. Следующая реализация должна добавить отдельную подготовку DOCX из `data/source-data/pearls-word/`, затем генерацию JSON из `data/word-docx/`.

Проверка TypeScript:

```bash
npm run build
```

## Текущая схема парсинга

Новая схема:

1. Найти Word-брошюры во всех `data/source-data/pearls-word/<год>/<квартал>/Брошюры` или `БРОШЮРЫ`.
2. Игнорировать `Оригиналы`, временные файлы `~$...` и английские исходники.
3. Если файл `.doc`, сконвертировать его через LibreOffice в `.docx`.
4. Если файл уже `.docx`, скопировать его как подготовленный файл.
5. Сохранить подготовленные файлы в `data/word-docx/{year}/{quarter}/Брошюры/`.
6. Прочитать подготовленные `.docx` через `mammoth`.
7. Разделить текст на `header`, `body`, `footer` и внутренние `documents[]`.
8. Сохранить reviewed JSON в `data/parsed/{year}/`.
9. Занести reviewed JSON в Postgres через seed.

## Что развивать дальше

- хранить PDF-архив в `data/source-data/pearls-pdf/`;
- реализовать подготовку DOCX в `data/word-docx/`;
- реализовать Word-first CLI для 2022 года;
- проверить JSON за 1-й квартал 2022 вручную;
- после правок правил сгенерировать JSON за все четыре квартала 2022;
- после проверки 2022 года прогнать все найденные годы и кварталы;
- заменить PDF-зависимые поля на `sourceWord` или нейтральный `sourcePath`;
- обновить seed и каталог под Word-источник;
- затем продолжать обработку следующих лет квартал за кварталом.

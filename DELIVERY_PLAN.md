# Pearls Migrator — Delivery Plan

Этот файл фиксирует порядок ближайших спринтов, релизов и коммитов.

`ARCHITECTURE.md` описывает целевую архитектуру. `DELIVERY_PLAN.md` описывает, как идти к ней маленькими проверяемыми шагами.

## Рабочий Принцип

- Source PDFs в `pearls/` — сырой архив от редакторов.
- Reviewed JSON в `data/parsed/{year}/` — источник правды для приложения.
- Postgres — runtime index, который всегда можно пересобрать из JSON.
- `var/downloads/` — пересобираемые download artifacts.
- Bulk ZIP archives — готовые архивы всех документов по форматам.
- Каждый этап закрывается отдельным коммитом.
- После завершения этапа отмечаем чекбоксы в этом файле.

## Sprint 1 — Нормализация JSON

Цель: сделать JSON самодостаточным источником данных для DB seed, каталога, sitemap, downloads и будущего поиска.

- [ ] Проверить текущие изменения парсера дат
- [ ] Довести `PearlDocument` до целевой формы
- [ ] Добавить в JSON поля `slug`, `year`, `month`, `day`, `publishedAt`, `sortDate`
- [ ] Добавить в JSON поля `speaker`, `sourcePdf`, `jsonPath`, `parsedAt`
- [ ] Изменить output parser: `data/parsed/{year}/{originalName}.json`
- [ ] Перегенерировать `data/parsed/` автоматически, без ручной правки каждого файла
- [ ] Локально проверить 10 случайных JSON
- [ ] Закоммитить reviewed JSON

План коммитов:

1. `Добавить извлечение дат из подзаголовков`
2. `Переложить JSON по годовым папкам`
3. `Нормализовать метаданные JSON`
4. `Обновить распарсенные данные`

## Sprint 2 — Postgres Runtime Catalog

Цель: главная страница, sitemap и lookup лекций читают каталог из Postgres, а не сканируют JSON на runtime.

- [ ] Добавить локальный Postgres setup
- [ ] Установить Prisma
- [ ] Создать `Lecture` model
- [ ] Написать seed из `data/parsed/`
- [ ] Переключить главную страницу на DB catalog
- [ ] Переключить sitemap на DB
- [ ] Оставить полный текст/paragraphs в JSON

План коммитов:

1. `Добавить Prisma и схему лекций`
2. `Добавить сидинг лекций из JSON`
3. `Перевести каталог на Postgres`
4. `Перевести sitemap на Postgres`

## Sprint 3 — Download Artifacts

Цель: убрать генерацию всех файлов при старте сервера и заменить её явной командой генерации download artifacts после обновления данных.

- [ ] Удалить обязательный `generateDownloads()` из startup
- [ ] Добавить `npm run generate:downloads`
- [ ] Генерировать индивидуальные TXT/DOCX/EPUB файлы в `var/downloads/{format}/{year}/`
- [ ] Генерировать `var/downloads/bundles/all-txt.zip`
- [ ] Генерировать `var/downloads/bundles/all-docx.zip`
- [ ] Генерировать `var/downloads/bundles/all-epub.zip`
- [ ] Добавить route для индивидуальных скачиваний
- [ ] Добавить route для bulk ZIP downloads
- [ ] Добавить 3 кнопки bulk downloads в конце каталога
- [ ] Показывать размер каждого ZIP, если файл уже сгенерирован

План коммитов:

1. `Убрать генерацию скачиваний при старте`
2. `Добавить генерацию файлов скачивания`
3. `Добавить общие ZIP архивы`
4. `Добавить кнопки скачивания всех лекций`

## Sprint 4 — Production Deploy

Цель: production flow через PM2 deploy и Postgres.

- [ ] Настроить production env
- [ ] Настроить PM2 deploy
- [ ] Прогонять Prisma migrations на production Postgres
- [ ] Сидить Postgres из committed JSON
- [ ] Добавить `/health`

План коммитов:

1. `Добавить production env пример`
2. `Настроить PM2 deploy`
3. `Добавить healthcheck`

## Sprint 5 — Search & RAG

Цель: подготовить поиск и будущий RAG поверх reviewed JSON и Postgres catalog.

- [ ] Добавить Postgres FTS
- [ ] Добавить chunker
- [ ] Добавить Qdrant setup
- [ ] Добавить embedding scripts
- [ ] Добавить `POST /api/ask`
- [ ] Добавить `/chat`

План коммитов:

1. `Добавить полнотекстовый поиск`
2. `Добавить разбиение лекций на чанки`
3. `Добавить индексацию в Qdrant`
4. `Добавить RAG endpoint`
5. `Добавить страницу чата`

## Quarterly Content Release Flow

Повторяемый флоу для новых пакетов лекций:

1. Получить новые PDF от редакторов.
2. Положить PDF в `pearls/{year}/`.
3. Запустить локальный парсинг.
4. Проверить JSON в `data/parsed/{year}/`.
5. Если JSON корректный, сделать коммит.
6. Запушить в `main`.
7. Задеплоить через PM2.
8. Запустить seed на production Postgres.
9. Запустить генерацию download artifacts.

План коммита для контентного релиза:

`Добавить лекции за YYYY QN`

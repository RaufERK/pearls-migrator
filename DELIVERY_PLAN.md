# Pearls Migrator — Delivery Plan

Этот файл фиксирует порядок ближайших спринтов, релизов и коммитов.

`ARCHITECTURE.md` описывает целевую архитектуру. `DELIVERY_PLAN.md` описывает, как идти к ней маленькими проверяемыми шагами.

## Рабочий Принцип

- Source PDFs в `pearls/` — сырой архив от редакторов.
- Reviewed JSON в `data/parsed/` — источник правды для приложения.
- Postgres — runtime index, который всегда можно пересобрать из JSON.
- `var/downloads/` — disposable cache для файлов скачивания.
- Каждый этап закрывается отдельным коммитом.
- После завершения этапа отмечаем чекбоксы в этом файле.

## Sprint 1 — Нормализация JSON

Цель: сделать JSON самодостаточным источником данных для DB seed, каталога, sitemap, downloads и будущего поиска.

- [ ] Проверить текущие изменения парсера дат
- [ ] Довести `PearlDocument` до целевой формы
- [ ] Добавить в JSON поля `slug`, `year`, `month`, `day`, `publishedAt`, `sortDate`
- [ ] Добавить в JSON поля `speaker`, `sourcePdf`, `parsedAt`
- [ ] Перегенерировать `data/parsed/`
- [ ] Локально проверить 10 случайных JSON
- [ ] Закоммитить reviewed JSON

План коммитов:

1. `Добавить извлечение дат из подзаголовков`
2. `Нормализовать метаданные JSON`
3. `Обновить распарсенные данные`

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

## Sprint 3 — Downloads Cache

Цель: убрать генерацию всех файлов при старте и заменить её ленивой генерацией с кешем.

- [ ] Удалить обязательный `generateDownloads()` из startup
- [ ] Добавить генерацию файла при первом запросе
- [ ] Сохранять кеш в `var/downloads/`
- [ ] Добавить проверку свежести кеша
- [ ] Оставить CLI pre-warm как опциональную команду

План коммитов:

1. `Убрать генерацию скачиваний при старте`
2. `Добавить кеш скачиваний`
3. `Добавить команду прогрева скачиваний`

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
4. Проверить JSON в `data/parsed/`.
5. Если JSON корректный, сделать коммит.
6. Запушить в `main`.
7. Задеплоить через PM2.
8. Запустить seed на production Postgres.

План коммита для контентного релиза:

`Добавить лекции за YYYY QN`

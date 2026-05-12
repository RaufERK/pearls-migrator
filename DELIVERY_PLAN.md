# Pearls Migrator — Delivery Plan

Этот файл фиксирует порядок ближайших спринтов, релизов и коммитов.

`ARCHITECTURE.md` описывает целевую архитектуру. `DELIVERY_PLAN.md` описывает, как идти к ней маленькими проверяемыми шагами.

## Рабочий Принцип

- Source PDFs в `pearls/` — сырой архив от редакторов.
- Reviewed JSON в `data/parsed/{year}/` — источник правды для приложения.
- `DOCUMENTS_GUIDE.md` — источник правил по типам документов, трем датам, заголовку, телу и футеру.
- Postgres — runtime index, который всегда можно пересобрать из JSON.
- `var/downloads/` — пересобираемые download artifacts.
- Bulk ZIP archives — готовые архивы всех документов по форматам.
- Каждый этап закрывается отдельным коммитом.
- После завершения этапа отмечаем чекбоксы в этом файле.

## Sprint 1 — Нормализация JSON

Статус: реализовано в парсере и перегенерировано в `data/parsed/`. Остается ревью качества OCR-случаев и фиксация данных в коммите.

Цель: сделать JSON самодостаточным источником данных для DB seed, каталога, sitemap, downloads и будущего поиска.

Дополнение: нормализация должна учитывать документную модель из `DOCUMENTS_GUIDE.md`. В JSON нужно явно разделить редакционную дату сайта, историческую дату создания и дату публикации в `Жемчужинах Мудрости`.

- [x] Проверить текущие изменения парсера дат
- [x] Довести `PearlDocument` до целевой формы
- [x] Добавить в JSON поля `slug`, `year`, `month`, `day`, `publishedAt`, `sortDate`
- [x] Добавить в JSON поля `speaker`, `sourcePdf`, `jsonPath`, `parsedAt`
- [x] Изменить output parser: `data/parsed/{year}/{originalName}.json`
- [x] Перегенерировать `data/parsed/` автоматически, без ручной правки каждого файла
- [x] Локально проверить 10 случайных JSON
- [x] Обновить `PearlDocument` под `documentType`, `author`, `sitePublication`, `creation`, `pearlPublication`
- [x] Разделить текст на `parts.header`, `parts.body`, `parts.footer`
- [x] Сохранять футер после черты отдельно и использовать его для уточнения автора, типа и даты создания
- [x] Научить парсер считать `Открывающий призыв`, `Призыв`, `Молитва` и похожие строки началом тела, а не продолжением заголовка
- [x] Извлекать строку `Том ... № ...` в `pearlPublication`, если она присутствует
- [ ] Закоммитить reviewed JSON

План коммитов:

1. `Нормализовать метаданные документов`
2. `Обновить распарсенные данные`

## Sprint 2 — Postgres Runtime Catalog

Цель: главная страница, sitemap и lookup лекций читают каталог из Postgres, а не сканируют JSON на runtime. Seed должен брать новые поля `documentType`, `author`, `sitePublication`, `creation`, `pearlPublication` и считать `content` из `parts.body`.

- [x] Добавить локальный Postgres setup
- [x] Установить Prisma
- [x] Создать `Lecture` model под актуальную JSON-модель
- [x] Написать seed из `data/parsed/`
- [x] Переключить главную страницу на DB catalog с сортировкой по `sitePublication.sortDate`
- [x] Переключить sitemap на DB
- [x] Оставить полный текст, `parts` и `paragraphs` в JSON
- [ ] Добавить фильтры по автору, году публикации сайта, году создания и типу документа

План коммитов:

1. `Добавить Prisma и схему лекций`
2. `Добавить сидинг лекций из JSON`
3. `Перевести каталог на Postgres`
4. `Перевести sitemap на Postgres`
5. `Добавить фильтры документов`

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

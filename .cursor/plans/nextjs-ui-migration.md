---
name: nextjs_ui_migration
overview: Перейти с Express + ручной React SSR на Next.js App Router frontend в web/, сохранив SEO, текущие URL, Word/JSON/Postgres pipeline и backend/parser код.
status: planned
---

# План Перехода На Next.js Frontend

## Решение

Переходим на `Next.js App Router` для публичного frontend, но не переписываем весь проект.

Backend, Word pipeline, parser, reviewed JSON, Prisma/Postgres seed и download logic остаются в текущем TypeScript/Express-коде. Next.js добавляется как отдельный frontend-слой в `web/`, чтобы перенос дизайна из `FIGMA/` был ближе к исходному React/Tailwind-style макету и не требовал ручного перевода всего дизайна в один `public/styles.css`.

`FIGMA/` — единственный актуальный дизайн-источник. `PearlsV27/` считается legacy-прототипом.

## Почему Переходим

Текущий Express + React SSR хорошо отдаёт SEO HTML, но плохо совпадает с форматом дизайна:

- `FIGMA/` приходит как React/Vite/Tailwind-style UI с mock data.
- Production UI сейчас собирается через `src/views/*.tsx`, `renderToStaticMarkup` и ручной `public/styles.css`.
- Каждый перенос дизайна превращается в ручную реконструкцию.
- Чем больше будет фильтров, поиска, detail views и интерактивности, тем дороже будет поддерживать собственный frontend-stack.

Next.js не решит перенос `FIGMA/src/app/App.tsx` один-в-один, потому что mock data и SPA-state всё равно нужно заменить реальными данными и route pages. Но Next делает production frontend ближе к современному React-стеку: `app/page.tsx`, route metadata, server components, route handlers, Tailwind, client components только там, где нужен интерактив.

## Целевая Граница

```text
data/source-data/pearls-word/
  -> data/word-docx/
  -> data/parsed/
  -> Postgres
  -> shared TS modules in src/
  -> web/ Next.js frontend
```

Express/backend остаётся для:

- CLI pipeline;
- API/download routes на переходном этапе;
- существующих shared modules;
- production backend задач, если они не относятся к публичному UI.

Next.js отвечает за:

- публичный каталог;
- страницу чтения;
- SEO metadata;
- sitemap/robots;
- перенос дизайна из `FIGMA/`;
- будущие frontend-фичи: поиск, фильтры, интерактивные элементы.

## Чекбоксы

### 1. Bootstrap

- [ ] Добавить `web/` как отдельное Next.js App Router приложение.
- [ ] Подключить Tailwind в `web/`.
- [ ] Настроить `web/package.json` или root scripts так, чтобы запуск frontend/backend был понятен.
- [ ] Оставить текущий Express app рабочим на время миграции.
- [ ] Зафиксировать Node version через существующий `.nvmrc`/`engines`.

### 2. Базовый Layout

- [ ] Создать `web/app/layout.tsx`.
- [ ] Создать `web/app/page.tsx`.
- [ ] Перенести общий shell: html/body, title defaults, stylesheet/Tailwind.
- [ ] Перенести `SiteHeader` как Next component.
- [ ] Перенести starry background из `FIGMA/` без mock data.

### 3. Каталог

- [ ] Перенести главную страницу каталога в `web/app/page.tsx`.
- [ ] Подключить реальные данные каталога.
- [ ] Сохранить группировку по году и месяцу публикации сайта.
- [ ] Сохранить фильтр по году публикации сайта.
- [ ] Перенести таблицы, градиенты, кнопки скачивания и визуальный стиль из `FIGMA/`.
- [ ] Проверить, что HTML каталога доступен без ожидания client-side JS.

### 4. Страница Чтения

- [ ] Создать `web/app/pearls/[year]/[slug]/page.tsx`.
- [ ] Подключить реальные данные материала.
- [ ] Перенести detail card, actions, download links и print link.
- [ ] Сохранить полный текст в HTML для SEO.
- [ ] Добавить `generateMetadata` для title, description, canonical.
- [ ] Проверить несколько старых и новых материалов.

### 5. API, Downloads, SEO Routes

- [ ] Решить для `/downloads/[year]/[file]`: Next route handler или proxy на Express.
- [ ] Решить для `/api/pearls/[year]/[slug]`: Next route handler или proxy на Express.
- [ ] Перенести или проксировать текущую download generation logic.
- [ ] Добавить `web/app/robots.ts`.
- [ ] Добавить `web/app/sitemap.ts`.
- [ ] Сохранить текущие URL без redirect-шума.

### 6. Проверка Parity

- [ ] `npm run build` для текущего проекта проходит.
- [ ] Next build проходит.
- [ ] Главная страница визуально ближе к `FIGMA/`, чем текущий Express UI.
- [ ] Страница чтения визуально ближе к `FIGMA/`.
- [ ] TXT/DOCX/EPUB скачивания работают.
- [ ] Print flow работает.
- [ ] SEO HTML проверен через curl/browser source.
- [ ] Sitemap и robots работают.

### 7. Cutover

- [ ] Принять решение, остаётся ли Express HTML renderer как fallback.
- [ ] Если fallback не нужен, удалить `src/render.tsx` и `src/views/`.
- [ ] Обновить `README.md`, `ARCHITECTURE.md`, `DELIVERY_PLAN.md`, `CLAUDE.md` после фактического cutover.
- [ ] Закоммитить удаление старого UI отдельным коммитом.

## Не Делаем В Этом Переходе

- Не переписываем Word parser.
- Не меняем reviewed JSON pipeline.
- Не переносим всю backend-логику в Next.
- Не добавляем auth/moderator panel.
- Не добавляем RAG/search до завершения frontend cutover.

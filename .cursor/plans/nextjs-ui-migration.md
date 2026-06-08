---
name: nextjs_ui_migration
overview: Перейти с Express + ручной React SSR на Next.js App Router frontend в web/, сохранив SEO, текущие URL, Word/JSON/Postgres pipeline и backend/parser код.
status: in_progress
---

# План Перехода На Next.js Frontend

## Текущее Решение

`web/` — текущий публичный Next.js App Router frontend. Каталог `/` и страница чтения `/pearls/[year]/[slug]` уже перенесены на Next и рендерятся сервером.

Express остаётся для API/download/backend задач на переходном этапе. Word pipeline, parser, reviewed JSON, Prisma/Postgres seed и download logic не переписываем.

`FIGMA/` — единственный актуальный дизайн-источник. Его mock data не переносим в runtime.

## Граница Системы

```text
data/source-data/pearls-word/
  -> data/word-docx/
  -> data/parsed/
  -> Postgres
  -> shared TS modules in src/
  -> web/ Next.js frontend
```

## Уже Сделано

- [x] Создать `web/` как Next.js App Router приложение.
- [x] Подключить Tailwind в `web/`.
- [x] Настроить root `npm run dev` для одновременного запуска Next frontend и Express API.
- [x] Перенести layout, header и starry background.
- [x] Перенести каталог в `web/app/page.tsx` с реальными данными, фильтром по году, таблицами и download links.
- [x] Перенести страницу чтения в `web/app/pearls/[year]/[slug]/page.tsx` с полным SEO HTML, metadata, download links и print link.

## Осталось Сделать

### Проверка Parity

- [ ] Проверить несколько старых и новых материалов.
- [ ] TXT/DOCX/EPUB скачивания работают.
- [ ] Print flow работает.
- [ ] SEO HTML проверен через curl/browser source.
- [ ] `npm run build` и `npm run build:web` проходят после финальной чистки.

### API, Downloads, SEO Routes

- [ ] Оставить `/downloads/[year]/[file]` как proxy на Express или перенести в Next route handler.
- [ ] Оставить `/api/pearls/[year]/[slug]` как Express API или перенести в Next route handler.
- [ ] Добавить `web/app/robots.ts`.
- [ ] Добавить `web/app/sitemap.ts`.
- [ ] Сохранить текущие публичные URL без redirect-шума.

### Cutover Cleanup

- [ ] Принять решение, остаётся ли Express HTML renderer как fallback.
- [ ] Если fallback не нужен, удалить `src/render.tsx` и `src/views/`.
- [ ] Удалить legacy `public/styles.css`, если Express HTML renderer удалён.
- [ ] Убрать root React dependencies, если root backend больше не импортирует React.
- [ ] Обновить `README.md`, `ARCHITECTURE.md`, `DELIVERY_PLAN.md`, `CLAUDE.md` после фактического cutover.
- [ ] Закоммитить удаление старого UI отдельным коммитом.

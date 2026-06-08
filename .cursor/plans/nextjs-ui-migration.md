---
name: nextjs_ui_migration
overview: Next.js frontend cutover completed; Express remains backend/API/download/filesystem layer.
status: completed
---

# Next.js Frontend Cutover

Этот план закрыт. Детальные выполненные чеклисты больше не храним здесь, чтобы не раздувать рабочий контекст.

## Итоговое Решение

- `web/` — публичный Next.js App Router frontend.
- `/` и `/pearls/[year]/[slug]` рендерятся Next server components.
- `web/app/robots.ts` и `web/app/sitemap.ts` отвечают за SEO-служебные routes.
- Express остаётся backend-слоем для `/api/*`, `/downloads/*`, `/source-files/*`.
- Word pipeline, parser, reviewed JSON, Prisma/Postgres seed, filesystem work и download logic не переносим в Next.
- Старый Express HTML renderer удалён.

## Runtime Boundary

Next owns public UI and SEO. Express owns backend API, downloads, source files, filesystem-heavy work, and pipeline support. CLI scripts own batch work.

## Follow-up

- [ ] Production deploy plan.
- [ ] Production healthcheck.
- [ ] Final UI polish against `FIGMA/`.

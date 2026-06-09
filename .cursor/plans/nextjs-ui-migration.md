---
name: nextjs_ui_migration
overview: Next.js frontend cutover completed; production runtime is Next-only.
status: completed
---

# Next.js Frontend Cutover

Этот план закрыт. Детальные выполненные чеклисты больше не храним здесь, чтобы не раздувать рабочий контекст.

## Итоговое Решение

- `web/` — публичный Next.js App Router frontend.
- `/` и `/pearls/[year]/[slug]` рендерятся Next server components.
- `web/app/robots.ts` и `web/app/sitemap.ts` отвечают за SEO-служебные routes.
- Production runtime теперь Next-only: Next напрямую читает Postgres и отдаёт static downloads.
- Word pipeline, parser, reviewed JSON, Prisma/Postgres seed, filesystem work и download logic не переносим в Next.
- Старый Express HTML renderer удалён.

## Runtime Boundary

Next owns production UI, SEO, direct Postgres reads, healthcheck, and static downloads. CLI scripts own offline batch work.

## Follow-up

- [ ] Production deploy plan.
- [ ] Production healthcheck.
- [ ] Final UI polish against `FIGMA/`.

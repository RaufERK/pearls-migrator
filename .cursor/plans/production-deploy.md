# Production Deploy

## Current Production

- Server: `155.212.174.133`.
- App SSH: `ssh app` (`appuser`).
- Root SSH: `ssh sw`.
- App path: `/home/appuser/apps/pearls-migrator`.
- Shared env: `/home/appuser/apps/pearls-migrator/shared/.env`.
- PM2 process: `pearls-migrator`.
- Next port: `3021`.
- Production domain: `https://amasters.ru`.
- Technical/staging domain: `https://amasters.tech`.
- Status: deployed, seeded, downloads generated, Nginx + SSL configured.

## Deploy Command

```bash
npm run deploy
```

The PM2 post-deploy sequence is defined in `ecosystem.config.cjs`.

## Verify Production

```bash
curl -I https://amasters.ru/health
curl -I https://amasters.ru/
curl -I https://amasters.ru/pearls/2026/2026Q2-3
curl -I https://amasters.ru/downloads/2026/2026Q2-3.txt
curl -I https://amasters.ru/sitemap.xml
```

## Main Domain Cutover

Completed. `amasters.ru` and `www.amasters.ru` point to `155.212.174.133`; Nginx serves the app, HTTP redirects to HTTPS, and `www` redirects to `https://amasters.ru/`.

## Rollback

1. Return DNS to the old server.
2. Or disable the new Nginx site for the main domain.
3. Recheck the old production site.

# Production Deploy

## Current Staging

- Server: `155.212.174.133`.
- App SSH: `ssh app` (`appuser`).
- Root SSH: `ssh sw`.
- App path: `/home/appuser/apps/pearls-migrator`.
- Shared env: `/home/appuser/apps/pearls-migrator/shared/.env`.
- PM2 process: `pearls-migrator`.
- Next port: `3021`.
- Staging domain: `https://amasters.tech`.
- Staging status: deployed, seeded, downloads generated, Nginx + SSL configured.

## Deploy Command

```bash
npm run deploy
```

The PM2 post-deploy sequence is defined in `ecosystem.config.cjs`.

## Verify Staging

```bash
curl -I https://amasters.tech/health
curl -I https://amasters.tech/
curl -I https://amasters.tech/pearls/2026/2026Q2-3
curl -I https://amasters.tech/downloads/2026/2026Q2-3.txt
curl -I https://amasters.tech/sitemap.xml
```

## Main Domain Cutover

Do only after staging approval.

1. Change DNS for the main domain to `155.212.174.133`.
2. Add the main domain to Nginx.
3. Issue SSL with Certbot after DNS propagation.
4. Verify homepage, reading page, downloads, `robots.txt`, `sitemap.xml`, and `/health`.

## Rollback

1. Return DNS to the old server.
2. Or disable the new Nginx site for the main domain.
3. Recheck the old production site.

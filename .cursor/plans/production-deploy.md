# Production Deploy Plan

## Решение

Деплоим новый проект на новый сервер `155.212.174.133` и сначала проверяем его на временном домене `amasters.tech`. Старый проект `amasters_copy` остаётся только историческим примером, не целевой инфраструктурой.

1. Поднять новый проект рядом на том же сервере.
2. Проверить Next-only runtime через отдельный порт.
3. Проверить Postgres seed, static downloads, healthcheck, catalog, reading page, sitemap.
4. После проверки можно переключать боевой домен через DNS/зону.

Для временного домена нужен Nginx + SSL на новом сервере. До распространения DNS можно уже подготовить PM2 app, env, Postgres, build и проверить приложение через `127.0.0.1:<port>` на сервере.

## Что Берём Из `spokenword`

Проект `spokenword` уже живёт на нужном сервере и даёт рабочую схему деплоя:

- SSH user: `appuser`.
- SSH app alias: `ssh app`.
- SSH root alias: `ssh sw`.
- Host: `155.212.174.133`.
- Deploy path family: `/home/appuser/apps/<project>/source`.
- Shared env pattern: `/home/appuser/apps/<project>/shared/.env`.
- PM2 deploy pattern через `ecosystem.config.cjs`.
- Nginx настраивается root-пользователем через `ssh sw`.

Код, структуру и runtime `spokenword` не переносим. Берём только инфраструктурный паттерн: PM2 deploy, `/home/appuser/apps/...`, shared env, logs, Nginx.

## Рекомендуемый Safe Cutover

### 1. Подготовить Новый Deploy Target

- [ ] Создать на сервере отдельный каталог для нового проекта, например `/home/appuser/apps/pearls-migrator`.
- [x] Настроить repo в `ecosystem.config.cjs` на новый GitHub repo.
- [x] Оставить production process на Next-only runtime.
- [x] Для проверки использовать отдельный порт `3021`, чтобы не конфликтовать со `spokenword` на `3005`.

### 2. Подготовить Env

- [ ] Создать или обновить `/home/appuser/apps/pearls-migrator/shared/.env`.
- [ ] Минимально нужны:

```bash
DATABASE_URL=...
SITE_URL=https://amasters.tech
```

- [ ] Не использовать env старых проектов и не затирать env `spokenword`.

### 3. Подготовить Deploy Sequence

Post-deploy sequence подготовлен в `ecosystem.config.cjs`:

```bash
source ~/.nvm/nvm.sh
mkdir -p /home/appuser/apps/pearls-migrator/shared
ln -sfn /home/appuser/apps/pearls-migrator/shared/.env ./.env
ln -sfn /home/appuser/apps/pearls-migrator/shared/.env ./.env.production
npm ci --include=dev
npm --prefix web ci --include=dev
npm run db:generate
npm run db:seed
npm run generate:downloads
npm run build:web
pm2 startOrReload ecosystem.config.cjs --env production
pm2 save
```

Почему так:

- `db:generate` создаёт root и web Prisma clients.
- `db:seed` заполняет Postgres из reviewed JSON.
- `generate:downloads` создаёт `web/public/downloads`.
- `build:web` собирает Next после подготовки базы и файлов.
- PM2 запускает только Next.

### 4. Проверить Staging На Сервере

Если процесс поднят на `3021`, проверить через `ssh app`:

```bash
curl -I http://127.0.0.1:3021/health
curl -I http://127.0.0.1:3021/
curl -I http://127.0.0.1:3021/pearls/2026/2026Q2-3
curl -I http://127.0.0.1:3021/downloads/2026/2026Q2-3.txt
curl -I http://127.0.0.1:3021/sitemap.xml
```

Также проверить PM2:

```bash
pm2 list
pm2 logs pearls-migrator --lines 100
```

### 5. Настроить Nginx Для `amasters.tech`

Это требует `ssh sw`:

- [ ] Дождаться, пока DNS `amasters.tech` указывает на `155.212.174.133`.
- [ ] Создать Nginx site для `amasters.tech` и, если нужно, `www.amasters.tech`.
- [ ] Proxy target: `127.0.0.1:3021` на время проверки.
- [ ] Проверить `nginx -t`.
- [ ] Выпустить SSL через Certbot после DNS propagation.
- [ ] Reload Nginx.

Минимальная идея конфига:

```nginx
server {
    listen 80;
    server_name amasters.tech www.amasters.tech;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
        default_type "text/plain";
        try_files $uri =404;
    }

    location / {
        proxy_pass http://127.0.0.1:3021;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 6. Проверить `amasters.tech`

После Nginx/SSL:

```bash
curl -I https://amasters.tech/health
curl -I https://amasters.tech/
curl -I https://amasters.tech/pearls/2026/2026Q2-3
curl -I https://amasters.tech/downloads/2026/2026Q2-3.txt
curl -I https://amasters.tech/sitemap.xml
```

### 7. Cutover На Боевой Домен

После успешной проверки:

- [ ] Подменить DNS боевого домена на новый сервер.
- [ ] Добавить боевой домен в Nginx config или создать отдельный site.
- [ ] Выпустить SSL для боевого домена после DNS propagation.
- [ ] Проверить боевые URL.

```bash
curl -I https://amasters.ru/health
curl -I https://amasters.ru/
curl -I https://amasters.ru/pearls/2026/2026Q2-3
curl -I https://amasters.ru/downloads/2026/2026Q2-3.txt
curl -I https://amasters.ru/sitemap.xml
```

### 8. Rollback

Rollback должен быть простым:

- [ ] Вернуть DNS боевого домена на старый сервер.
- [ ] Или отключить новый Nginx site для боевого домена.
- [ ] Проверить `https://amasters.ru/`.

## Ускоренный Вариант

Можно деплоить сразу на `amasters.tech`, потому что это временный домен. Но не нужно сразу трогать боевой домен, пока `amasters.tech` не проверен.

Использовать direct-prod только если:

- свежий локальный `npm run build:web` проходит;
- `npm run smoke` проходит;
- env и Postgres на новом сервере готовы;
- Nginx/SSL для `amasters.tech` готовы.

## Первый Практический Шаг

Обновить `ecosystem.config.cjs` нового проекта под deploy:

- добавить `deploy.production`;
- указать новый repo;
- указать host `155.212.174.133`;
- указать path `/home/appuser/apps/pearls-migrator`;
- использовать порт `3021` для проверки на `amasters.tech`.

# Ecosystem — production deployment

Single host, dedicated IP `38.225.55.123`, Docker + **Traefik** (already running
on the server, external network `grapifly_proxy`, entrypoint `websecure`, cert
resolver `le`). Every app follows the same shape as `jtrade/docker-compose.prod.yml`.

```
deploy.sh                     # pull + rebuild + restart (run on the server)
deploy/systemd/               # boot-time units (one per app + ecosystem.target)
deploy/Caddyfile              # (removed — Traefik is the proxy)
<app>/docker-compose.local.yml   # local dev (host ports, .env)
<app>/docker-compose.prod.yml    # prod (Traefik labels, .env.prod, no host ports)
```

## 1. DNS (Hostinger → grapifly.com → DNS Zone)

Fix the apex (currently points at `2.57.91.91`) and add a wildcard. Keep `MX` / `TXT`.

| Type | Name | Value |
|------|------|-------|
| A | `@` | `38.225.55.123` |
| A | `www` | `38.225.55.123` |
| A | `*` | `38.225.55.123` |

The wildcard covers every subdomain below.

## 2. Hostname → service

| Hostname | Service (Traefik router → port) |
|----------|--------------------------------|
| `grapifly.com`, `www.grapifly.com` | `grapifly` frontend → 3100 |
| `id.grapifly.com` | `grapifly` backend → 3101 |
| `relay.grapifly.com` | `relay` frontend → 3000 |
| `api.relay.grapifly.com` | `relay` backend → 3001 |
| `businessapp.grapifly.com` | `business` frontend → 3005 |
| `api.businessapp.grapifly.com` | `business` backend → 3004 |
| `jtrade.grapifly.com` | `jtrade` frontend (nginx, proxies `/backend`) → 80 |

Routers are declared as `traefik.*` labels in each `docker-compose.prod.yml`.
Traefik must expose the `websecure` entrypoint and a cert resolver named `le`.

## 3. Prod env files (on the server, gitignored)

Each project has an `env/` folder with `.env.local` + `.env.prod` (gitignored,
one per machine / server) and committed `.env.{local,prod}.example` templates.
`deploy.sh` refuses to run if a prod file is missing:

```bash
cp grapifly/env/.env.prod.example      grapifly/env/.env.prod
cp relay/env/.env.prod.example         relay/env/.env.prod
cp business-app/env/.env.prod.example  business-app/env/.env.prod
cp jtrade/env/.env.prod.example        jtrade/env/.env.prod
# then replace every CHANGE_ME
```

| File | Fill in |
|------|---------|
| `grapifly/env/.env.prod` | `MONGODB_URI` (**Atlas**, DB `grapiflydb`), `JWT_SESSION_SECRET`, `GOOGLE_CLIENT_SECRET`, `*_SERVICE_SECRET` (must match each app), `GRAPIFLY_SSO_CLIENT_SECRET` (= `RELAY_SERVICE_SECRET`) |
| `relay/env/.env.prod` | `MONGODB_URI`, AWS/S3, SMTP (`CHANGE_ME_*`) — secrets + keys are pre-generated |
| `business-app/env/.env.prod` | `MONGODB_URI`, `MONGO_URI`, `BI_DATABASE_URL` (Neon), `PLATFORM_ADMIN_BOOTSTRAP_PASSWORD` — one file, backend + BI |
| `jtrade/env/.env.prod` | `MONGODB_URI` (**Atlas**, DB `jtradedb`) — the rest is pre-filled |

The pre-generated secrets in the `.example` files are consistent across apps
(same `RELAY_SERVICE_SECRET` value in grapifly and relay, etc.). Keep them or
regenerate all matching pairs together.

**Public URLs are already set** in each `docker-compose.prod.yml` `environment:` /
`build.args` (they override the env files), so `.env.prod` only needs secrets +
`MONGODB_URI` + Redis host. The `*_SERVICE_SECRET` pairs **must match** between
grapifly and each app.

### The jtrade backend .env.prod on the server is stale

It still has `54.166.195.143`, `JWT_EXPIRES`, `SALT_ROUNDS` (pre-Grapifly). Rewrite
it against `jtrade/backend/.env.example`.

## 4. Deploy

```bash
# first time
cd /path/to/ecosystem
docker network create grapifly_proxy        # if Traefik didn't already
sudo deploy/systemd/install.sh              # boot-time units

# every deploy
./deploy.sh                    # pull main, rebuild + restart all apps
./deploy.sh main jtrade        # just one app
```

`deploy.sh` per app: `git pull` → `compose -f docker-compose.prod.yml down` →
`build --no-cache` → `up -d`.

## 5. External config (one-time)

- **Google OAuth** (Grapifly login) — Google Cloud Console → OAuth client:
  - Authorized JS origins: `https://grapifly.com`, `https://id.grapifly.com`
  - Redirect URI: `https://id.grapifly.com/auth/google/callback`
- **Relay Xero / Gmail** — callbacks to `https://api.relay.grapifly.com/accounting/oauth/xero/callback`
  and `https://api.relay.grapifly.com/relay/channels/oauth/gmail/callback`

## 6. Notes

- All four Nest backends call `set('trust proxy', 1)` — OAuth/SSO redirects use `https`.
- `grapifly` writes the applications catalogue (`launchUrl`, `ssoCallbackUrl`) from
  `{GRAPIFLY,RELAY,BUSINESS,JTRADE}_APP_URL` / `*_SSO_CALLBACK_URL` **on every boot**.
- Cross-app server-to-server calls go through Traefik (`https://api.relay.grapifly.com`,
  `https://id.grapifly.com`) — only the routed services join `grapifly_proxy`.
- `grapifly` and `jtrade` use **MongoDB Atlas** (databases `grapiflydb` and
  `jtradedb`); neither compose file has a `mongo` service. `relay` / `business-app`
  still run their own Mongo (no host ports in prod).
- `restart: unless-stopped` on every container + the systemd units = survives both
  container crashes and host reboot.
- `business` has no Grapifly SSO yet — its `ssoCallbackUrl` stays admin-set.

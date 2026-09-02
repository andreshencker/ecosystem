# Grapifly ecosystem — production deployment (grapifly.com)

Server: single host, dedicated IP `38.225.55.123`, Docker + a reverse proxy.

## 1. DNS (Hostinger → grapifly.com → DNS Zone)

Delete the default parking `A @` / `A www`. Keep any `MX` / `TXT` (email).

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` | `38.225.55.123` | 3600 |
| A | `www` | `38.225.55.123` | 3600 |
| A | `*` | `38.225.55.123` | 3600 |

The wildcard covers `jtrade`, `relay`, `businessapp`, `id`, and every `api.*`
subdomain. (Prefer explicit records? add one `A` per host instead of `*`.)

Verify: `dig +short jtrade.grapifly.com` → `38.225.55.123`

## 2. Hostname → container

| Hostname | Container:port |
|----------|----------------|
| `grapifly.com`, `www.grapifly.com` | `grapifly_frontend:3100` |
| `id.grapifly.com` | `grapifly_backend:3101` |
| `relay.grapifly.com` | `relay_frontend:3000` |
| `api.relay.grapifly.com` | `relay_backend:3001` |
| `businessapp.grapifly.com` | `business_frontend:3005` |
| `api.businessapp.grapifly.com` | `business_backend:3004` |
| `jtrade.grapifly.com` | `jtrade_frontend:80` (proxies `/backend` itself) |

Reverse proxy: [`deploy/Caddyfile`](./Caddyfile) — auto-HTTPS for all of the
above.

## 3. Shared network + bring up each app

One external Docker network links every app + Caddy, so Caddy reaches each
frontend/backend and the backends reach each other by container name. Each
app's DB/Redis stays on its own private network.

```bash
docker network create grapifly_net
```

Each app has a `docker-compose.prod.yml` overlay with the prod env + build args
and no exposed DB/Redis ports.

```bash
# grapifly
cd grapifly       && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
# relay
cd ../relay       && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
# business
cd ../business-app && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
# jtrade  (no base compose in the repo — the prod file is standalone)
cd ../jtrade      && docker compose -f docker-compose.prod.yml up -d --build
```

`docker-compose.prod.yml` uses `!reset []` to drop host port mappings — needs
Docker Compose **v2.24+**. Older: delete the `ports:` from the base compose.

Frontends bake their public URLs at **build time**, so any URL change needs
`--build`.

## 4. One-time external config

### Google OAuth (Grapifly login)
Google Cloud Console → APIs & Services → Credentials → the OAuth 2.0 Client:
- **Authorized JavaScript origins**: `https://grapifly.com`, `https://id.grapifly.com`
- **Authorized redirect URIs**: `https://id.grapifly.com/auth/google/callback`

### Relay — Xero / Gmail OAuth
Update the callback URLs in the Xero developer portal and the Google Cloud OAuth
client for Relay:
- `https://api.relay.grapifly.com/accounting/oauth/xero/callback`
- `https://api.relay.grapifly.com/relay/channels/oauth/gmail/callback`

### jtrade frontend env file
`jtrade/frontend/env/.env.prod` is committed but only holds comments — the real
values arrive as build args from `jtrade/docker-compose.prod.yml`. Local `.env*`
files are excluded from the image (`.dockerignore`).

## 5. What the code now reads from env

| App | Runtime env (compose `environment:`) | Build args (rebuild image) |
|-----|--------------------------------------|----------------------------|
| grapifly-backend | `FRONTEND_URL` (CSV ok), `GRAPIFLY_APP_URL`, `RELAY_APP_URL`, `BUSINESS_APP_URL`, `JTRADE_APP_URL`, `RELAY_SSO_CALLBACK_URL`, `JTRADE_SSO_CALLBACK_URL`, `GOOGLE_CALLBACK_URL`, `RELAY_API_URL` | — |
| grapifly-frontend | — | `NEXT_PUBLIC_ID_API_URL`, `NEXT_PUBLIC_JTRADE_URL`, `NEXT_PUBLIC_BUSINESS_URL`, `NEXT_PUBLIC_COMMUNICATIONS_URL` |
| relay-backend | `APP_BASE_URL`, `API_BASE_URL`, `ALLOWED_ORIGINS`, `GRAPIFLY_ID_API_URL`, `XERO_OAUTH_FRONTEND_RETURN_URL`, `GOOGLE_EMAIL_OAUTH_FRONTEND_RETURN_URL` | — |
| relay-frontend | — | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_GRAPIFLY_ID_URL` |
| business-backend | `FRONTEND_BASE_URL`, `APP_BASE_URL`, `ALLOWED_ORIGINS`, `RELAY_API_URL` | — |
| business-frontend | — | `NEXT_PUBLIC_API_URL` |
| jtrade-backend | `ALLOWED_ORIGINS`, `GRAPIFLY_ID_API_URL`, `GRAPIFLY_FRONTEND_URL`, `FRONTEND_BASE_URL`, `JTRADE_PUBLIC_API_URL`, `RELAY_API_URL` | — |
| jtrade-frontend | — | `VITE_API_BASE`, `VITE_GRAPIFLY_ID_URL`, `VITE_GRAPIFLY_WEB_URL` |

`grapifly_backend` rewrites the `applications` catalogue (`launchUrl`,
`ssoCallbackUrl`) from these env vars **on every boot**.

## 6. Internal vs public URLs

Server-to-server calls use **internal container names** (`http://relay_backend:3001`,
`http://grapifly_backend:3101`) — set in the prod overlays. Browser-facing values
(CORS, redirects, links, `NEXT_PUBLIC_*` / `VITE_*`) use the **public** domains.

| Var | Kind | prod value |
|-----|------|------------|
| `RELAY_API_URL` (grapifly/business/jtrade) | internal | `http://relay_backend:3001` |
| `GRAPIFLY_ID_API_URL` (relay/jtrade) | internal | `http://grapifly_backend:3101` |
| `GRAPIFLY_FRONTEND_URL` (jtrade) | public | `https://grapifly.com` |
| `FRONTEND_URL` (grapifly) | public | `https://grapifly.com` |

## 7. Notes / gotchas

- All four Nest backends call `set('trust proxy', 1)` so OAuth/SSO redirects are
  built with `https` behind the proxy.
- DB/Redis are **not** exposed to the host in the prod overlays. If you keep the
  base `ports:` anyway, firewall 27017/27019/6379/6380.
- Cookies: everything under `*.grapifly.com` → Grapifly session cookies can use
  `SameSite=Lax; Domain=.grapifly.com; Secure`.
- `jtrade/frontend/nginx/nginx.prod.conf` now only proxies `/backend`→`backend:3002`.
  The stale `/orchestrator` and `/communication` blocks were removed (jtrade's
  backend talks to Relay server-side via `RELAY_API_URL`).
- `jtrade/backend/src/microservices/` (old communications/orchestrator clients,
  with a hardcoded `54.166.195.143`) is **excluded from the build** and not run.
- The legacy `jtrade/orchestrator/` is kept in the repo but not deployed.
- `business` app has no Grapifly SSO yet — its `ssoCallbackUrl` stays admin-set.
- jtrade backend `.env.prod` (secrets: `JWT_ACCESS_SECRET`, `JTRADE_SERVICE_SECRET`,
  `RELAY_API_KEY`, …) must exist on the server — it is gitignored.

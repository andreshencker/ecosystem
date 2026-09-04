# Ecosystem Internal API

> The standard for machine-to-machine calls between the four ecosystem apps
> (Grapifly, Relay, jtrade, business-app). One header scheme, one envelope,
> one error shape, one client shape.

---

## Why this exists

Grapifly owns identity (organizations, users, memberships, app access). Every
other app stores Grapifly ids (`grapiflyOrganizationId`, `grapiflyUserId`) and
sooner or later needs to read that identity data back — resolve an id to a name,
list an org's members, fetch an org profile.

Before this standard each app hand-rolled its own client against slightly
different endpoints with different headers. Relay's `src/ecosystem/services/`
and jtrade's `src/integrations/grapifly/` are the same two services written
twice. This document is the single contract they all follow.

---

## 1. Namespace

Every machine-to-machine endpoint lives under **`/internal/…`**. Never mix M2M
routes with user-facing routes. A caller reaching `/internal/*` is another
ecosystem backend, never a browser.

| App | Base URL env var | Notes |
|---|---|---|
| Grapifly | `GRAPIFLY_ID_API_URL` | identity provider — the main callee |
| Relay | `RELAY_API_URL` | payments + notifications |
| jtrade | `JTRADE_API_URL` | rarely a callee |
| business-app | `BUSINESS_API_URL` | rarely a callee |

---

## 2. Authentication

### App identity (always required)

| Header | Value |
|---|---|
| `x-ecosystem-app` | the **calling** app's key: `grapifly` \| `relay` \| `jtrade` \| `business` |
| `x-ecosystem-secret` | that app's service secret (`<APP>_SERVICE_SECRET`) |

The callee verifies the secret against the value Grapifly hashed for that app
in the applications catalogue (`applications.serviceSecretHash`, a SHA-256 of
`<APP>_SERVICE_SECRET`). Grapifly rewrites those hashes from env on every boot,
so the source of truth is always the `*_SERVICE_SECRET` env vars and they must
match between the calling app and Grapifly.

Comparison is timing-safe. A missing or wrong secret is `403`.

### Acting user (only for user-scoped endpoints)

| Header | Value |
|---|---|
| `x-ecosystem-actor` | the `grapiflyUserId` the call is made **on behalf of** |

Endpoints that enforce membership / permissions (e.g. "the org profile this
user can see") require `x-ecosystem-actor`. Endpoints marked **permission-free**
(e.g. Directory resolve — non-sensitive display data only) ignore it.

### Legacy headers (accepted, deprecated)

Grapifly still accepts the pre-standard headers so nothing breaks during
rollout:

| Legacy | Canonical |
|---|---|
| `x-grapifly-sso-secret` + `:appKey` path param | `x-ecosystem-secret` + `x-ecosystem-app` |
| `x-grapifly-user-id` | `x-ecosystem-actor` |

Two surfaces stay outside this standard for now (convergence pending):

- **Relay's inbound payments API** (`/payments/*`) uses `x-api-key` — a single
  shared key, not per-app.
- **The SSO code exchange** (`POST {grapifly}/auth/sso/exchange`, called by Relay
  and jtrade at login) keeps `x-grapifly-sso-secret`. It's the SSO handshake,
  not a `/internal/*` data call, and it's login-critical.

---

## 3. Response envelope

**Success** — HTTP `200`/`201`:

```json
{ "contractVersion": 3, "data": { "...": "..." } }
```

**Error** — HTTP `4xx`/`5xx`:

```json
{ "contractVersion": 3, "error": { "code": "ORG_NOT_FOUND", "message": "..." } }
```

- `contractVersion` is an integer. Bump it only for a breaking change to a
  given endpoint's `data` shape; add fields freely without a bump.
- `code` is a stable, machine-readable `SCREAMING_SNAKE_CASE` string.
- Pre-standard Grapifly endpoints return `{ contractVersion: 2, <inlineKey>: … }`
  (payload inlined, not under `data`). Those stay as-is until a v3 rewrite.

---

## 4. Client shape

Apps **do not share code** (separate deployments, separate `node_modules`).
Each app copies this ~50-line client into its own integration folder:

```ts
// <app>/backend/src/integrations/<peer>/<peer>-internal.client.ts
@Injectable()
export class PeerInternalClient {
  private readonly base: string;
  private readonly appKey = '<this-app-key>';
  private readonly secret: string;

  constructor(private readonly http: HttpService, config: ConfigService) {
    this.base = (config.get<string>('<PEER>_API_URL') ?? 'http://localhost:PORT')
      .replace(/\/$/, '');
    this.secret = config.get<string>('<THIS_APP>_SERVICE_SECRET') ?? '';
  }

  async post<T>(path: string, body: unknown, actor?: string): Promise<T> {
    if (!this.secret) throw new ServiceUnavailableException('ecosystem secret not configured');
    try {
      const res = await firstValueFrom(this.http.post<{ contractVersion: number; data: T }>(
        `${this.base}/internal${path}`,
        body,
        {
          timeout: 5000,
          headers: {
            'x-ecosystem-app': this.appKey,
            'x-ecosystem-secret': this.secret,
            ...(actor ? { 'x-ecosystem-actor': actor } : {}),
          },
        },
      ));
      return res.data.data;
    } catch (err) {
      // 4xx -> BadRequest with upstream message; else -> ServiceUnavailable
      throw mapEcosystemError(err);
    }
  }
}
```

Rules:
- **Timeout every call** (5 s default).
- **Never** forward a raw upstream 5xx to your own user — map to `503`.
- **Cache** read-only lookups (org/user names change rarely) — a few minutes TTL.
- The `businessId` / `organizationId` / actor **always** comes from the caller's
  own auth context, **never** from the inbound request body.

---

## 5. Endpoint registry

### Grapifly

| Method | Path | Auth | Envelope | Purpose |
|---|---|---|---|---|
| `POST` | `/internal/directory/organizations/resolve` | app-secret | v3 `data` | batch id → `{ organizationId, name, slug, status }` — **permission-free**, display data only |
| `POST` | `/internal/directory/users/resolve` | app-secret | v3 `data` | batch id → `{ grapiflyUserId, displayName, avatarUrl }` — **permission-free**, no email |
| `GET` | `/internal/apps/:appKey/organizations` | app-secret + actor | v2 legacy | orgs the actor belongs to |
| `GET` | `/internal/apps/:appKey/organizations/:id` | app-secret + actor (member) | v2 legacy | full org profile (sensitive fields included) |
| `GET` | `/internal/apps/:appKey/organizations/:id/team` | app-secret + actor (member) | v2 legacy | members + emails + invitations |
| `GET` | `/internal/apps/:appKey/organizations/:id/enabled-apps` | app-secret + actor | v2 legacy | app-switcher list |
| `POST` | `/internal/communication-tokens/validate` | token is the credential | v1 | verify a Relay communication token |

### Relay

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `*` | `/payments/*` | `x-api-key` (shared) | payments window — see `docs/payments/` |
| `POST` | `/notifications/event` | `x-api-key` / `x-integration-token` | fire a notification |

---

## 6. Sensitive vs. display data

The Directory resolve endpoints are permission-free **only** because they return
data that is already effectively public (shown in the app-switcher, the catalog,
team lists you're a member of):

- **OK permission-free**: `organizationId`, `name`, `slug`, `status`,
  `isPlatform`, `isDefault`, `grapiflyUserId`, `displayName`, `avatarUrl`.
- **Never permission-free** (stays membership-scoped on `/internal/apps/:appKey/…`):
  full org profile, `officialEmail` / support contacts, postal address, bank
  account, USDT wallet, member email addresses, membership roles.

If an app needs a member's email, it calls the membership-scoped
`/team` endpoint with a real `x-ecosystem-actor` who belongs to that org.

---

## 7. Rollout status

| App | Client aligned | Notes |
|---|---|---|
| Grapifly | n/a (callee) | accepts canonical + legacy headers; Directory API is the reference impl |
| jtrade | ✅ | `integrations/grapifly/*` on canonical headers; `grapifly-directory.service.ts` added |
| Relay | ✅ | `ecosystem/services/grapifly-*.service.ts` on canonical headers |
| business-app | ⬜ | no Grapifly SSO yet — align when it lands |

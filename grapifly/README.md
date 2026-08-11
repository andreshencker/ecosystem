# Grapifly

Grapifly is the identity and application portal for the ecosystem. It provides a single Grapifly ID and connects JTrade, Business App and Communications App without merging their business data.

## Current MVP

- Google-only sign in using OpenID Connect/OAuth 2.0.
- Automatic Grapifly ID creation on first successful Google login.
- Server-managed `HttpOnly` session cookie.
- Personal portal containing the ecosystem applications.
- Independent MongoDB database.

## Google configuration

Create an OAuth 2.0 Web Application in Google Cloud and add:

- Authorized JavaScript origin: `http://localhost:3100`
- Authorized redirect URI: `http://localhost:3101/auth/google/callback`

Copy `.env.example` to `.env` and set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and a strong `JWT_SESSION_SECRET`.

## Docker

```bash
cd grapifly
cp .env.example .env
docker compose up --build
```

- Portal: http://localhost:3100
- Identity API: http://localhost:3101
- Health: http://localhost:3101/health
- MongoDB: localhost:27019

## Local development

Run `npm install` once inside both `backend/` and `frontend/`. Then use `npm run start:dev` for the backend and `npm run dev` for the frontend.

## Next architecture phases

1. Organizations and memberships.
2. Application registry and first-party/third-party classification.
3. Authorization Code + PKCE issuance for ecosystem applications.
4. Local user linking through `grapiflyUserId`.
5. Consent, scopes, session management and global logout.

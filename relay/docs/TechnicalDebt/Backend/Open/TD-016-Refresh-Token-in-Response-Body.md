---
tags: [technical-debt, security]
id: TD-016
area: Security
priority: Low
status: Open
identified: 2026-06-13
action-plan: AP-012
---

# TD-016 — Refresh Token Delivered in Response Body

## Description

`POST /auth/login` and `POST /auth/refresh` return the refresh token in the JSON response body. The frontend is responsible for storage. If stored in `localStorage` or `sessionStorage`, the token is accessible to any JavaScript on the page.

## Impact

XSS attack surface: a malicious script injected into the frontend page could read the refresh token from storage and use it to obtain a new access token. Not a risk if the frontend stores the token only in memory (lost on page reload) or uses an HTTP-only cookie.

Low severity for the current Phase 1A context — the service is API-first with a trusted internal client. Becomes higher severity when a public-facing frontend ships.

## Planned Resolution

**AP-012** — Add a `REFRESH_TOKEN_COOKIE=true` environment flag. When enabled, `POST /auth/login` and `POST /auth/refresh` set an `HttpOnly; Secure; SameSite=Strict` cookie named `refreshToken` in addition to (or instead of) the response body. `POST /auth/logout` clears the cookie. Existing body-based flow continues to work when flag is off.

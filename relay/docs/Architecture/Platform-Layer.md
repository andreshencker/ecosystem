---
tags: [architecture, layer]
---

# Platform Layer

## Platform Responsibility

The Platform Layer owns the concerns that make this a SaaS product — user identity, authentication, and session management. Entities in this layer are not company-scoped; they exist above individual tenants.

All services share this concern, but for now it is implemented inside the Communication Backend.

**What it owns:**
- User registration and account management
- Email verification and password reset
- JWT-based authentication (access + refresh token lifecycle)
- Session revocation
- Service-to-service authentication (API key)

## Current Implementation

The Platform Layer is implemented in `src/platform/` within the Communication Backend.

For implementation detail — auth endpoints, JWT configuration, guards, SMTP — see:

→ [[Modules/Communication/Backend/Security]]
→ [[Modules/Communication/Backend/API]]
→ [[Modules/Communication/Backend/Architecture]]

## Future Consideration

As additional services are added, platform auth may be extracted into its own service or handled at the API Gateway layer to avoid duplicating auth logic across services.

See [[Future Platform Architecture]] and [[Gateway Layer]].

## Key Decisions
- [[Decisions]]

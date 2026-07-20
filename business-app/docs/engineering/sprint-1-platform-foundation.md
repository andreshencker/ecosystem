# Sprint 1 — Platform Foundation

**Fecha inicio:** 2026-07-03  
**Fecha cierre:** 2026-07-06  
**Estado:** Completado con ítems documentados para Sprint 2

---

## Objetivo

Identity, Business, Security y Provisioning base completamente operativos en `business-app/backend`.

---

## Estado final — resumen ejecutivo

| Área | Estado | Notas |
|---|---|---|
| Identity & Auth (endpoints) | ✅ Completo | Todos los endpoints del spec |
| RBAC — DB-lookup strategy | ✅ Completo | GlobalAuthGuard puebla AuthContext completo |
| Users & Invitations | ✅ Completo | Todos los endpoints del spec |
| Company (platform layer) | ✅ Completo | GET/PATCH /company + SMTP + fiscal-profile |
| Rate limiting auth (15/min) | ✅ Completo | @nestjs/throttler |
| Provisioning infrastructure | ✅ Completo | ProvisioningService llamado tras registro |
| Provisioning — FiscalProfile | ✅ Completo | AUD defaults por schema + verificación en ProvisioningService |
| Provisioning — ChartOfAccounts | 📋 Stub | Sprint 8 (AccountingModule) |
| Provisioning — DocumentPackages | 📋 Stub | Sprint 9 (DocumentModule) |
| Provisioning — CommConnection | 📋 Manual | Requiere config de admin |
| Company vs Business | ✅ Documentado | Ver `docs/architecture/company-vs-business.md` |
| Tests | ✅ 306/306 | 0 errores TypeScript |

---

## Decisión RBAC (DEC-008 rev-2)

**Estrategia elegida: DB-lookup por request.**

El JWT contiene solo `{ sub, type }`. `GlobalAuthGuard`, después de verificar el token, carga el `User` desde MongoDB y puebla:

```typescript
AuthContext = {
  actorType, userId, email,
  role, scope, companyId, companyKey
}
```

**Por qué no JWT-claims:**
- Los cambios de rol (deactivación, promoción) tomarían efecto inmediatamente sin re-login.
- La plataforma tiene pocos endpoints por ahora — la latencia extra (1 DB query/request) es aceptable.
- En Sprint 2+, si el volumen lo requiere, se puede añadir Redis cache en GlobalAuthGuard.

**Efecto:**
- `RolesGuard` + `@Roles()` ahora FUNCIONAN (ctx.role siempre está poblado).
- Usuarios desactivados reciben 401 en el siguiente request.
- `ctx.companyId` disponible en todos los controllers (el `business/` domain ya lo usaba).

---

## Endpoints implementados

### Auth (`POST/GET /auth/*`)

| Endpoint | Estado |
|---|---|
| `POST /auth/register` | ✅ |
| `GET /auth/verify-email` | ✅ |
| `POST /auth/login` | ✅ |
| `POST /auth/refresh` | ✅ |
| `POST /auth/logout` | ✅ |
| `POST /auth/forgot-password` | ✅ |
| `POST /auth/reset-password` | ✅ |
| `GET /auth/me` | ✅ |
| Rate limiting 15 req/min | ✅ |

### Users & Invitations

| Endpoint | Estado |
|---|---|
| `GET /users` | ✅ |
| `GET /users/me` | ✅ |
| `PATCH /users/me` | ✅ |
| `PATCH /users/me/password` | ✅ |
| `GET /users/:id` | ✅ |
| `PATCH /users/:id` | ✅ |
| `DELETE /users/:id` | ✅ |
| `PATCH /users/:id/deactivate` | ✅ |
| `PATCH /users/:id/reactivate` | ✅ |
| `POST /users/:id/send-password-reset` | ✅ |
| `POST /users/invite` | ✅ |
| `GET /users/invitations` | ✅ |
| `POST /users/invitations/:id/resend` | ✅ |
| `PATCH /users/invitations/:id/cancel` | ✅ |

### Company

| Endpoint | Estado |
|---|---|
| `GET /company` | ✅ |
| `PATCH /company` | ✅ |
| `GET /company/fiscal-profile` | ✅ |
| `PATCH /company/fiscal-profile` | ✅ |
| `GET /company/smtp` | ✅ |
| `PATCH /company/smtp` | ✅ |
| `POST /company/smtp/test` | ✅ |

---

## Flujo de provisioning

```
POST /auth/register
    │
    ├── Phase 1 (síncrona, atómica)
    │   ├── createCompanyOwnerWithCompany()  → Company + business_owner
    │   └── setEmailVerificationToken()      → token de verificación de email
    │
    ├── Phase 2a (fire-and-forget)
    │   └── ProvisioningService.provisionBusiness(companyId)
    │       ├── P-03: FiscalProfile defaults (AUD) ✅
    │       ├── P-14: ChartOfAccounts AU        📋 stub → Sprint 8
    │       ├── P-xx: DocumentPackages           📋 stub → Sprint 9
    │       └── P-xx: CommunicationConnection    📋 manual → admin config
    │
    └── Phase 2b (fire-and-forget)
        └── notifyEvent('security.company_verify_email')
```

---

## Archivos modificados en cierre de Sprint 1

| Archivo | Acción | Motivo |
|---|---|---|
| `src/infrastructure/security/guards/global-auth.guard.ts` | Modificado | DB-lookup RBAC — puebla AuthContext completo |
| `src/infrastructure/security/security.module.ts` | Modificado | Importa UsersModule para inyectar UsersService |
| `src/infrastructure/security/types/auth-context.types.ts` | Modificado | Añade campo `email` |
| `src/platform/provisioning/provisioning.service.ts` | Nuevo | Lógica de provisioning |
| `src/platform/provisioning/provisioning.module.ts` | Nuevo | Módulo NestJS |
| `src/platform/auth/auth.service.ts` | Modificado | Llama a provisionBusiness() en register() |
| `src/platform/auth/auth.module.ts` | Modificado | Importa ProvisioningModule |
| `src/platform/auth/tests/auth.service.spec.ts` | Modificado | Mock de ProvisioningService |
| `src/platform/company/company-portal.controller.ts` | Modificado | Actualiza comentario obsoleto |
| `src/platform/company/dto/fiscal-profile.dto.ts` | Nuevo | DTO para fiscal-profile endpoint |
| `src/platform/users/users.controller.ts` | Modificado | GET/PATCH /users/:id |
| `src/app.module.ts` | Modificado | ThrottlerModule + ThrottlerGuard |

---

## Qué pasa a Sprint 2

| Ítem | Por qué se difiere |
|---|---|
| `Business` aggregate conectado a `Company` | Depende de Sprint 2 Customer domain |
| ChartOfAccounts AU por defecto | Depende de Sprint 8 AccountingModule |
| DocumentPackages instalados | Depende de Sprint 9 DocumentModule |
| CommunicationConnection default | Requiere configuración de admin |
| Permission guards granulares `@Permissions()` | Diseño pendiente; `@Roles()` cubre Sprint 2 |

---

## Tests

| Suite | Tests | Estado |
|---|---|---|
| `business-app/backend` | 306/306 | ✅ |
| `communications-app/backend` | 140/140 | ✅ |
| TypeScript | 0 errores | ✅ |

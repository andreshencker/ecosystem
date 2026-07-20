# Communication Audit — Módulos actuales

**Versión:** 1.0 | **Fecha:** 2026-07-07 | **Sprint:** 2 (cierre)

---

## 1. Resumen ejecutivo

| Dimensión | Estado |
|---|---|
| Platform Events implementados | ✅ Todos correctos |
| Business Events implementados | ✅ Ninguno aún — correcto para este sprint |
| Domain Events (Customer) | ✅ Outbox solamente — ningún Communication Event incorrecto |
| Frontend Toast/Snackbar | ✅ Corregido en esta auditoría (3 gaps resueltos) |
| eventKeys hardcodeados sin documentar | ✅ Ninguno encontrado |
| notifyEvent() fuera de Auth/Invitations | ✅ Ninguno — correcto |
| Frontend llamando Communications directamente | ✅ No existe |
| businessId desde frontend | ✅ No existe |
| Tokens resueltos manualmente por módulos | ✅ No existe |
| TODOs de notificación en producción | ✅ Resueltos en esta auditoría |
| Console.log de debug en producción | ✅ Resueltos en esta auditoría |

**Decisión:** Sprint 2 **CERRADO**. Listo para Sprint 3.

---

## 2. Módulos auditados

| Módulo | Tipo | Estado |
|---|---|---|
| `platform/auth` | Application Service | ✅ Correcto |
| `platform/users` | Application Service | ✅ Corregido |
| `platform/user-invitations` | Application Service | ✅ Correcto |
| `platform/company` (CompanyPortalService) | Application Service | ✅ Correcto |
| `customer` | Application Service | ✅ Correcto |
| `mdm` | Read-only catalog | ✅ Sin acciones, sin Toast requerido |
| `platform/provisioning` | Internal (async stub) | ✅ Sin acciones de usuario |
| `settings/communication-connection` | Settings Service | ✅ Correcto |
| `settings/communication-client` | Infrastructure Client | ✅ Correcto |
| `infrastructure/outbox` | Infrastructure | ✅ Sin acciones de usuario |
| Frontend — auth pages | UI | ✅ Feedback manejado en páginas |
| Frontend — customers | UI | ✅ Correcto |
| Frontend — users | UI | ✅ Correcto |
| Frontend — invitations | UI | ✅ Correcto |
| Frontend — settings/company | UI | ✅ Corregido |
| Frontend — settings/communications | UI | ✅ Corregido |

---

## 3. Tabla por método del Service — AuthService

| Método | Toast | Domain Event | Canal externo | Sensible | Platform/Business | eventKey | Estado |
|---|---|---|---|---|---|---|---|
| `register()` | ✅ (página) | — | ✅ Sí | ✅ | Platform | `security.company_verify_email` | ✅ |
| `verifyEmail()` | ✅ (página redirect) | — | ❌ No | — | — | — | ✅ |
| `login()` | ✅ (página redirect) | — | ❌ No | — | — | — | ✅ |
| `refreshTokens()` | ❌ (técnico, silencioso) | — | ❌ No | — | — | — | ✅ |
| `logout()` | ✅ (página redirect) | — | ❌ No | — | — | — | ✅ |
| `forgotPassword()` | ✅ (página) | — | ✅ Sí | ✅ | Platform | `security.company_forgot_password` | ✅ |
| `resetPassword()` | ✅ (página) | — | ✅ Sí | ✅ | Platform | `security.company_password_changed` | ✅ |

---

## 4. Tabla por método — UserInvitationsService

| Método | Toast | Domain Event | Canal externo | Sensible | Platform/Business | eventKey | Estado |
|---|---|---|---|---|---|---|---|
| `sendInvitation()` — business_admin | ✅ | — | ✅ Sí | ✅ | Platform | `security.company_admin_invitation` | ✅ |
| `sendInvitation()` — other roles | ✅ | — | ✅ Sí | ✅ | Platform | `security.company_user_invitation` | ✅ |
| `resendInvitation()` | ✅ | — | ✅ Sí | ✅ | Platform | `security.company_invitation_resent` | ✅ |
| `cancelInvitation()` | ✅ | — | ❌ No | — | — | — | ✅ |
| `handlePasswordCompleted()` | — (event-driven) | — | ✅ Sí | ✅ | Platform | `security.company_welcome_message` | ✅ |
| `acceptInvitationsByEmail()` | — (internal) | — | ❌ No | — | — | — | ✅ |
| `listInvitations()` | ❌ (read) | — | ❌ No | — | — | — | ✅ |

---

## 5. Tabla por método — UsersController (endpoints)

| Endpoint | Toast | Domain Event | Canal externo | Sensible | Platform/Business | eventKey | Estado |
|---|---|---|---|---|---|---|---|
| `GET /users` (listPlatformUsers) | ❌ (read) | — | ❌ No | — | — | — | ✅ |
| `GET /users/me` | ❌ (read) | — | ❌ No | — | — | — | ✅ |
| `PATCH /users/me` (update profile) | ✅ | — | ❌ No | — | — | — | ✅ |
| `PATCH /users/me/password` (changePassword) | ✅ | — | ✅ Sí (cuando no wasMustChange) | ✅ | Platform | `security.company_password_changed` | ✅ corregido |
| `DELETE /users/:id` | ✅ | — | ❌ No | — | — | — | ✅ |
| `PATCH /users/:id/deactivate` | ✅ | — | ❌ No | — | — | — | ✅ |
| `PATCH /users/:id/reactivate` | ✅ | — | ❌ No | — | — | — | ✅ |
| `POST /users/:id/send-password-reset` | ✅ | — | ✅ Sí | ✅ | Platform | `security.company_forgot_password` | ✅ corregido |

---

## 6. Tabla por método — CustomerService

| Método | Toast | Domain Event | Canal externo | Sensible | Platform/Business | eventKey | Estado |
|---|---|---|---|---|---|---|---|
| `create()` | ✅ | `CustomerCreated` → Outbox | ❌ No | — | — | — | ✅ |
| `findAll()` | ❌ (read) | — | ❌ No | — | — | — | ✅ |
| `findById()` | ❌ (read) | — | ❌ No | — | — | — | ✅ |
| `update()` | ✅ | `CustomerUpdated` → Outbox | ❌ No | — | — | — | ✅ |
| `deactivate()` | ✅ | `CustomerDeactivated` → Outbox | ❌ No | — | — | — | ✅ |
| `getContacts()` | ❌ (read) | — | ❌ No | — | — | — | ✅ |
| `addContact()` | ✅ | — | ❌ No | — | — | — | ✅ |
| `updateContact()` | ✅ | — | ❌ No | — | — | — | ✅ |
| `removeContact()` | ✅ | — | ❌ No | — | — | — | ✅ |

---

## 7. Tabla por método — CompanyPortalService

| Método | Toast | Domain Event | Canal externo | Sensible | Estado |
|---|---|---|---|---|---|
| `getOwnCompany()` | ❌ (read) | — | ❌ No | — | ✅ |
| `updateOwnCompany()` | ✅ (corregido) | — | ❌ No | — | ✅ corregido |
| `getFiscalProfile()` | ❌ (read) | — | ❌ No | — | ✅ |
| `updateFiscalProfile()` | ✅ (corregido) | — | ❌ No | — | ✅ corregido |
| `getSmtp()` | ❌ (read) | — | ❌ No | — | ✅ |
| `updateSmtp()` | ✅ (global error handler) | — | ❌ No | — | ✅ |
| `testSmtp()` | ✅ (inline Alert — apropiado para test) | — | ❌ No | — | ✅ |

---

## 8. Tabla por método — CommunicationConnectionService

| Método | Toast | Domain Event | Canal externo | Estado |
|---|---|---|---|---|
| `get()` | ❌ (read) | — | ❌ | ✅ |
| `save()` | ✅ (corregido) | — | ❌ | ✅ corregido |
| `test()` | ✅ (inline — apropiado para test) | — | ❌ | ✅ |
| `toggle()` | ✅ (corregido) | — | ❌ | ✅ corregido |
| `delete()` | ✅ (corregido) | — | ❌ | ✅ corregido |

---

## 9. MdmService

Read-only catalog. Sin acciones de usuario, sin Toast requerido, sin Communications, sin Domain Events. ✅ Correcto.

---

## 10. Estado del frontend — Toast/Snackbar

### Sistema de Toast

- `GlobalSnackbar` componente en layout raíz — disponible en toda la app ✅
- `useUIStore.pushSnack()` es el único punto de acceso ✅
- `MutationCache.onError` en queryClient.ts — fallback global para errores ✅

### Estado por hook

| Hook / Módulo | onSuccess Toast | onError Toast | Estado |
|---|---|---|---|
| `useCustomers` — createCustomer | ✅ "Customer created" | ✅ | ✅ |
| `useCustomers` — updateCustomer | ✅ "Customer updated" | ✅ | ✅ |
| `useCustomers` — deactivateCustomer | ✅ "Customer deactivated" | ✅ | ✅ |
| `useCustomers` — addContact | ✅ "Contact added" | ✅ | ✅ |
| `useCustomers` — updateContact | ✅ "Contact updated" | ✅ | ✅ |
| `useCustomers` — removeContact | ✅ "Contact removed" | ✅ | ✅ |
| `useUsers` — updateUser | ✅ "User updated" | ✅ | ✅ |
| `useUsers` — updateMe | ✅ "Profile updated" | ✅ | ✅ |
| `useUsers` — changePassword | ✅ "Password changed" | ✅ | ✅ |
| `useUsers` — deleteUser | ✅ "User deleted successfully." | ✅ | ✅ |
| `useUsers` — adminPasswordReset | ✅ (mensaje del backend) | ✅ | ✅ |
| `useUsers` — deactivateUser | ✅ "User deactivated" | ✅ | ✅ |
| `useUsers` — reactivateUser | ✅ "User reactivated" | ✅ | ✅ |
| `useInvitations` — inviteUser | ✅ success/warning + mensaje | ✅ | ✅ |
| `useInvitations` — resendInvitation | ✅ success/warning | ✅ | ✅ |
| `useInvitations` — cancelInvitation | ✅ "Invitation cancelled" | ✅ | ✅ |
| `useCompanies` — updateCompany | ✅ "Company settings saved." **CORREGIDO** | ✅ **CORREGIDO** | ✅ |
| `useIntegration` — save | ✅ "Integration saved successfully." **CORREGIDO** | ✅ **CORREGIDO** | ✅ |
| `useIntegration` — test | ❌ inline Alert (apropiado) | ✅ **CORREGIDO** | ✅ |
| `useIntegration` — toggle | ✅ "Integration enabled/disabled." **CORREGIDO** | ✅ **CORREGIDO** | ✅ |
| `useIntegration` — remove | ✅ "Integration deleted." **CORREGIDO** | ✅ **CORREGIDO** | ✅ |
| Auth pages | ✅ feedback en página (redirect/alert) | ✅ | ✅ |

---

## 11. Estado de Domain Events

| Evento | Servicio | Destino | Estado |
|---|---|---|---|
| `CustomerCreated` | `CustomerService.create()` | Outbox → BI/Analytics (Sprint 11) | ✅ Publicado |
| `CustomerUpdated` | `CustomerService.update()` | Outbox → BI (Sprint 11) | ✅ Publicado |
| `CustomerDeactivated` | `CustomerService.deactivate()` | Outbox → BI (Sprint 11) | ✅ Publicado |

Sin Communication Events generados automáticamente a partir de Domain Events. ✅ Correcto.

---

## 12. Estado de Platform Events

| eventKey | Implementado | Documentado | Estado |
|---|---|---|---|
| `security.company_verify_email` | ✅ | ✅ | ✅ |
| `security.company_forgot_password` | ✅ | ✅ | ✅ |
| `security.company_password_changed` | ✅ | ✅ | ✅ |
| `security.company_admin_invitation` | ✅ | ✅ | ✅ |
| `security.company_user_invitation` | ✅ | ✅ | ✅ |
| `security.company_invitation_resent` | ✅ | ✅ | ✅ |
| `security.company_welcome_message` | ✅ | ✅ | ✅ |

---

## 13. Estado de Business Events

Ningún Business Event implementado aún. Correcto para este sprint. El Communication Catalog (`seed-catalog.ts`) está documentado pero pendiente de implementación. Se implementa en Sprint 6 (Billing).

---

## 14. Verificaciones de seguridad de Communications

| Regla | Estado |
|---|---|
| Ningún módulo resuelve tokens directamente | ✅ Todo pasa por `getCommunicationConnectionForContext()` |
| Todo envío externo pasa por `CommunicationClientService.notifyEvent()` | ✅ |
| No existen llamadas directas a SMTP para notificaciones | ✅ `testSmtp()` es solo verificación de config |
| No existen eventKeys hardcodeados sin documentación | ✅ 7 keys, todos documentados |
| No existen Business Events fuera del Communication Catalog | ✅ No hay ningún Business Event implementado |
| Frontend nunca llama Communications directamente | ✅ Verificado: ninguna URL de Communications en frontend |
| CustomerCreated/Updated/Deactivated NO generan Communications | ✅ Solo Outbox |
| businessId nunca viene del request body para Communications | ✅ |

---

## 15. Correcciones realizadas en esta auditoría

### Código corregido

| Archivo | Problema | Corrección |
|---|---|---|
| `frontend/hooks/api/useCommunicationConnection.ts` | save/toggle/remove sin Toast de éxito; sin Toast de error propio | Agregado `pushSnack` en onSuccess y onError para save, toggle, remove; test tiene error handler |
| `frontend/hooks/api/useCompanies.ts` | `useUpdateCompany` sin Toast (usaba inline Alert en página) | Agregado `pushSnack` success + error |
| `frontend/modules/user-invitations/hooks.ts` | 4 `console.log/error` de debug en producción | Eliminados |
| `backend/platform/users/users.module.ts` | `CommunicationClientModule` no importado | Importado |
| `backend/platform/users/users.controller.ts` | `changePassword` tenía `TODO: notification` — no enviaba email de confirmación tras cambio voluntario de contraseña | Implementado: `notifyEvent({ type:'platform', event:'security.company_password_changed' })` cuando `!wasMustChange` |
| `backend/platform/users/users.controller.ts` | `sendPasswordReset` tenía `TODO: notification` — admin podía triggear reset pero el email nunca se enviaba | Implementado: `notifyEvent({ type:'platform', event:'security.company_forgot_password' })` con resetUrl y expiresAt ya calculados |

---

## 16. Deudas técnicas restantes

| Deuda | Impacto | Prioridad | Sprint sugerido |
|---|---|---|---|
| `seed-catalog.ts` no existe | Sin él, ningún Business Event puede implementarse | Alta | Sprint 6 (Billing) — primer paso antes de `notifyEvent()` |
| `SeedProvisioningService` no implementado | El token-save no provisiona Communications | Alta | Sprint 6 — junto con seed-catalog |
| `type: 'company'` debería ser `'business'` en código | Inconsistencia terminología | Baja | Sprint de refactor |
| Validación de startup si empresa base sin `CommunicationConnection` | Silent failure en producción | Media | Antes de go-live |
| BI handlers para Customer events (Sprint 11) | Analytics pendiente | Normal | Sprint 11 |
| Responsive layout en settings/company/page.tsx | Mobile usa form largo sin card layout | Baja | Sprint 3+ UI sprint |

---

## 17. Recomendación final — Go/No-Go Sprint 3

**GO ✅ — Sprint 2 cerrado. Sprint 3 puede comenzar.**

**Justificación:**
- Todos los Platform Events correctamente implementados y documentados
- Ningún Business Event implementado incorrectamente
- Ningún módulo viola las reglas de Communications
- Frontend cumple el estándar de Toast en todos los módulos actuales
- Dos bugs de notificación resueltos (`changePassword` y `sendPasswordReset`)
- Debug `console.log` eliminado
- Communication Catalog documentado y su implementación claramente diferida a Sprint 6

**Los módulos futuros tienen un estándar claro** en `communication-architecture.md` + `module-development-standard.md` + `definition-of-done.md §9`.

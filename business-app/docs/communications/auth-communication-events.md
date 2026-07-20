> ⚠️ **DEPRECATED** — Este documento fue migrado a:
> **`docs/integrations/communications/notifications.md`** (§3 Platform Events)
> No actualizar este documento. Usar la nueva fuente de verdad.

# Auth — Communication Events

**Versión:** 1.0  
**Fecha:** 2026-07-06  
**Estado:** Canónico — implementado

---

## 1. Principio

Todos los eventos de Auth/Security son eventos de **plataforma** (`type: 'platform'`).

Siempre usan la conexión de la empresa base (`isPlatformCompany: true`), independientemente de qué empresa pertenezca el usuario. Esto es obligatorio porque:

1. En el momento del registro, la empresa recién creada no tiene `CommunicationConnection`.
2. El usuario invitado no puede iniciar sesión para configurar su conexión.
3. La recuperación de contraseña debe funcionar aunque la empresa haya desactivado su conexión.

---

## 2. Mapa de eventos

### AuthService

| Método | Event Key | Variables requeridas |
|--------|-----------|---------------------|
| `register()` | `security.company_verify_email` | firstName, email, verificationUrl, expiresAt, loginUrl |
| `forgotPassword()` | `security.company_forgot_password` | firstName, email, companyName, resetUrl, expiresAt |
| `resetPassword()` | `security.company_password_changed` | firstName, email, companyName, when |

### UserInvitationsService

| Método | Event Key | Variables requeridas |
|--------|-----------|---------------------|
| `sendInvitation()` — business_admin | `security.company_admin_invitation` | firstName, email, companyName, role, tempPassword, loginUrl |
| `sendInvitation()` — company_user | `security.company_user_invitation` | firstName, email, companyName, role, tempPassword, loginUrl |
| `resendInvitation()` | `security.company_invitation_resent` | firstName, email, companyName, role, tempPassword, loginUrl |
| `handlePasswordCompleted()` | `security.company_welcome_message` | firstName, email, companyName, role, loginUrl |

---

## 3. Templates provisionados

Todos los eventos anteriores tienen template por defecto en Communications:

```
communications-app/backend/src/communication/company/provisioning/constants/default-events.constant.ts
```

Templates definidos:
- `company_verify_email` (dominio: `security`)
- `company_forgot_password` (dominio: `security`)
- `company_password_changed` (dominio: `security`)
- `company_admin_invitation` (dominio: `security`)
- `company_user_invitation` (dominio: `security`)
- `company_invitation_resent` (dominio: `security`)
- `company_welcome_message` (dominio: `security`)

Todos con `scope: 'platform'` y `senderScope: 'platform'`.

---

## 4. Implementación actual

### Patrón en AuthService

```typescript
this.commClient.notifyEvent({
  type:      'platform',           // ← SIEMPRE modules para Auth
  companyId: String(user.companyId), // ← solo para logging, no afecta resolución
  event:     'security.company_verify_email',
  email:     user.email,
  data:      { firstName, email, verificationUrl, expiresAt, loginUrl },
});
```

### Patrón en UserInvitationsService

```typescript
this.commClient.notifyEvent({
  type:      'platform',           // ← SIEMPRE modules para invitaciones
  companyId: params.companyId,     // ← solo para logging
  event:     'security.company_user_invitation',
  email:     params.email,
  data:      { firstName, email, companyName, role, tempPassword, loginUrl },
});
```

---

## 5. Eventos que NO tienen Communication Event en Auth

| Acción | Por qué no tiene Communication Event |
|--------|--------------------------------------|
| Login exitoso | Feedback en pantalla (token JWT) — no se notifica por email |
| Logout | Acción local — no se notifica por email |
| Refresh token | Operación técnica transparente — no se notifica |
| Cambio de rol | Notificación por toast — no requiere email externo |
| Cancelación de invitación | Acción administrativa — toast al actor |

---

## 6. Eventos pendientes (no implementados aún)

| Evento potencial | Justificación | Decisión |
|------------------|---------------|----------|
| `security.user_activated` | Notificar que la cuenta fue activada manualmente | A definir si aplica |
| `security.account_locked` | Notificar múltiples intentos fallidos | A definir si aplica |
| `security.new_device_login` | Alerta de seguridad por login desde dispositivo nuevo | A definir si aplica |

Antes de implementar cualquiera de estos, aplicar la regla de decisión:  
¿El usuario realmente necesita recibir un email? ¿No basta un toast?

---

## 7. SMTP en Company Portal

`CompanyPortalService` tiene un `testSmtp()` que usa nodemailer para verificar una conexión SMTP.  
Esto es solo para el flujo de configuración/prueba — **no se usa para enviar notificaciones**.  
El envío real siempre pasa por `CommunicationClientService.notifyEvent()`.

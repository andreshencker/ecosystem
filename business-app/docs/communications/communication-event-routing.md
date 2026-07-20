> ⚠️ **DEPRECATED** — Este documento fue migrado a:
> **`docs/integrations/communications/notifications.md`** (§5-§6 Flujos técnicos)
> **`docs/integrations/communications/README.md`** (§Token resolution)
> No actualizar este documento. Usar la nueva fuente de verdad.

# Enrutamiento de eventos de comunicación

**Versión:** 1.2  
**Fecha:** 2026-07-04  
**Estado:** Implementado — ver sección 11 para estado detallado por punto

---

## 1. Problema encontrado

Durante el registro inicial de una empresa nueva, el sistema intentaba enviar el correo de verificación de email usando la conexión de Communications configurada para esa empresa. Sin embargo, la empresa recién creada no tiene `CommunicationConnection` configurado — no puede tenerlo porque acaba de ser creada.

**Logs antes de este fix:**
```
[CommunicationClientService] SKIPPED — no active CommunicationConnection found for
                             businessCompanyId=<nueva empresa>.
delivered=false
```

**Logs después del fix:**
```
type=platform → resolving connection for platformCompanyId=6a4763381f1b814d45cd1043
connection resolved — remoteCompanyId=6a47598e0e4756be6dde82ca token=gpf_test_559...
POST http://localhost:3001/notifications/event
```

El token de la plataforma se resuelve correctamente. El `SKIPPED` desapareció.

---

## 2. Causa raíz original

`CommunicationClientService.notifyEvent()` asumía que todos los eventos debían usar la conexión de la empresa del usuario. Incorrecto para eventos de ciclo de vida de la plataforma.

---

## 3. Principio fundamental: `type` es interno a Business App

> **Communications no sabe nada de `type`, de empresa base, ni de empresa usuaria.**
>
> `type` es una decisión que se toma **dentro de Business App**, antes de llamar a Communications.
> Su único propósito es seleccionar el token y el `remoteCompanyId` correctos.
>
> Communications recibe siempre un request ya resuelto:
> `{ companyId, event, email, payload }` con el token correcto en el header.
> No recibe `type`. Su contrato no cambia.

---

## 4. Dos tipos de enrutamiento

### `type = 'platform'`

La comunicación es emitida por **Invoice App (la plataforma)** hacia el usuario.
Usa siempre la conexión de la empresa base (`isPlatformCompany: true`).
Funciona incluso antes de que el tenant configure su propia conexión.

**Servicios actuales que usan `type: 'platform'`:**
- `AuthService.register()` → `security.company_verify_email`
- `AuthService.forgotPassword()` → `security.company_forgot_password`
- `AuthService.resetPassword()` → `security.company_password_changed`
- `UserInvitationsService.sendInvitation()` → `security.company_admin_invitation` / `security.company_user_invitation`
- `UserInvitationsService.resendInvitation()` → `security.company_invitation_resent`
- `UserInvitationsService.handlePasswordCompleted()` → `security.company_welcome_message`

### `type = 'company'`

La comunicación es emitida por **la empresa usuaria** hacia sus propios clientes.
Usa la conexión de la empresa propietaria del recurso (`companyId` obligatorio).

**Servicios futuros que usarán `type: 'company'`:**
- Módulo de facturas → `invoices.invoice_sent`
- Módulo de pagos → `payments.reminder_sent`
- Módulo de reportes → cualquier evento de exportación
- Cualquier comunicación comercial de la empresa hacia sus clientes

---

## 5. Tabla de clasificación

| Evento / Acción | Tipo | Conexión a usar |
|-----------------|------|-----------------|
| `security.company_verify_email` | `platform` | Empresa base (Invoice App) |
| `security.company_forgot_password` | `platform` | Empresa base (Invoice App) |
| `security.company_password_changed` | `platform` | Empresa base (Invoice App) |
| `security.company_admin_invitation` | `platform` | Empresa base (Invoice App) |
| `security.company_user_invitation` | `platform` | Empresa base (Invoice App) |
| `security.company_invitation_resent` | `platform` | Empresa base (Invoice App) |
| `security.company_welcome_message` | `platform` | Empresa base (Invoice App) |
| Envío de factura a cliente | `company` | Empresa emisora de la factura |
| Recordatorio de pago | `company` | Empresa emisora del cobro |
| Envío de reporte | `company` | Empresa que generó el reporte |
| Notificación comercial | `company` | Empresa que inicia la acción |

---

## 6. Función de resolución implementada

### `CommunicationConnectionService.getCommunicationConnectionForContext()`

```typescript
async getCommunicationConnectionForContext(
  type: 'platform' | 'company',
  businessCompanyId?: string,
): Promise<CompanyConnection | null>
```

**Lógica:**

```
Si type === 'platform':
  1. Buscar company con isPlatformCompany = true → obtener platformCompanyId
  2. Buscar CommunicationConnection para ese platformCompanyId
  3. Retornar { communicationCompanyId, decryptedToken, ... }
  4. Si no existe → log error crítico, retornar null

Si type === 'company':
  1. Usar el businessCompanyId recibido
  2. Buscar CommunicationConnection para ese companyId
  3. Si no existe → log warning, retornar null
```

### `NotifyEventParams` actualizado

```typescript
export interface NotifyEventParams {
  type: 'platform' | 'company';
  companyId?: string;  // requerido en type='company'; logging en type='modules'
  event: string;
  email: string;
  data: Record<string, string | undefined | null>;
}
```

### Cómo llaman los servicios

```typescript
// ✅ Plataforma — AuthService, UserInvitationsService
this.commClient.notifyEvent({
  type:      'platform',  // ← resolución interna desde base company
  companyId,              // ← solo para logging (no afecta conexión)
  event:     'security.company_verify_email',
  email:     user.email,
  data:      { ... },
});

// ✅ Empresa (futuro) — InvoiceService, PaymentService, etc.
this.commClient.notifyEvent({
  type:      'company',
  companyId: invoice.companyId,  // ← determina qué conexión usar
  event:     'invoices.invoice_sent',
  email:     customer.email,
  data:      { ... },
});
```

Communications recibe en ambos casos el mismo shape:
```json
{ "companyId": "<remoteCompanyId resuelto>", "event": "...", "email": "...", "payload": {...} }
```

---

## 7. Por qué el registro no puede usar la empresa recién creada

El registro crea empresa y usuario de forma atómica. En ese momento:
1. La empresa acaba de existir — sin `CommunicationConnection`.
2. El usuario no puede iniciar sesión para configurarla — email no verificado.
3. El email de verificación necesita enviarse primero.

Dependencia circular. La única solución: usar la empresa base que ya tiene conexión configurada.

---

## 8. Riesgos de mezclar tipos

### Usar `type='company'` para eventos de plataforma

| Riesgo | Descripción |
|--------|-------------|
| **Bloqueo en registro** | Empresa nueva sin conexión → email de verificación nunca llega → cuenta inactivable. |
| **Dependencia del ciclo de vida** | Si la empresa desactiva su conexión, sus usuarios pierden recuperación de contraseña. |
| **Identidad de marca incorrecta** | Correos de la plataforma llegarían con la identidad visual de la empresa usuaria. |

### Usar `type='platform'` para eventos de empresa

| Riesgo | Descripción |
|--------|-------------|
| **Identidad incorrecta** | Clientes reciben facturas desde Invoice App, no desde la empresa emisora. |
| **Throttling compartido** | Cuota de envío de la empresa base se consume por todas las empresas usuarias. |
| **Violación del aislamiento de tenant** | Cada empresa debe usar sus propias credenciales para sus comunicaciones. |

---

## 9. Reglas de operación

### Empresa base (Invoice App)
- Debe tener siempre `CommunicationConnection` activa y testeada.
- Es un **requisito operativo no negociable** — la plataforma no puede funcionar sin ella.
- Si su conexión cae, ningún usuario nuevo puede verificar su email ni recuperar contraseña.

### Empresas usuarias
- Su conexión es opcional para usar la plataforma base.
- Obligatoria cuando quieren enviar comunicaciones propias (facturas, etc.).
- Si no tiene conexión → `delivered=false`, log de aviso, no falla el flujo principal.

---

## 10. Logs de diagnóstico implementados

```
[CommunicationClientService]     type=platform businessCompanyId=<id> recipient=<email>
[CommunicationConnectionService] type=platform → resolving connection for platformCompanyId=<id>
[CommunicationClientService]     connection resolved — remoteCompanyId=<id> token=<prefix>...
[CommunicationClientService]     POST <url>
                                   headers: { x-api-key: "<prefix>..." }
                                   body: { companyId, event, email, payload }
[CommunicationClientService]     DELIVERED — HTTP 200 / FAILED — httpStatus: <n> responseBody: <json>
```

---

## 11. Estado de implementación

| Punto | Estado |
|-------|--------|
| `getCommunicationConnectionForContext()` en `CommunicationConnectionService` | ✅ Implementado |
| `type` en `NotifyEventParams` | ✅ Implementado |
| `CommunicationClientService.notifyEvent()` usa el nuevo método | ✅ Implementado |
| `AuthService` — 3 eventos con `type: 'platform'` | ✅ Implementado |
| `UserInvitationsService` — 3 eventos con `type: 'platform'` | ✅ Implementado |
| Logs de diagnóstico por tipo | ✅ Implementado |
| Futuros módulos de negocio con `type: 'company'` | ⏳ Pendiente (cuando existan) |
| Validación de startup si base company sin conexión | ⏳ Pendiente |

---

## 12. Autenticación en POST /notifications/event — RESUELTO

**Estado:** ✅ Resuelto — implementado en `GlobalAuthGuard` de Communications.

**Solución adoptada (Opción A extendida):** `GlobalAuthGuard` en Communications acepta el integration token tanto en `x-integration-token` como en `x-api-key` (cuando el valor no coincide con `COMMUNICATION_API_KEY`). Business App envía el token como `x-api-key`, el guard lo detecta como token de integración y lo valida vía `resolveCompanyByToken()`.

**Flujo resuelto:**

```
Business App                                     Communications GlobalAuthGuard
  │                                                     │
  │──POST /notifications/event──────────────────────→   │
  │  headers: { x-api-key: "<integration-token>" }      │
  │  body: { companyId, event, email, payload }          │
  │                                                     │
  │                    ┌─ step 3: ¿x-api-key === COMMUNICATION_API_KEY? No (es integration token)
  │                    ├─ step 4: ¿es token de integración? Sí → resolveCompanyByToken()
  │                    └─ authContext.companyId = <Communications companyId>
  │                                                     │
  │←────────────────────────────────────────────────────│
        200 / 207
```

**Invariante:** `dto.companyId` del body nunca se usa para resolver la empresa — siempre se usa el `companyId` resuelto desde la autenticación. El body `companyId` solo se registra en log para diagnóstico y coherencia.

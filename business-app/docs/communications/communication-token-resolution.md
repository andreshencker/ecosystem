> ⚠️ **DEPRECATED** — Este documento fue migrado a:
> **`docs/integrations/communications/README.md`** (§Token resolution + §Modelo de conexión)
> No actualizar este documento. Usar la nueva fuente de verdad.

# Resolución de token de comunicación

**Versión:** 1.0  
**Fecha:** 2026-07-06  
**Estado:** Canónico — implementado

---

## 1. Principio

Ningún módulo de Business App resuelve tokens de Communications por su cuenta.  
Toda resolución pasa por `CommunicationConnectionService.getCommunicationConnectionForContext()`.

---

## 2. El resolver implementado

### Clase

```
business-app/backend/src/settings/communication-connection/communication-connection.service.ts
```

### Método principal

```typescript
getCommunicationConnectionForContext(
  type: 'platform' | 'company',
  businessCompanyId?: string,
): Promise<CompanyConnection | null>
```

### Tipos de retorno

```typescript
interface CompanyConnection {
  communicationCompanyId: string;  // companyId en Communications
  decryptedToken: string;          // integration token (nunca loggear completo)
  status: 'connected' | 'failed' | null;
  isActive: boolean;
}
```

---

## 3. Lógica de resolución

### `type = 'platform'` — Eventos de plataforma

Se usa para eventos del sistema: auth, invitaciones, lifecycle de la plataforma.

```
1. Buscar company con isPlatformCompany = true → obtener platformCompanyId
2. Buscar CommunicationConnection activa para ese platformCompanyId
3. Desencriptar el token
4. Retornar { communicationCompanyId, decryptedToken, ... }

Si no existe conexión → log error crítico, retornar null (notificación skipped)
```

La empresa base (platform company) SIEMPRE debe tener una `CommunicationConnection` activa.  
Si no la tiene, los usuarios no pueden verificar email ni recuperar contraseña.

### `type = 'company'` — Eventos de negocio del tenant

Se usa para eventos del tenant: facturas, reportes, documentos.

```
1. Usar el businessCompanyId recibido (nunca proviene del frontend)
2. Buscar CommunicationConnection activa para ese companyId
3. Desencriptar el token
4. Retornar { communicationCompanyId, decryptedToken, ... }

Si no existe conexión → log warning, retornar null (notificación skipped, no falla el flujo)
```

---

## 4. El único punto de llamada a Communications

`CommunicationClientService.notifyEvent()` es el único lugar que:
1. Llama a `getCommunicationConnectionForContext()`
2. Construye el request HTTP
3. Envía el token como `x-api-key` header
4. Loggea el resultado

Ningún servicio de dominio llama a Communications directamente.

```typescript
// Patrón correcto — en cualquier servicio
this.commClient.notifyEvent({
  type:      'platform' | 'company',
  companyId: '<id para logging o resolución>',
  event:     'domain.event_key',
  email:     recipient,
  data:      { /* variables del template */ },
});
```

---

## 5. Tabla de calificación de tipo

| Módulo / Acción | type | businessCompanyId |
|----------------|------|-------------------|
| Auth — verify email | `platform` | companyId del usuario (logging) |
| Auth — forgot password | `platform` | companyId del usuario (logging) |
| Auth — password changed | `platform` | companyId del usuario (logging) |
| Invitations — send | `platform` | companyId de la empresa (logging) |
| Invitations — resend | `platform` | companyId de la empresa (logging) |
| Invitations — welcome | `platform` | companyId de la empresa (logging) |
| Invoices — invoice_sent | `company` | companyId del tenant emisor (**obligatorio**) |
| Payments — payment_received | `company` | companyId del tenant emisor (**obligatorio**) |
| Documents — document_sent | `company` | companyId del tenant emisor (**obligatorio**) |

---

## 6. Seguridad

- El `businessCompanyId` para eventos `type='company'` SIEMPRE viene del `AuthContext` / JWT en el backend.
- Nunca viene del frontend como parámetro libre.
- Communications resuelve el `effectiveCompanyId` desde la autenticación (token), nunca desde el body.

---

## 7. Lo que Communications nunca ve

- El campo `type` (`platform` / `company`) — es una decisión interna de Business App.
- El `businessCompanyId` local de Business App — solo se envía el `communicationCompanyId` resuelto.
- Ninguna decisión de routing — Communications recibe una request ya resuelta.

Communications siempre recibe:
```json
{
  "companyId": "<remoteCompanyId resuelto>",
  "event": "domain.event_key",
  "email": "destinatario@email.com",
  "payload": { "data": { ... } }
}
```
Con `x-api-key: <integration-token>` en el header.

# Communications Integration

## Qué es

Communications App es un servicio externo del mismo monorepo que actúa como el motor de entrega de comunicaciones del ERP (emails, SMS, notificaciones, generación de PDFs).

## Para qué sirve en Business App

Business App decide **qué comunicar, a quién, y cuándo**. Communications App decide **cómo entregarlo, con qué template, a través de qué proveedor**.

Módulos que consumen esta integración:
- `src/modules/auth/` — verificación de email, reset de contraseña, invitaciones
- `src/modules/user-invitations/` — emails de invitación a Business
- Futuros: billing (envío de invoices), work (confirmaciones de turno)

## Autenticación

**Platform events:** `x-api-key` con la clave del Platform Company (env: `COMMUNICATION_API_KEY`).
**Business events:** `x-api-key` con el Integration Token del Business, cifrado en `IntegrationConnection`.

El token nunca viaja en texto plano. Se cifra con AES-256-GCM al guardar y se descifra en memoria solo para cada request.

## Variables de entorno requeridas

| Variable | Descripción |
|---|---|
| `COMMUNICATION_API_URL` | Base URL de Communications App (ej: `http://localhost:3001`) |
| `COMMUNICATION_API_KEY` | API Key del Platform Company en Communications App |
| `ENCRYPTION_KEY` | Clave AES-256-GCM para cifrar tokens de integración |

## Qué provee a otros módulos

| Export | Uso |
|---|---|
| `CommunicationConnectionService` | Gestión del token: guardar, probar, resolver por contexto |
| `CommunicationsClientService` | `notifyEvent()` — única forma de enviar notificaciones |
| `CommunicationCatalogProvisioningService` | Provisiona el catálogo de eventos al iniciar la app |

## Cómo enviar una notificación

```typescript
// Desde cualquier módulo que tenga CommunicationsModule importado
await this.commClient.notifyEvent({
  type:       'platform' | 'business',
  businessId: string,   // del JWT — NUNCA del request body
  event:      'security.company_verify_email',
  email:      'user@example.com',
  data:       { firstName: 'Ana', verificationUrl: '...' },
});
```

Todo evento enviable debe estar registrado en `catalog/communication-catalog.ts`.

## Estructura interna

```
communications/
  communications.module.ts          — módulo principal, provisiona catálogo al arrancar
  catalog/
    communication-catalog.ts        — catálogo unificado: platform + business events
    communication-catalog.types.ts  — tipos TypeScript del catálogo
    communication-catalog.validator.ts
  client/
    communications-client.service.ts  — cliente HTTP (único punto de llamada a Comms)
    communications-client.module.ts
    dto/notify-event-params.interface.ts
  connection/
    communication-connection.schema.ts  — IntegrationConnection (genérico, provider-agnostic)
    communication-connection.service.ts — resolución de token, CRUD de conexión
    communication-connection.controller.ts — endpoints de Settings → Integrations
    communication-connection.module.ts
    dto/communication-connection.dto.ts
  provisioning/
    communication-catalog-provisioning.service.ts — provisiona dominios y eventos en Comms
    communication-catalog-provisioning.module.ts
```

## Cómo probar la conexión

1. Iniciar Business App y Communications App
2. En Settings → Integrations → Communications, pegar un Integration Token válido
3. El endpoint `PATCH /integrations/communications/connection` llama a `GET /company-integrations/me` en Comms
4. Si el token es válido, guarda el `remoteCompanyId` y marca `lastStatus: 'connected'`

## Documentación detallada

- `docs/integrations/communications/README.md` — arquitectura de la integración
- `docs/integrations/communications/notifications.md` — catálogo completo y flujo de notifyEvent
- `docs/integrations/communications/files.md` — capacidad Files (definición pendiente)
- `docs/decisions/ADR-019-seed-catalog.md` — decisión del catálogo unificado
- `docs/decisions/ADR-020-integrations-architecture.md` — por qué el código vive aquí

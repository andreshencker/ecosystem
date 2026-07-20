# Communications Integration

**Versión:** 1.0 | **Fecha:** 2026-07-07 | **Estado:** Canónico — fuente de verdad única
**Reemplaza:** `docs/architecture/communication-architecture.md`, `docs/communications/communication-token-resolution.md`

---

## ¿Qué es Communications App?

Communications App es una aplicación externa independiente — un servicio separado del mismo monorepo — que actúa como el motor de entrega de comunicaciones externas del ERP.

Business App decide qué comunicar, a quién, y cuándo.
Communications App decide cómo entregarlo, a través de qué proveedor, con qué template.

```
Business App                          Communications App
────────────────                      ──────────────────────────────────
decide cuándo enviar         →        resuelve el domain y el event
decide qué evento ejecutar   →        selecciona el template
decide a quién enviar        →        aplica el layout y el theme
decide qué payload enviar    →        resuelve el proveedor y credenciales
decide platform o business   →        renderiza y entrega
                                      registra logs de entrega
```

**Principio absoluto:** Communications nunca toma decisiones de negocio. Business App nunca implementa lógica de envío.

---

## Dos capacidades

Communications App tiene exactamente dos capacidades. Son independientes entre sí y tienen documentación separada.

| Capacidad | Documento | Estado |
|---|---|---|
| **Notifications** — envío de emails, SMS y otras comunicaciones | [`notifications.md`](./notifications.md) | ✅ Documentado |
| **Files** — generación y almacenamiento de documentos PDF | [`files.md`](./files.md) | ⏳ Definición pendiente |

Este README cubre únicamente la arquitectura de integración y la conexión. El contenido específico de cada capacidad está en sus propios documentos.

---

## Responsabilidades de la integración

### Lo que esta integración gestiona (en Business App)

| Responsabilidad | Implementación |
|---|---|
| Estado de la conexión | `CommunicationConnection` schema — token cifrado, estado, remoteCompanyId |
| Validación del token | `GET /company-integrations/me` en Communications |
| Resolución del token correcto | `CommunicationConnectionService.getCommunicationConnectionForContext()` |
| Envío de la request HTTP | `CommunicationClientService.notifyEvent()` |
| Catálogo de Business Events | `communication-catalog.ts` (sección `business`) |
| Catálogo de Platform Events | `communication-catalog.ts` (sección `platform`) |
| Provisioning de assets al guardar token | `SeedProvisioningService` (⏳ pendiente) |

### Lo que Communications App gestiona (no en Business App)

| Responsabilidad |
|---|
| Templates HTML de los events |
| Renderizado (layout + theme + content) |
| Selección del proveedor de email/SMS |
| Credenciales de proveedor (SMTP, SendGrid, Twilio) |
| Logs de entrega |
| Reintentos y dead letter de entrega |

---

## Modelo de conexión

### CommunicationConnection

Un `CommunicationConnection` es el registro de que un Business (o la Platform Company) está autenticado en Communications App.

```
CommunicationConnection {
  businessId:             ObjectId    ← ID del Business en Business App
  communicationCompanyId: string      ← ID del mismo Business en Communications
  encryptedToken:         string      ← AES-256-GCM
  status:                 'connected' | 'failed' | null
  isActive:               boolean
  createdAt:              DateTime
  updatedAt:              DateTime
}
```

**Invariantes:**
- El token nunca se almacena en texto plano
- Solo el Business que creó la conexión puede verla
- La empresa base (`isPlatformCompany: true`) siempre debe tener una conexión activa — es un requisito operativo no negociable

### Dos tipos de conexión

| Tipo | A qué empresa de Communications apunta | Para qué se usa |
|---|---|---|
| **Platform** | La empresa de la plataforma (`isPlatformCompany: true`) | Eventos de auth, invitaciones, seguridad del sistema |
| **Business** | La empresa del tenant logueado | Eventos de negocio: facturas, pagos, documentos |

---

## Resolución del token

**Única función autorizada:** `CommunicationConnectionService.getCommunicationConnectionForContext()`

```typescript
getCommunicationConnectionForContext(
  type: 'platform' | 'business',
  businessId?: string,          // requerido para type='business'; solo logging para type='platform'
): Promise<CompanyConnection | null>
```

**Nota terminológica:** El parámetro se llama `businessCompanyId` en el código actual (código legado usa `companyId`). El nombre canónico es `businessId`. Ver §Deudas técnicas.

### Lógica de resolución

```
type = 'platform':
  1. Buscar Company { isPlatformCompany: true }
  2. Buscar CommunicationConnection activa para ese Company
  3. Descifrar token → retornar { communicationCompanyId, decryptedToken }
  4. Si no existe → log CRITICAL, retornar null → notificación skipped
     ⚠ Si la conexión platform no existe, ningún usuario puede verificar
       email ni recuperar contraseña. Es un fallo operativo crítico.

type = 'business':
  1. Usar el businessId recibido (del JWT — nunca del frontend)
  2. Buscar CommunicationConnection activa para ese businessId
  3. Descifrar token → retornar { communicationCompanyId, decryptedToken }
  4. Si no existe → log WARNING, retornar null
     El flujo de negocio NO falla. La notificación se omite silenciosamente.
```

### Regla de oro

```
Ningún módulo de Business App resuelve tokens de Communications directamente.
Todo pasa por getCommunicationConnectionForContext().
```

---

## Cómo se comunica Business App con Communications

Todo envío pasa por `CommunicationClientService.notifyEvent()`. Es el único punto de llamada HTTP a Communications desde Business App.

```typescript
// CommunicationClientService.notifyEvent() — única forma de enviar
this.commClient.notifyEvent({
  type:       'platform' | 'business',
  businessId: string,        // del JWT — NUNCA del request body del frontend
  event:      string,        // formato: 'domainKey.eventKey'
  email:      string,
  data:       Record<string, string | undefined | null>,
});
```

Internamente, `notifyEvent()` hace:

```
1. getCommunicationConnectionForContext(type, businessId)
   → obtiene el token correcto (platform o business)
   → si null → log + return false (no falla el flujo)

2. POST /notifications/event
   headers: { x-api-key: <token resuelto> }
   body: {
     companyId: <communicationCompanyId resuelto>,
     event:     'domainKey.eventKey',
     email:     'destinatario@ejemplo.com',
     payload:   { data: { ... } }
   }

3. Log del resultado (delivered: true/false)
```

**Regla de seguridad:** Communications nunca usa el `companyId` del body para decisiones de seguridad. El `companyId` efectivo siempre viene del token (ADR-007 §3 en `communications-app/docs/Decisions/`).

---

## Relación con el código

El código de esta integración vive en:

```
src/integrations/communications/    ← ubicación target (ADR-020)
```

**Estado actual:** El código existe en `src/settings/` (nombre legacy). La migración a `src/integrations/communications/` está documentada en ADR-020 y pendiente de ejecución.

```
src/settings/communication-connection/  → src/integrations/communications/connection/
src/settings/communication-client/      → src/integrations/communications/
```

---

## Deudas técnicas reconocidas

| Deuda | Impacto | Prioridad |
|---|---|---|
| `type: 'company'` en código debe ser `type: 'business'` | Inconsistencia con esta documentación | Baja — refactor sprint |
| `companyId` como nombre de parámetro debe ser `businessId` | Inconsistencia con vocabulario del proyecto | Baja — refactor sprint |
| Código vive en `src/settings/` no en `src/integrations/` | Inconsistencia con ADR-020 | Media — migración pendiente |
| Validación de startup si platform company sin conexión | Silent failure en producción | Media — antes de go-live |
| `seed-catalog.ts` no existe | Sin él, ningún Business Event puede implementarse | Alta — Sprint 6 |
| `SeedProvisioningService` no existe | Token-save no provisiona Communications | Alta — Sprint 6 |

---

## Referencias

| Documento | Contenido |
|---|---|
| [`notifications.md`](./notifications.md) | Communication Catalog, Platform Events, Business Events, notifyEvent, provisioning completo |
| [`files.md`](./files.md) | Files como segunda capacidad de Communications (definición pendiente) |
| `ADR-019-seed-catalog.md` | Decisión arquitectónica del Seed Catalog |
| `ADR-020-integrations-architecture.md` | Por qué las integraciones viven en `src/integrations/` |
| `communications-app/docs/Decisions/DEC-017` | Modelo de composición: Theme + Layout + Event |
| `communications-app/docs/Decisions/DEC-019` | Pipeline único de notifyEvent() |
| `communications-app/docs/Decisions/ADR-007` | Trust boundary — companyId nunca del body |

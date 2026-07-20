# 01 — Integration Domain

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual oficial

---

## Conceptos del dominio

### IntegrationConnection

Una `IntegrationConnection` es el registro de que un Business tiene configurada una integración con un sistema externo. Es la entidad de estado más importante del dominio.

```
IntegrationConnection {
    connectionId:      UUID
    businessId:        ObjectId
    provider:          string        — referencia a MDM.IntegrationProvider
    displayName:       string        — nombre que el usuario ve (ej: 'My Work Google Calendar')
    status:            ConnectionStatus
    authMethod:        string        — 'oauth2' | 'api_key' | 'basic' | 'hmac'
    encryptedCredentials: string     — credenciales cifradas (AES-256-GCM)
    scopes:            string[]      — permisos otorgados (ej: ['calendar.read'])
    externalId:        string?       — ID del recurso en el sistema externo (ej: calendarId)
    lastSyncAt:        DateTime?
    lastSyncStatus:    string?       — 'success' | 'partial' | 'failed'
    errorMessage:      string?
    metadata:          object?       — datos específicos del proveedor
    createdAt:         DateTime
    revokedAt:         DateTime?
}

ConnectionStatus:
  'active'          — conectado y funcional
  'needs_reauth'    — el token expiró o fue revocado — requiere reconexión
  'suspended'       — suspendido por el usuario
  'error'           — error que requiere atención
  'revoked'         — el usuario desconectó la integración
```

**Invariantes:**
- Las credenciales nunca se almacenan en texto plano
- Solo el Business que creó la conexión puede verla o modificarla
- Un Business puede tener múltiples conexiones del mismo proveedor (ej: dos cuentas de Google Calendar)
- Revocar una conexión no elimina los datos ya importados

---

### Connector

Un `Connector` es la implementación que sabe cómo comunicarse con un proveedor específico. Es el componente técnico — no la entidad de dominio.

```
Connector {
    providerId:        string        — 'google_calendar' | 'stripe' | 'xero' | etc.
    version:           string        — versión del API externo que usa
    capabilities: [
        'inbound_sync'        — puede importar datos
        'outbound_sync'       — puede exportar datos
        'webhook_receive'     — puede recibir webhooks
        'oauth2_flow'         — tiene flujo OAuth2
        'polling'             — requiere polling periódico
    ]
    rateLimits: {
        requestsPerMinute:  integer
        requestsPerDay:     integer
        burstAllowed:       integer
    }
}
```

El Connector es responsable de:
- Autenticación (OAuth2, API Key, etc.)
- Construcción de requests al sistema externo
- Parsing de las respuestas
- Normalización al formato del dominio interno
- Manejo de rate limits específicos del proveedor

---

### SyncJob

Un `SyncJob` es la ejecución de una sincronización entre un sistema externo y el ERP.

```
SyncJob {
    jobId:             UUID
    connectionId:      UUID
    businessId:        ObjectId
    syncType:          string        — 'full' | 'incremental' | 'manual'
    triggeredBy:       string        — 'scheduled' | 'user' | 'system' | 'event'
    status:            JobStatus
    startedAt:         DateTime
    completedAt:       DateTime?
    itemsFound:        integer?
    itemsImported:     integer?
    itemsSkipped:      integer?
    itemsFailed:       integer?
    errorMessage:      string?
    nextSyncAt:        DateTime?     — cuándo será el próximo sync automático
}

JobStatus:
  'queued'    → 'running' → 'completed'
                          → 'partial'   — algunos items fallaron
                          → 'failed'    — todo falló
```

---

### WebhookEndpoint

Un `WebhookEndpoint` es la URL pública donde el Integration Hub recibe eventos de sistemas externos.

```
WebhookEndpoint {
    endpointId:        UUID
    businessId:        ObjectId
    provider:          string
    url:               string     — generado: /integrations/webhooks/{endpointId}
    secret:            string     — HMAC secret (cifrado en reposo)
    status:            'active' | 'suspended'
    deliveryGuarantee: string     — 'at_least_once' | 'at_most_once'
    idempotencyWindow: string     — '24h' — ventana de deduplicación
    events:            string[]   — eventos suscritos del sistema externo
    lastReceivedAt:    DateTime?
}
```

**Seguridad del Webhook:**
```
Request entrante:
  1. Verificar X-Signature header (HMAC-SHA256 del body con el secret)
  2. Verificar timestamp del request (< 5 minutos — previene replay attacks)
  3. Verificar que el X-Webhook-Id no fue recibido antes (deduplicación)
  4. Si pasa → procesar; si no → rechazar con 401/409
```

---

### IntegrationEvent (evento normalizado)

Cuando el Integration Hub recibe datos de un sistema externo, los normaliza a un formato canónico antes de publicarlos como Domain Events.

```
IntegrationEvent {
    integrationEventId:   UUID
    businessId:           ObjectId
    provider:             string
    connectionId:         UUID
    externalEventType:    string      — tipo en el sistema externo ('calendar.event.created')
    normalizedEventType:  string      — tipo en nuestro sistema ('CalendarEventImported')
    rawPayload:           object      — payload original (para debugging y reprocessing)
    normalizedPayload:    object      — payload traducido al dominio interno
    receivedAt:           DateTime
    processedAt:          DateTime?
    idempotencyKey:       string      — para garantizar que no se procese dos veces
}
```

**El rawPayload se retiene:** Si más adelante se descubre un bug en el Normalizer, el rawPayload permite reprocesar el evento con la lógica corregida sin volver a consultar el sistema externo.

---

## Responsabilidades del Integration Hub

### Lo que el Integration Hub DEBE hacer

| Responsabilidad | Descripción |
|---|---|
| **Gestionar credenciales** | Almacenar, cifrar, refrescar tokens OAuth2 |
| **Ejecutar sincronizaciones** | Polling y webhooks con el sistema externo |
| **Normalizar datos** | Traducir formatos externos al vocabulario del dominio |
| **Publicar Domain Events** | CalendarEventImported, BankTransactionImported, etc. |
| **Garantizar idempotencia** | El mismo evento externo no genera duplicados |
| **Manejar errores** | Retry, circuit breaker, dead letter |
| **Registrar el historial** | Toda sincronización es auditable |
| **Monitorear salud** | Health checks periódicos de las conexiones activas |

### Lo que el Integration Hub NUNCA debe hacer

| Prohibición | Razón |
|---|---|
| **Contener lógica de negocio** | Saber que un "VEVENT de Google" es un "WorkEvent draft" — eso lo decide Work domain |
| **Modificar datos de dominio directamente** | Solo publica eventos; Work domain crea el WorkEvent |
| **Conocer las reglas de cada dominio** | Si un CalendarEvent debe aplicar overtime — eso lo sabe Work |
| **Almacenar datos operativos** | Los WorkEvents, Payments, etc. viven en sus dominios |
| **Exponer credenciales a otros dominios** | Las credenciales son privadas del Integration Hub |

---

## Ownership de conexiones por dominio

| Dominio | Tipo de integración | Provider ejemplos |
|---|---|---|
| Calendar | Inbound — importar eventos | Google Calendar, Outlook, Apple, iCal |
| Banking | Inbound — importar extractos | CDR Australia, OFX, CSV |
| Expenses | Inbound — importar recibos | Google Drive, Dropbox, Direct upload |
| Accounting (export) | Outbound — sincronizar ledger | Xero, MYOB, QuickBooks |
| Payments | Inbound — confirmar pagos | Stripe, Square, GoCardless |
| Document Management | Inbound/Outbound — storage | S3, R2, Google Drive |
| Communications | Outbound — enviar mensajes | SendGrid, Mailgun, Twilio |
| Tax Authority | Outbound — presentar declaraciones | ATO STP, IRD NZ |

---

## Domain Events que Integration Hub publica

```
CALENDARIO:
  CalendarEventImported       — evento de calendario listo para ser WorkEvent
  CalendarSyncCompleted       — sincronización completada
  CalendarConnectionFailed    — la conexión perdió acceso

BANCARIO:
  BankTransactionImported     — transacción bancaria para conciliación
  BankStatementImported       — extracto bancario completo

PAGOS EXTERNOS:
  ExternalPaymentConfirmed    — pago confirmado vía Stripe/Square/etc.
  ExternalPaymentFailed       — pago rechazado

ACCOUNTING EXPORT:
  ExternalLedgerSynced        — datos sincronizados con Xero/MYOB
  ExternalSyncFailed          — fallo en sincronización con sistema externo

INBOUND WEBHOOKS:
  ExternalOrderCompleted      — pedido completado en Shopify/WooCommerce
  ExternalClientUpdated       — cliente actualizado en CRM externo
  ExternalEventReceived       — evento genérico de webhook
```

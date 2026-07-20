# 02 — Integration Patterns

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual oficial

---

## Los cuatro patrones de integración

```
┌─────────────────────────────────────────────────────────────────────┐
│                     INTEGRATION HUB                                 │
│                                                                     │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐        │
│  │    POLLING     │  │    WEBHOOK     │  │   STREAMING    │        │
│  │  (Inbound)     │  │  (Inbound)     │  │  (Inbound)     │        │
│  └────────┬───────┘  └────────┬───────┘  └────────┬───────┘        │
│           │                   │                   │                 │
│           └───────────────────┴───────────────────┘                 │
│                               │                                     │
│                    NORMALIZER / ACL LAYER                           │
│                               │                                     │
│           ┌───────────────────▼───────────────────┐                 │
│           │              EVENT BUS                 │                 │
│           └───────────────────┬───────────────────┘                 │
│                               │                                     │
│           ┌───────────────────▼───────────────────┐                 │
│           │              PUSH / SYNC              │                 │
│           │             (Outbound)                │                 │
│           └───────────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Patrón 1 — Polling (Inbound)

**Cuándo usar:** El sistema externo no tiene webhooks. Requiere consultas periódicas para detectar cambios.

**Ejemplo:** Google Calendar, Apple Calendar (iCal URL), bancos sin Open Banking.

```
Flujo de Polling:
  ScheduledJob (cada X minutos)
      │
      ▼
  Connector.fetchChanges(connection, since: lastSyncAt)
      │
      ├── Autenticar (usar token almacenado / refresh si expiró)
      ├── Consultar API externa
      │     GET /calendars/{id}/events?timeMin=lastSyncAt
      ├── Parsear respuesta
      ├── Deduplicar (¿este externalId ya fue importado?)
      ├── Normalizar cada item a IntegrationEvent
      └── Publicar Domain Events en el Event Bus
      │
  Actualizar SyncJob:
      ├── itemsImported, itemsSkipped, itemsFailed
      └── lastSyncAt = now()
```

**Frecuencia de polling por proveedor:**

| Proveedor | Frecuencia | Razón |
|---|---|---|
| Google Calendar | Cada 15 minutos | Rate limit de la API |
| Apple Calendar (iCal URL) | Cada 60 minutos | No tiene API incremental |
| OFX Bank Import | Manual (on-demand) | No hay API automática |
| CSV Bank Import | Manual (on-demand) | Usuario sube el archivo |

**Deduplicación en polling:**

El mismo evento puede aparecer en dos polls consecutivos si fue creado entre el inicio y el fin del primer poll. La deduplicación usa el `externalId` del sistema externo:

```
Deduplication store:
  ImportedExternalId {
      externalId:       string
      provider:         string
      connectionId:     UUID
      importedAt:       DateTime
  }

Antes de importar un item:
  ¿Existe ya un ImportedExternalId para este (externalId, provider, connectionId)?
    SÍ → skip (ya fue importado)
    NO → importar y registrar
```

---

## Patrón 2 — Webhook Inbound

**Cuándo usar:** El sistema externo soporta webhooks — notifica activamente cuando algo cambia.

**Ejemplo:** Stripe, Shopify, Square, GoCardless, GitHub.

```
Flujo de Webhook:
  Sistema externo → POST /integrations/webhooks/{endpointId}
      │
      ▼
  WebhookReceiver:
      ├── Verificar HMAC signature (X-Signature header)
      ├── Verificar timestamp (< 5 minutos)
      ├── Verificar X-Webhook-Id (deduplicación)
      │     ¿Ya fue recibido? → responder 200 (aceptado pero ignorado)
      │     Nuevo → continuar
      ├── Responder 200 INMEDIATAMENTE (antes de procesar)
      │     ← El sistema externo espera la respuesta rápida
      └── Encolar el payload para procesamiento asíncrono
      │
  Processing Queue (asíncrono):
      ├── Parsear payload del sistema externo
      ├── Normalizar a IntegrationEvent
      └── Publicar Domain Event en el Event Bus
```

**Por qué responder 200 antes de procesar:**
La mayoría de sistemas externos tienen un timeout de 5-10 segundos para la respuesta del webhook. Si el procesamiento tarda más (ej: normalización compleja, base de datos lenta), el sistema externo asume que el webhook no fue recibido y lo reenvía. Responder 200 inmediatamente y procesar de forma asíncrona evita este problema.

**Idempotencia en webhooks:**
Los sistemas externos suelen reintentar webhooks si no reciben 200. El mismo webhook puede llegar 2-3 veces. La deduplicación por `X-Webhook-Id` garantiza que el mismo evento no se procese dos veces.

---

## Patrón 3 — Streaming (Inbound, futuro)

**Cuándo usar:** Alto volumen de eventos del sistema externo. Polling es demasiado frecuente. Webhooks no escalan.

**Ejemplo:** Open Banking CDR en Australia (cuando la regulación madure), Stripe en modo streaming, Kafka topics de sistemas legacy.

```
Flujo de Streaming:
  Stream Producer (externo) → Message Broker → Integration Hub Consumer
      │
      ▼
  StreamConsumer:
      ├── Lee mensajes del broker (Kafka, Kinesis, etc.)
      ├── Batch de mensajes (ej: 100 mensajes)
      ├── Procesa cada mensaje:
      │     ├── Normalizar
      │     ├── Deduplicar
      │     └── Publicar Domain Event
      └── Confirmar offset (commit)
```

**Garantías del streaming:**
- At-least-once: los mensajes se procesan al menos una vez (puede haber duplicados → deduplicación)
- Exactly-once: requiere transacciones distribuidas — no implementado en Fase 1

---

## Patrón 4 — Push / Sync Outbound

**Cuándo usar:** El ERP necesita enviar datos a un sistema externo: exportar al ledger de Xero, sincronizar clientes con un CRM, enviar payroll al ATO.

```
Flujo Outbound:
  Domain Event interno → Integration Hub Consumer
      │
      ▼
  OutboundConnector:
      ├── Recibe el Domain Event
      ├── Verifica que existe una IntegrationConnection activa para ese tipo
      ├── Transforma el evento al formato del sistema externo
      ├── Envía al sistema externo (con retry si falla)
      └── Registra el resultado en SyncJob
```

**Ejemplo: Exportar Journal Entry a Xero**

```
JournalEntryPosted event publicado por Accounting
    │
    ▼
Integration Hub Consumer escucha JournalEntryPosted
    │
    ▼
¿Tiene el Business una IntegrationConnection activa con Xero?
    ├── NO → ignorar
    └── SÍ → XeroConnector.syncJournalEntry(journalEntry, xeroConnection)
              │
              ▼
          XeroConnector:
              ├── Autenticar con Xero
              ├── Transformar JournalEntry al formato de Xero Manual Journal
              ├── POST /manualJournals (Xero API)
              ├── Si success → registrar externalId de Xero
              └── Si falla → RetryPolicy → DeadLetter
```

---

## OAuth2 Flow

Para integraciones que requieren autorización del usuario:

```
AUTHORIZATION CODE FLOW:

1. Business Owner hace click en "Conectar Google Calendar"

2. Business App genera la Authorization URL:
   https://accounts.google.com/o/oauth2/auth?
     client_id=...&
     redirect_uri=https://businessapp.com/integrations/callback/google&
     scope=https://www.googleapis.com/auth/calendar.readonly&
     state=connectionId_encriptado

3. Business Owner es redirigido a Google → autoriza

4. Google redirige a Business App con el código de autorización:
   https://businessapp.com/integrations/callback/google?code=AUTH_CODE&state=...

5. Integration Hub intercambia el código por tokens:
   POST https://oauth2.googleapis.com/token
   → access_token (expira en 1h)
   → refresh_token (válido indefinidamente hasta revocación)

6. Tokens cifrados y almacenados en IntegrationConnection.encryptedCredentials

7. Cuando el access_token expira:
   Integration Hub usa refresh_token automáticamente → nuevo access_token
   (transparent al usuario, sin necesidad de reconectarse)
```

---

## Versioning de las integraciones

Los sistemas externos evolucionan. Las APIs cambian de versión.

**Estrategia:**
- Cada Connector tiene una `apiVersion` explícita (ej: 'v3' para Google Calendar API)
- Cuando la API externa depreca una versión, el Connector se actualiza internamente
- Los Domain Events producidos son siempre los mismos (normalización garantiza estabilidad)
- Los dominios internos nunca saben que la API externa cambió de versión

```
Google Calendar API v3 → CalendarEventImported (payload normalizado)
Google Calendar API v4 → CalendarEventImported (mismo payload normalizado)

Billing, Work, Analytics: no saben que hubo un cambio de versión en Google.
Solo el Connector de Google Calendar fue actualizado.
```

---

## Health Checks de conexiones

El Integration Hub ejecuta health checks periódicos para detectar conexiones que necesitan atención:

```
HealthCheck (cada 6 horas por conexión activa):
    ├── Verificar que el token es válido
    ├── Hacer una llamada de prueba mínima al sistema externo
    │     (ej: GET /userinfo para Google, GET /me para Stripe)
    ├── Si falla:
    │     ├── Marcar IntegrationConnection.status = 'needs_reauth'
    │     └── Disparar Domain Event: CalendarConnectionFailed
    │           → Automation puede notificar al Business Owner
    └── Si éxito:
          └── Actualizar lastHealthCheckAt
```

**Estado `needs_reauth`:**
Cuando una conexión necesita reautenticación, el Integration Hub deja de hacer polling/sync para esa conexión hasta que el Business Owner reconecte. No falla silenciosamente.

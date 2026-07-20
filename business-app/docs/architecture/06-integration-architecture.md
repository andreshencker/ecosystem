# 06 — Integration Architecture

**Versión:** 1.1 | **Fecha:** 2026-07-08 | **Estado:** Oficial — Actualizado por ADR-022

La arquitectura de integración define cómo el ERP se conecta con el mundo exterior — tanto para recibir información (inbound) como para enviarla (outbound). El principio rector es que **los sistemas externos no deben afectar el modelo de dominio interno**.

---

## Principio de aislamiento de integraciones

Toda integración externa está contenida dentro del **Integration Bounded Context** (y sus sub-adaptadores por dominio). Los módulos de negocio nunca se conectan directamente a sistemas externos.

```
Mundo exterior
      │
      │  (Google, Bank, CSV, Webhooks)
      ▼
┌─────────────────────┐
│  INTEGRATION LAYER  │  ← Único punto de contacto con el exterior
│                     │
│  Normalización      │  ← Traduce formatos externos a dominio interno
│  Autenticación      │  ← Gestiona tokens OAuth, API keys, etc.
│  Rate limiting      │  ← Protege el sistema de sobrecarga
│  Error handling     │  ← Reintentos, dead-letter, alertas
└──────────┬──────────┘
           │ Domain Events normalizados
           ▼
      Bounded Contexts internos
```

---

## Integraciones Inbound (El mundo entra al ERP)

### IB-01, IB-02, IB-03 — Calendar Providers (Google, Apple, Microsoft)

> **⚠ ADR-022 (2026-07-08):** Las integraciones con proveedores de calendario **NO se implementan en Business App**. Son responsabilidad de **Communications App**.

**Decisión:** Ver `docs/decisions/ADR-022-calendar-provider-delegation-to-communications.md`

**Lo que Communications App gestiona:**
- OAuth 2.0 para Google Calendar API v3
- CalDAV / iCal URL para Apple Calendar
- Microsoft Graph API v1.0 para Outlook
- Refresh automático de tokens
- Polling periódico y deduplicación
- Publicación de `CalendarEventImported` hacia Business App

**Lo que Business App Calendar Domain gestiona:**
- `CalendarSource` — referencia lógica a la fuente (provider, syncStatus, `communicationsConnectionId`)
- `CalendarEvent` — eventos importados normalizados
- `ScheduledEvent` — fechas críticas internas del ERP
- Domain Events: `CalendarEventImported`, `CalendarSyncCompleted`, `CalendarSyncFailed`
- Endpoints CRUD de eventos

**Business App NO tendrá** carpetas `src/integrations/google-calendar/`, `src/integrations/outlook-calendar/`, ni `src/integrations/icloud-calendar/`.

---

### IB-04 — Bank Data (Futuro)

**Propósito:** Importar extractos bancarios para conciliación automática.

**Opciones de integración:**

```
Opción A: OFX/QIF File Import (disponible ahora)
  User descarga .ofx del banco
  User sube al sistema
  Integration Layer parsea y crea BankTransaction events

Opción B: CSV Import
  User descarga CSV del portal bancario
  Integration Layer normaliza columnas
  Configurable por banco (cada banco tiene diferente formato)

Opción C: Open Banking API (futuro — regulación CDR en Australia)
  OAuth 2.0 con banco
  Webhooks de nuevas transacciones
  Datos normalizados por el estándar CDR
```

**Normalización:** Independientemente del método, el resultado es siempre el mismo evento:

```
BankTransactionImported {
    businessId,
    bankAccountId,
    externalTransactionId,
    date,
    amount,
    direction: 'credit' | 'debit',
    description,
    balance,
    source: 'ofx' | 'csv' | 'open_banking'
}
```

---

### IB-05 — CSV Import (genérico)

**Propósito:** Importar datos en bulk desde archivos CSV — WorkEvents históricos, Customers, Invoices de sistemas legacy.

**Diseño:**
```
CSVImportJob {
    type: 'work_events' | 'customers' | 'invoices' | 'bank_transactions'
    mapping: { csvColumn → domainField }
    validationRules: per-type
    rollbackOnError: boolean
}
```

El Import Layer valida cada fila antes de publicar eventos. Una fila inválida no cancela el resto.

---

### IB-06 — Webhooks Inbound (Futuro)

**Propósito:** Recibir eventos de sistemas externos (ERP, CRM, marketplace) para disparar acciones dentro del ERP.

**Diseño:**
```
WebhookEndpoint {
    url: '/webhooks/{businessId}/{integrationKey}'
    authentication: HMAC-SHA256 signature verification
    events: {
        'order.completed' → InvoiceGenerationTrigger
        'client.updated'  → CustomerSync
    }
}
```

**Principio:** Los webhooks inbound nunca modifican el dominio directamente. Son traducidos a Domain Commands que el Application Layer ejecuta.

---

## Integraciones Outbound (El ERP sale al mundo)

### OB-01 — Communications Platform

**Propósito:** Enviar emails, SMS, y otras comunicaciones a usuarios y Customers.

**Protocolo:** REST API interno (Communications Platform es un servicio separado del mismo monorepo)

**Flujo:**
```
CommunicationDispatchService.dispatch(params)
    → Resolver CommunicationConnection
    → Decrypt integration token
    → POST /notifications/event
        headers: { x-api-key: token }
        body: { companyId, event, email, payload }
    → Registrar CommunicationLog
```

**Autenticación:**
- Eventos de plataforma (verificación, invitaciones): usa la CommunicationConnection de la Platform Company
- Eventos de negocio (facturas, recordatorios): usa la CommunicationConnection del Business

**Responsabilidades:**
- No conoce los templates — esos están en Communications Platform
- No decide qué enviar — eso lo decide el módulo que publica el evento
- Solo ejecuta y registra

---

### OB-02 — BI / Data Warehouse (Futuro)

**Propósito:** Exportar datos del General Ledger y Analytics al warehouse de BI para análisis avanzado.

**Protocolo:** Batch export (nightly) o streaming (Kafka/Kinesis)

**Flujo:**
```
Nightly Job:
    → Query Analytics Read Models (no Accounting directamente)
    → Transform to warehouse format
    → Load to Snowflake/BigQuery
    → ML pipelines consume from warehouse
```

**Principio:** El warehouse consume Read Models, no el General Ledger directamente. Si se necesitan datos contables para análisis, el Analytics domain los proyecta primero.

---

### OB-03 — PDF Generation

**Propósito:** Generar PDFs de Invoices para envío a Customers.

**Patrón:**
```
InvoiceSent event consumed by PDF Service
    → Fetch Invoice data (via read model)
    → Merge with Business template (logo, colors)
    → Generate PDF (Puppeteer / WeasyPrint)
    → Store in object storage (S3/R2)
    → URL passed to Communication Platform for email attachment
```

**El PDF Service es un servicio de soporte**, no un Bounded Context. No tiene lógica de dominio.

---

### OB-04 — Open Banking Outbound (Futuro)

**Propósito:** En el futuro, el ERP podría iniciar pagos directamente desde el sistema.

**Regulación:** CDR (Consumer Data Right) en Australia permite pagos iniciados por terceros (PayTo).

**Diseño conceptual:**
```
Payment Initiation Request
    → CDR Bank API
    → PaymentInitiated event (external confirmation)
    → System creates Payment record upon bank confirmation
```

---

### OB-05 — Tax Authority Integration (Futuro)

**Propósito:** Presentación electrónica de declaraciones fiscales.

**Australia:**
- Single Touch Payroll (STP) — ATO payroll reporting
- BAS lodgment via ATO Business Portal API

**Diseño:**
```
BASReport generated by Analytics
    → Digital Signature (Business Owner)
    → ATO API submission
    → Lodgment reference number stored
```

---

## Autenticación en integraciones

### OAuth 2.0 Flows

Para integraciones que requieren OAuth (Google, Microsoft, Banks):

```
Authorization Code Flow (para apps de escritorio/web):
1. User → Authorization URL (con scope específico)
2. Authorization Server → code de autorización
3. Integration Layer → exchange code for tokens
4. Access token (short-lived) + Refresh token (long-lived)
5. Tokens encriptados (AES-256-GCM) en IntegrationConnection
6. Refresh automático antes de expiración

Client Credentials Flow (para server-to-server sin usuario):
1. Integration Layer → token endpoint con client_id + client_secret
2. Access token con scope específico
3. Renovación automática
```

### HMAC Signature (para webhooks inbound)

```
Incoming webhook:
1. Verify X-Signature header
2. HMAC-SHA256(secret, rawBody) === signature
3. Check timestamp (dentro de 5 minutos — anti-replay)
4. Idempotency: X-Webhook-Id no visto antes
```

### API Key (para Communications Platform)

```
Integration token almacenado en CommunicationConnection.encryptedToken
Desencriptado solo en el momento del request
Nunca en logs, nunca en responses de API
```

---

## Manejo de errores en integraciones

### Estrategia por tipo de error

| Error | Acción |
|---|---|
| 4xx del servicio externo (cliente) | No reintentar. Log. Alerta si es crítico. |
| 401 Unauthorized | Refrescar token. Reintentar una vez. Si falla, marcar integración como necesita reconexión. |
| 429 Too Many Requests | Exponential backoff. Respetar Retry-After header. |
| 5xx del servicio externo (servidor) | Reintentar con backoff. Max 3 intentos. Dead-letter después. |
| Timeout | Tratar como 5xx. Reintentar. |
| Red error | Reintentar inmediatamente. Si persiste, backoff. |

### Dead Letter Queue

Las integraciones que fallan repetidamente van a una Dead Letter Queue:

```
Dead Letter Queue:
    → Alerta al Platform Admin
    → Visibilidad en el dashboard de operaciones
    → Opción de replay manual
    → Expiración después de 7 días
```

---

## Principios de la Integration Architecture

**P1 — El dominio no sabe de integraciones**
Un módulo de dominio nunca importa un SDK de Google, AWS, o cualquier servicio externo. Eso vive en la Infrastructure Layer.

**P2 — Normalización siempre**
Un evento de Google Calendar, Apple Calendar, y Outlook producen exactamente el mismo `CalendarEventImported`. El dominio de Work no sabe de dónde vino.

**P3 — Idempotencia en inbound**
Si el mismo evento externo llega dos veces, el sistema lo detecta y no crea duplicados.

**P4 — Encriptación de credenciales**
Ninguna credencial externa se almacena en texto plano. AES-256-GCM en reposo.

**P5 — Audit trail de integraciones**
Toda llamada a un sistema externo se registra — éxito o fracaso — con timestamp y payload resumido.

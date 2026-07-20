# 03 — Provider Catalog

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual oficial

Catálogo completo de todos los proveedores de integración: actuales y planificados. Para cada proveedor se documenta: qué ofrece, qué patrón usa, qué Domain Events produce o consume, y en qué fase del ERP es relevante.

---

## Categoría 1 — Calendarios

### Google Calendar

| Campo | Valor |
|---|---|
| **Patrón** | Polling (push disponible con Google Pub/Sub en fases futuras) |
| **Auth** | OAuth2 (Authorization Code Flow) |
| **Scopes** | `calendar.readonly` |
| **Rate limit** | 1M queries/day/project |
| **Events importados** | CalendarEventImported |
| **Fase ERP** | Fase 2 (Work domain) |

**Datos que normaliza:**
```
Google VEVENT → CalendarEvent normalizado:
  summary → title
  start.dateTime → date, startTime
  end.dateTime → endTime
  id → externalEventId
  description → notes (opcional)
```

**Deduplicación:** por `externalEventId` (el `id` de Google).

---

### Microsoft Outlook / Office 365

| Campo | Valor |
|---|---|
| **Patrón** | Polling + Webhooks (Microsoft Graph Subscriptions) |
| **Auth** | OAuth2 (Microsoft Identity Platform) |
| **Scopes** | `Calendars.Read` |
| **Rate limit** | 60 requests/minute |
| **Fase ERP** | Fase 2 |

---

### Apple Calendar (CalDAV / iCal URL)

| Campo | Valor |
|---|---|
| **Patrón** | Polling (CalDAV con etag-based incremental sync) |
| **Auth** | CalDAV: Basic Auth. iCal URL: anónima. |
| **Rate limit** | Sin API formal — polling respetuoso |
| **Fase ERP** | Fase 2 |

**Diferencia importante:** El iCal URL (suscripción .ics) requiere diff completo en cada sync — no tiene sincronización incremental. CalDAV soporta etags para sync incremental.

---

## Categoría 2 — Pagos

### Stripe

| Campo | Valor |
|---|---|
| **Patrón** | Webhook (Stripe Event Webhooks) |
| **Auth** | Webhook: HMAC-SHA256. API calls: API Key |
| **Events que consume** | `payment_intent.succeeded`, `invoice.payment_succeeded`, `charge.refunded` |
| **Events que produce** | ExternalPaymentConfirmed, ExternalPaymentFailed, ExternalRefundProcessed |
| **Fase ERP** | Fase 3 (Billing + Payments) |

**Mapping de eventos:**
```
Stripe: payment_intent.succeeded → ERP: ExternalPaymentConfirmed
  ├── amount: payment_intent.amount / 100 (Stripe usa centavos)
  ├── currency: payment_intent.currency.toUpperCase()
  ├── externalId: payment_intent.id
  └── metadata: payment_intent.metadata (puede contener invoiceId si fue enviado)
```

---

### Square

| Campo | Valor |
|---|---|
| **Patrón** | Webhook |
| **Auth** | OAuth2 |
| **Fase ERP** | Fase 3 |

---

### GoCardless (Direct Debit)

| Campo | Valor |
|---|---|
| **Patrón** | Webhook |
| **Auth** | OAuth2 |
| **Disponibilidad** | UK, Australia (BECS), Europa |
| **Events que produce** | ExternalPaymentConfirmed, ExternalPaymentFailed, ExternalMandateCreated |
| **Fase ERP** | Fase 3+ |

---

### eWAY (Australia)

| Campo | Valor |
|---|---|
| **Patrón** | Webhook + REST |
| **Auth** | API Key |
| **Disponibilidad** | Australia, NZ |
| **Fase ERP** | Fase 3+ |

---

## Categoría 3 — Contabilidad Externa

### Xero

| Campo | Valor |
|---|---|
| **Patrón** | Outbound Sync + Webhook (inbound para reconciliación) |
| **Auth** | OAuth2 |
| **Datos exportados** | Invoices, Payments, Journal Entries, Contacts (Customers) |
| **Rate limit** | 60 API calls/minute |
| **Events que consume** | InvoiceSent, PaymentRecorded, JournalEntryPosted |
| **Events que produce** | ExternalLedgerSynced, ExternalSyncFailed |
| **Fase ERP** | Fase 4+ (Accounting) |

**Casos de uso:**
- Business que quiere mantener su ledger en Xero pero usar el ERP para la operación
- Contador que prefiere Xero pero el Business usa Invoice App para time tracking + billing

---

### MYOB AccountRight

| Campo | Valor |
|---|---|
| **Auth** | OAuth2 |
| **Disponibilidad** | Australia, NZ |
| **Fase ERP** | Fase 4+ |

---

### QuickBooks Online

| Campo | Valor |
|---|---|
| **Auth** | OAuth2 |
| **Disponibilidad** | Global |
| **Fase ERP** | Fase 4+ |

---

## Categoría 4 — Bancario y Open Banking

### CDR Open Banking (Australia)

| Campo | Valor |
|---|---|
| **Patrón** | OAuth2 + REST (Consumer Data Right) |
| **Auth** | FAPI (Financial-grade API) OAuth2 |
| **Datos importados** | BankTransaction, AccountBalance |
| **Events que produce** | BankTransactionImported, BankBalanceUpdated |
| **Fase ERP** | Fase 7 (Banking) |

**Qué es CDR:** El Consumer Data Right es la regulación australiana que obliga a los bancos a proveer acceso a los datos del cliente vía API estándar. Similar a PSD2/Open Banking en Europa.

---

### OFX / QIF File Import

| Campo | Valor |
|---|---|
| **Patrón** | Manual upload (no es un servicio web) |
| **Auth** | N/A (el usuario descarga el archivo del banco y lo sube) |
| **Events que produce** | BankTransactionImported |
| **Fase ERP** | Fase 7 |

---

### CSV Bank Import

| Campo | Valor |
|---|---|
| **Patrón** | Manual upload con column mapping configurable |
| **Auth** | N/A |
| **Configuración** | El usuario mapea las columnas del CSV al formato interno |
| **Fase ERP** | Fase 7 |

---

## Categoría 5 — Almacenamiento

### Amazon S3

| Campo | Valor |
|---|---|
| **Patrón** | Outbound (upload) + Inbound (presigned URL download) |
| **Auth** | AWS Credentials (IAM Role) |
| **Uso** | Document Management (archivos primario) |
| **Fase ERP** | Desde el inicio |

---

### Cloudflare R2

| Campo | Valor |
|---|---|
| **Ventaja** | Sin egress fees vs S3 |
| **API** | S3-compatible (mismo cliente, distinto endpoint) |
| **Fase ERP** | Desde el inicio (alternativa a S3) |

---

### Google Drive / OneDrive / Dropbox

| Campo | Valor |
|---|---|
| **Uso** | Business Owner elige guardar sus documentos en su propio cloud storage |
| **Auth** | OAuth2 |
| **Fase ERP** | Fase 5+ |

---

## Categoría 6 — Gobierno y Fiscal

### ATO Single Touch Payroll (STP)

| Campo | Valor |
|---|---|
| **Patrón** | Outbound (presentación de nómina al ATO) |
| **Auth** | ATO Device Authentication (digital certificate) |
| **Datos enviados** | Payroll summary (salarios, PAYG, superannuation) por empleado |
| **Frecuencia** | En cada pago de nómina |
| **Fase ERP** | Fase 9 (Payroll) |

---

### ATO BAS Lodgment

| Campo | Valor |
|---|---|
| **Patrón** | Outbound |
| **Auth** | ATO Business Portal (SBR2 Standard Business Reporting) |
| **Datos enviados** | BAS (GST collected, GST claimable, PAYG, etc.) |
| **Frecuencia** | Trimestral |
| **Fase ERP** | Fase 4 (Accounting) |

---

## Categoría 7 — CRM e integraciones de negocio

### Shopify

| Campo | Valor |
|---|---|
| **Patrón** | Webhook inbound |
| **Events consumidos** | `orders/paid`, `customers/create`, `customers/update` |
| **Events producidos** | ExternalOrderCompleted, ExternalClientUpdated |
| **Uso** | Auto-crear Invoice cuando un pedido se completa en Shopify |
| **Fase ERP** | Fase 4+ |

---

### HubSpot / Salesforce / Pipedrive

| Campo | Valor |
|---|---|
| **Patrón** | Webhook bidireccional |
| **Uso** | Sincronizar Customers entre el ERP y el CRM |
| **Events** | ExternalClientUpdated, ExternalDealWon |
| **Fase ERP** | Fase 4+ |

---

## Categoría 8 — Comunicaciones

Los proveedores de comunicación están gestionados por la **Communications Platform**, no directamente por el Integration Hub. El Integration Hub es responsable de las credenciales de la integración; la Communications Platform es responsable del envío.

| Proveedor | Tipo | Gestionado por |
|---|---|---|
| SendGrid | Email | Communications Platform |
| Mailgun | Email | Communications Platform |
| AWS SES | Email | Communications Platform |
| Twilio | SMS | Communications Platform |
| Vonage | SMS | Communications Platform |
| SMTP Custom | Email | Communications Platform |

---

## Resumen del catálogo

| Categoría | Proveedores actuales | Proveedores planificados |
|---|---|---|
| Calendarios | Google, Outlook, Apple, iCal | CalDAV genérico |
| Pagos | Stripe, Square, GoCardless | eWAY, PayPal, BECS |
| Contabilidad | Xero, MYOB, QuickBooks | Sage, FreshBooks |
| Bancario | CDR AU, OFX, CSV | PSD2 UK/EU, Open Banking NZ |
| Storage | S3, R2 | GCS, Azure Blob |
| Storage personal | — | Google Drive, OneDrive, Dropbox |
| Fiscal | ATO STP, ATO BAS | IRD NZ, HMRC UK |
| CRM/Marketplace | Shopify | HubSpot, Salesforce, WooCommerce |

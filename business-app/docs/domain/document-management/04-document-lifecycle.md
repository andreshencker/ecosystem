# 04 — Document Delivery Lifecycle

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual oficial

---

## Propósito de este documento

Define el flujo completo de ciclo de vida documental: desde el evento de negocio que dispara la generación de un documento, hasta la entrega al destinatario y el registro del resultado en el estado del proceso de negocio.

El caso canónico es `InvoiceApproved → Documento generado → Email enviado → Cliente recibe la factura`.

La arquitectura descrita aquí es el patrón aplicable a todos los tipos de documento del ERP (Statement, Receipt, BAS, Payroll, etc.). Solo cambian los datasets y el template. El flujo de orquestación es idéntico.

---

## Principios del ciclo de vida

| Principio | Descripción |
|---|---|
| **Billing/Revenue no genera PDFs** | Billing solo publica eventos de negocio. El Document Platform orquesta la generación. |
| **Document Platform no envía emails** | Document Platform solo produce el buffer y publica el evento. Communications envía. |
| **Analytics no genera documentos** | Analytics solo provee datasets en respuesta a una solicitud. |
| **Communications no calcula datos** | Communications recibe el buffer listo y los metadatos de destino. No consulta entidades. |
| **Document Platform no almacena PDFs** | La generación es efímera. El buffer tiene TTL de 15 minutos y se destruye. |
| **El correlationId es el hilo conductor** | Todos los eventos del ciclo comparten el mismo correlationId para trazabilidad completa. |

---

## Flujo principal: Invoice Approved → Cliente recibe email

```
BILLING/REVENUE          DOCUMENT PLATFORM           ANALYTICS
────────────────         ─────────────────           ─────────

Invoice aprobado
  │
  ├─ Invoice.status → 'approved'
  ├─ Publish: InvoiceApproved ─────────────────►
  │   {invoiceId, businessId,
  │    documentType: 'invoice',
  │    correlationId}
  │                         │
  │                         ├─ Resolve BusinessDocumentPackage
  │                         │   (businessId + documentType: 'invoice')
  │                         │    → selected variant, defaultLocale, defaultFormat
  │                         │
  │                         ├─ Resolve DocumentContract
  │                         │    → datasets requeridos para 'invoice'
  │                         │
  │                         ├──── DatasetsRequest ──────────────────►
  │                         │      {entityId: invoiceId, businessId,
  │                         │       datasets: [BusinessDataset,
  │                         │                 CustomerDataset,
  │                         │                 InvoiceMetadataDataset,
  │                         │                 InvoiceItemsDataset,
  │                         │                 InvoiceTotalsDataset,
  │                         │                 PaymentDetailsDataset]}
  │                         │
  │                         │◄─── DatasetsResponse ─────────────────┤
  │                         │      {businessDataset: {...},
  │                         │       customerDataset: {...},
  │                         │       invoiceMetadataDataset: {...},
  │                         │       invoiceItemsDataset: [...],
  │                         │       invoiceTotalsDataset: {...},
  │                         │       paymentDetailsDataset: {...}}
  │                         │
  │                         ├─ Resolve locale
  │                         │    Priority: CustomerDataset.preferredLocale
  │                         │             > BusinessDocumentPackage.defaultLocale
  │                         ├─ Resolve format
  │                         │    Priority: BusinessDocumentPackage.defaultFormat
  │                         │
  │                         ├─ Load Template (selected variant)
  │                         ├─ Decompose Template → Blocks
  │                         ├─ Render each Block with its Dataset
  │                         ├─ Apply Theme (colors, typography, brand tokens)
  │                         ├─ Renderer → PDF Buffer (ephemeral)
  │                         ├─ Store buffer in temp storage (TTL: 15 min)
  │                         │
  │                         ├─ Publish: DocumentRendered ──────────────────────────►
  │                         │   {documentExecutionId, documentType,
  │                         │    entityType: 'invoice', entityId: invoiceId,
  │                         │    businessId, bufferRef, bufferExpiresAt,
  │                         │    mimeType, filename, fileSizeBytes,
  │                         │    recipientEmail, recipientName, locale,
  │                         │    templateId, templateVersion, payloadHash,
  │                         │    correlationId}
  │
  │    COMMUNICATIONS                                   AUDIT / TIMELINE
  │    ──────────────                                   ────────────────
  │         │◄── DocumentRendered
  │         │
  │         ├─ Fetch buffer (bufferRef)
  │         ├─ Compose email
  │         │   (subject + body via internal emailEventKey mapping)
  │         ├─ Attach PDF buffer
  │         ├─ Send via provider
  │         │
  │         ├─ (success) Publish: EmailSent ───────────────────────────────────────►
  │         │    {communicationId, documentExecutionId,          ├─ Audit log entry
  │         │     entityType: 'invoice', entityId: invoiceId,    │  (timeline)
  │         │     businessId, recipientEmail, sentAt,            │
  │         │     provider, messageId, correlationId}            │
  │         │
  │         └─ (buffer TTL expires — sin acción explícita requerida)
  │
  │◄──── EmailSent (entityType: 'invoice', entityId: invoiceId)
  │
  ├─ Invoice.status → 'sent'
  ├─ Invoice.sentAt → sentAt
  ├─ Invoice.communicationId → communicationId
  ├─ Publish: InvoiceDelivered
  │    {invoiceId, businessId, sentAt, correlationId}
  │
  └─ (futuro) PaymentDueScheduler observa Invoice.dueDate
        → Si sin pago después de dueDate → Publish: PaymentReminderDue
```

---

## Flujo de fallo: Email no entregado

```
COMMUNICATIONS                    BILLING/REVENUE          AUDIT
──────────────                    ───────────────          ─────

  ├─ Send fails
  ├─ Retry interno (hasta N intentos)
  ├─ Retries agotados
  ├─ Publish: EmailFailed ────────────────────────────────────────────►
  │    {communicationId, documentExecutionId,                  ├─ Audit log entry
  │     entityType: 'invoice', entityId: invoiceId,           │
  │     reason, retryable: false, correlationId}               │

  │◄── EmailFailed (entityType: 'invoice', entityId: invoiceId)
  │
  ├─ Invoice.status → 'delivery_failed'
  ├─ Publish: InvoiceDeliveryFailed
  │    {invoiceId, businessId, reason, correlationId}
  │
  └─ (optional) Notificar al Business Owner — requiere acción manual
```

---

## Respuestas a las 15 preguntas del ciclo de vida

### 1. ¿Quién inicia el proceso?

**Billing/Revenue** es el iniciador. Publica `InvoiceApproved` después de cambiar el estado interno del Invoice. No llama directamente al Document Platform — simplemente publica el hecho de negocio.

**Document Platform** suscribe a `InvoiceApproved` y orquesta todo lo que sigue.

### 2. ¿Qué evento dispara la generación del documento?

`InvoiceApproved`

Este evento representa el hecho de negocio. Document Platform lo consume para iniciar el flujo documental. La separación es intencional: Billing no sabe cómo se genera el PDF ni a quién se envía.

### 3. ¿Qué información mínima se envía al Document Platform?

Billing/Revenue incluye en `InvoiceApproved`:

```
{
  invoiceId:     ObjectId    — entityId para resolución de datasets
  businessId:    ObjectId    — tenant scope
  documentType:  'invoice'   — para resolver Package y Contract
  correlationId: UUID        — hilo de trazabilidad de todo el ciclo
}
```

Locale, variant y format son opcionales (hints). Si no se proveen, Document Platform los resuelve desde `BusinessDocumentPackage`.

### 4. ¿Cuándo se consulta Analytics?

Después de que Document Platform resuelve el `BusinessDocumentPackage` y el `DocumentContract`. Solo cuando sabe exactamente qué datasets necesita, los solicita todos en una sola llamada a Analytics.

**Nunca** se consulta Analytics antes de resolver el contrato. **Nunca** se hacen múltiples llamadas a Analytics para el mismo documento.

### 5. ¿Qué datasets debe entregar Analytics?

Para `documentType: 'invoice'`, según el `DocumentContract`:

| Dataset | Contenido conceptual |
|---|---|
| `BusinessDataset` | Nombre, ABN, logo, dirección, datos de contacto del Business |
| `CustomerDataset` | Nombre, email, dirección, locale preferido del Customer |
| `InvoiceMetadataDataset` | Número de factura, fecha de emisión, fecha de vencimiento, referencia |
| `InvoiceItemsDataset` | Líneas de ítem: descripción, cantidad, precio unitario, monto, código de impuesto |
| `InvoiceTotalsDataset` | Subtotal, impuesto, descuento, total, moneda |
| `PaymentDetailsDataset` | BSB, cuenta, nombre de banco, términos de pago, instrucciones |

Analytics entrega **datasets completos**. Nunca campos individuales. Document Platform nunca le pide a Analytics "dame el email del cliente" — le pide `CustomerDataset` completo.

### 6. ¿Quién decide qué template usar?

**Document Platform**, resolviendo `BusinessDocumentPackage`:

```
BusinessDocumentPackage.getTemplate(businessId, documentType: 'invoice')
  → retorna el template de la variante configurada como default para este Business
     (ej. 'classic', 'modern', 'minimal', 'corporate')
```

Billing/Revenue no sabe que existen templates. El Business configuró su preferencia una vez en el Document Platform. En cada generación, Document Platform lo resuelve automáticamente.

### 7. ¿Quién decide el idioma?

**Document Platform**, con la siguiente jerarquía de resolución:

```
1. Hint de locale en InvoiceApproved (si Billing lo provee)
2. CustomerDataset.preferredLocale       ← más común
3. BusinessDocumentPackage.defaultLocale ← fallback del Business
```

El idioma es del cliente, no del Business. Si el cliente tiene preferencia de idioma, el documento se genera en ese idioma, usando el paquete de traducciones correspondiente del Package.

### 8. ¿Quién decide el formato?

**Document Platform**, resolviendo:

```
1. Hint de format en InvoiceApproved (si Billing lo provee)
2. BusinessDocumentPackage.defaultFormat  ← ej. 'A4' para Australia
```

### 9. ¿Quién conoce el correo del cliente?

**Analytics**, a través de `CustomerDataset`. El email del cliente es un atributo del Customer master data que Analytics proyecta en el dataset.

Document Platform extrae `recipientEmail` y `recipientName` del `CustomerDataset` y los incluye en el evento `DocumentRendered`. Communications no necesita consultar ningún otro sistema para saber a quién enviar.

### 10. ¿Quién adjunta el documento al email?

**Communications**. Recibe `bufferRef` en `DocumentRendered`, descarga el buffer del almacenamiento temporal, y lo adjunta al email antes de enviarlo.

### 11. ¿Quién registra el intento de envío?

**Communications** registra cada intento internamente antes de enviarlo al proveedor. Este log interno es transparente para el resto del sistema.

El resultado final (éxito o fallo definitivo) se publica como `EmailSent` o `EmailFailed`.

### 12. ¿Quién registra si el envío fue exitoso o falló?

**Communications** publica `EmailSent` o `EmailFailed`. El servicio de **Audit/Timeline** suscribe a ambos y registra la entrada en el timeline del Invoice.

### 13. ¿Quién cambia el estado del Invoice a "sent"?

**Billing/Revenue**, al recibir `EmailSent` filtrado por `entityType: 'invoice'`.

Billing no confía ciegamente en el evento — verifica `entityId` para actualizar el Invoice correcto. La transición de estado es:

```
Invoice.status: 'approved' → 'sent'   (si EmailSent)
Invoice.status: 'approved' → 'delivery_failed'  (si EmailFailed)
```

### 14. ¿Quién dispara recordatorios si no hay pago?

**Billing/Revenue**, mediante un `PaymentDueScheduler` propio. Este scheduler verifica periódicamente facturas en estado `sent` cuyo `dueDate` haya pasado sin un pago registrado. Cuando detecta una, publica `PaymentReminderDue`.

`PaymentReminderDue` inicia un flujo de comunicación independiente — no es una repetición del flujo de entrega de factura original.

### 15. ¿Qué eventos se publican en cada paso?

Ver el catálogo de eventos a continuación.

---

## Catálogo de eventos del ciclo documental

### `InvoiceApproved`

| Campo | Valor |
|---|---|
| **Producer** | Billing/Revenue |
| **Consumers** | Document Platform |
| **Categoría** | Operacional |
| **Idempotencia** | Document Platform deduplica por `invoiceId` — un mismo Invoice no genera dos documentos |

**Payload conceptual:**
```
invoiceId:     ObjectId
businessId:    ObjectId
documentType:  'invoice'
correlationId: UUID
occurredAt:    DateTime
```

**NO debe:**
- Incluir datos del cliente (email, nombre, dirección)
- Incluir preferencias de template o locale directamente
- Disparar directamente el envío de email desde Billing

---

### `DocumentRendered`

| Campo | Valor |
|---|---|
| **Producer** | Document Platform |
| **Consumers** | Communications |
| **Categoría** | Operacional (ciclo documental interno) |
| **Idempotencia** | Communications deduplica por `documentExecutionId` |

**Payload conceptual:**
```
documentExecutionId: UUID
documentType:        'invoice'
entityType:          'invoice'
entityId:            ObjectId    — invoiceId
businessId:          ObjectId
bufferRef:           string      — referencia al buffer temporal (firmada, TTL 15 min)
bufferExpiresAt:     DateTime
mimeType:            'application/pdf'
filename:            string      — ej. 'INV-2026-042.pdf'
fileSizeBytes:       integer
recipientEmail:      string      — del CustomerDataset
recipientName:       string      — del CustomerDataset
locale:              string      — locale resuelto (ej. 'en-AU')
templateId:          UUID
templateVersion:     string
payloadHash:         string      — SHA-256 de los datasets usados
correlationId:       UUID
occurredAt:          DateTime
```

**NO debe:**
- Ser procesado después de `bufferExpiresAt`
- Ser almacenado como evento permanente (contiene referencia efímera)
- Incluir el PDF binario directamente en el payload
- Incluir `emailEventKey` — eso es conocimiento de Communications

---

### `EmailSent`

| Campo | Valor |
|---|---|
| **Producer** | Communications |
| **Consumers** | Billing/Revenue, Audit/Timeline, Analytics |
| **Categoría** | Comunicación + Operacional |
| **Idempotencia** | Billing/Revenue deduplica por `invoiceId` al actualizar status |

**Payload conceptual:**
```
communicationId:      UUID
documentExecutionId:  UUID
entityType:           'invoice'
entityId:             ObjectId
businessId:           ObjectId
recipientEmail:       string
sentAt:               DateTime
provider:             string    — 'sendgrid' | 'ses' | etc.
messageId:            string    — ID del proveedor
correlationId:        UUID
```

**NO debe:**
- Contener el buffer o el PDF
- Modificar directamente el estado del Invoice (eso lo hace Billing/Revenue al recibirlo)
- Ser publicado antes de que el proveedor confirme la entrega al relay

---

### `EmailFailed`

| Campo | Valor |
|---|---|
| **Producer** | Communications |
| **Consumers** | Billing/Revenue, Audit/Timeline |
| **Categoría** | Comunicación |
| **Idempotencia** | Billing/Revenue deduplica por `invoiceId` |

**Payload conceptual:**
```
communicationId:     UUID
documentExecutionId: UUID
entityType:          'invoice'
entityId:            ObjectId
businessId:          ObjectId
recipientEmail:      string
reason:              string    — descripción del error final
retryable:           false     — ya se agotaron los reintentos internos
correlationId:       UUID
failedAt:            DateTime
```

**NO debe:**
- Ser publicado antes de agotar todos los reintentos internos de Communications
- Contener el buffer

---

### `InvoiceDelivered`

| Campo | Valor |
|---|---|
| **Producer** | Billing/Revenue |
| **Consumers** | Analytics, Audit/Timeline |
| **Categoría** | Operacional + Financiero |
| **Idempotencia** | La transición de estado es forward-only; idempotente por naturaleza |

**Payload conceptual:**
```
invoiceId:         ObjectId
businessId:        ObjectId
customerId:        ObjectId
invoiceNumber:     string
sentAt:            DateTime
communicationId:   UUID
correlationId:     UUID
```

**NO debe:**
- Disparar un nuevo ciclo de envío
- Ser publicado si el Invoice ya estaba en estado 'sent' previamente

---

### `InvoiceDeliveryFailed`

| Campo | Valor |
|---|---|
| **Producer** | Billing/Revenue |
| **Consumers** | Analytics, Business Owner notification |
| **Categoría** | Operacional |
| **Idempotencia** | Forward-only; idempotente por naturaleza |

**Payload conceptual:**
```
invoiceId:     ObjectId
businessId:    ObjectId
reason:        string
correlationId: UUID
failedAt:      DateTime
```

**NO debe:**
- Reintentar automáticamente el envío — requiere acción explícita del Business Owner

---

## Contratos de información entre dominios

### Billing/Revenue → Document Platform

Via evento `InvoiceApproved`:

```
invoiceId:     ObjectId    — para resolución de datasets en Analytics
businessId:    ObjectId    — tenant scope y para resolver BusinessDocumentPackage
documentType:  'invoice'   — para resolver Package y Contract
correlationId: UUID        — hilo de trazabilidad
```

Document Platform **no necesita más** para iniciar el flujo completo. Todo lo demás lo resuelve internamente.

---

### Document Platform → Analytics

Solicitud de datasets (llamada interna, no evento):

```
entityId:   invoiceId
businessId: businessId
datasets: [
  'BusinessDataset',
  'CustomerDataset',
  'InvoiceMetadataDataset',
  'InvoiceItemsDataset',
  'InvoiceTotalsDataset',
  'PaymentDetailsDataset'
]
```

---

### Analytics → Document Platform

Respuesta de datasets:

```
businessDataset: {
  name, abn, logoUrl, address, phone, email, website, ...
}
customerDataset: {
  name, email, phone, address, preferredLocale, ...
}
invoiceMetadataDataset: {
  invoiceNumber, issueDate, dueDate, reference, notes, ...
}
invoiceItemsDataset: [
  { description, quantity, unitPrice, amount, taxCode, ... }
]
invoiceTotalsDataset: {
  subtotal, taxAmount, discount, total, currency, ...
}
paymentDetailsDataset: {
  bankName, bsb, accountNumber, accountName, paymentTerms, instructions, ...
}
```

Analytics entrega **datasets completos**. Nunca campos individuales. Document Platform no le pide campos específicos.

---

### Document Platform → Communications

Via evento `DocumentRendered`:

```
documentExecutionId: UUID
bufferRef:           string     — referencia temporal (TTL 15 min)
bufferExpiresAt:     DateTime
mimeType:            'application/pdf'
filename:            string
fileSizeBytes:       integer
recipientEmail:      string
recipientName:       string
locale:              string
entityType:          'invoice'
entityId:            ObjectId
businessId:          ObjectId
templateId:          UUID
templateVersion:     string
payloadHash:         string
correlationId:       UUID
```

Communications conoce internamente el mapeo `entityType: 'invoice'` → `emailEventKey: 'invoices.invoice_sent'`. Document Platform no necesita saber sobre la estructura del sistema de comunicaciones.

---

### Communications → Billing/Revenue

Via evento `EmailSent` o `EmailFailed`:

```
communicationId:      UUID
documentExecutionId:  UUID
entityType:           'invoice'
entityId:             ObjectId    — invoiceId, para que Billing actualice el Invoice correcto
businessId:           ObjectId
recipientEmail:       string
sentAt / failedAt:    DateTime
provider:             string      (en EmailSent)
messageId:            string      (en EmailSent)
reason:               string      (en EmailFailed)
correlationId:        UUID
```

Billing/Revenue usa `entityType + entityId` para filtrar los eventos que le corresponden.

---

### Communications → Audit/Timeline

Via evento `EmailSent` o `EmailFailed` (el mismo Audit/Timeline también suscribe):

```
type:                 'email_sent' | 'email_failed'
correlationId:        UUID
documentExecutionId:  UUID
entityType:           'invoice'
entityId:             ObjectId
businessId:           ObjectId
recipientEmail:       string
timestamp:            DateTime
result: {
  success:            boolean
  messageId:          string?
  provider:           string?
  reason:             string?
}
```

---

## El buffer efímero — ciclo de vida

```
GENERACIÓN
  Document Platform renderiza el PDF en memoria
  └─ Store en temp storage (Redis / S3 con TTL 15 min)
  └─ Publish: DocumentRendered { bufferRef, bufferExpiresAt }

CONSUMO
  Communications recibe DocumentRendered
  └─ Fetch buffer usando bufferRef
  └─ Attach a email
  └─ Send email

EXPIRACIÓN AUTOMÁTICA
  Si Communications falla en consumir antes de bufferExpiresAt:
  └─ El buffer TTL expira automáticamente en storage
  └─ bufferRef se vuelve inválida — nadie puede regenerar el PDF desde ella
  └─ Document Platform puede regenerar si Billing vuelve a publicar InvoiceApproved

QUÉ NO SE ALMACENA JAMÁS
  ✗ El binario PDF permanentemente
  ✗ El bufferRef más allá de la duración del evento
  ✗ Las URLs de descarga temporal

QUÉ SÍ SE ALMACENA
  ✓ documentExecutionId (para audit trail)
  ✓ payloadHash (para integridad — prueba de qué datos se usaron)
  ✓ templateId + templateVersion (para reproducibilidad)
  ✓ communicationId (en Invoice record)
  ✓ sentAt (en Invoice record)
```

---

## Estados del Invoice a lo largo del ciclo

```
draft
  │
  ▼
issued    ← factura emitida al cliente
  │
  ▼
approved  ← factura revisada y aprobada para envío
  │         Document Platform comienza aquí
  ├─ (éxito) ──────────────────────────────────────► sent
  │                                                    │
  │                                                    ▼
  │                                                 paid (flujo de pago separado)
  │
  └─ (fallo definitivo) ───────────────────────► delivery_failed
                                                    │
                                                    ▼
                                                  (Business Owner decide: reintentar o cancelar)
```

---

## Garantías del ciclo

| Garantía | Mecanismo |
|---|---|
| Un Invoice genera exactamente un documento por intento | Document Platform deduplica por `invoiceId` antes de iniciar la generación |
| El buffer no se filtra más allá de Communications | TTL de 15 min en temp storage; Communications consume y el TTL expira |
| El estado de Invoice siempre refleja la realidad | Billing/Revenue actualiza solo al recibir el evento de outcome de Communications |
| Toda la cadena es trazable | `correlationId` en todos los eventos; `documentExecutionId` en los logs del Document Platform |
| Communications no envía dos veces el mismo documento | Deduplica por `documentExecutionId` antes de dispatch |
| No hay datos de cliente fuera del ámbito del ciclo | El email del cliente viaja solo de Analytics a Document Platform a Communications, dentro del mismo flujo |

---

## Extensibilidad a otros tipos de documento

Este flujo es idéntico para todos los tipos de documento del ERP. Lo único que cambia:

| Parámetro | Invoice | Statement | BAS | Payroll |
|---|---|---|---|---|
| `documentType` | `invoice` | `statement` | `bas_report` | `payslip` |
| `DocumentContract` | 6 datasets | 4 datasets | 3 datasets | 5 datasets |
| `emailEventKey` (en Communications) | `invoices.invoice_sent` | `statements.statement_sent` | `tax.bas_submitted` | `payroll.payslip_sent` |
| Template variant | Classic / Modern / Minimal | Classic / Detailed | Standard | — |
| Producer del trigger event | Billing/Revenue | Billing/Revenue | Accounting | Payroll |

El Document Platform, Analytics, Communications, y el Audit/Timeline no cambian. Solo se agrega un nuevo Package, un nuevo Contract, y el Consumer en Communications mapea el nuevo `documentType` a su `emailEventKey`.

---

## Documentos relacionados

- [01-document-domain.md](./01-document-domain.md) — Entidades y ciclo de vida de almacenamiento
- [02-document-relationships.md](./02-document-relationships.md) — Relaciones entre dominios
- [ADR-008-document-delivery-lifecycle.md](../../decisions/ADR-008-document-delivery-lifecycle.md) — Decisión arquitectónica
- `docs/domain/analytics/` — Datasets y proyecciones de Analytics
- `docs/domain/billing/` — Estados y eventos del Invoice

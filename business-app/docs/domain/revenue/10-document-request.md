# 10 — Document Request

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

Este documento formaliza el concepto de **Document Request**: el paso explícito que existe entre la aprobación de una Invoice y su envío al Customer. Revenue y Billing nunca generan PDFs ni conocen Templates. Solo solicitan documentos.

---

## El problema

El flujo original saltaba directamente de `Invoice.Approved` a `Invoice.Sent`. Este salto ocultaba un proceso no trivial: la generación del documento PDF, su almacenamiento, y la obtención de una referencia segura antes de poder enviar la comunicación.

Si Billing generara el PDF directamente:
- Billing necesitaría conocer el Template Engine y el Motor de Composición
- Billing necesitaría conocer las reglas del Theme y del Layout
- Un fallo en la generación del PDF sería indistinguible de un fallo en el envío
- El PDF no existiría en el sistema antes del envío — no habría evidencia en caso de disputa
- Regenerar el PDF de una Invoice histórica requeriría recorrer la lógica de Billing

El Document Request desacopla estas responsabilidades de forma explícita.

---

## El flujo actualizado

```
Invoice.Approved
    │
    │ Billing publica: DocumentRequested
    │   { invoiceId, documentType: PDF_INVOICE, businessId, customerId }
    ▼
Document Management recibe DocumentRequested
    │
    ├── Solicita al Template Engine los datos de composición:
    │     Invoice data (items, totals, dates)
    │     Customer data (name, address, ABN)
    │     Business data (name, logo, ABN, bank account)
    │     FiscalProfile (GST number, payment terms)
    │
    ├── Aplica el Layout Template (default_pdf_layout del Business)
    │
    ├── Aplica el Theme (colores, tipografía del Business)
    │
    ├── Genera el binario PDF
    │
    ├── Almacena en el StorageNamespace del Business
    │   → Filename: invoice-{invoiceNumber}-{timestamp}.pdf
    │   → Retención: 7 años (BR-DOC-003)
    │
    └── Crea el DocumentReference
          { documentId, invoiceId, storageKey, mimeType, generatedAt }
    │
    │ Document Management publica: DocumentGenerated
    │   { documentId, invoiceId, businessId, documentReference }
    ▼
Billing recibe DocumentGenerated
    │
    ├── Adjunta el DocumentReference a la Invoice
    │   → Invoice.documentId = documentId
    │
    └── Invoice pasa al estado "ready_to_send"
    │
    │ [Business Owner confirma envío, o proceso automático según configuración]
    ▼
Communications recibe InvoiceReadyToSend
    │
    ├── Resuelve el canal (email)
    ├── Resuelve el template de email (invoice.sent event)
    ├── Adjunta el PDF como referencia segura (URL de descarga temporal)
    │
    └── Envía al Customer
    │
    │ Billing publica: InvoiceSent
    │   { invoiceId, documentId, sentAt, channel }
    ▼
Financial Engine recibe InvoiceSent
    → (según RecognitionPolicy) crea FinancialTransaction INVOICE_ISSUED
```

---

## Los participantes del Document Request

### El solicitante (Billing)

Billing sabe que necesita un PDF pero no sabe cómo generarlo. Su única responsabilidad es publicar el evento `DocumentRequested` con los metadatos necesarios: tipo de documento, referencia a la Invoice, y contexto del Business.

Billing no espera el PDF — reacciona al evento `DocumentGenerated` cuando está listo.

### El generador (Document Management + Template Engine)

El Document Management recibe el `DocumentRequested` y orquesta la generación:
1. Consulta los datos necesarios (Invoice, Customer, Business, Theme, Layout)
2. Delega la composición al Template Engine
3. Almacena el resultado
4. Publica `DocumentGenerated`

El Template Engine aplica exactamente el mismo modelo de composición que para los emails: Layout Template + Theme + datos de contexto (ver DEC-017 §8).

### El resultado (DocumentReference)

El DocumentReference es la prueba de que el documento existe. No es el documento en sí (el binario está en el StorageProvider). Es el registro que dice "este PDF existe, tiene este ID, fue generado en este momento, y puede descargarse con un token temporal".

---

## Por qué el documento debe existir antes del envío

**1. Evidencia auditable:**
El PDF de la Invoice debe existir en el sistema con una fecha de generación documentada antes de que la Invoice sea "enviada" legalmente. Si el Customer disputa cuándo recibió la Invoice, el sistema puede mostrar: "el PDF fue generado el 2026-07-05T14:23:00Z y enviado el 2026-07-05T14:23:05Z".

**2. Resiliencia del canal de envío:**
Si el envío por email falla (proveedor de email caído, dirección inválida), el PDF ya existe en el sistema. Se puede reintentar el envío sin regenerar el documento.

**3. Descarga directa:**
El Customer puede recibir un link de descarga directa del PDF almacenado — sin regenerarlo en tiempo real. El link usa un token temporal seguro sobre el `documentId`.

**4. Historial inmutable:**
Una Invoice enviada tiene un `documentId` que referencia el binario exacto que fue enviado. Si el Business modifica su logo o Template después, el PDF histórico no cambia — porque ya está almacenado.

---

## Manejo de fallos

### Fallo en la generación del PDF

Si el Template Engine o el StorageProvider fallan al procesar `DocumentRequested`:
- Document Management publica `DocumentGenerationFailed` con el error
- Billing recibe el evento y mantiene la Invoice en estado `approved` (no avanza a `ready_to_send`)
- El sistema reintenta automáticamente con backoff exponencial
- Después de N reintentos, el evento va al Dead Letter Queue para intervención manual

La Invoice nunca queda en un estado "enviada sin documento".

### Fallo en el envío (después de DocumentGenerated)

Si el envío del email falla después de que el PDF ya fue generado:
- El PDF existe y es válido
- Billing puede reintentar el envío usando el `documentId` existente — no necesita regenerar
- El estado de la Invoice retrocede a `ready_to_send` para el reintento

---

## El evento DocumentRequested

**Clasificación:** Operativo · de Comunicación
**Producer:** Billing domain (al aprobar la Invoice)
**Payload:**
```
{
  requestId:      UUID único del request
  businessId:     ID del Business
  documentType:   PDF_INVOICE | PDF_REPORT | PDF_STATEMENT
  invoiceId:      ID de la Invoice (para PDF_INVOICE)
  requestedAt:    timestamp
  priority:       NORMAL | HIGH (para documentos urgentes)
}
```
**Consumers:**
- Document Management → genera el PDF y almacena

---

## El evento DocumentGenerated

**Clasificación:** Operativo · de Comunicación
**Producer:** Document Management
**Payload:**
```
{
  documentId:      ID del documento creado
  requestId:       referencia al DocumentRequested que lo originó
  businessId:      ID del Business
  invoiceId:       ID de la Invoice (si aplica)
  documentReference: {
    storageKey:    clave en el StorageProvider
    mimeType:      "application/pdf"
    sizeBytes:     tamaño del archivo
    generatedAt:   timestamp de generación
  }
}
```
**Consumers:**
- Billing → adjunta el DocumentReference a la Invoice y avanza a `ready_to_send`

---

## El evento InvoiceReadyToSend

**Clasificación:** Operativo · de Comunicación
**Producer:** Billing (después de recibir DocumentGenerated y adjuntar el documento)
**Payload:**
```
{
  invoiceId:    ID de la Invoice
  businessId:   ID del Business
  customerId:   ID del Customer
  documentId:   ID del PDF generado
  channel:      EMAIL | POST | PORTAL
}
```
**Consumers:**
- Communications domain → envía la Invoice al Customer por el canal configurado

---

## Relación con el modelo de composición de DEC-017

El Document Request para un PDF de Invoice sigue exactamente el mismo modelo de composición que los emails (DEC-017 §8), aplicado al canal `pdf`:

```
Resolución de datos:
  1. Invoice data (ítems, totales, fechas, número)
  2. Customer data (nombre, dirección, ABN del destinatario)
  3. Business data + FiscalProfile (emisor, ABN, banco)
  4. Theme (colores, tipografía del Business)
  5. Layout Template: default_pdf_layout (wrapper del documento)

Composición:
  Inyectar datos en el template
  Renderizar variables: invoice.* / customer.* / business.* / theme.*
  Producir el binario PDF

Almacenamiento:
  StorageNamespace del Business
  Retención: 7 años (documentos financieros — BR-DOC-003)
```

---

## Lo que Revenue y Billing nunca hacen

| Responsabilidad | Nunca la tiene Revenue | Nunca la tiene Billing |
|---|---|---|
| Generar binarios PDF | ✅ nunca | ✅ nunca |
| Conocer el Layout Template | ✅ nunca | ✅ nunca |
| Conocer el Theme | ✅ nunca | ✅ nunca |
| Almacenar archivos | ✅ nunca | ✅ nunca |
| Conocer el StorageProvider | ✅ nunca | ✅ nunca |
| Adjuntar PDFs a emails | ✅ nunca | ✅ nunca |

Revenue y Billing solo publican eventos. Document Management y Communications los materializan.

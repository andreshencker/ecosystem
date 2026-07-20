# 02 — Document Relationships

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual oficial

Cada dominio del ERP tiene una relación específica con Document Management. Este documento define quién genera, quién consume, y quién puede solicitar eliminación de cada tipo de documento.

---

## Matriz de relaciones

| Dominio | Genera documentos | Consume documentos | Puede archivar | Tipo de documentos |
|---|---|---|---|---|
| Billing | Sí | Referencia | Sí (sus propios) | invoice_pdf, credit_note_pdf, payment_receipt, statement |
| Accounting | Sí | Referencia | Sí (sus propios) | financial_report, trial_balance, bas_report, tax_certificate |
| Analytics | Sí | No | Sí (sus propios) | export_csv, export_pdf, financial_report |
| Communications | No | Sí (adjuntar) | No | Consume documentos generados por otros |
| Work | Sí (futuro) | Referencia | Sí | contract |
| Customer | No | Referencia | No | — |
| Identity | No | No | No | — |
| Business | No | Referencia | No | — |
| Integration | Sí (imported) | No | Parcial | receipt_image, ofx_import, csv_import |
| Payroll (futuro) | Sí | Referencia | Sí | payslip, payroll_summary |

---

## Billing ↔ Document Management

### Documentos que Billing genera

**1. Invoice PDF**
```
Trigger: InvoiceSent event
Generado por: Billing → PDF Generation Service → Document Management
DocumentReference almacenado en: Invoice.pdfDocumentRef

DocumentMetadata:
  entityReferences: [
    { entityType: 'invoice', entityId: invoice.id },
    { entityType: 'customer', entityId: invoice.customerId }
  ]
  period: invoice.issueDate YYYY-MM
  amount: invoice.grossAmount
  currency: invoice.currency
```

**Por qué Billing no almacena la URL directamente:**
Si el Business cambia de plan y migra de S3 a R2, o si el sistema rota los presigned URLs, la URL almacenada en Invoice se volvería inválida. Con DocumentReference, solo Document Management sabe cómo obtener la URL actual.

**2. Payment Receipt**
```
Trigger: PaymentRecorded event
DocumentMetadata:
  entityReferences: [
    { entityType: 'payment', entityId: payment.id },
    { entityType: 'invoice', entityId: payment.invoiceId }
  ]
  amount: payment.amount
```

**3. Customer Statement**
```
Trigger: Acción manual del Business Owner
Contenido: listado de facturas del cliente en el período solicitado
DocumentMetadata:
  entityReferences: [{ entityType: 'customer', entityId: customer.id }]
  period: 'YYYY-QN' del statement
```

### Cómo Communications usa documentos de Billing

```
CommunicationDispatcher.onInvoiceSent(event) {
    // Obtiene la URL de descarga del PDF
    const downloadUrl = await documentManagement.getDownloadUrl(
        invoice.pdfDocumentRef.documentId,
        { expiresIn: '7 days' }    // URL firmada temporalmente
    );

    // Pasa la URL a Communications Platform
    await communicationClient.trigger({
        event: 'invoices.invoice_sent',
        payload: {
            invoiceNumber: invoice.invoiceNumber,
            pdfDownloadUrl: downloadUrl,     ← URL temporal, no almacenada
            amount: invoice.total
        }
    });
}
```

**Principio:** Communications recibe URLs temporales (presigned URLs). Nunca almacena las URLs — estas expiran. Si el cliente quiere volver a descargar la factura, Business App solicita una nueva URL temporal a Document Management.

---

## Accounting ↔ Document Management

### Documentos que Accounting genera

**1. P&L Report (Financial Report)**
```
Trigger: FiscalPeriodClosed event O acción manual del Business Owner
DocumentMetadata:
  entityReferences: [
    { entityType: 'fiscal_period', entityId: period.id }
  ]
  period: period.code
```

**2. Trial Balance**
```
Trigger: Acción manual del Business Owner o del contador
```

**3. BAS Report (Australia)**
```
Trigger: Fin de trimestre fiscal (job automático O manual)
Tipo: bas_report
Contenido: datos pre-llenados para el Business Activity Statement

DocumentMetadata:
  entityReferences: [{ entityType: 'bas_quarter', entityId: basQuarter.id }]
  period: trimestre fiscal
  amount: bas.netGSTPayable
```

**Retención de documentos fiscales:** 7 años (requerimiento ATO Australia).
Document Management aplica `retentionUntil = createdAt + 7 years` automáticamente para `documentType = 'bas_report'`.

---

## Analytics ↔ Document Management

### Documentos que Analytics genera

**1. Report Exports (PDF/CSV)**
```
Trigger: Business Owner solicita exportar un reporte
Generado por: Analytics → PDF/CSV generator → Document Management

DocumentReference retornado al Business App
Business App provee URL de descarga temporal al Frontend
El documento no se almacena permanentemente → se archiva a los 30 días
```

**Retención de exports:** 30 días (no son documentos legales, son convenientes).

---

## Work ↔ Document Management (futuro)

### Documentos que Work generará

**1. Contract Document**
```
Trigger: Business Owner carga un PDF de contrato como adjunto al Contract entity
DocumentType: 'contract'
DocumentMetadata:
  entityReferences: [
    { entityType: 'contract', entityId: contract.id },
    { entityType: 'customer', entityId: contract.customerId }
  ]
```

---

## Integration Hub ↔ Document Management

### Documentos que Integration importa

**1. Receipt Images (para Expenses — Fase 6)**
```
Trigger: Staff sube una foto del recibo de gasto
DocumentType: 'receipt_image'
DocumentMetadata:
  entityReferences: [{ entityType: 'expense', entityId: expense.id }]
```

**2. Imported Files (OFX, CSV)**
```
Trigger: Business Owner sube extracto bancario para conciliación
DocumentType: 'ofx_import' | 'csv_bank_import'
Retención: 1 año (dato de referencia para auditoría)
```

---

## Customer ↔ Document Management

Customer no genera documentos. Pero es un sujeto referenciado en múltiples documentos.

```
// Buscar todos los documentos relacionados a un cliente
DocumentManagement.listByEntity('customer', customerId)
    → retorna:
        - Todas las Invoice PDFs de ese cliente
        - Todos sus Payment Receipts
        - Todos sus Customer Statements
        - Los contratos donde aparece como cliente
```

Esta búsqueda cross-document es solo posible porque Document Management centraliza el almacenamiento y los metadatos.

---

## Firma digital de documentos (futuro)

Para contratos y facturas que requieren firma electrónica:

```
DocumentSigned {
    documentId:     UUID
    businessId:     ObjectId
    signatories: [
        {
            name:         string
            email:        string
            signedAt:     DateTime
            signatureRef: string    — referencia a la firma digital
            ipAddress:    string?   — para audit trail legal
        }
    ]
    signatureProvider: string    — 'docusign' | 'adobe_sign' | 'hellosign'
    signedDocumentVersionId: UUID  — versión con firma embedded
    isLegallyBinding: boolean
}
```

La versión firmada es una nueva `DocumentVersion` con el PDF original + la firma embebida. La versión original sin firma se preserva.

---

## Diagrama de relaciones

```
                    DOCUMENT MANAGEMENT
                    ┌──────────────────────┐
                    │                      │
  Billing ─────────►│  STORE               │◄──── Integration
  Accounting ───────►│  (genera documents) │◄──── Work (futuro)
  Analytics ─────────►│                    │◄──── Payroll (futuro)
                    │                      │
                    │  RETRIEVE            │────► Communications
                    │  (provee URLs)       │────► Customer portal
                    │                      │────► Business App
                    │  MANAGE              │────► Analytics (DocumentFact)
                    │  (lifecycle)         │────► Audit log
                    └──────────────────────┘

REGLA: Los dominios operativos (Billing, Accounting, Work) solo
       almacenan DocumentReference. Nunca URLs directas.
       Solo Document Management conoce cómo obtener el archivo real.
```

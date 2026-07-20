# Evento: billing.invoice_sent

**Versión del contrato:** 1
**Fecha:** 2026-07-06
**Productor:** Billing domain (`src/billing/`)
**Estado:** Oficial — pendiente de implementación (Sprint 6)

---

## Propósito

Indica que una Invoice fue enviada al Customer. Alimenta `fact_invoice` en BI, que es la base de todos los KPIs de revenue.

---

## Payload

| Campo | Tipo | Requerido | BI Column | Descripción |
|---|---|---|---|---|
| `businessId` | UUID | ✅ | `fact_invoice.business_id` | Tenant owner |
| `invoiceId` | UUID | ✅ | `fact_invoice.invoice_id` | ID de la Invoice |
| `customerId` | UUID | ✅ | `fact_invoice.customer_id` | Customer destinatario |
| `issueDate` | `YYYY-MM-DD` | ✅ | `fact_invoice.issue_date_key` | Fecha de emisión |
| `dueDate` | `YYYY-MM-DD` | ✅ | `fact_invoice.due_date_key` | Fecha de vencimiento |
| `invoiceNumber` | string | ✅ | `fact_invoice.invoice_number` | Número de factura |
| `subtotal` | decimal | ✅ | `fact_invoice.subtotal` | Sin impuestos |
| `taxAmount` | decimal | ✅ | `fact_invoice.tax_amount` | Impuesto (GST) |
| `grossAmount` | decimal | ✅ | `fact_invoice.gross_amount` | Total con impuestos |
| `currency` | string(3) | ✅ | `fact_invoice.currency` | AUD / NZD / etc. |
| `workEventCount` | integer | opcional | `fact_invoice.work_event_count` | Cantidad de WorkEvents incluidos |
| `daysTodue` | integer | opcional | `fact_invoice.days_to_due` | issueDate → dueDate |

---

## BI Relevance

```
Tabla afectada: fact_invoice
event_type: 'sent'
Idempotency: ON CONFLICT (event_id) DO NOTHING

KPIs que alimenta:
- RevenueByPeriod: SUM(gross_amount) WHERE event_type = 'sent'
- ARBalance: facturas sent sin payment correspondiente
- InvoiceVolumeByCustomer
```

---

## Estado de implementación

- ❌ No implementado aún (Sprint 6)

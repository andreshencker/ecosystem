# Evento: billing.invoice_generated

**Versión del contrato:** 1
**Fecha:** 2026-07-06
**Productor:** Billing domain (`src/billing/`)
**Estado:** Oficial — pendiente de implementación (Sprint 6)

---

## Propósito

Indica que una Invoice fue generada (draft). BI no consume este evento directamente — solo `invoice_sent` alimenta `fact_invoice`. Sin embargo, Analytics BC-10 puede usarlo para el pipeline de Invoice.

---

## Payload

| Campo | Tipo | Requerido | Analytics | BI |
|---|---|---|---|---|
| `businessId` | UUID | ✅ | ✅ | — |
| `invoiceId` | UUID | ✅ | ✅ | — |
| `customerId` | UUID | ✅ | ✅ | — |
| `issueDate` | `YYYY-MM-DD` | ✅ | ✅ | — |
| `grossAmount` | decimal | ✅ | ✅ | — |
| `currency` | string(3) | ✅ | ✅ | — |

---

## BI Relevance

No alimenta tablas de BI directamente. Solo `billing.invoice_sent` lo hace.

---

## Estado de implementación

- ❌ No implementado aún (Sprint 6)

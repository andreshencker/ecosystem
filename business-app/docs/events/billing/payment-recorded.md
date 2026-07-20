# Evento: billing.payment_recorded

**Versión del contrato:** 1
**Fecha:** 2026-07-06
**Productor:** Billing domain (`src/billing/`)
**Estado:** Oficial — pendiente de implementación (Sprint 6)

---

## Propósito

Indica que un pago fue registrado contra una Invoice. Alimenta `fact_payment` en BI y puede generar `fact_customer_activity` si es el primer pago de ese customer.

---

## Payload

| Campo | Tipo | Requerido | BI Column | Descripción |
|---|---|---|---|---|
| `businessId` | UUID | ✅ | `fact_payment.business_id` | Tenant owner |
| `paymentId` | UUID | ✅ | `fact_payment.payment_id` | ID del Payment. Unique. |
| `invoiceId` | UUID | ✅ | `fact_payment.invoice_id` | Invoice contra la que aplica |
| `customerId` | UUID | ✅ | `fact_payment.customer_id` | Customer que pagó |
| `amount` | decimal | ✅ | `fact_payment.amount` | Monto del pago |
| `currency` | string(3) | ✅ | `fact_payment.currency` | Código ISO 4217 |
| `paymentDate` | `YYYY-MM-DD` | ✅ | `fact_payment.payment_date_key` | Fecha del pago |
| `paymentMethod` | string | opcional | `fact_payment.payment_method` | `bank_transfer \| card \| cash \| etc.` |
| `daysToPayment` | integer | opcional | `fact_payment.days_to_payment` | Días desde emisión de invoice |
| `isFirstPayment` | boolean | opcional | — | Si es el primer pago del customer — activa fact_customer_activity |

---

## BI Relevance

```
Tablas afectadas: fact_payment, (fact_customer_activity si isFirstPayment = true)
Idempotency: ON CONFLICT (event_id) DO NOTHING

KPIs que alimenta:
- CollectionsRate: payments vs invoices sent
- ARBalance: reducir balance cuando llega payment
- AverageDaysToPayment
- CustomerPaymentBehavior
```

---

## Estado de implementación

- ❌ No implementado aún (Sprint 6)

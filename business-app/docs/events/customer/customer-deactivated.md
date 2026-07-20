# Evento: customer.deactivated

**Versión del contrato:** 1
**Fecha:** 2026-07-06
**Productor:** Customer domain (`src/customer/`)
**Estado:** Oficial — **NO implementado** (Sprint 2 deuda)

---

## Propósito

Indica que un Customer fue desactivado (soft delete). BI actualiza `dim_customer.is_active = false` y registra la actividad en `fact_customer_activity`.

---

## Payload

| Campo | Tipo | Requerido | BI Column | Descripción |
|---|---|---|---|---|
| `businessId` | UUID | ✅ | `dim_customer.business_id` | Tenant owner |
| `customerId` | UUID/string | ✅ | `dim_customer.customer_id` | Customer desactivado |
| `deactivatedAt` | ISO8601 | ✅ | `fact_customer_activity.activity_date_key` | Timestamp UTC |
| `deactivatedBy` | UUID | opcional | — | userId que ejecutó la acción |

---

## BI Relevance

```
Tablas afectadas: dim_customer, fact_customer_activity
Mapeo dim_customer:
  is_active → false
  updated_at → deactivatedAt

Mapeo fact_customer_activity:
  event_id           → event_id
  business_id        → businessId
  customer_id        → customerId
  activity_date_key  → deactivatedAt (Date part)
  activity_type      → 'customer_deactivated'
```

---

## Estado de implementación

- ✅ `CustomerDeactivatedEvent` definido en `src/customer/events/customer-deactivated.event.ts`
- ✅ `CustomerService.deactivate()` publica el evento al Outbox después del soft-delete
- ❌ Handler de BI: no implementado (Sprint 11 — `dim_customer.is_active = false` + `fact_customer_activity`)
- ❌ Handler de Analytics: no implementado

**Nota:** Este evento es exclusivamente un Domain Event para BI/Analytics. NO genera Communication Event. La confirmación al usuario se hace con toast en el frontend.

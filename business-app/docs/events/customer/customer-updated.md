# Evento: customer.updated

**Versión del contrato:** 1
**Fecha:** 2026-07-06
**Productor:** Customer domain (`src/customer/`)
**Estado:** Oficial — **NO implementado** (Sprint 2 deuda)

---

## Propósito

Indica que los datos de un Customer fueron actualizados. BI hace un UPSERT en `dim_customer` para mantener la dimensión actualizada (Slowly Changing Dimension Type 1).

---

## Payload

| Campo | Tipo | Requerido | BI Column | Descripción |
|---|---|---|---|---|
| `businessId` | UUID | ✅ | `dim_customer.business_id` | Tenant owner |
| `customerId` | UUID/string | ✅ | `dim_customer.customer_id` | Customer actualizado |
| `displayName` | string | opcional | `dim_customer.display_name` | Si fue modificado |
| `abn` | string \| null | opcional | `dim_customer.abn` | Si fue modificado |
| `email` | string \| null | opcional | `dim_customer.email` | Si fue modificado |
| `updatedAt` | ISO8601 | ✅ | `dim_customer.updated_at` | Timestamp de la actualización |
| `changedFields` | string[] | ✅ | — | Lista de campos que cambiaron |

---

## BI Relevance

```
Tabla afectada: dim_customer
Estrategia: SCD Type 1 (UPSERT — sobreescribir valores)
Idempotency: ON CONFLICT (customer_id) DO UPDATE SET updated_at = excluded.updated_at, ...

Nota: BI no mantiene historial de cambios del customer (SCD Type 1).
Si se requiere historial futuro, se debe migrar a SCD Type 2 con nueva versión del evento.
```

---

## Estado de implementación

- ✅ `CustomerUpdatedEvent` definido en `src/customer/events/customer-updated.event.ts`
- ✅ `CustomerService.update()` publica el evento al Outbox después del UPDATE (incluye `changedFields`)
- ❌ Handler de BI: no implementado (Sprint 11 — UPSERT en `dim_customer`, SCD Type 1)
- ❌ Handler de Analytics: no implementado

**Nota:** Este evento es exclusivamente un Domain Event para BI/Analytics. NO genera Communication Event. La confirmación al usuario se hace con toast en el frontend.

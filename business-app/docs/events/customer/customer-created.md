# Evento: customer.created

**Versión del contrato:** 1
**Fecha:** 2026-07-06
**Productor:** Customer domain (`src/customer/`)
**Estado:** Oficial — **NO implementado** (Sprint 2 deuda)

---

## Propósito

Indica que un nuevo Customer fue creado en el sistema. Es el origen de `dim_customer` en BI y del read model operativo en Analytics BC-10.

---

## Envelope

| Campo | Valor |
|---|---|
| `eventName` | `customer.created` |
| `version` | 1 |
| `aggregateType` | `Customer` |
| `tenantId` | `businessId` del tenant propietario |

---

## Payload

| Campo | Tipo | Requerido | BI Column | Descripción |
|---|---|---|---|---|
| `businessId` | UUID | ✅ | `dim_customer.business_id` | Tenant owner. Siempre del JWT — nunca del body. |
| `customerId` | UUID/string | ✅ | `dim_customer.customer_id` | ID del Customer. Inmutable. |
| `displayName` | string | ✅ | `dim_customer.display_name` | Nombre visible del customer |
| `customerType` | `'company' \| 'individual'` | ✅ | `dim_customer.customer_type` | Tipo de entidad |
| `abn` | string \| null | opcional | `dim_customer.abn` | ABN si aplica |
| `email` | string \| null | opcional | `dim_customer.email` | Email de contacto principal |
| `isActive` | boolean | ✅ | `dim_customer.is_active` | Siempre `true` en created |
| `createdAt` | ISO8601 | ✅ | `dim_customer.created_at` | Timestamp UTC |
| `updatedAt` | ISO8601 | ✅ | `dim_customer.updated_at` | Igual a createdAt inicialmente |

---

## Consumidores

| Consumidor | Acción |
|---|---|
| BI BC-13 | INSERT INTO `dim_customer`, INSERT INTO `fact_customer_activity` (activity_type: 'customer_created') |
| Analytics BC-10 | Actualizar CustomerSummary read model |

---

## BI Relevance

```
Tablas afectadas: dim_customer, fact_customer_activity
Idempotency:
  dim_customer:            ON CONFLICT (customer_id) DO UPDATE SET ...
  fact_customer_activity:  ON CONFLICT (event_id) DO NOTHING

Mapeo dim_customer:
  businessId    → business_id
  customerId    → customer_id
  displayName   → display_name
  customerType  → customer_type
  abn           → abn
  email         → email
  isActive      → is_active
  createdAt     → created_at
  updatedAt     → updated_at

Mapeo fact_customer_activity:
  eventId       → event_id
  businessId    → business_id
  customerId    → customer_id
  createdAt     → activity_date_key (Date part)
  'customer_created' → activity_type
```

---

## Analytics Relevance

```
Read model afectado: CustomerSummaryModel (src/analytics/)
Handler: CustomerCreatedAnalyticsHandler
Acción: Incrementar total_customers, active_customers
```

---

## Estado de implementación

- ✅ `CustomerCreatedEvent` definido en `src/customer/events/customer-created.event.ts`
- ✅ `CustomerService.create()` publica el evento al Outbox después del INSERT
- ❌ Handler de BI: no implementado (Sprint 11)
- ❌ Handler de Analytics: no implementado

**Nota:** Este evento es exclusivamente un Domain Event para BI/Analytics. NO genera Communication Event. La confirmación al usuario se hace con toast en el frontend.

**Pendiente en Sprint 11:** Implementar `CustomerCreatedAnalyticsHandler` y handler de BI que proyecte en `dim_customer` y `fact_customer_activity`.

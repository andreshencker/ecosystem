# Evento: work.work_event_confirmed

**Versión del contrato:** 1
**Fecha:** 2026-07-06
**Productor:** Work domain (`src/work/`)
**Estado:** Oficial — pendiente de implementación (Sprint 4)

---

## Propósito

Indica que un WorkEvent fue confirmado y tiene un RateResult asociado. Es el evento más crítico para BI — alimenta `fact_work_event` que es la base de las métricas de productividad y billing.

---

## Payload

| Campo | Tipo | Requerido | BI Column | Descripción |
|---|---|---|---|---|
| `businessId` | UUID | ✅ | `fact_work_event.business_id` | Tenant owner |
| `workEventId` | UUID | ✅ | `fact_work_event.work_event_id` | ID del WorkEvent. Unique. |
| `customerId` | UUID | ✅ | `fact_work_event.customer_id` | Customer del contrato |
| `userId` | UUID | ✅ | `fact_work_event.user_id` | Usuario que realizó el trabajo |
| `contractId` | UUID | opcional | `fact_work_event.contract_id` | Contrato asociado |
| `workDate` | date string `YYYY-MM-DD` | ✅ | `fact_work_event.work_date_key` | Fecha del trabajo (para join con dim_time) |
| `durationMinutes` | decimal | ✅ | `fact_work_event.duration_minutes` | Duración en minutos |
| `durationHours` | decimal | ✅ | `fact_work_event.duration_hours` | Duración en horas |
| `calculatedAmount` | decimal | ✅ | `fact_work_event.calculated_amount` | Monto calculado por Rate Engine |
| `currency` | string(3) | ✅ | `fact_work_event.currency` | Código ISO 4217 |
| `rateType` | string | ✅ | `fact_work_event.rate_type` | `standard \| overtime \| weekend \| night` |
| `billable` | boolean | ✅ | `fact_work_event.billable` | Si es facturable |
| `source` | string | ✅ | `fact_work_event.source` | `manual \| calendar` |

---

## BI Relevance

```
Tabla afectada: fact_work_event
Idempotency: ON CONFLICT (event_id) DO NOTHING

⚠️ CRÍTICO: calculatedAmount y rateType son inmutables en BI una vez insertados.
Si el WorkEvent se anula después (WorkEventVoided), BI crea una fila fact_work_event
con is_voided=true — nunca modifica la fila original.
```

---

## Estado de implementación

- ❌ No implementado aún (Sprint 4)
- Payload definido aquí como contrato oficial

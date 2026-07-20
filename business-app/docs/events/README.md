# Domain Events — Catálogo Oficial

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial

---

## Propósito

Este directorio contiene el contrato oficial de cada Domain Event del sistema. Es la única fuente de verdad sobre qué emite cada dominio, con qué payload, y quién lo consume.

**Regla:** Si un evento no tiene documento aquí, no existe oficialmente y ningún agente puede implementar consumidores para él.

---

## Estándar de contratos

Ver `00-event-contract-standard.md` para la plantilla completa.

---

## Índice de eventos

### Identity
| Evento | Estado | BI | Analytics |
|---|---|---|---|
| `user.registered` | Pendiente de doc formal | `dim_user` | — |

### Business
| Evento | Estado | BI | Analytics |
|---|---|---|---|
| `business.created` | [Ver](./business/business-created.md) | `dim_business` | — |

### Customer
| Evento | Estado | BI | Analytics |
|---|---|---|---|
| `customer.created` | [Ver](./customer/customer-created.md) | `dim_customer`, `fact_customer_activity` | — |
| `customer.updated` | [Ver](./customer/customer-updated.md) | `dim_customer` (upsert) | — |
| `customer.deactivated` | [Ver](./customer/customer-deactivated.md) | `dim_customer`, `fact_customer_activity` | — |

### Work
| Evento | Estado | BI | Analytics |
|---|---|---|---|
| `work.work_event_confirmed` | [Ver](./work/work-event-confirmed.md) | `fact_work_event` | Workload snapshot |

### Billing
| Evento | Estado | BI | Analytics |
|---|---|---|---|
| `billing.invoice_generated` | [Ver](./billing/invoice-generated.md) | — | — |
| `billing.invoice_sent` | [Ver](./billing/invoice-sent.md) | `fact_invoice` | Revenue snapshot |
| `billing.payment_recorded` | [Ver](./billing/payment-recorded.md) | `fact_payment`, `fact_customer_activity` | AR snapshot |

### Accounting
| Evento | Estado | BI | Analytics |
|---|---|---|---|
| `accounting.journal_entry_posted` | [Ver](./accounting/journal-entry-posted.md) | — | — |

---

## Reglas de evolución de contratos

1. Los payloads son **aditivos** — solo se agregan campos, nunca se eliminan
2. Si un campo cambia de nombre: agregar el nuevo, deprecar el viejo por 2 sprints, luego eliminar
3. Todo cambio de contrato requiere nueva versión del evento (`version: 2`)
4. Los consumidores de BI deben manejar versiones anteriores hasta que todos los eventos históricos sean v2
5. Nunca cambiar el tipo de un campo existente en la misma versión

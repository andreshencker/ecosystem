# Evento: business.created

**Versión del contrato:** 1
**Fecha:** 2026-07-06
**Productor:** Business domain (`src/business/`)
**Estado:** Oficial — implementado

---

## Propósito

Indica que un nuevo Business (tenant) fue creado en el sistema. Es el evento que dispara el provisioning de todos los recursos por defecto del tenant.

---

## Envelope

| Campo | Valor |
|---|---|
| `eventName` | `business.created` |
| `version` | 1 |
| `aggregateType` | `Business` |
| `tenantId` | `businessId` del nuevo tenant |

---

## Payload

| Campo | Tipo | Requerido | BI Column | Descripción |
|---|---|---|---|---|
| `businessId` | UUID | ✅ | `dim_business.business_id` | ID del Business. Inmutable. |
| `tenantId` | UUID | ✅ | `dim_business.business_id` | Sinónimo de businessId en v1 del evento base |
| `name` | string | ✅ | `dim_business.business_name` | Nombre del negocio |
| `type` | string | ✅ | — | Tipo de business (e.g. `sole_trader`, `company`) |
| `status` | string | ✅ | `dim_business.is_active` | Estado inicial (siempre `active`) |
| `createdBy` | UUID | ✅ | — | userId del usuario que creó el Business |

### Campos FALTANTES en v1 — requeridos por BI

> ⚠️ **Deuda técnica:** Los siguientes campos están en `dim_business` pero no en el payload actual del evento. Deben agregarse en v1.1 (additive change — no breaking):

| Campo BI | Valor esperado | Fuente |
|---|---|---|
| `dim_business.jurisdiction` | AU / NZ / etc. | Se puede inferir del `type` o necesita campo explícito |
| `dim_business.currency` | AUD / NZD / etc. | Debe estar en el payload |
| `dim_business.timezone` | Australia/Sydney | Debe estar en el payload |
| `dim_business.is_platform` | boolean | Flag de operador SaaS |

**Acción requerida en Sprint 2/3:** Agregar estos campos al payload de `BusinessCreatedEvent`.

---

## Consumidores

| Consumidor | Acción |
|---|---|
| Business domain | Provisioning trigger |
| BI BC-13 | INSERT INTO `dim_business` (cuando ingesta activa) |

---

## BI Relevance

```
Tabla afectada: dim_business
Idempotency: eventId (ON CONFLICT (business_id) DO UPDATE SET ...)
Mapeo:
  tenantId/businessId → dim_business.business_id
  name               → dim_business.business_name
  status == 'active' → dim_business.is_active = true
  occurredAt         → dim_business.created_at
```

---

## Estado de implementación

- ✅ Evento definido en código: `src/business/domain/events/business-created.event.ts`
- ⚠️ Payload incompleto: faltan `jurisdiction`, `currency`, `timezone`, `is_platform`
- ❌ Publicación verificada: confirmar que se publica después del save
- ❌ Handler de BI: no implementado aún (Sprint 11)

# 00 — Event Contract Standard

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial

---

## Plantilla de contrato de evento

Todo evento documentado en `docs/events/` debe seguir esta plantilla exacta.

---

## Campos del envelope (comunes a todos los eventos)

Estos campos son generados por `DomainEvent` base y están presentes en TODOS los eventos:

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `eventId` | `UUID` | ✅ | Identificador único del evento. Generado automáticamente. Usado como idempotency key por consumidores. |
| `eventName` | `string` | ✅ | Nombre del evento en formato `domain.event_name` (e.g. `customer.created`) |
| `version` | `number` | ✅ | Versión del contrato. Empieza en 1. Incrementa solo cuando hay breaking changes. |
| `aggregateId` | `UUID` | ✅ | ID del aggregate que originó el evento |
| `aggregateType` | `string` | ✅ | Nombre del aggregate (e.g. `Customer`) |
| `tenantId` | `UUID` | ✅ | Sinónimo de `businessId` en el campo base. Siempre presente. |
| `occurredAt` | `ISO8601` | ✅ | Timestamp UTC de cuando el evento ocurrió en el dominio |
| `correlationId` | `UUID` | opcional | ID para correlacionar con la request HTTP que originó el evento |
| `causationId` | `UUID` | opcional | `eventId` del evento que causó este (para cadenas de eventos) |
| `metadata` | `object` | opcional | Metadatos adicionales (e.g. userId, requestId) |

---

## Campos del payload (específicos de cada evento)

El `payload` es el objeto con los datos de negocio del evento. Los campos del payload son los que alimentan Analytics BC-10 y BI BC-13.

**Regla crítica:** Si un campo del payload alimenta una columna de BI (`dim_*` o `fact_*`), ese campo es **invariante** — nunca puede eliminarse ni cambiar de tipo.

---

## Reglas de compatibilidad

```
ADDITIVE (permitido sin incrementar versión):
  ✅ Agregar campo opcional nuevo al payload
  ✅ Agregar campo opcional nuevo al envelope
  ✅ Ampliar enum con valor nuevo

BREAKING (requiere version: N+1):
  ❌ Eliminar campo del payload
  ❌ Cambiar tipo de un campo (string → number)
  ❌ Cambiar nombre de un campo
  ❌ Hacer obligatorio un campo antes opcional
  ❌ Cambiar el eventName

PROHIBIDO EN CUALQUIER VERSIÓN:
  ❌ Cambiar aggregateId a un ID diferente
  ❌ Cambiar tenantId/businessId
  ❌ Publicar el mismo evento dos veces para el mismo hecho de negocio
```

---

## Relevancia para BI y Analytics

Cada documento de evento indica:

```yaml
bi_relevance:
  affects: [dim_customer, fact_customer_activity]  # qué tablas de Neon se actualizan
  fields_mapped:                                    # mapeo campo payload → columna Neon
    - payload.customerId → dim_customer.customer_id
    - payload.businessId → dim_customer.business_id
  idempotency: eventId → dim_customer.event_id (ON CONFLICT DO NOTHING)

analytics_relevance:
  affects: []   # qué read models de MongoDB se actualizan
  handler: CustomerCreatedHandler en src/analytics/
```

---

## Plantilla completa

```markdown
# Evento: {domain}.{event_name}

**Versión del contrato:** 1
**Fecha:** YYYY-MM-DD
**Productor:** {Domain} (src/{domain}/)
**Estado:** Oficial

---

## Propósito
{Por qué existe este evento. Qué hecho de negocio representa.}

---

## Envelope

| Campo | Valor |
|---|---|
| eventName | `{domain}.{event_name}` |
| version | 1 |
| aggregateType | `{AggregateType}` |
| tenantId | businessId del tenant |

---

## Payload

| Campo | Tipo | Requerido | BI Column | Descripción |
|---|---|---|---|---|
| businessId | UUID | ✅ | ... | ... |
| ... | ... | ... | ... | ... |

---

## Consumidores

| Consumidor | Acción |
|---|---|
| Analytics BC-10 | Actualiza read model X |
| BI BC-13 | INSERT INTO fact_X ... |
| {Domain} | Handler: {HandlerClass} |

---

## Compatibilidad

### v1 → v1 (additive changes)
- {lista de campos agregados si aplica}

### v1 → v2 (breaking — cuando aplique)
- {no aplica todavía}

---

## BI Relevance

{tabla dim_ o fact_ afectada, mapeo de campos, idempotency key}

---

## Analytics Relevance

{read model afectado, handler en src/analytics/}
```

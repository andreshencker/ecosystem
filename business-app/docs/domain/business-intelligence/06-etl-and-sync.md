# 06 — ETL y Sync para BI

**Versión:** 1.1 | **Fecha:** 2026-07-06 | **Estado:** Oficial

---

## Pipeline completo de ingesta

```
Domain Events
    │
    ▼
Outbox (MongoDB — domain_events_outbox)
    │  (Outbox Processor — job NestJS)
    ▼
BI Ingestion Endpoint (business-app/backend → BI HTTP interno)
    │  POST /internal/ingest/event  |  x-internal-service-token
    ▼
Raw Event Validator (BI Python)
    │  valida schema, versión, idempotency key
    ▼
Transformer Layer (BI Python — app/ingestion/)
    │  convierte payload del evento a formato de dim_*/fact_*
    ▼
Dimension Builder
    │  UPSERT dim_business, dim_customer, dim_user
    │  (SCD Type 1 — sobreescribe, no mantiene historial)
    ▼
Fact Builder
    │  INSERT INTO fact_* ON CONFLICT (event_id) DO NOTHING
    ▼
Warehouse Neon (PostgreSQL)
    │
    ▼
Semantic Layer (app/semantic/)
    │  measures, KPIs, calculated metrics
    ▼
BI API (/internal/*)
```

---

## Regla absoluta

**BI nunca lee MongoDB directamente en runtime.** Toda ingesta viene por:
1. HTTP interno desde `business-app/backend` (Outbox Processor)
2. API Pull controlado para bootstrap/reconciliación (solo desde `business-app/backend`)

```
❌ BI → MongoDB de business-app (PROHIBIDO)
✅ business-app/backend → BI (HTTP + x-internal-service-token)
```

---

## Mecanismo 1 — Event Forwarding (principal, casi tiempo real)

```python
# BI endpoint — app/ingestion/event_ingestion.py
POST /internal/ingest/event
{
  "eventName": "customer.created",
  "version": 1,
  "eventId": "uuid",
  "tenantId": "uuid",
  "occurredAt": "2026-07-06T10:00:00Z",
  "payload": { ... }
}
```

El `Outbox Processor` en `business-app/backend` llama a este endpoint para cada evento en `status: 'pending'`.

**Tablas afectadas por evento:**

| Evento | Dimensiones | Facts |
|---|---|---|
| `customer.created` | `dim_customer` (INSERT) | `fact_customer_activity` (activity_type: customer_created) |
| `customer.updated` | `dim_customer` (UPDATE) | — |
| `customer.deactivated` | `dim_customer` (is_active=false) | `fact_customer_activity` (customer_deactivated) |
| `billing.invoice_sent` | — | `fact_invoice` (event_type: sent) |
| `billing.payment_recorded` | — | `fact_payment` |
| `work.work_event_confirmed` | — | `fact_work_event` |
| `identity.user_registered` | `dim_user` (INSERT) | — |
| `business.created` | `dim_business` (INSERT) | — |

---

## Mecanismo 2 — Bootstrap / Reconciliación (API Pull)

Solo se activa:
1. Al desplegar BI por primera vez cuando ya hay datos en el ERP
2. Cuando se detectan eventos perdidos (gap en la secuencia del Outbox)

```python
# job en business-intelligence/app/ingestion/bootstrap.py
# Llamado MANUALMENTE o por job programado — nunca en respuesta a requests de usuario

async def bootstrap_customers(business_id: str):
    page = 1
    while True:
        response = await backend_client.get(
            f"/api/export/customers",
            params={"businessId": business_id, "page": page, "limit": 500},
            headers={"x-internal-service-token": settings.bi_internal_service_token}
        )
        customers = response["items"]
        if not customers:
            break
        for customer in customers:
            await upsert_dim_customer(customer)
        page += 1
```

**El endpoint `/api/export/customers` en `business-app/backend` debe:**
- Estar protegido con `x-internal-service-token` (solo BI puede llamarlo)
- Retornar todos los campos necesarios para `dim_customer`
- Soportar paginación
- No retornar datos sensibles (contraseñas, tokens)

---

## Idempotencia

```python
# dim_customer — SCD Type 1 (UPSERT)
INSERT INTO dim_customer (customer_id, business_id, display_name, ...)
VALUES (...)
ON CONFLICT (customer_id) DO UPDATE SET
    display_name = excluded.display_name,
    is_active    = excluded.is_active,
    updated_at   = excluded.updated_at;

# fact_* — INSERT OR SKIP
INSERT INTO fact_invoice (fact_id, event_id, ...)
VALUES (gen_random_uuid(), ...)
ON CONFLICT (event_id) DO NOTHING;
```

El `event_id` del envelope del evento es el único idempotency key para los facts. Procesar el mismo evento dos veces no genera duplicados.

---

## Checkpoints y retries

```python
# Outbox Processor en business-app/backend
async def process_outbox():
    pending = await outbox.find(status='pending', attempts__lte=5)
    for event in pending:
        try:
            await bi_client.ingest_event(event)
            await outbox.update(event.id, status='delivered')
        except Exception as e:
            await outbox.update(event.id, attempts=event.attempts+1)
            if event.attempts >= 5:
                await outbox.update(event.id, status='dead_letter', error=str(e))
```

**Dead Letter Events:**
- Se almacenan en `domain_events_dead_letter`
- Requieren intervención manual para replay
- El ReleaseManager los revisa antes de cerrar un sprint

---

## Replay y reprocessing

### Replay de un evento específico

```bash
# Desde business-app/backend
POST /admin/outbox/replay
{ "eventId": "uuid" }
# Re-pone el evento en status='pending' para que el Outbox Processor lo procese de nuevo
```

### Rebuild completo de BI

```bash
# 1. Parar ingesta
# 2. Truncar facts (mantener dims y alembic_version)
# En Neon:
TRUNCATE fact_invoice, fact_payment, fact_work_event, fact_customer_activity RESTART IDENTITY;

# 3. Re-ejecutar bootstrap para cada tabla
python -m app.ingestion.bootstrap --table=dim_customer --all-businesses
python -m app.ingestion.bootstrap --table=fact_invoice --all-businesses

# 4. Verificar row counts
python -c "
from app.core.database import engine
import asyncio
from sqlalchemy import text

async def check():
    async with engine.connect() as conn:
        for table in ['dim_business', 'dim_customer', 'fact_invoice', 'fact_payment', 'fact_work_event']:
            count = (await conn.execute(text(f'SELECT COUNT(*) FROM {table}'))).scalar()
            print(f'{table}: {count} rows')
asyncio.run(check())
"
```

---

## Schema versioning y event versioning

Cuando un evento sube de version (v1 → v2):

```python
# app/ingestion/transformers/customer_transformer.py
def transform_customer_created(event: dict) -> dict:
    version = event.get('version', 1)
    if version == 1:
        return {
            'customer_id': event['payload']['customerId'],
            'display_name': event['payload']['displayName'],
            # v1 no tiene jurisdiction — usar None
            'abn': event['payload'].get('abn'),
        }
    elif version == 2:
        return {
            'customer_id': event['payload']['customerId'],
            'display_name': event['payload']['displayName'],
            'abn': event['payload'].get('abn'),
            # v2 agrega email directamente
            'email': event['payload'].get('email'),
        }
```

**Regla:** El transformer siempre maneja múltiples versiones. Cuando la versión más antigua ya no existe en el Outbox, el handler de esa versión puede removerse.

---

## Lo que NO se debe hacer

```
❌ BI leyendo MongoDB directamente en runtime
❌ Ingesta sin validar el event_id como idempotency key
❌ Modificar un fact_* ya insertado (los facts son inmutables)
❌ Truncar dim_* sin re-hacer bootstrap de los facts que dependen de ellas (violación de FK)
❌ Ingesta sin validar x-internal-service-token en el endpoint de BI
❌ Transformers con lógica de negocio del ERP (calcular GST, validar contratos)
❌ Replay sin parar la ingesta normal primero (race condition)
```

---

## Estado actual (Sprint 2)

| Componente | Estado |
|---|---|
| Endpoint `/internal/ingest/event` en BI | ❌ No implementado |
| Outbox collection en MongoDB | ❌ No implementado |
| Outbox Processor job en NestJS | ❌ No implementado |
| Bootstrap scripts en BI | ❌ No implementado |
| Transformers por dominio | ❌ No implementados |
| Endpoint `/api/export/*` en backend | ❌ No implementado |

Todo esto se implementa en **Sprint 11** cuando el flujo end-to-end de eventos esté completo. Los sprints 1-10 solo deben garantizar que los Domain Events se publican con el payload correcto.

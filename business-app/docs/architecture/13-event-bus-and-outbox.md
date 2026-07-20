# 13 — Event Bus y Outbox Strategy

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial

---

## Contexto

El sistema necesita garantizar que los Domain Events publicados por los dominios operativos lleguen a sus consumidores (Analytics BC-10, BI BC-13, otros dominios) de forma confiable, ordenada, y sin pérdida, incluso cuando un servicio está temporalmente caído.

---

## Estrategia actual (Fase 1 — En memoria + Outbox)

### Implementación inicial

```
Domain Service
  │ save() a MongoDB
  │ publish(DomainEvent) ← solo después del save
  │
  ▼
Event Bus (en memoria — NestJS EventEmitter2)
  │
  ├─► Analytics Handler (en proceso, mismo NestJS)
  ├─► Outbox Writer (persistir a MongoDB antes de delivery externo)
  └─► Cross-domain Handlers (en proceso)
```

**Outbox Pattern:**

```
business-app/MongoDB
  Collection: domain_events_outbox
    {
      _id:          UUID,
      eventId:      UUID,
      eventName:    string,
      version:      number,
      tenantId:     UUID,
      aggregateId:  UUID,
      payload:      object,
      occurredAt:   Date,
      status:       'pending' | 'delivered' | 'failed' | 'dead_letter',
      attempts:     number,
      lastAttemptAt: Date | null,
      deliveredAt:  Date | null,
      error:        string | null
    }
```

**Outbox Processor (job interno):**
- Corre cada 5 segundos
- Lee eventos `status: 'pending'` en orden de `occurredAt`
- Los envía a los consumidores externos (actualmente: ninguno en Fase 1)
- Si delivery falla: incrementa `attempts`, marca `lastAttemptAt`
- Después de 5 intentos fallidos: mueve a `status: 'dead_letter'`

---

## Estrategia futura (Fase 3+ — Broker externo)

```
Domain Service
  │
  ▼
Event Bus interno (publish en memoria, Outbox write)
  │
  ▼
Outbox Processor
  │
  ▼
Message Broker (Kafka | RabbitMQ | NATS JetStream)
  │
  ├─► Analytics Service (subscriber dedicado)
  ├─► BI Ingestion Service (subscriber dedicado)
  └─► Cross-service consumers
```

**Criterio de migración a broker:**
- Cuando más de 3 servicios externos consumen eventos
- Cuando el throughput supera ~1000 eventos/hora
- Cuando se requiere replay de eventos históricos para nuevos consumidores

**Principio de independencia de broker:**
Los contratos de eventos (`docs/events/`) no cambian al migrar de bus interno a Kafka. Solo cambia la infraestructura de transporte. Los consumidores reciben el mismo payload.

---

## Idempotencia

**Regla universal:** Todo handler de eventos debe ser idempotente. Recibir el mismo evento dos veces debe producir el mismo resultado que recibirlo una vez.

**Implementación en consumidores:**

```typescript
// Analytics handler (NestJS)
async handle(event: CustomerCreatedEvent) {
  const exists = await this.analyticsModel.findOne({ eventId: event.eventId });
  if (exists) return; // idempotente
  await this.analyticsModel.create({ eventId: event.eventId, ... });
}

// BI ingestion (Python)
INSERT INTO dim_customer (...) VALUES (...)
ON CONFLICT (customer_id) DO UPDATE SET
  display_name = excluded.display_name,
  updated_at   = excluded.updated_at;

INSERT INTO fact_customer_activity (event_id, ...)
ON CONFLICT (event_id) DO NOTHING;
```

---

## Retries y Dead Letter Queue

```
Intento 1: inmediato
Intento 2: +30 segundos (backoff exponencial)
Intento 3: +2 minutos
Intento 4: +10 minutos
Intento 5: +30 minutos
→ Dead Letter: alerta + requiere intervención manual
```

**Dead Letter Queue:**
```
Colección: domain_events_dead_letter
  {
    eventId:     UUID,
    eventName:   string,
    payload:     object,
    failedAt:    Date,
    reason:      string,
    consumer:    string,
    canReplay:   boolean
  }
```

---

## Ordering

Los eventos dentro del mismo aggregate se procesan en orden de `occurredAt`. No se garantiza orden cross-aggregate.

**Consecuencia para BI:**
- `CustomerCreated` antes que `CustomerUpdated` para el mismo `customerId`
- El Outbox Processor garantiza este orden por aggregate
- Si llegan fuera de orden: el handler debe hacer UPSERT por `customer_id` en lugar de INSERT puro

---

## Replay de Analytics y BI

### Rebuild completo de Analytics BC-10

```
1. Detener Outbox Processor
2. Truncar colecciones de Analytics en MongoDB
3. Leer todos los eventos del Outbox en orden cronológico
4. Re-ejecutar cada handler en secuencia
5. Reiniciar Outbox Processor
```

Cuándo se necesita:
- Nueva proyección de Analytics que requiere historia pasada
- Bug en un handler que generó datos incorrectos

### Rebuild completo de BI BC-13

```
1. Detener ingesta de BI
2. Ejecutar: TRUNCATE fact_invoice, fact_payment, ... (mantener dim_time)
3. Ejecutar ETL histórico desde Outbox / API pull de business-app
4. Verificar: alembic current = head
5. Verificar: row counts por tabla
6. Reanudar ingesta
```

---

## Lo que NO se debe hacer

```
❌ Publicar Domain Events ANTES de salvar a MongoDB
   (Si el save falla después, el evento fue publicado sobre un hecho inexistente)

❌ Usar Domain Events para comunicación sincrónica request/response
   (Los eventos son asíncronos por naturaleza)

❌ Poner lógica de negocio en el Outbox Processor
   (Solo entrega — nunca transforma)

❌ Consumir eventos de orden inverso sin manejar la idempotencia
   (CustomerUpdated puede llegar antes que CustomerCreated en condiciones de red)

❌ Hardcodear consumers en el productor
   (El productor publica sin saber quién consume)

❌ Mezclar Domain Events con comandos
   (Un evento describe algo que YA ocurrió — no es una instrucción)
```

# Business Domain Events

**Módulo:** `src/business/domain/events/`

---

## Eventos publicados

| Evento | Constante | Trigger |
|---|---|---|
| `BusinessCreatedEvent` | `business.created` | `Business.create()` |
| `BusinessUpdatedEvent` | `business.updated` | `Business.update()` |
| `BusinessActivatedEvent` | `business.activated` | `Business.activate()` |
| `BusinessDeactivatedEvent` | `business.deactivated` | `Business.deactivate()` |
| `BusinessDeletedEvent` | `business.deleted` | `Business.softDelete()` |

---

## Estructura base (heredada de DomainEvent)

```typescript
{
  eventId: string;          // UUID auto-generado
  aggregateId: string;      // businessId
  aggregateType: 'Business';
  occurredAt: Date;
  correlationId?: string;
  causationId?: string;
  tenantId: string;
  version: number;
  metadata: Record<string, unknown>;
}
```

---

## Payloads

### BusinessCreatedEvent
```typescript
{ businessId, tenantId, name, type, status, createdBy }
```

### BusinessUpdatedEvent
```typescript
{ businessId, tenantId, updatedFields: string[], updatedBy }
```

### BusinessActivatedEvent / BusinessDeactivatedEvent
```typescript
{ businessId, tenantId, activatedBy | deactivatedBy }
```

### BusinessDeletedEvent
```typescript
{ businessId, tenantId, deletedBy }
```

---

## Publisher

`BusinessEventPublisher` — implementación in-process de `EventPublisher` (shared/infrastructure).  
Los consumidores suscriben via `publisher.on('Business', listener)`.  
Future: reemplazar con BullMQ/Redis Pub/Sub sin cambiar la interfaz.

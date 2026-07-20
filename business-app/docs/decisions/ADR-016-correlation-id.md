# ADR-016: CorrelationId Policy — Trazabilidad de requests y eventos en todo el ERP

**Fecha:** 2026-07-06
**Estado:** Aceptado
**Autor:** Architecture Review — Sprint 0.5

---

## Contexto

El ERP es un sistema event-driven donde un request HTTP puede desencadenar múltiples domain events, jobs de background, notificaciones por comunicaciones, y escrituras en base de datos. Sin un identificador de correlación, es imposible trazar todos los efectos de un request original al revisar logs o debuggear problemas en producción.

---

## Decisión

El ERP adopta una política de **CorrelationId obligatorio** en todos los requests y eventos.

### CorrelationId en requests HTTP

El `RequestContext` (`shared/application/request-context.ts`) incluye `correlationId: string`. El middleware existente `RequestIdMiddleware` (renombrado a `CorrelationIdMiddleware` en el futuro) lo genera o propaga:

- Si el request incluye el header `x-correlation-id`: se reutiliza el valor (útil para tracing entre servicios)
- Si no incluye el header: se genera un UUID nuevo

### CorrelationId en DomainEvents

La clase base `DomainEvent` (`shared/domain/events/domain-event.base.ts`) incluye `correlationId?: string`. Al publicar eventos desde un use case, se propaga el `correlationId` del `RequestContext`.

### CorrelationId en el Value Object

El Value Object `CorrelationId` (`shared/domain/value-objects/correlation-id.vo.ts`) encapsula el identificador para uso en entidades de dominio.

### CausationId

La clase `DomainEvent` incluye también `causationId?: string`. Representa el ID del evento que causó este evento (útil para cadenas de eventos). Es opcional y no se propaga automáticamente.

---

## Reglas de implementación

**ADR-016-R001:** Todo use case que publique domain events debe propagar el `correlationId` del `RequestContext` al evento.

**ADR-016-R002:** Los logs de la capa de aplicación siempre incluyen el `correlationId` cuando está disponible.

**ADR-016-R003:** El header HTTP para recibir/devolver el correlation ID es `x-correlation-id` (consistente con el `x-request-id` existente).

**ADR-016-R004:** El `correlationId` no es sensible — puede aparecer en logs sin redacción.

---

## Consecuencias

### Positivas
- Trazabilidad completa de requests a través de múltiples eventos y jobs
- Debugging simplificado: filtrar logs por `correlationId` muestra todo lo que ocurrió en un request
- Compatible con sistemas de distributed tracing (Jaeger, Zipkin) en el futuro

### Negativas
- Requiere pasar el `RequestContext` (o al menos el `correlationId`) a todos los use cases
- Los jobs de background necesitan generar su propio `correlationId` (no viene de un HTTP request)

---

## Documentos relacionados

- `ADR-011-shared-kernel.md` — CorrelationId como Value Object en Shared Kernel
- `ADR-002-event-driven-integration.md` — patrón de eventos del dominio
- `ADR-013-audit-policy.md` — campos de auditoría

# Business Domain — Decisiones técnicas

**Sprint:** 1  
**Fecha:** 2026-07-06

---

## DEC-B001 — Business como Aggregate Root del ERP (no Company)

**Decisión:** Se crea el `Business` domain entity en `src/business/` como entidad raíz del ERP, distinto del `Company` en `platform/company/` (entidad SaaS).

**Contexto:** `platform/company/` es la entidad de suscripción SaaS. `business/Business` es la entidad de negocio del ERP. Los dominios Revenue, Billing, Work, Calendar, etc. referenciarán `businessId` del dominio ERP.

**Colección MongoDB:** `erp_businesses` (no `companies`) para evitar colisión.

---

## DEC-B002 — `businessId` como campo UUID separado de `_id`

**Decisión:** El schema usa `businessId: string` (UUID) como identificador de dominio, separado del `_id: ObjectId` de MongoDB.

**Por qué:** El dominio maneja UUIDs (`BusinessId extends ValueObject`). El `_id` de MongoDB queda como detalle de infraestructura. La búsqueda usa `{ businessId, tenantId }` en todos los queries.

---

## DEC-B003 — `tenantId` = `authContext.companyId` de la plataforma SaaS

**Decisión:** El controlador usa `ctx.companyId` (del JWT de la plataforma) como `tenantId` del Business entity.

**Por qué:** El SaaS platform company es el scope de tenant del ERP. Un user autenticado pertenece a una company, y esa company es el tenant del ERP.

**Nota:** Si se aprueba ADR-001 (`Company → Business`), `companyId` pasará a `businessId`. El controlador deberá actualizarse. Esto es parte de la Fase 3 de ADR-001.

---

## DEC-B004 — BusinessEventPublisher in-process (no modifica EventBusService existente)

**Decisión:** `BusinessEventPublisher` implementa el contrato abstracto `EventPublisher` del Shared Kernel usando su propio `EventEmitter`. No modifica `EventBusService` (que está tipado a `PlatformEventKey`).

**Por qué:** `EventBusService` pertenece a la capa platform y tiene una API tipada para eventos de platform. Los domain events del ERP son un concepto diferente. En el futuro, `BusinessEventPublisher` puede reemplazarse por una implementación con BullMQ/Redis sin cambiar el contrato.

---

## DEC-B005 — Soft delete en aggregate + repositorio

**Decisión:** `Business.softDelete()` modifica el estado del aggregate (setea `deletedAt`, cambia status a inactive). El repositorio ejecuta el `updateOne` real. El aggregate emite `BusinessDeletedEvent`.

**Por qué:** El aggregate es responsable de mantener sus invariantes y emitir eventos. El repositorio es responsable de la persistencia. Ambas responsabilidades son separadas.

---

## DEC-B006 — `import type` para interfaces en constructores injectable

**Decisión:** `IBusinessRepository` y `EventPublisher` se importan con `import type` en los handlers NestJS. Los tokens de inyección (`BUSINESS_REPOSITORY_TOKEN`, `BUSINESS_EVENT_PUBLISHER_TOKEN`) se importan normalmente.

**Por qué:** `isolatedModules: true` + `emitDecoratorMetadata: true` requiere que TypeScript sepa que los tipos de parámetros en constructores decorados NO tienen valores runtime que emitir. `import type` señala esto explícitamente.

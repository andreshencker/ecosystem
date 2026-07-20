---
name: project-sprint-0-5
description: Sprint 0.5 Shared Foundation completed 2026-07-06 — shared kernel location, what was built
metadata:
  type: project
---

Sprint 0.5 Shared Foundation completed 2026-07-06.

**Location:** `business-app/backend/src/shared/`

**Why:** Created before Sprint 1 to prevent DDD infrastructure duplication across Revenue, Billing, Work, Customer, Calendar, Analytics domains.

**How to apply:** All new modules extend from shared/ — Entity, AggregateRoot, ValueObject, DomainEvent, etc. Never redefine them per-module.

**What was built:**
- `domain/entities/` — Entity, AggregateRoot base classes
- `domain/value-objects/` — 15 VOs: Money, Percentage, Currency, Email, Phone, Website, Address, Locale, Timezone, Country, Language, UUID, EntityId, TenantId, CorrelationId
- `domain/events/` — DomainEvent base (eventId, aggregateId, aggregateType, occurredAt, correlationId, causationId, tenantId, version, metadata)
- `domain/errors/` — DomainError base + BusinessError, ValidationError, ConflictError, NotFoundError, AuthorizationError, InfrastructureError
- `domain/rules/` — BusinessRule base
- `domain/interfaces/` — Repository, SoftDeletable, Versionable
- `application/` — Result<T>, Either<L,R>, ApplicationError, PagedResult, CursorPage, UseCase/Command/Query interfaces, Validator, RequestContext
- `infrastructure/` — BaseRepository, MongoRepositoryBase, Clock/SystemClock, AppLogger abstraction, EventPublisher abstraction, BaseDocument schema
- `kernel/` — CURRENCIES, COUNTRIES, LOCALES, MIME_TYPES, ROLES, PERMISSIONS, REGEX constants
- `testing/` — createTestBusiness(), createTestUser(), createMoney(), createAddress(), cleanDatabase()

**ADRs:** ADR-011 through ADR-018 in `business-app/docs/decisions/`

**Key decisions:**
- BaseDocument: tenantId + createdBy/updatedBy + deletedAt/deletedBy + version (extends this in all new schemas)
- Result<T> for all use case returns (no throw for flow control)
- Soft delete mandatory for all domain entities
- Repository pattern: one repo per Aggregate Root
- CorrelationId propagated from RequestContext → DomainEvent

# ADR-011: Shared Kernel — Módulo compartido para todos los dominios del ERP

**Fecha:** 2026-07-06
**Estado:** Aceptado
**Autor:** Architecture Review — Sprint 0.5

---

## Contexto

A medida que los dominios del ERP (Revenue, Billing, Calendar, Work, Customer, Analytics, Document) comienzan su implementación en Sprint 1, existe el riesgo de duplicación de infraestructura base: clases Entity, AggregateRoot, Value Objects comunes, errores, patrones de Result, y constantes. Cada dominio implementaría su propia versión sin coordinación, generando inconsistencias y deuda técnica.

El patrón DDD denomina a este concepto **Shared Kernel**: un conjunto mínimo de abstracciones compartidas que todos los bounded contexts conocen y usan, pero que ninguno posee de forma exclusiva.

---

## Decisión

Crear un módulo `src/shared/` en el backend del ERP (`business-app/backend`) que centralice:

- **domain/** — Value Objects base, Entity, AggregateRoot, DomainEvent, DomainError, BusinessRule, interfaces de dominio
- **application/** — Result<T>, Either<L,R>, ApplicationError, PagedResult, CursorPage, contratos de UseCase/Command/Query, Validator, RequestContext
- **infrastructure/** — BaseRepository, MongoRepositoryBase, Clock, AppLogger (abstracción), EventPublisher (abstracción), BaseDocument schema
- **kernel/** — Constantes compartidas: Currencies, Countries, Locales, MimeTypes, Roles, Permissions, Regex
- **testing/** — Factories y helpers de test reutilizables

Este módulo NO contiene lógica de negocio. Solo contiene infraestructura reutilizable.

---

## Reglas de uso

**ADR-011-R001:** Ningún dominio define sus propias clases Entity, AggregateRoot, ValueObject o DomainEvent. Todos extienden las clases base de `shared/`.

**ADR-011-R002:** El Shared Kernel es de solo lectura para los módulos de dominio — los dominios extienden, nunca modifican.

**ADR-011-R003:** Toda nueva constante de plataforma (currency, country, role, permission) se agrega al kernel compartido, no a constants locales de cada módulo.

**ADR-011-R004:** El módulo `shared/` no registra NestJS providers propios. Es infraestructura TypeScript pura, importada directamente por cada módulo que la necesite.

---

## Consecuencias

### Positivas
- Eliminación de duplicación de infraestructura base entre dominios
- Consistencia garantizada en patrones de error, Result, y Value Objects
- Los módulos de Sprint 1 pueden arrancar directamente extendiendo las clases base sin re-inventarlas
- Única fuente de verdad para constantes de plataforma

### Negativas
- Cualquier cambio breaking en el Shared Kernel impacta todos los dominios simultáneamente
- Requiere coordinación cuando se necesita modificar una clase base

### Mitigación
- Las clases base son abstractas — solo se extienden, no se instancian directamente
- Los cambios al Shared Kernel requieren revisión de todos los dominios que extienden la clase modificada

---

## Documentos relacionados

- `ADR-002-event-driven-integration.md` — patrón de eventos del dominio
- `ADR-017-value-objects.md` — política de Value Objects
- `ADR-018-result-pattern.md` — política del patrón Result

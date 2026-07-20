# ADR-012: Repository Pattern — Contrato de acceso a datos para todos los dominios

**Fecha:** 2026-07-06
**Estado:** Aceptado
**Autor:** Architecture Review — Sprint 0.5

---

## Contexto

Cada dominio del ERP necesita persistencia. Sin un patrón acordado, cada dominio implementaría su propio mecanismo de acceso a datos: queries inline en services, uso directo de Model de Mongoose, o variantes del patrón Repository sin consistencia. Esto dificulta el testing, la migración de base de datos, y el razonamiento sobre la capa de dominio.

El patrón Repository es el estándar de facto en DDD para desacoplar el dominio de la persistencia.

---

## Decisión

Todos los dominios del ERP implementarán el Repository Pattern con las siguientes reglas:

### 1. Contrato base

La interfaz `Repository<TEntity, TId>` en `shared/domain/interfaces/repository.interface.ts` define el contrato mínimo:
- `findById(id): Promise<TEntity | null>`
- `save(entity): Promise<TEntity>`
- `delete(id): Promise<void>`

### 2. Clase base abstracta

`BaseRepository<TEntity, TId>` en `shared/infrastructure/base-repository.abstract.ts` extiende el contrato con:
- `findAll(tenantId): Promise<TEntity[]>`
- `exists(id, tenantId): Promise<boolean>`

### 3. Implementación MongoDB

`MongoRepositoryBase<TEntity, TDocument, TId>` en `shared/infrastructure/mongo-repository.base.ts` provee implementaciones por defecto de `findById`, `findAll`, `delete`, `exists`. Cada repositorio concreto implementa `toDomain()` y `save()`.

### 4. Un repositorio por Aggregate Root

Cada Aggregate Root tiene exactamente un repositorio. No existen repositorios para entidades internas del aggregate.

---

## Reglas de implementación

**ADR-012-R001:** Los controllers y use cases nunca usan Mongoose Models directamente — siempre usan un repositorio.

**ADR-012-R002:** La capa de dominio solo conoce la interfaz `Repository<TEntity, TId>`. La implementación concreta (`MongoRepositoryBase`) vive en la capa de infraestructura.

**ADR-012-R003:** Los repositorios son responsables del mapeo entre documentos MongoDB (TDocument) y entidades de dominio (TEntity). El método `toDomain()` es obligatorio.

**ADR-012-R004:** Toda query adicional (findByEmail, findByTenantId, etc.) se agrega al repositorio concreto del dominio, no a la clase base.

---

## Consecuencias

### Positivas
- El dominio puede ser testeado con repositorios en memoria sin MongoDB
- La migración de MongoDB a otra base de datos solo requiere reemplazar la implementación del repositorio
- Los use cases son agnósticos a la persistencia

### Negativas / Trade-offs
- Overhead de un layer adicional para operaciones simples de CRUD
- El mapeo `toDomain()` / `toPersistence()` requiere mantenimiento cuando el schema evoluciona

---

## Alternativas descartadas

**Alternativa A: Active Record** — Los modelos Mongoose gestionan su propia persistencia. Descartado porque acopla el dominio a Mongoose y dificulta el testing.

**Alternativa B: Data Mapper directo** — Los services usan `Model` directamente. Descartado por las mismas razones.

---

## Documentos relacionados

- `ADR-011-shared-kernel.md` — clase base provista por Shared Kernel
- `ADR-013-audit-policy.md` — campos de auditoría que todos los repositorios deben gestionar

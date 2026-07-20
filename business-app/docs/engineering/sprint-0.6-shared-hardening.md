# Sprint 0.6 — Shared Foundation Hardening

**Fecha:** 2026-07-06  
**Estado:** Completado  
**Tipo:** Infrastructure hardening — sin funcionalidades de ERP

---

## Objetivo

Corregir los riesgos críticos encontrados en el Architecture Review del Sprint 0.5 antes de iniciar Sprint 1.
No se implementó ninguna funcionalidad de dominio. Solo se endureció el Shared Foundation.

---

## Riesgos corregidos

### T00-601 · Tenant isolation en MongoRepositoryBase

**Riesgo original:** `findById(id)` no filtraba por `tenantId` — permitía recuperar documentos de otro tenant si se conocía el ID. `findAll(tenantId)` no filtraba registros soft-deleted.

**Corrección:**
- `findById(id, tenantId)` agrega `tenantId` y `deletedAt: null` al query.
- `findAll(tenantId)` agrega `deletedAt: null`.
- `exists(id, tenantId)` agrega `deletedAt: null`.

```typescript
// Antes
findById(id: TId): Promise<TEntity | null>
findOne({ _id: id })

// Después
findById(id: TId, tenantId: string): Promise<TEntity | null>
findOne({ _id: id, tenantId, deletedAt: null })
```

---

### T00-602 · Repository contract unificado

**Riesgo original:** La interfaz `Repository<TEntity, TId>` (dominio) tenía `delete(id)` sin tenantId. `BaseRepository` tenía `delete(id, tenantId)`. Las firmas eran incompatibles.

**Corrección:** Ambas firmas alineadas a `delete(id, tenantId, deletedBy?)`. TypeScript impide compilar un repositorio que borre sin tenantId.

---

### T00-603 · Soft delete formalizado en la capa base

**Riesgo original:** `MongoRepositoryBase.delete()` ejecutaba `deleteOne` (hard delete). Violaba ADR-014.

**Corrección:** `delete()` ejecuta `updateOne({ $set: { deletedAt, deletedBy } })`. Hard delete no existe en los repositorios base. Los registros ya soft-deleted son idempotentes (query filtra `deletedAt: null`).

```typescript
// Antes: hard delete
await this.model.deleteOne({ _id: id, tenantId }).exec();

// Después: soft delete
await this.model.updateOne(
  { _id: id, tenantId, deletedAt: null },
  { $set: { deletedAt: new Date(), deletedBy } }
).exec();
```

---

### T00-604 · AggregateRoot.pullDomainEvents()

**Riesgo original:** El caller debía hacer `domainEvents` + `clearDomainEvents()` en dos pasos — operación no atómica.

**Corrección:** Agregado `pullDomainEvents(): DomainEvent[]` que copia, limpia, y retorna en una sola operación.

```typescript
// Antes (no atómico — riesgo de doble-publish o pérdida de eventos)
const events = aggregate.domainEvents;
await publisher.publishAll(events);
aggregate.clearDomainEvents();

// Después (atómico)
const events = aggregate.pullDomainEvents();
await publisher.publishAll(events);
```

`clearDomainEvents()` se mantiene para casos donde se necesita descartar eventos explícitamente sin publicarlos.

---

### T00-605 · Money con representación exacta (bigint)

**Riesgo original:** `Money` usaba `number` de JavaScript. Las operaciones con decimales acumulaban errores de punto flotante. Inaceptable en un ERP financiero.

**Corrección:** `Money` almacena `minorUnits: bigint` internamente. Todo el aritmético se hace en bigint. Los decimales solo aparecen en el boundary de entrada (`Money.of()`) y de salida (`toDecimal()`, `toString()`).

```typescript
// Antes: floating point
Money.of(0.1, 'AUD').add(Money.of(0.2, 'AUD')).amount
// → 0.30000000000000004 ❌

// Después: bigint exacto
Money.of(0.1, 'AUD').add(Money.of(0.2, 'AUD')).amount
// → 0.30 ✓ (10n + 20n = 30n minor units)
```

**API del nuevo Money:**

| Método | Descripción |
|---|---|
| `Money.of(amount, currency)` | Convierte decimal a minor units (rounded). Boundary de entrada. |
| `Money.ofMinorUnits(bigint, currency)` | Factory desde minor units exactos. Usar para persistencia. |
| `Money.zero(currency)` | Alias de `Money.ofMinorUnits(0n, currency)`. |
| `.add(other)` | Suma exacta en bigint. |
| `.subtract(other)` | Resta exacta en bigint. |
| `.multiply(factor: number)` | Multiplica con 8 decimales de precisión para el factor. Redondeo half-up. |
| `.compare(other): -1 \| 0 \| 1` | Comparación para sorting. |
| `.isZero() / .isPositive() / .isNegative()` | Predicados. |
| `.amount` | Getter decimal (para display — no usar en aritmético). |
| `.minorUnits` | Getter bigint (para persistencia y cálculos). |
| `.currency` | Código ISO 4217 en mayúsculas. |
| `.toDecimal()` | Mismo que `.amount`. |
| `.toString()` | `"10.50 AUD"`. |

**Persistencia:** Guardar `minorUnits.toString()` en MongoDB (bigint no es JSON-serializable). Reconstruir con `Money.ofMinorUnits(BigInt(storedString), currency)`.

**Scale de minor units:**

| Currency | Decimales | Ejemplo |
|---|---|---|
| AUD, USD, EUR, GBP... | 2 | $10.50 → 1050n |
| JPY, KRW, VND | 0 | ¥1000 → 1000n |

---

### T00-606 · EntityId / TenantId / CorrelationId como Value Objects

**Riesgo original:** Los tres eran clases standalone que no extendían `ValueObject`. `equals()` no era el estándar del patrón. `Entity<EntityId>` no podía comparar IDs correctamente vía `===`.

**Corrección:**
- Los tres ahora extienden `ValueObject<{value: string}>`.
- `equals()` compara por valor a través del mecanismo de `JSON.stringify(props)` heredado de `ValueObject`.
- `Entity.equals()` actualizado para delegar a `.equals()` del ID si es un ValueObject:

```typescript
// Entity.equals() ahora soporta TId = string y TId = EntityId
equals(other: Entity<TId>): boolean {
  if (!(other instanceof Entity)) return false;
  if (this._id === other._id) return true; // string/number ids
  if (typeof (this._id as any).equals === 'function') {
    return (this._id as any).equals(other._id); // ValueObject ids
  }
  return false;
}
```

---

### T00-607 · Email usa REGEX.EMAIL del Shared Kernel

**Riesgo original:** `email.vo.ts` declaraba su propio `EMAIL_REGEX` duplicando `REGEX.EMAIL` de `kernel/regex.ts`.

**Corrección:** `email.vo.ts` importa y usa `REGEX.EMAIL`. Single Source of Truth para el patrón de validación de email.

---

### T00-608 · TestUser.role tipado como UserRole

**Riesgo original:** `TestUser.role` era `string`, perdiendo el tipo `UserRole` que fue centralizado en el Sprint 0.5 SSOT.

**Corrección:** `TestUser.role: UserRole`. `createTestUser({ role: 'invalid_role' })` ahora falla en compilación.

---

### T00-609 · DomainEvent.occurredAt inyectable

**Riesgo original:** `occurredAt = new Date()` hardcodeado en el constructor imposibilitaba reconstruir un evento desde persistencia con su timestamp original.

**Corrección:** `occurredAt` es ahora un parámetro opcional en `DomainEventParams`. Si no se pasa, usa `new Date()` (comportamiento actual preservado).

```typescript
// Rehydration desde persistencia:
class OrderShipped extends DomainEvent {
  constructor(params: ...) {
    super({ ...params, occurredAt: storedTimestamp });
  }
}
```

---

## Qué NO se corrigió en este sprint

| Observación | Razón de aplazamiento |
|---|---|
| `Money` multiply con ratios irracionales (1/3) | El redondeo half-up es suficiente para casos ERP. Revisar si surge caso real. |
| `Locale` / `Timezone` sin validación de formato | Bajo riesgo en Sprint 1. Candidato para Sprint 0.7 si se implementan preferencias de usuario. |
| `UUID.constructor` debería ser `private` | Solo afecta extensibilidad teórica. No hay subclases. |
| `Result.flatMap()` (chain) | No requerido hasta que existan use cases reales. |
| `RequestContext` dual use (user vs system) | Pospuesto hasta que haya jobs de background. |
| `SharedModule` de NestJS | No requerido hasta que haya providers inyectables en dominios. |
| `Money` serialización bigint | Ver sección "Persistencia" arriba. Requiere convención por repositorio. |
| `ResultError` ↔ `DomainError` unificación de tipos | Bajo impacto hasta que haya use cases reales. |

---

## Impacto en Sprint 1

### Lo que Sprint 1 puede usar directamente sin preocupación

- `MongoRepositoryBase` — tenant isolation y soft delete garantizados por defecto
- `Money.of()` / `Money.ofMinorUnits()` — exactitud financiera garantizada
- `AggregateRoot.pullDomainEvents()` — event dispatch atómico
- `EntityId`, `TenantId`, `CorrelationId` — comparación por valor correcta
- `Repository` / `BaseRepository` — firmas alineadas, TypeScript valida

### Convenciones que Sprint 1 debe respetar

1. **Persistencia de Money:** Guardar como `{ minorUnits: minorUnits.toString(), currency }` en MongoDB. Reconstruir con `Money.ofMinorUnits(BigInt(doc.minorUnits), doc.currency)`.
2. **`deletedBy`:** Pasar desde `RequestContext.userId` al llamar `repository.delete(id, tenantId, ctx.userId)`.
3. **Event dispatch:** Usar siempre `pullDomainEvents()`, nunca `domainEvents` + `clearDomainEvents()` separados.
4. **Repositorios con queries adicionales:** Agregar `{ deletedAt: null }` a TODOS los queries adicionales que el repositorio concreto defina más allá de los heredados.

---

## Checklist de aprobación

- [x] `MongoRepositoryBase.findAll()` filtra `deletedAt: null`
- [x] `MongoRepositoryBase.findById(id, tenantId)` filtra `tenantId` y `deletedAt: null`
- [x] No existe query base sin `tenantId`
- [x] `Repository` y `BaseRepository` tienen firmas de `delete()` compatibles
- [x] `delete()` hace soft delete — hard delete no existe en la base
- [x] `AggregateRoot.pullDomainEvents()` existe y es atómico
- [x] `Money` usa `bigint` internamente — `0.1 + 0.2 = 0.30` exacto
- [x] `Money.compare()` existe
- [x] `EntityId`, `TenantId`, `CorrelationId` extienden `ValueObject`
- [x] `Entity.equals()` soporta TId = ValueObject
- [x] `Email` usa `REGEX.EMAIL` del kernel
- [x] `TestUser.role: UserRole` — TypeScript valida
- [x] `DomainEvent.occurredAt` es inyectable vía parámetro
- [x] TypeScript compila sin errores
- [x] Ningún cambio fuera de `shared/` ni `docs/`

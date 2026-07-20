# Business Repository

**Interfaz:** `IBusinessRepository` (`src/business/domain/repositories/business.repository.ts`)  
**Implementación:** `BusinessMongoRepository` (`src/business/infrastructure/persistence/`)  
**Token DI:** `BUSINESS_REPOSITORY_TOKEN` (Symbol)

---

## Contrato

```typescript
interface IBusinessRepository extends Repository<Business, string> {
  findById(id: string, tenantId: string): Promise<Business | null>;
  findAll(tenantId: string): Promise<Business[]>;
  save(entity: Business): Promise<Business>;
  delete(id: string, tenantId: string, deletedBy?: string): Promise<void>;
  exists(id: string, tenantId: string): Promise<boolean>;
  existsByName(name: string, tenantId: string): Promise<boolean>;
}
```

---

## Garantías

- **Tenant isolation**: todo método filtra por `tenantId`. `findById` con tenantId incorrecto retorna `null`.
- **Soft delete**: `delete()` ejecuta `updateOne($set: { deletedAt, deletedBy })`. Nunca borra físicamente.
- **deletedAt: null en lecturas normales**: `findById`, `findAll`, `exists` excluyen registros con `deletedAt != null`.
- **Upsert en save()**: usa `$set` + `$setOnInsert` para crear o actualizar en una sola operación sin riesgo de duplicados.

---

## Persistence Mapper

`BusinessPersistenceMapper` convierte entre:
- **Dominio** (`Business` aggregate con Value Objects)
- **Persistencia** (`BusinessDocument` — campos primitivos para MongoDB)

El método `toDomain(doc)` reconstruye el aggregate via `Business.fromPersistence()` (sin emitir eventos).  
El método `toPersistence(business)` retorna un `Record<string, unknown>` para el `$set` de MongoDB.

---

## Money y BigInt

Los futuros campos monetarios que dependan del Business (ej. configuración de revenue) deben persisitir `Money.minorUnits` como `string` (`.toString()` del bigint), y reconstituirlo con `Money.ofMinorUnits(BigInt(storedString), currency)`.

---

## Testing

Para tests unitarios de handlers, usar `FakeRepository` del patrón en `create-business.handler.spec.ts`. Para integration tests contra MongoDB real, usar el patrón de `cleanDatabase()` del Shared Testing.

# ADR-014: Soft Delete Policy — Eliminación lógica en todas las entidades del ERP

**Fecha:** 2026-07-06
**Estado:** Aceptado
**Autor:** Architecture Review — Sprint 0.5

---

## Contexto

Los datos financieros y contables no pueden eliminarse físicamente de la base de datos. Las regulaciones de auditoría, los trails contables, y la integridad referencial requieren que los registros eliminados permanezcan en la base de datos pero sean excluidos de las operaciones normales.

---

## Decisión

El ERP implementa **Soft Delete** en todas las entidades de negocio. La eliminación física (hard delete) está prohibida para entidades de dominio.

### Mecanismo

Los campos `deletedAt` y `deletedBy` en `BaseDocument` implementan la política:

- **Registro activo:** `deletedAt === null`
- **Registro eliminado:** `deletedAt !== null` (contiene el timestamp de eliminación)

La interfaz `SoftDeletable` en `shared/domain/interfaces/soft-deletable.interface.ts` define el contrato:

```typescript
export interface SoftDeletable {
  deletedAt: Date | null;
  deletedBy: string | null;
}
```

La función `isDeleted(entity)` provee la verificación de estado.

---

## Reglas de implementación

**ADR-014-R001:** Ningún repositorio implementa hard delete en entidades de dominio. El método `delete()` de `BaseRepository` ejecuta soft delete (setear `deletedAt` y `deletedBy`).

**ADR-014-R002:** Toda query de negocio filtra registros eliminados: `{ deletedAt: null }`. Los registros eliminados solo son accesibles por queries administrativas explícitas.

**ADR-014-R003:** El índice `{ deletedAt: 1 }` en `BaseDocument` permite queries eficientes sobre el estado de eliminación.

**ADR-014-R004:** Los registros de infraestructura (tokens, logs, cache) pueden usar hard delete. Solo los registros de entidades de negocio usan soft delete.

**ADR-014-R005:** Un registro eliminado no puede ser re-activado sin una decisión arquitectónica explícita. No existe operación `restore()` en el diseño base.

---

## Consecuencias

### Positivas
- Trazabilidad completa del ciclo de vida de cada entidad
- Compliance con regulaciones de auditoría financiera
- Integridad referencial preservada (no hay referencias rotas por eliminación)
- Capacidad de recuperación ante eliminaciones accidentales

### Negativas
- Acumulación de datos en la base de datos — requiere política de archivado a largo plazo
- Todas las queries deben incluir `{ deletedAt: null }` — risk de olvidarlo en queries ad-hoc
- Índices compuestos de unicidad deben considerar el estado de eliminación (documentos eliminados no deben bloquear la re-creación del mismo registro)

### Mitigación del riesgo de unicidad
Para campos únicos (ej. email de customer, código de contrato), los índices parciales de MongoDB deben excluir registros eliminados:

```javascript
db.entities.createIndex(
  { tenantId: 1, uniqueField: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);
```

---

## Documentos relacionados

- `ADR-013-audit-policy.md` — política de campos de auditoría
- `ADR-015-versioning.md` — versioning y optimistic locking

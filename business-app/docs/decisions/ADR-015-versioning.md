# ADR-015: Versioning Policy — Optimistic Locking preparado en todas las entidades

**Fecha:** 2026-07-06
**Estado:** Aceptado
**Autor:** Architecture Review — Sprint 0.5

---

## Contexto

En un sistema multi-tenant con operaciones concurrentes, existe el riesgo de lost updates: dos usuarios modifican el mismo registro simultáneamente y el segundo sobrescribe los cambios del primero sin conocerlos. El patrón Optimistic Locking previene este problema.

La implementación actual del ERP no tiene concurrencia alta, pero la base de datos de producción con múltiples usuarios por tenant puede generarla. Es más barato diseñar el soporte desde el inicio que agregar optimistic locking después.

---

## Decisión

Todas las entidades que extienden `BaseDocument` incluyen un campo `version: number` (default: 1). Este campo está preparado para implementar Optimistic Locking cuando sea necesario.

### Estado actual (Sprint 0.5)

El campo `version` existe en el schema pero **no se valida automáticamente**. Los repositorios no implementan validación de versión en `save()`. Es infraestructura preparada, no funcionalidad activa.

### Activación futura (por aggregate)

Cuando un aggregate requiera Optimistic Locking, el repositorio concreto implementará:

```typescript
async save(entity: MyEntity): Promise<MyEntity> {
  const result = await this.model.findOneAndUpdate(
    { _id: entity.id, version: entity.version },  // check version
    { ...persistenceData, $inc: { version: 1 } }, // increment on save
    { new: true }
  );
  if (!result) throw new ConflictError('Version conflict — the entity was modified by another operation');
  return this.toDomain(result);
}
```

---

## Reglas de implementación

**ADR-015-R001:** El campo `version` nunca es seteado manualmente por la capa de aplicación. Solo el repositorio lo gestiona.

**ADR-015-R002:** Al crear una entidad, `version` inicia en 1. Cada `save()` exitoso lo incrementa en 1.

**ADR-015-R003:** El campo `version` de Mongoose (`__v`) está deshabilitado (`versionKey: false`) en todos los schemas. El campo `version` de `BaseDocument` es el único mecanismo de versioning.

**ADR-015-R004:** La activación de Optimistic Locking en un aggregate específico es una decisión del equipo propietario del dominio, no una decisión global.

---

## Consecuencias

### Positivas
- El campo `version` está disponible en todos los documentos desde el inicio — no requiere migration futura
- La activación de Optimistic Locking es incremental (por aggregate) sin cambios de schema
- Facilita debugging: el `version` en los documentos permite ver cuántas veces fue modificado cada registro

### Negativas
- El campo `version` ocupa espacio en cada documento aunque no se use activamente
- Developers pueden confundirlo con el `__v` de Mongoose (mitigado por `versionKey: false` y documentación)

---

## Documentos relacionados

- `ADR-013-audit-policy.md` — campos de auditoría en BaseDocument
- `ADR-014-soft-delete.md` — soft delete policy

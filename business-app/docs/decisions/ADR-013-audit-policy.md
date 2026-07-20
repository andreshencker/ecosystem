# ADR-013: Audit Policy — Campos de auditoría obligatorios en todas las entidades persistidas

**Fecha:** 2026-07-06
**Estado:** Aceptado
**Autor:** Architecture Review — Sprint 0.5

---

## Contexto

Las regulaciones contables y los requisitos de compliance exigen trazabilidad completa de quién creó, modificó, o eliminó cada registro del ERP. Sin una política centralizada, cada dominio implementaría campos de auditoría de forma inconsistente.

---

## Decisión

Toda entidad persistida en MongoDB que extienda `BaseDocument` (`shared/infrastructure/schemas/base-document.schema.ts`) incluirá automáticamente los siguientes campos de auditoría:

| Campo | Tipo | Responsabilidad |
|-------|------|----------------|
| `tenantId` | string | Aislamiento multi-tenant (obligatorio, indexado) |
| `createdAt` | Date | MongoDB timestamps (automático) |
| `updatedAt` | Date | MongoDB timestamps (automático) |
| `createdBy` | string \| null | ID del usuario que creó el registro |
| `updatedBy` | string \| null | ID del usuario que modificó por última vez |
| `deletedAt` | Date \| null | Timestamp de eliminación lógica (null = activo) |
| `deletedBy` | string \| null | ID del usuario que eliminó lógicamente |
| `version` | number | Contador para optimistic locking (inicia en 1) |

`createdAt` y `updatedAt` son provistos por la opción `timestamps: true` de Mongoose. Los demás campos son provistos por `BaseDocument`.

---

## Reglas de implementación

**ADR-013-R001:** Todo schema del ERP que persiste entidades de negocio extiende `BaseDocument`. Los schemas de infraestructura (tokens, logs, queues) pueden omitirlo.

**ADR-013-R002:** `createdBy` y `updatedBy` se populan desde el `RequestContext` en la capa de aplicación, nunca en la capa de dominio.

**ADR-013-R003:** Los schemas hijos usan `timestamps: true` y `versionKey: false`. El campo `version` en `BaseDocument` reemplaza al `__v` de Mongoose.

**ADR-013-R004:** `tenantId` es obligatorio y siempre indexado. Ninguna query omite el filtro de `tenantId`.

---

## Consecuencias

### Positivas
- Auditoría completa sin esfuerzo adicional por dominio
- `tenantId` garantiza aislamiento multi-tenant en la capa de datos
- `version` prepara optimistic locking para escalabilidad futura

### Negativas
- Todos los schemas heredan 7 campos adicionales, aunque algunos puedan no necesitarlos
- `createdBy` / `updatedBy` requieren que el RequestContext esté disponible en la capa de aplicación

---

## Documentos relacionados

- `ADR-014-soft-delete.md` — uso de deletedAt / deletedBy
- `ADR-015-versioning.md` — uso del campo version para optimistic locking
- `ADR-016-correlation-id.md` — correlationId en RequestContext

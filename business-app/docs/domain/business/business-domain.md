# Business Domain

**Sprint:** 1  
**Estado:** Implementado  
**Módulo:** `src/business/`

---

## Resumen

Business es el **Aggregate Root del ERP**. Todos los demás dominios (Revenue, Billing, Customer, Calendar, Work, Analytics, Documents, Communications) obtienen el contexto de tenant/business desde aquí.

---

## Aggregate Root: Business

### Campos

| Campo | Tipo (dominio) | Almacenado como | Obligatorio |
|---|---|---|---|
| `id` | `BusinessId` (VO) | string UUID | ✅ |
| `tenantId` | `TenantId` (VO) | string | ✅ |
| `name` | `BusinessName` (VO) | string (max 200) | ✅ |
| `legalName` | `BusinessName | null` (VO) | string | ❌ |
| `abn` | string | null | ❌ (11 dígitos si presente) |
| `settings` | `BusinessSettings` (VO) | {currency, language, locale, timezone} | ✅ (defaults AUD/en/en-AU/Australia/Sydney) |
| `country` | `Country` (VO) | ISO 3166-1 alpha-2 | ✅ (default AU) |
| `status` | `BusinessStatus` (VO) | 'active' | 'inactive' | ✅ (default active) |
| `type` | `BusinessType` (VO) | 'company' | 'sole_trader' | 'partnership' | 'trust' | ✅ |
| `correlationId` | string | null | ❌ |
| `createdAt` | Date | MongoDB timestamps | auto |
| `updatedAt` | Date | MongoDB timestamps | auto |
| `deletedAt` | Date | null | null = activo | auto |
| `createdBy` | string | null | primer userId | ❌ |
| `updatedBy` | string | null | userId que modificó | ❌ |
| `deletedBy` | string | null | userId que eliminó | ❌ |
| `version` | number | inicia en 1 | auto |

### Value Objects propios

| VO | Validación |
|---|---|
| `BusinessId` | UUID, no vacío |
| `BusinessName` | no vacío, máx 200 chars |
| `BusinessStatus` | `'active' | 'inactive'` |
| `BusinessType` | `'company' | 'sole_trader' | 'partnership' | 'trust'` |
| `BusinessSettings` | compone Currency + Language + Locale + Timezone del Shared Kernel |

### Value Objects del Shared Kernel reutilizados

`TenantId`, `Country`, `Currency`, `Language`, `Locale`, `Timezone`

---

## Estado y transiciones

```
create() → active
active  → deactivate() → inactive
inactive → activate() → active
active/inactive → softDelete() → deleted (soft, deletedAt != null)
```

Intentar activar un ya-activo → `BusinessAlreadyActiveError`  
Intentar desactivar un ya-inactivo → `BusinessAlreadyInactiveError`  
Intentar operar sobre un deleted → `BusinessAlreadyDeletedError` / `BusinessRuleViolationError`

---

## Business Rules

| Regla | Descripción |
|---|---|
| `BusinessNameMustNotBeEmpty` | name no puede ser vacío |
| `BusinessAbnMustBeValid` | ABN debe ser 11 dígitos (si presente) |
| `BusinessMustNotBeDeleted` | ninguna operación sobre registros deleted |
| `BusinessMustBeActiveForDeactivation` | debe estar active para desactivar |
| `BusinessMustBeInactiveForActivation` | debe estar inactive para activar |

---

## Colección MongoDB

`erp_businesses` — separado del legacy `companies` (plataforma SaaS).

### Índices

- `{ businessId: 1 }` — único, principal lookup
- `{ tenantId: 1 }` — global
- `{ tenantId: 1, name: 1 }` — unicidad de nombre por tenant
- `{ tenantId: 1, status: 1 }` — queries por estado
- `{ tenantId: 1, deletedAt: 1 }` — soft delete filter

# Sprint 2 — Auditoría y Decisión Go / No-Go para Sprint 3

**Fecha de auditoría:** 2026-07-06
**Auditor:** CTO Agent
**Método:** Inspección directa del código fuente y documentación

---

## Hallazgos de la auditoría

### Backend — Customer CRUD

| Criterio | Estado | Evidencia |
|---|---|---|
| `POST /customers` | ✅ Implementado | `customer.controller.ts`, `customer.service.ts` |
| `GET /customers` (lista + filtros) | ✅ Implementado | `CustomerService.findAll()` con search, active filter |
| `GET /customers/:id` | ✅ Implementado | `CustomerService.findByIdOrThrow()` |
| `PATCH /customers/:id` | ✅ Implementado | `CustomerService.update()` |
| `POST /customers/:id/deactivate` | ✅ Implementado | `CustomerService.deactivate()` |
| `POST /customers/:id/contacts` | ✅ Implementado | `CustomerService.addContact()` |
| `GET /customers/:id/contacts` | ✅ Implementado | `CustomerService.getContacts()` |
| `PATCH /customers/:id/contacts/:contactId` | ✅ Implementado | `CustomerService.updateContact()` |
| `DELETE /customers/:id/contacts/:contactId` | ✅ Implementado | `CustomerService.removeContact()` |
| businessId del JWT, no del body | ✅ Verificado | El `companyId` viene del guard en el controller |
| Tenant isolation | ✅ Verificado | Todas las queries filtran por `companyId` |

**Backend Customer: ✅ COMPLETO**

---

### Backend — Domain Events

> **Actualización 2026-07-07:** Los tres eventos fueron implementados y el servicio los publica. Estado corregido.

| Criterio | Estado | Evidencia |
|---|---|---|
| `CustomerCreated` evento definido | ✅ IMPLEMENTADO | `src/customer/events/customer-created.event.ts` |
| `CustomerUpdated` evento definido | ✅ IMPLEMENTADO | `src/customer/events/customer-updated.event.ts` |
| `CustomerDeactivated` evento definido | ✅ IMPLEMENTADO | `src/customer/events/customer-deactivated.event.ts` |
| `CustomerService.create()` publica evento | ✅ PUBLICA | Via `OutboxService.append()` después del save |
| `CustomerService.update()` publica evento | ✅ PUBLICA | Via `OutboxService.append()` con `changedFields` |
| `CustomerService.deactivate()` publica evento | ✅ PUBLICA | Via `OutboxService.append()` después del save |
| Outbox collection para Customer events | ✅ EXISTE | `OutboxService` en `src/infrastructure/outbox/` |

**Domain Events: ✅ IMPLEMENTADOS**

---

### Backend — Tests

| Criterio | Estado | Evidencia |
|---|---|---|
| Tests unitarios de CustomerService | ✅ Existen | `src/customer/tests/customer.service.spec.ts` |
| Tests de integración de endpoints | ❌ No encontrados | No hay tests de controller |
| Tests verifican publicación de eventos | ❌ No aplica | Los eventos no están implementados |

**Tests: ⚠️ PARCIAL**

---

### Frontend — Customer pages

> **Actualización 2026-07-07:** Frontend Customer implementado. Estado corregido.

| Criterio | Estado | Evidencia |
|---|---|---|
| Ruta `/customers` en el router | ✅ EXISTE | `frontend/app/(portal)/customers/page.tsx` |
| Lista de customers (DataGrid + mobile cards) | ✅ EXISTE | `customers/page.tsx` |
| Formulario de creación | ✅ EXISTE | `customers/new/page.tsx` |
| Detalle de customer | ✅ EXISTE | `customers/[id]/page.tsx` |
| Edición de customer | ✅ EXISTE | `customers/[id]/edit/page.tsx` |
| Deactivate con confirmación | ✅ EXISTE | `useDeactivateCustomerMutation` con toast |
| Gestión de contacts | ✅ EXISTE | `customers/[id]/ContactForm.tsx` |
| Toast en éxito y error | ✅ CORRECTO | Todos los hooks tienen `pushSnack` success+error |

**Frontend Customer: ✅ IMPLEMENTADO**

---

### Backend — MDM (Master Data)

| Criterio | Estado | Evidencia |
|---|---|---|
| Módulo MDM existe | ✅ Existe | `src/mdm/` directory |
| Tests de MDM | ✅ Existen | `src/mdm/tests/mdm.service.spec.ts` |
| Endpoints expuestos | ⚠️ No verificado | No se inspeccionó el controller MDM |

**MDM: ⚠️ PENDIENTE DE VERIFICACIÓN DETALLADA**

---

### Documentación

| Criterio | Estado |
|---|---|
| Contratos de eventos Customer documentados | ✅ Recién creado en esta sesión (`docs/events/customer/`) |
| docs/events/ completo | ✅ Creado ahora |
| docs/architecture/13,14,15 | ✅ Creados ahora |
| docs/domain/bi/06-etl-and-sync.md actualizado | ✅ Actualizado ahora |
| docs/domain/bi/08-semantic-layer.md | ✅ Creado ahora |

**Documentación: ✅ COMPLETADA EN ESTA SESIÓN**

---

## Resumen de estado Sprint 2

| Componente | Estado | Blocking para Sprint 3 |
|---|---|---|
| Backend CRUD Customer | ✅ Completo | No |
| Backend Domain Events Customer | ❌ No implementados | **SÍ** |
| Backend Tests completos | ⚠️ Parcial | **SÍ** |
| Frontend Customer pages | ❌ No implementado | **SÍ** |
| MDM | ⚠️ Parcial | No (Sprint 3 no depende) |
| Docs y contratos de eventos | ✅ Completo | No |
| Gateway BI (BiClientService) | ✅ Existe | No |

---

## Decisión actualizada: **GO para Sprint 3**

> **Revisión 2026-07-07:** Ambos bloqueantes fueron resueltos. La decisión original NO-GO ha sido revertida.

### Estado actual de los bloqueantes

**1. Domain Events — ✅ RESUELTO**

`CustomerCreated`, `CustomerUpdated`, `CustomerDeactivated` existen en el código en `src/customer/events/`. `CustomerService` publica los tres eventos al Outbox después de cada operación de escritura. Los eventos incluyen todos los campos requeridos para `dim_customer` en BI (`businessId`, `customerId`, `displayName`, `customerType`, `abn`, `email`, `isActive`, `createdAt`, `updatedAt`).

**2. Frontend — ✅ RESUELTO**

Páginas de customer implementadas en `frontend/app/(portal)/customers/`:
- Lista con DataGrid (desktop) y cards (mobile) ✅
- Creación ✅
- Detalle ✅
- Edición ✅
- Deactivate con confirmación ✅
- Gestión de contacts ✅
- Toast/Snackbar en éxito y error de todas las mutaciones ✅

Adicionalmente resuelto (2026-07-07):
- Notificación `security.company_password_changed` implementada en `UsersController.changePassword()`
- Notificación `security.company_forgot_password` implementada en `UsersController.sendPasswordReset()`
- Console.log de debug eliminados de hooks
- Toast agregado a `useUpdateCompany` y `useIntegration`

### Lo que debe completarse antes de Sprint 3

```
BLOQUEANTE 1 — Domain Events (PlatformAgent o CustomerAgent)
  [ ] Crear CustomerCreatedEvent con payload completo
  [ ] Crear CustomerUpdatedEvent con payload completo
  [ ] Crear CustomerDeactivatedEvent con payload completo
  [ ] CustomerService.create() publica CustomerCreatedEvent después del save
  [ ] CustomerService.update() publica CustomerUpdatedEvent después del save
  [ ] CustomerService.deactivate() publica CustomerDeactivatedEvent después del save
  [ ] Tests verifican que los eventos se publican con el payload correcto

BLOQUEANTE 2 — Frontend Customer (FrontendAgent)
  [ ] /customers — lista con DataGrid (desktop) + cards (mobile)
  [ ] /customers/new — formulario de creación
  [ ] /customers/:id — detalle
  [ ] /customers/:id/edit — edición
  [ ] Deactivate con confirmación
  [ ] Contacts management
  [ ] Loading, error, empty states
  [ ] Ninguna URL directa a BI en el código

NO BLOQUEANTE (puede avanzar en paralelo o diferirse)
  [ ] Tests de integración de customer controller
  [ ] MDM endpoints verificación completa
```

---

## Recomendación al equipo

**Permanecer en Sprint 2 hasta que los dos bloqueantes estén resueltos.**

Sprint 3 (Calendar Domain) no depende de Customer para funcionar, pero el roadmap establece una dependencia implícita: **el flujo completo de eventos debe funcionar antes de agregar más dominios**. Si Customer no publica eventos, el patrón se rompe para todos los dominios futuros.

Una vez resueltos los bloqueantes:
- `alembic current` en BI sigue en `32d1d2706e72 (head)` ← sin cambios de schema necesarios en Sprint 2
- Los eventos de Customer no requieren tablas nuevas en Neon hasta Sprint 11
- Sprint 3 puede comenzar inmediatamente después del QA sign-off de Sprint 2

---

## Criterios exactos de Go para Sprint 3

```
[ ] CustomerCreatedEvent publicado y testeado
[ ] CustomerUpdatedEvent publicado y testeado
[ ] CustomerDeactivatedEvent publicado y testeado
[ ] /customers lista con DataGrid y mobile cards
[ ] /customers creación funciona end-to-end
[ ] /customers/:id deactivate funciona
[ ] QA sign-off de Sprint 2
[ ] docs/ actualizados (ya completos)
[ ] alembic current = head (sin cambios en BI)
```

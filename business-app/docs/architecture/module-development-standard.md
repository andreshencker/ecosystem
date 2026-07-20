# Module Development Standard

**Versión:** 1.0 | **Fecha:** 2026-07-07 | **Estado:** Oficial — guía obligatoria para nuevos módulos

> Este documento es la guía oficial para crear cualquier módulo nuevo en el ERP.
> Seguirlo garantiza que todos los módulos son consistentes, seguros, y cumplen los estándares de la plataforma.
> Aplica a desarrolladores humanos y a agentes de IA por igual.

---

## 0. Antes de comenzar

Lee estos documentos en orden. Son los prerrequisitos de este estándar.

1. `docs/architecture/09-architecture-principles.md` — principios del sistema
2. `docs/integrations/communications/notifications.md` — estándar de comunicaciones (reemplaza communication-architecture.md)
3. `docs/engineering/12-definition-of-done.md` — qué significa "terminado"
4. `docs/domain/02-ubiquitous-language.md` — vocabulario del proyecto

Si no los conoces, léelos antes de escribir una sola línea.

---

## 1. Análisis previo (obligatorio antes de codificar)

### 1.1 Identificar el bounded context

```
¿Este módulo pertenece a un bounded context existente?
  Sí → revisar docs/architecture/11-context-map.md y respetar los boundaries
  No → crear ADR justificando el nuevo bounded context antes de implementar
```

### 1.2 Identificar el Aggregate Root

```
¿Cuál es la entidad principal del módulo?
  → debe tener identidad estable (ID inmutable)
  → debe mantener sus invariantes internamente
  → es la única puerta de entrada para modificar su estado
```

### 1.3 Tabla de decisión obligatoria — por método del Application Service

**Antes de escribir una sola línea de código**, completar esta tabla para todos los métodos públicos del Service. Esto es **obligatorio en el PR**:

```
Método | Toast | Domain Event | Canal externo | Platform/Business | eventKey | Tests | Documentado
───────┼───────┼──────────────┼───────────────┼───────────────────┼──────────┼───────┼────────────
...    | ✅/❌ | Nombre/N/A   | ✅/❌          | Platform/Business/N/A | key/N/A | ✅/❌ | ✅/❌
```

**Ejemplo completo (módulo Customer + módulo Billing):**

| Método | Toast | Domain Event | Canal externo | Platform/Business | eventKey | Documentado |
|---|---|---|---|---|---|---|
| `createCustomer()` | ✅ | `CustomerCreated` → BI/Analytics | ❌ No | N/A | N/A | ✅ |
| `updateCustomer()` | ✅ | `CustomerUpdated` → BI | ❌ No | N/A | N/A | ✅ |
| `deactivateCustomer()` | ✅ | `CustomerDeactivated` → BI | ❌ No | N/A | N/A | ✅ |
| `findAllCustomers()` | ❌ lectura | — | ❌ No | N/A | N/A | N/A |
| `sendInvoice()` | ✅ | `InvoiceSent` → BI/Accounting | ✅ Sí | Business | `billing.invoice_sent` | ✅ |
| `recordPayment()` | ✅ | `PaymentRecorded` → BI/Accounting | ✅ Sí | Business | `billing.payment_received` | ✅ |
| `voidInvoice()` | ✅ | `InvoiceVoided` → BI/Accounting | ❌ No | N/A | N/A | ✅ |

Esta tabla debe aparecer en el doc del módulo o en el PR description. No es opcional.

---

## 2. Backend — flujo de implementación

### 2.1 Estructura de archivos (estándar DDD)

```
src/{module-name}/
  ├── {module}.controller.ts
  ├── {module}.module.ts
  ├── {module}.service.ts
  ├── schemas/
  │   └── {entity}.schema.ts
  ├── dto/
  │   ├── create-{entity}.dto.ts
  │   ├── update-{entity}.dto.ts
  │   └── {entity}-response.dto.ts
  └── events/                   ← solo si el módulo publica Domain Events
      └── {entity}-created.event.ts
```

### 2.2 Checklist de implementación backend

```
[ ] Schema de Mongoose definido con los campos necesarios
[ ] DTOs de entrada con class-validator (validación en la frontera)
[ ] DTO de respuesta que no expone campos internos
[ ] businessId en todos los documentos — siempre indexado
[ ] Todas las queries filtran por businessId como condición primaria
[ ] businessId siempre del JWT/AuthContext — nunca del request body
[ ] Guards de autenticación y rol aplicados
[ ] Paginación en endpoints de lista (page, limit, total)
[ ] Respuestas HTTP correctas (201 Create, 200 OK, 204 No Content, 404, 400)
[ ] No hay console.log() de debug
[ ] No hay any sin justificación
```

---

## 3. Domain Events — decisión

Por cada método del Application Service que modifica estado, responder:

```
¿Otros módulos necesitan saber que este cambio ocurrió?

Consumidores potenciales:
  - BI BC-13  (analytics de negocio — tablas fact_*)
  - Analytics BC-10 (read models operativos)
  - Accounting (asientos contables)
  - Auditoría
  - Integraciones externas

Si alguno aplica → publicar Domain Event al Outbox DESPUÉS del save
Si ninguno aplica → no publicar evento (no todo cambio necesita un evento)
```

### 3.1 Checklist de Domain Events

```
[ ] El evento se publica DESPUÉS del save a base de datos (nunca antes)
[ ] El payload del evento es autocontenido (no requiere llamadas adicionales)
[ ] El nombre del evento está en tiempo pasado (CustomerCreated, no CreateCustomer)
[ ] El evento incluye businessId como campo obligatorio
[ ] El handler (si existe) es idempotente (mismo evento dos veces = mismo resultado)
[ ] Existe doc en docs/events/{domain}/{event-name}.md con el contrato del evento
[ ] El contrato del evento incluye mapeo a BI (tablas, idempotencia)
```

---

## 4. Comunicación externa — decisión

**Aplicar el Communication First Decision por cada método público.**

Ver `docs/architecture/communication-architecture.md §1` para el árbol completo.

### 4.1 Evaluación rápida

```
Ejemplos que NUNCA requieren canal externo:
  - create/update/deactivate de entidades administrativas
    (Customer, Rate, Contract draft, Company settings)
  - lecturas (findAll, findById)
  - cambios de estado interno sin impacto en terceros

Ejemplos que SÍ requieren canal externo:
  - Invitación / verificación de email / reset de contraseña
  - Envío de Invoice al cliente
  - Compartir documento
  - Enviar contrato a cliente
  - Recordatorio de pago
  - Cualquier acción donde un tercero externo necesita ser notificado
```

### 4.2 Si requiere canal externo: Communication Catalog

**Regla de oro:** Ningún Business Event puede llamarse con `notifyEvent()` si no existe previamente en el `COMMUNICATION_CATALOG`. Primero el catálogo, después el código.

```
[ ] Determiné el tipo: 'platform' o 'business'

Si 'platform':
  [ ] El eventKey existe en Communications default-events.constant.ts
  [ ] Si es nuevo: creado en Communications + actualizado auth-communication-events.md
  [ ] Actualicé §10 tabla Platform Events de communication-architecture.md

Si 'business':
  [ ] El eventKey existe en COMMUNICATION_CATALOG (seed-catalog.ts)
       ← si NO existe, crear el domain/event aquí PRIMERO, antes del notifyEvent()
  [ ] Si el domain es nuevo: agregado con version: 1
  [ ] Si el event es nuevo en domain existente: domain version bumped (N → N+1)
  [ ] Si el eventKey ya existía: NO lo renombré, NO cambié variables obligatorias
  [ ] Si necesité cambio incompatible: creé billing.invoice_sent_v2 (versión nueva)
  [ ] Actualicé §2 tabla módulo y §10 tabla Business Events de communication-architecture.md
  [ ] Actualicé provisioning-default-templates.md §4

[ ] businessId del AuthContext/JWT — NUNCA del request body
[ ] eventKey en formato domainKey.eventKey
[ ] Solo llamo notificationClient.notifyEvent()
[ ] No resuelvo tokens ni credenciales manualmente
```

---

## 5. Frontend — flujo de implementación

### 5.1 Estructura de archivos (estándar React)

```
src/modules/{module-name}/
  ├── pages/
  │   ├── {EntityList}Page.tsx
  │   └── {EntityDetail}Page.tsx  (si aplica)
  ├── components/
  │   ├── {EntityList}Table.tsx         ← desktop
  │   ├── {EntityList}Cards.tsx         ← mobile
  │   ├── {EntityForm}Dialog.tsx        ← create/edit
  │   └── {EntityDeactivate}Dialog.tsx  ← si aplica
  └── hooks/
      ├── use{Entity}List.ts
      └── use{Entity}Mutations.ts
```

### 5.1b Navegación — obligatorio

**Toda página nueva debe registrarse en la navegación antes de ser considerada DONE.**

```
Regla de pertenencia:
  Si la página es para el usuario/empresa (operaciones, configuración, clientes, etc.)
  → va en Business App sidebar (COMPANY_SETTINGS_ITEMS o nueva sección)
  → va en ALLOWED_ROUTES de business_owner y business_admin

  Si la página es para administración global de la plataforma SaaS
  → va en Platform Admin sidebar (sidebarAdmin de platform_admin)
  → NO va en COMPANY_SETTINGS_ITEMS

Archivos a actualizar:
  frontend/config/rbac/role-config.ts   ← agregar a la sección correcta del sidebar
  frontend/config/rbac/route-rules.ts   ← agregar a ALLOWED_ROUTES de los roles correctos
```

**Ejemplo — página operacional del Business (Calendar, Work, Billing...):**
```typescript
// route-rules.ts
business_owner: [..., '/settings/calendar'],
business_admin: [..., '/settings/calendar'],

// role-config.ts — en COMPANY_SETTINGS_ITEMS (o sección nueva)
{ href: '/settings/calendar', label: 'Calendar', icon: CalendarMonthOutlinedIcon }
```

**Ejemplo — página exclusiva de Platform Admin (Audit, Global Users...):**
```typescript
// role-config.ts — en platform_admin.sidebarAdmin únicamente
sidebarAdmin: [
  ...,
  { label: 'Tools', items: [{ href: '/admin/audit', label: 'Audit', icon: ... }] },
]
```

### 5.2 Responsive (obligatorio)

```
[ ] Layout desktop: DataGrid o tabla con columnas
[ ] Layout mobile: tarjetas o lista compacta
[ ] Breakpoint: < 768px → mobile, ≥ 768px → desktop
[ ] Ver ui_responsive_standard en memory
```

### 5.3 Toast/Snackbar (obligatorio — siempre)

```
[ ] Toast en cada mutación exitosa (create, update, deactivate, send, etc.)
[ ] Toast en cada error de mutación
[ ] Los mensajes son claros para el usuario (no "Error 400")
[ ] No hay acciones silenciosas — toda acción tiene feedback visual

Ejemplos:
  ✅ "Cliente creado exitosamente."
  ✅ "Factura enviada a cliente@email.com."
  ✅ "No se pudo crear el cliente. Verifica los datos."
  ❌ "Error" (demasiado vago)
  ❌ Sin feedback (invisible para el usuario)
```

### 5.4 Estados de la UI

```
[ ] Loading state: spinner o skeleton mientras carga datos
[ ] Empty state: mensaje útil cuando no hay datos
[ ] Error state: mensaje claro + acción para reintentar
[ ] Confirmation dialog para acciones destructivas (deactivate, delete)
```

### 5.5 Arquitectura frontend

```
[ ] El frontend NO llama a ningún servicio interno directamente
    (No URLs de BI, Analytics, Communications en el código frontend)
[ ] Todo pasa por business-app/backend
[ ] Hooks con TanStack Query (useQuery, useMutation)
[ ] businessId nunca se envía como parámetro del frontend
    (lo resuelve el backend desde el JWT)
```

---

## 6. Analytics y BI

### 6.1 ¿Cuándo agregar Analytics?

```
¿El módulo genera datos que el Business Owner querría ver en su dashboard?
  Sí → definir Read Model en Analytics BC-10
  No → sin Analytics para este módulo

¿Los datos son relevantes para reportes financieros o de negocio?
  Sí → definir tablas en BI BC-13
  No → sin BI para este módulo
```

### 6.2 Checklist Analytics/BI

```
Si el módulo requiere Analytics:
  [ ] Read model definido en docs/domain/analytics/
  [ ] Handler de evento registrado en Analytics BC-10
  [ ] Read model vacío al crearse — se llena con operación

Si el módulo requiere BI:
  [ ] Tablas definidas (fact_* o dim_*) en docs/domain/business-intelligence/
  [ ] Migración de Alembic generada
  [ ] Handler de evento registrado en BI BC-13
  [ ] Idempotencia: ON CONFLICT DO NOTHING para fact_*, DO UPDATE para dim_*
```

---

## 7. Tests

```
[ ] Tests unitarios para la lógica de negocio del Service
[ ] Tests de integración para todos los endpoints nuevos:
      - Happy path (datos válidos)
      - Validation error (400)
      - Not found (404)
      - Unauthorized (401)
      - Forbidden (403)
[ ] Si hay Domain Events: test que verifica que el evento se publica
[ ] Si hay Communication Events: test que verifica que notifyEvent() fue llamado
    con los parámetros correctos (mock del NotificationClient)
[ ] No hay tests skippeados sin comentario
[ ] Coverage mínimo 80% en los Services nuevos
[ ] Todos los tests pasan: npm test retorna 0
[ ] Ningún test existente falló (zero regressions)
```

---

## 8. Documentación

```
[ ] Si es un nuevo concepto: agregado al glosario
    (docs/domain/02-ubiquitous-language.md)

[ ] Si hay Domain Events nuevos:
    [ ] doc en docs/events/{domain}/{event-name}.md
    [ ] contrato del evento completo (payload, BI mapping, consumers)

[ ] Si hay Communication Events nuevos:
    [ ] actualizado communication-architecture.md §2
    [ ] si es Business Event: actualizado provisioning-default-templates.md §4
    [ ] si es Platform Event: actualizado auth-communication-events.md

[ ] Si hay una decisión arquitectónica no trivial:
    [ ] ADR creado en docs/decisions/ADR-XXX.md

[ ] Si cambia el modelo de datos:
    [ ] doc de schema actualizado o creado
```

---

## 9. Definition of Done — self-review

Antes de marcar la tarea como DONE o crear el PR, el agente/desarrollador debe:

```
SELF-REVIEW COMPLETO:

CÓDIGO
[ ] Compila sin errores (tsc --noEmit retorna 0)
[ ] Sin errores de lint (eslint retorna 0)
[ ] Sin any sin justificación
[ ] Sin console.log() de debug
[ ] Sin secrets hardcodeados
[ ] businessId del JWT — nunca del body

DOMAIN EVENTS
[ ] Eventos publicados DESPUÉS del save
[ ] Payload autocontenido
[ ] Handlers idempotentes

COMMUNICATIONS (§4 de este estándar)
[ ] Communication First Decision aplicado
[ ] Toast/Snackbar en el frontend
[ ] Tipo correcto: platform o business
[ ] notifyEvent() es la única llamada a Communications
[ ] Communication Catalog actualizado si aplica

FRONTEND
[ ] Desktop + Mobile layouts
[ ] Toast en éxito y error de cada acción
[ ] Loading / Empty / Error states
[ ] No llama a servicios internos directamente

TESTS
[ ] Todos los tests pasan
[ ] Sin regressions
[ ] Coverage ≥ 80%

DOCUMENTACIÓN
[ ] Glosario actualizado si aplica
[ ] Docs de eventos actualizados
[ ] ADR si hubo decisión no trivial
[ ] communication-architecture.md si hay nuevos Communication Events

PR
[ ] Title: [S{N}][{DEPT}] {descripción}
[ ] Branch: feature/{dept}/{descripción}
[ ] Diff revisado línea por línea
```

---

## 10. Patrones de referencia

### Módulo de referencia: Customer

El módulo Customer es el módulo de referencia actual porque:
- Implementa correctamente CRUD con businessId del JWT
- Publica Domain Events al Outbox
- NO tiene Communication Events (correcto — solo toast en frontend)
- Tiene DTOs bien definidos

Archivos de referencia:
```
src/customer/customer.service.ts
src/customer/customer.controller.ts
src/customer/schemas/customer.schema.ts
src/customer/events/customer-created.event.ts
docs/events/customer/customer-created.md
```

### Módulo de referencia para Communication Events: Auth

El módulo Auth es la referencia para Platform Communication Events:

```
src/platform/auth/auth.service.ts
docs/communications/auth-communication-events.md
```

---

## 11. Tabla de decisiones rápidas

| Situación | Acción |
|---|---|
| Crear/editar entidad administrativa | Toast + Domain Event al Outbox (si BI lo necesita). Sin Communication Event. |
| Enviar algo a un cliente externo | Toast + Communication Event `type: 'business'` |
| Auth / invitaciones / seguridad | Toast + Communication Event `type: 'platform'` |
| Operación de lectura (GET) | Solo devolver datos. Sin Toast. Sin Event. |
| Cambio de estado interno | Toast. Domain Event si BI/Analytics lo necesita. Evaluar si cliente externo debe saber. |
| Error de validación | Toast con el error. Sin Event. Sin Communication. |
| Nueva entidad que otros módulos consumen | Domain Event al Outbox obligatorio. |
| Nuevo evento de comunicación | Actualizar Communication Catalog primero, luego implementar. |

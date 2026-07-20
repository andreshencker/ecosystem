# 13 — Checklists

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial — Referencia rápida

---

Este documento consolida todos los checklists del proceso de ingeniería en un solo lugar de referencia rápida. Los detalles completos de cada checklist están en los documentos respectivos.

---

## CHECKLIST 01 — Agente: Self-Review antes de abrir PR

Completar antes de reportar COMPLETION al CTO.

```
CÓDIGO
  [ ] Compila sin errores (tsc --noEmit)
  [ ] Sin errores de lint
  [ ] Sin console.log de debug
  [ ] Sin TODOs sin issue asociado
  [ ] Sin código comentado
  [ ] Sin secrets hardcodeados
  [ ] Sin imports de módulos fuera de mi ownership

BUSINESS RULES
  [ ] Invariantes del dominio implementadas
  [ ] businessId siempre del JWT
  [ ] Ningún boundary de dominio cruzado

DOMAIN EVENTS
  [ ] Eventos publicados después del save
  [ ] Handlers idempotentes
  [ ] Payloads autocontenidos

DATABASE
  [ ] Migration existe si hay cambios de schema
  [ ] Índices definidos
  [ ] Queries filtran por businessId

TESTS
  [ ] Tests unitarios escritos y pasan
  [ ] Tests de integración escritos y pasan
  [ ] Ningún test existente falló
  [ ] npm test retorna 0

DOCUMENTACIÓN
  [ ] docs/ actualizados
  [ ] ADR creado si hay nueva decisión
  
PR
  [ ] Branch: feature/{dept}/{descripción}
  [ ] PR Title: [S{N}][{DEPT}] {descripción}
  [ ] PR Description incluye: qué hace, cómo probar, decisiones tomadas
```

---

## CHECKLIST 02 — QA Agent: Revisión de PR

```
TESTS
  [ ] Tests unitarios existen y pasan
  [ ] Tests de integración existen y pasan
  [ ] No hay regresiones (tests previos siguen pasando)
  [ ] Coverage no decreció
  [ ] No hay tests skippeados injustificados

CRITERIOS DE ACEPTACIÓN
  [ ] Cada criterio tiene al menos un test que lo cubre
  [ ] Los criterios verificados desde perspectiva de comportamiento

COMPORTAMIENTO
  [ ] Happy path funciona correctamente
  [ ] Error paths retornan respuestas apropiadas
  [ ] businessId isolation verificada (datos solo del Business del JWT)

SEGURIDAD
  [ ] Sin JWT retorna 401
  [ ] Con JWT de otro Business no devuelve datos incorrectos
  [ ] Sin campos sensibles en respuestas inapropiadas

GATEWAY Y ARQUITECTURA (obligatorio en todos los PRs que tocan frontend)
  [ ] No hay ninguna URL de Business Intelligence en el código del frontend
  [ ] No hay ninguna llamada directa desde frontend a /internal/* de ningún servicio
  [ ] Todo acceso a datos del frontend pasa por business-app/backend
  [ ] businessId nunca viene del body del request en endpoints protegidos por JWT

DOCUMENTACIÓN
  [ ] docs/ actualizado según el comportamiento implementado
```

---

## CHECKLIST 03 — CTO Agent: Code Review de PR

```
DOMAIN ISOLATION
  [ ] Solo modifica archivos dentro de su ownership
  [ ] Sin imports directos entre bounded contexts distintos
  [ ] Comunicación cross-domain solo por Domain Events
  [ ] Sin lógica de negocio en controllers

EVENTS
  [ ] Payload de eventos correcto según arquitectura
  [ ] Eventos publicados después del save
  [ ] Handlers idempotentes
  [ ] Nombres en tiempo pasado

BUSINESS RULES
  [ ] Invariantes implementadas
  [ ] BRs del documento 04-business-rules.md respetadas
  [ ] businessId del JWT únicamente

SECURITY
  [ ] Sin secrets en código
  [ ] Guards aplicados correctamente
  [ ] Input validation con DTOs

DATABASE
  [ ] Migration existe si hay cambio de schema
  [ ] Índices definidos
  [ ] Queries con businessId

TESTS (verificación, no ejecución)
  [ ] Tests existen para lógica de negocio
  [ ] Tests de integración para endpoints
  [ ] DB real usada en tests (no mocks de DB)
  [ ] Tests escritos en términos de comportamiento

DOCUMENTATION
  [ ] docs/ actualizados
  [ ] ADR creado si hay nueva decisión técnica
```

---

## CHECKLIST 04 — Program Manager: Sprint Planning

```
PREPARACIÓN
  [ ] Roadmap revisado para el sprint
  [ ] Features seleccionadas con justificación de prioridad
  [ ] Dependencias de sprints anteriores verificadas

TASK GRAPH
  [ ] Todas las features descompuestas en tasks
  [ ] Cada task tiene agente asignado
  [ ] Cada task tiene criterios de aceptación
  [ ] Cada task tiene referencias a documentos de arquitectura
  [ ] Dependencias entre tasks correctamente modeladas
  [ ] Sin ciclos en el DAG
  [ ] Critical Path identificado
  [ ] Tasks de QA y Documentation incluidas

RIESGOS
  [ ] Riesgos del sprint identificados
  [ ] Mitigaciones propuestas
  [ ] Preguntas para el CTO documentadas

ENTREGA AL CTO
  [ ] Task Graph completo enviado al CTO
  [ ] Critical Path comunicado
  [ ] Riesgos comunicados
```

---

## CHECKLIST 05 — CTO Agent: Aprobación del Plan

```
COHERENCIA ARQUITECTÓNICA
  [ ] Las descomposiciones respetan bounded contexts
  [ ] Las asignaciones de agentes son correctas
  [ ] No hay tareas que crucen boundaries incorrectamente

DEPENDENCIAS
  [ ] Las dependencias son correctas y necesarias
  [ ] No hay dependencias circulares
  [ ] El Critical Path es razonable

COMPLETITUD
  [ ] Todas las features del sprint tienen tasks
  [ ] Todas las tasks tienen criterios de aceptación
  [ ] QA y Documentation tasks incluidas
  [ ] Tareas de infraestructura si aplica

RIESGOS
  [ ] Los riesgos del PM fueron revisados
  [ ] Se agregaron riesgos adicionales identificados por el CTO
```

---

## CHECKLIST 06 — Release Manager: Sprint Release

```
PRE-RELEASE
  [ ] Todas las tasks del sprint en estado MERGED
  [ ] QA sign-off del sprint completado
  [ ] CTO final review completado
  [ ] DoD verificada para todas las tasks

CI/CD
  [ ] Lint pasa
  [ ] TypeScript compila sin errores
  [ ] Unit tests pasan
  [ ] Integration tests pasan
  [ ] Docker build exitoso

RELEASE
  [ ] Rama de release creada
  [ ] Versión semántica asignada
  [ ] Release Notes generadas y revisadas
  [ ] Tag creado en git

STAGING DEPLOY
  [ ] Deploy exitoso en staging
  [ ] Smoke tests pasan
  [ ] Flujos críticos verificados manualmente
  [ ] Reporte al CTO y PM

PRODUCCIÓN DEPLOY (si autorizado)
  [ ] Autorización del CTO recibida
  [ ] Deploy ejecutado
  [ ] Health checks pasan
  [ ] Monitoreo por 15 minutos post-deploy
  [ ] Reporte final al CTO
```

---

## CHECKLIST 07 — Arquitectura: Validación de PR

Para cualquier PR que toque conceptos de dominio o arquitectura.

```
BOUNDED CONTEXTS
  [ ] El código está dentro del bounded context correcto
  [ ] No hay fugas de información entre contextos

UBIQUITOUS LANGUAGE
  [ ] Los nombres de clases, métodos y variables siguen el glosario
  [ ] No hay sinónimos prohibidos en el código

DOMAIN EVENTS
  [ ] El catálogo de eventos está actualizado
  [ ] Los payloads son correctos
  [ ] Los consumidores están documentados

INVARIANTS
  [ ] Las invariantes del dominio están implementadas como código, no como comentarios
  [ ] Los valores de retorno y errores son semánticamente correctos

ADRS
  [ ] Si hay una nueva decisión: ADR creado
  [ ] Si hay una decisión que contradice un ADR existente: ESCALATION al CTO
```

---

## CHECKLIST 08 — Backend: Nuevo módulo de dominio

Cuando un agente crea un nuevo módulo NestJS para un dominio.

```
ESTRUCTURA
  [ ] Módulo NestJS creado con @Module decorator
  [ ] Controller separado del Service
  [ ] Repository separado del Service
  [ ] DTOs definidos con class-validator
  [ ] Interfaces/types definidos

GUARDS
  [ ] JwtAuthGuard aplicado en rutas protegidas
  [ ] RolesGuard aplicado donde hay restricción de rol
  [ ] BusinessScopeGuard verifica que el businessId del JWT es correcto

EVENTS
  [ ] EventBus inyectado donde se publican eventos
  [ ] EventHandlers registrados para eventos consumidos
  [ ] Handlers marcados como idempotentes

TESTS
  [ ] Carpeta __tests__ o *.spec.ts junto al módulo
  [ ] Test de integración en carpeta test/ del backend

DATABASE
  [ ] Schema/Model definido
  [ ] Índices definidos en el schema
  [ ] Repository implementa las queries con businessId

DOCUMENTACIÓN
  [ ] Módulo referenciado en el documento de arquitectura correspondiente
```

---

## CHECKLIST 09 — Frontend: Nueva página

```
LAYOUT
  [ ] Desktop layout implementado (DataGrid o tabla)
  [ ] Mobile layout implementado (cards o lista)
  [ ] Loading state implementado
  [ ] Error state implementado
  [ ] Empty state implementado

DATA
  [ ] Hook de API con TanStack Query
  [ ] Invalidación de cache al mutar datos
  [ ] Error handling en el hook

FORMULARIOS (si aplica)
  [ ] Validación client-side
  [ ] Mensajes de error descriptivos
  [ ] Submit button deshabilitado durante loading

NAVEGACIÓN
  [ ] Ruta correcta en el router
  [ ] Breadcrumbs o navegación contextual
  [ ] Redirect correcto después de acciones

ACCESIBILIDAD
  [ ] Labels en formularios
  [ ] Alt text en imágenes
  [ ] Focus management en modales
```

---

## CHECKLIST 10 — QA: Sprint Sign-Off

```
REGRESIÓN COMPLETA
  [ ] Todos los tests del sprint pasan
  [ ] Todos los tests de sprints anteriores pasan
  [ ] Coverage no decreció vs sprint anterior

FLUJOS CRÍTICOS
  [ ] El flujo principal del sprint funciona en staging
  [ ] Los Domain Events del sprint se publican correctamente
  [ ] Los handlers de eventos del sprint funcionan

GATEWAY Y SEGURIDAD (obligatorio en todo sprint)
  [ ] El frontend no llama a Business Intelligence directamente
  [ ] El frontend no llama a Analytics directamente
  [ ] business-app/backend es el único gateway para servicios internos
  [ ] businessId siempre resuelto desde JWT en business-app/backend

ANALYTICS Y BI (si el sprint los requiere)
  [ ] Analytics BC-10: read models actualizados y respondiendo en staging
  [ ] BI BC-13: alembic current retorna head (si hubo cambios de schema)
  [ ] BI BC-13: GET /health retorna status: healthy en staging
  [ ] BI BC-13: datos ingestados si aplica

DOCUMENTACIÓN
  [ ] La documentación del sprint refleja el comportamiento implementado
  [ ] Los nuevos conceptos están en el glosario
  [ ] Los ADRs nuevos están bien documentados

FIRMA
  [ ] QA Agent: "Sprint {N} aprobado. Todos los criterios de la DoD cumplidos."
```

---

## CHECKLIST 11 — Sprint 2 Customer: Criterios específicos

Checklist adicional al Checklist 10 para el Sprint 2 Customer.

```
BACKEND — Customer CRUD
  [ ] POST /customers — crea company y individual con validaciones
  [ ] GET /customers — lista con filtros nombre, ABN, estado
  [ ] GET /customers/:id — detalle completo
  [ ] PATCH /customers/:id — actualización parcial
  [ ] POST /customers/:id/deactivate — soft delete
  [ ] POST /customers/:id/contacts — agregar Contact
  [ ] GET /customers/:id/contacts — listar contacts
  [ ] PATCH /customers/:id/contacts/:contactId — actualizar contact
  [ ] DELETE /customers/:id/contacts/:contactId — eliminar contact
  [ ] businessId siempre del JWT — nunca del body
  [ ] Customer no puede pertenecer a otro Business (isolation verificada)

FRONTEND — Customer management
  [ ] Lista de customers: desktop DataGrid + mobile cards
  [ ] Formulario de creación: company y individual con validaciones
  [ ] Detalle de customer: con contacts listados
  [ ] Edición de customer: campos modificables
  [ ] Deactivate: confirmación + feedback visual
  [ ] Loading, error, y empty states implementados
  [ ] El frontend llama /api/customers (business-app/backend) — nunca BI

DOMAIN EVENTS — payload para futura ingesta BI
  [ ] CustomerCreated incluye: businessId, customerId, displayName, customerType, abn, email, isActive, createdAt, updatedAt
  [ ] CustomerUpdated incluye los mismos campos con valores actualizados
  [ ] CustomerDeactivated incluye: businessId, customerId, deactivatedAt
  [ ] ContactAdded incluye: businessId, customerId, contactId
  [ ] Handlers de eventos son idempotentes

ANALYTICS BC-10
  [ ] NO requerido en Sprint 2 — no implementar read models de Customer en este sprint

BUSINESS INTELLIGENCE BC-13
  [ ] NO requerido en Sprint 2 — la ingesta de dim_customer se activa en Sprint 11
  [ ] Verificar que los eventos tienen el payload correcto para futura ingesta

MDM (Master Data)
  [ ] Catálogo de monedas implementado y accesible
  [ ] Catálogo de tax rates por jurisdicción implementado
  [ ] Catálogo de Invoice statuses implementado
  [ ] Catálogo de Payment methods implementado

QA GATEWAY
  [ ] El frontend no llama a ningún servicio interno directamente
  [ ] Isolation verificada: customer de Business A no accesible con JWT de Business B
```

---

## CHECKLIST 12 — Business Intelligence Agent: Validación de servicio BI

Checklist para el `BusinessIntelligenceAgent` antes de reportar cualquier tarea como DONE.

```
ALEMBIC
  [ ] alembic current retorna head (sin pendientes)
  [ ] alembic upgrade head ejecuta sin errores
  [ ] alembic downgrade funciona (rollback posible)
  [ ] No hay referencias a psycopg2 en requirements.txt
  [ ] No hay referencias a SQLite en ningún archivo de app/ o alembic/

MODELOS SQLALCHEMY
  [ ] Todos los modelos importados en app/models/__init__.py
  [ ] Base.metadata contiene todas las tablas esperadas
  [ ] Todas las PKs definidas
  [ ] Todas las FKs definidas y apuntan a tablas existentes
  [ ] Todos los índices de businessId definidos
  [ ] server_default=func.gen_random_uuid() en fact_id de todas las tablas fact_

NEON POSTGRESQL
  [ ] BI_DATABASE_URL apunta a Neon — no a localhost, no a SQLite
  [ ] El servicio falla en startup si BI_DATABASE_URL está vacía
  [ ] El servicio falla en startup si las migraciones no están aplicadas
  [ ] SSL configurado correctamente (ssl=require en connect_args)

SEGURIDAD
  [ ] Todo endpoint bajo /internal/ requiere x-internal-service-token
  [ ] /health no requiere token (público para health checks)
  [ ] businessId siempre viene como parámetro — nunca lo resuelve BI por su cuenta
  [ ] BI_INTERNAL_SERVICE_TOKEN configurado y no vacío en staging

HEALTH
  [ ] GET /health retorna: status, provider, server_version, warehouse, database, schema, migration_version
  [ ] status: healthy cuando Neon conecta y migraciones están aplicadas
  [ ] migration_version coincide con alembic current

CÓDIGO
  [ ] No hay import de psycopg2 en ningún archivo de app/ o alembic/
  [ ] No hay referencia a SQLite en ningún archivo de app/ o alembic/
  [ ] No hay referencia a MongoDB en ningún archivo de app/ o alembic/
  [ ] No hay hardcoded credentials en ningún archivo
  [ ] .env no se commitea (está en .gitignore)
```

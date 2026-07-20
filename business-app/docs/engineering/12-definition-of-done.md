# 12 — Definition of Done

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial — Referencia de todo el equipo

---

## Declaración

La Definition of Done (DoD) define el estándar mínimo que debe cumplir cualquier tarea para considerarse completa. No es una aspiración — es el piso mínimo.

Si una tarea no cumple la DoD, no está hecha. Sin excepciones, sin urgencias que justifiquen saltársela.

**Principio fundamental:** Una feature **nunca** se marca DONE solo porque el backend pasa los tests. El DONE requiere que todos los componentes declarados para ese sprint estén implementados, testeados, y documentados.

---

## DoD de una TASK (nivel tarea individual)

### 1. CÓDIGO

```
[ ] El código compila sin errores (tsc --noEmit retorna 0)
[ ] No hay errores de lint (eslint retorna 0)
[ ] No hay any tipado como `any` sin justificación documentada
[ ] No hay console.log() de debug dejados en el código
[ ] No hay TODOs sin un issue o tarea asociada
[ ] No hay código comentado (si se elimina algo, se elimina — no se comenta)
[ ] No hay secrets, API keys, ni passwords hardcodeados
[ ] Las variables de entorno requeridas tienen validación al inicio del servicio
```

### 2. BUSINESS RULES

```
[ ] Todas las invariantes del dominio están implementadas
[ ] Las Business Rules del documento 04-business-rules.md están respetadas
[ ] El businessId en todos los datos viene del JWT — nunca del request body
[ ] Los boundaries de dominio no fueron cruzados (ver 02-departments.md)
```

### 3. DOMAIN EVENTS

```
[ ] Los eventos se publican DESPUÉS del save a base de datos
[ ] Los handlers de eventos son idempotentes (mismo evento dos veces = mismo resultado)
[ ] El payload de cada evento es autocontenido (no requiere llamadas adicionales)
[ ] Los eventos están nombrados en tiempo pasado (WorkEventConfirmed, no ConfirmWorkEvent)
```

### 4. DATABASE

```
[ ] Si hay cambios de schema: existe el script de migration correspondiente
[ ] Los índices necesarios están definidos (al menos: businessId, campos de búsqueda frecuente)
[ ] Las queries siempre filtran por businessId como condición primaria
[ ] Los datos de test no quedan en la base de datos de producción
```

### 5. TESTS

```
[ ] Tests unitarios escritos para la lógica de negocio del servicio
[ ] Tests de integración escritos para todos los endpoints nuevos
[ ] Si hay flujo cross-domain: al menos un test E2E lo cubre
[ ] Todos los tests pasan localmente (npm test retorna 0)
[ ] No hay tests skippeados sin comentario explicando por qué
[ ] Coverage mínimo del 80% en los servicios nuevos
[ ] Ningún test existente falló (zero regressions)
```

### 6. DOCUMENTACIÓN

```
[ ] Los documentos de docs/ relevantes fueron actualizados
[ ] Si hay un nuevo concepto: agregado al glosario (docs/domain/02-ubiquitous-language.md)
[ ] Si hay una nueva decisión técnica: ADR creado en docs/decisions/
[ ] Si cambia un Domain Event: el catálogo de eventos está actualizado
[ ] Los docstrings de funciones complejas están escritos (máximo 1 línea)
```

### 7. SEGURIDAD

```
[ ] Rutas protegidas tienen el guard de autenticación JWT aplicado
[ ] Rutas con roles específicos tienen el guard de rol aplicado
[ ] Input validation (DTOs con class-validator) en todos los endpoints
[ ] No hay query injection posible (usar parámetros, no string interpolation en queries)
[ ] Headers de seguridad configurados (Helmet)
```

### 8. GATEWAY Y ARQUITECTURA DE SERVICIOS

```
[ ] El Frontend NO llama a Business Intelligence directamente (ninguna URL de BI en el código frontend)
[ ] El Frontend NO llama a Analytics directamente (todo vía business-app/backend)
[ ] business-app/backend es el único gateway entre Frontend y servicios internos (Analytics, BI)
[ ] businessId siempre viene del JWT resuelto en business-app/backend — nunca del body del request del frontend
[ ] Endpoints de BI bajo /internal/ requieren x-internal-service-token
```

### 9. ANALYTICS Y BI (si el sprint lo requiere)

```
Si el sprint requiere actualización de Analytics BC-10:
  [ ] Read models de MongoDB actualizados
  [ ] Handlers de eventos actualizados
  [ ] Datasets actualizados si el Document Platform los usa

Si el sprint requiere actualización de BI BC-13:
  [ ] Migración de Alembic generada y aplicada (alembic upgrade head)
  [ ] alembic current retorna head
  [ ] /health de BI responde status: healthy
  [ ] No hay tablas vacías si se ingresaron datos de prueba
  [ ] No hay referencias a SQLite, MongoDB, ni psycopg2 en runtime de BI
  [ ] Startup de BI falla si BI_DATABASE_URL no está configurada
```

### 9. COMMUNICATIONS (obligatorio para todo Application Service nuevo o modificado)

Aplicar las **5 preguntas oficiales** (ver `docs/integrations/communications/notifications.md §1`) por cada método público.

**Requisito mínimo:** incluir en el PR la tabla de decisión del módulo:

```
| Método | Toast | Domain Event | Canal externo | Platform/Business | eventKey |
```

Ver ejemplo completo en `module-development-standard.md §1.3`.

```
EVALUACIÓN DE COMUNICACIÓN (por método):

  [ ] Apliqué el Communication First Decision
  [ ] El resultado está documentado (comentario en código o en el PR)

  SI no requiere canal externo:
    [ ] Toast/Snackbar confirmado en el frontend (éxito y error)
    [ ] Si publico Domain Event: el doc del evento confirma explícitamente
        "No genera Communication Event — solo Domain Event interno"

  SI requiere canal externo:

    TIPO Y PARÁMETROS
    [ ] Tipo determinado: 'platform' o 'business'
    [ ] businessId viene del AuthContext/JWT — NUNCA del request body
    [ ] eventKey en formato: domainKey.eventKey

    IMPLEMENTACIÓN
    [ ] Solo llamé notificationClient.notifyEvent() — sin lógica de envío propia
    [ ] No resuelvo tokens manualmente
    [ ] No renderizo HTML en el Service
    [ ] No gestiono credenciales en el Service

    SI type = 'business':
      [ ] eventKey existe en COMMUNICATION_CATALOG.business (communication-catalog.ts)
      [ ] Si es nuevo: agregado al catálogo ANTES de implementar notifyEvent()
      [ ] Si es domain nuevo: domain agregado al catálogo, version bumped
      [ ] notifications.md §4 tabla de Business Events actualizada

    SI type = 'platform':
      [ ] eventKey existe en COMMUNICATION_CATALOG.platform (communication-catalog.ts)
      [ ] Si es nuevo: agregado al catálogo — startup lo provisiona automáticamente
      [ ] notifications.md §3 tabla de Platform Events actualizada

    FRONTEND
    [ ] Toast/Snackbar confirmado en el frontend (éxito y error)
        independientemente de si hay Communication Event
```

### 10. SELF-REVIEW

Antes de reportar COMPLETION al CTO, el agente debe completar su propio checklist:

```
SELF-REVIEW DEL AGENTE:
  [ ] Leí la Task Assignment y cumplí cada punto
  [ ] Verifiqué que no modifiqué archivos fuera de mi ownership
  [ ] Ejecuté npm test localmente y todos pasan
  [ ] Ejecuté npm run lint localmente y no hay errores
  [ ] Revisé el diff completo del PR línea por línea
  [ ] La documentación está actualizada
  [ ] El PR title sigue el formato: [S{N}][{DEPT}] {descripción}
  [ ] La rama sigue el formato: feature/{dept}/{descripción}
```

---

## DoD de una FEATURE (nivel feature completa)

Una Feature está DONE cuando:

```
[ ] Todas las Tasks de la Feature están en estado DONE
[ ] El flujo completo de la Feature funciona de punta a punta en staging
[ ] Los criterios de aceptación del Epic padre están cumplidos
[ ] El QA Agent dio el sign-off de la Feature
[ ] El CTO aprobó todos los merges de las Tasks de la Feature
[ ] El QA Agent verificó que el frontend no llama servicios internos directamente
[ ] Los Domain Events del feature tienen payload completo (campos que BI necesitará)
```

---

## DoD de un SPRINT (nivel sprint)

Un Sprint está DONE cuando:

```
[ ] Todas las Features del Sprint están DONE
[ ] El Sprint Release fue ejecutado por el Release Manager
[ ] El deploy en staging fue verificado y funciona correctamente
[ ] Las Release Notes fueron generadas y revisadas
[ ] La Retrospective fue completada y documentada
[ ] El PM confirmó: "Sprint {N} cerrado — DoD cumplida"
```

---

## DoD para tipos específicos de trabajo

### Backend — nuevo endpoint

```
[ ] Controller con validación de DTO
[ ] Service con lógica de negocio
[ ] Repository (si aplica)
[ ] Guard de autenticación y rol
[ ] Test de integración que cubre happy path y error paths
[ ] Documentado en la API reference (si existe)
```

### Backend — nuevo Domain Event

```
[ ] Clase del evento definida con todos los campos
[ ] Publicación en el lugar correcto (después del save)
[ ] Handler registrado si debe ser consumido en el mismo servicio
[ ] Al menos un test que verifica que el evento se publica con el payload correcto
[ ] Catálogo de eventos actualizado en los documentos relevantes
```

### Frontend — nueva página o componente

```
[ ] Desktop layout con DataGrid o tabla (si aplica)
[ ] Mobile layout con cards o lista (si aplica) — ver responsive standard en memory
[ ] Loading states manejados
[ ] Error states manejados
[ ] Empty states manejados
[ ] Hook de API usando TanStack Query
[ ] Tests de componente básicos
[ ] Accesible (etiquetas ARIA donde aplica)

NAVEGACIÓN (obligatorio — la página no está DONE sin esto):
[ ] Ruta agregada a ALLOWED_ROUTES en route-rules.ts para los roles correctos
[ ] Item agregado al sidebar en role-config.ts en la sección correcta:
      Business App (owner, admin) → COMPANY_SETTINGS_ITEMS o sección operacional
      Platform Admin global       → platform_admin.sidebarAdmin únicamente
[ ] Verificar que la página NO aparece en Platform Admin si es operacional del Business
[ ] Verificar que la página NO aparece en roles sin acceso (viewer, staff, accountant)
    a menos que sea explícitamente para ellos
[ ] Toast/Snackbar en éxito y error de todas las acciones de usuario
[ ] Ningún cálculo analítico en el componente (KPIs, totales, porcentajes → vienen del API)
```

### Migración de base de datos

```
[ ] El script de migration es idempotente
[ ] El migration agrega datos nuevos (no elimina ni renombra campos viejos en el mismo paso)
[ ] Se verificó en un dump de datos representativo antes de mergear
[ ] Existe el script de rollback si la migration falla
```

---

## Lo que NUNCA está en la DoD

Estas cosas no son parte de la DoD — son deseables pero no bloqueantes:

- Performance optimization (a menos que haya un threshold acordado)
- Refactors del código de otros agentes
- Features no incluidas en la Task
- Documentación externa al proyecto
- Métricas de monitoring avanzadas (para sprints futuros)

Si surge algo deseable durante la implementación que no está en la tarea, el agente lo documenta en el PR como "sugerencia futura" y el PM crea una tarea para el backlog. No se implementa sin aprobación del CTO.

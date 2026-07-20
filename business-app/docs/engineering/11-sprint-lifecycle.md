# 11 — Sprint Lifecycle

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial

---

## El ciclo de vida de un Sprint

```
SPRINT START
     │
     ▼
SPRINT PLANNING ──── Program Manager + CTO
     │
     ▼
SPRINT EXECUTION ─── Agentes en paralelo
     │
     ├── DAILY REVIEW ────────────── CTO (cada sesión)
     │
     ├── MID-SPRINT ARCHITECTURE REVIEW ── CTO (a mitad de sprint)
     │
     ▼
SPRINT WRAP-UP
     │
     ├── QA SIGN-OFF ────────────── QA Agent
     │
     ├── CTO FINAL REVIEW ────────── CTO
     │
     ├── RELEASE ─────────────────── Release Manager
     │
     └── RETROSPECTIVE ───────────── PM + CTO
```

---

## FASE 1 — Sprint Planning

**Participantes:** Program Manager + CTO Agent

**Duración:** 1 sesión de trabajo

**Objetivos:**
1. Revisar el roadmap y seleccionar las features del sprint
2. PM descompone las features en tareas
3. PM construye el Task Graph con dependencias
4. PM identifica el Critical Path
5. PM identifica riesgos
6. PM envía el plan al CTO para aprobación
7. CTO revisa y aprueba (o ajusta) el plan
8. CTO confirma: "Sprint {N} está planificado y aprobado"

**Salida:**
- Task Graph aprobado con todas las tareas en estado READY o BACKLOG
- Critical Path identificado
- Riesgos documentados
- Sprints pueden comenzar

**Criterio de finalización:**
> El Sprint Planning está completo cuando el CTO aprueba el Task Graph y todas las tareas READY tienen Task Assignment escrita.

---

## FASE 2 — Sprint Execution

**Participantes:** Todos los agentes de dominio

**Duración:** La mayor parte del sprint

**Proceso:**

El CTO despacha las primeras tareas READY simultáneamente. Los agentes trabajan en paralelo. El PM monitorea el estado del Task Graph.

**Bucle de ejecución:**

```
mientras (hay tareas que no están en DONE):
    
    Para cada tarea READY:
      CTO despacha al agente con Task Assignment completa
      
    Para cada tarea IN_PROGRESS:
      Agente trabaja
      Si BLOCKED → agente reporta al CTO → CTO resuelve
      Si COMPLETION → agente reporta al CTO
      
    Para cada tarea IN_REVIEW:
      QA Agent revisa
      CTO hace code review
      Si APPROVED → Release Manager merge → PM actualiza → nuevas READY
      Si CHANGES_REQUESTED → tarea vuelve a IN_PROGRESS
      
    CTO despacha nuevas tareas READY desbloqueadas por merges recientes
```

---

## FASE 3 — Daily Review

**Participantes:** CTO Agent

**Frecuencia:** Al inicio de cada sesión de trabajo

**Duración:** Breve — 5-10 minutos

**Checklist:**

```
ESTADO DEL SPRINT
  [ ] ¿Hay tareas BLOCKED que necesitan atención?
  [ ] ¿Alguna tarea lleva más de 2 sesiones en IN_PROGRESS sin progreso?
  [ ] ¿El Critical Path está en riesgo?
  [ ] ¿Hay tareas recién MERGED que desbloquean otras?

ACCIONES INMEDIATAS
  → Resolver BLOCKEDs urgentes
  → Despachar tareas READY recién desbloqueadas
  → Reformular tareas atascadas
```

---

## FASE 4 — Mid-Sprint Architecture Review

**Participantes:** CTO Agent

**Frecuencia:** A mitad del sprint (o cuando surge una decisión arquitectónica)

**Propósito:** Verificar que la implementación que va tomando forma no está creando deuda arquitectónica no intencional.

**Preguntas que el CTO responde:**

1. ¿Las decisiones de implementación tomadas hasta ahora son coherentes con los ADRs?
2. ¿Algún agente está aproximándose a cruzar un boundary de dominio?
3. ¿Los Domain Events publicados hasta ahora tienen el payload correcto?
4. ¿Hay algo que debería convertirse en un ADR nuevo?

**Si se detecta un problema:** El CTO interviene inmediatamente. Es más barato corregir a mitad del sprint que al final.

---

## FASE 5 — Sprint Wrap-Up

**Participantes:** CTO + QA Agent + Release Manager + PM

### Sub-fase 5a — QA Sign-Off Sprint Completo

El QA Agent hace un pass final sobre todos los PRs del sprint:

```
QA SPRINT SIGN-OFF:
  [ ] Todos los tests del sprint pasan (unit + integration + E2E)
  [ ] No hay regresiones en tests de sprints anteriores
  [ ] Coverage no decreció vs sprint anterior
  [ ] Todos los criterios de aceptación del sprint están cubiertos
```

### Sub-fase 5b — CTO Final Review

El CTO hace una revisión de alto nivel del sprint completo:

```
CTO SPRINT REVIEW:
  [ ] La arquitectura del codebase sigue siendo coherente
  [ ] No hay imports cruzados entre bounded contexts
  [ ] Los Domain Events del sprint son correctos y tienen payload completo para futura ingesta BI
  [ ] La documentación fue actualizada correctamente
  [ ] Definition of Done cumplida para todas las tareas
  [ ] Analytics BC-10 y BI BC-13 no fueron mezclados (están correctamente separados)
  [ ] El Frontend no llama a servicios internos directamente (QA lo verificó)
  [ ] business-app/backend es el único gateway en todos los nuevos endpoints
```

### Sub-fase 5c — Release

El Release Manager ejecuta el Sprint Release según el proceso definido en `10-release-manager.md`.

### Sub-fase 5d — Sprint Review (Demo)

Una vez en staging:
- PM y CTO verifican que las features funcionan según los criterios del sprint
- Se documenta cualquier discrepancia entre lo planificado y lo entregado

---

## FASE 6 — Retrospective

**Participantes:** PM + CTO Agent

**Formato:**

```
QUÉ FUNCIONÓ BIEN:
  → Listar 2-3 cosas que funcionaron bien en el sprint
  → Identificar qué repetir en el próximo sprint

QUÉ NO FUNCIONÓ:
  → Listar 2-3 problemas o fricciones
  → Para cada uno: causa raíz y acción correctiva

AJUSTES AL PROCESO:
  → ¿Hay alguna regla en docs/engineering/ que deba actualizarse?
  → ¿Hay un nuevo riesgo que el proceso no contempla?

ESTIMACIONES vs REALIDAD:
  → ¿Cuántas sesiones tomó el sprint vs estimado?
  → ¿Qué tareas se subestimaron?

PRÓXIMO SPRINT:
  → ¿Qué quedó sin terminar del sprint actual?
  → ¿Qué dependencias nuevas se identificaron?
```

---

## Sprint Metrics

El PM registra estas métricas al finalizar cada sprint:

| Métrica | Cómo se mide |
|---|---|
| Tareas completadas | DONE / planificadas |
| Tareas en tiempo | completadas sin retrasar Critical Path |
| PRs rechazados | veces que un PR tuvo CHANGES_REQUESTED |
| Bloqueantes | cantidad de mensajes BLOCKED en el sprint |
| Regresiones | tests de sprints anteriores que fallaron |
| Hotfixes post-release | bugs encontrados en staging |

---

## Calendario tipo de un Sprint de 2 semanas

```
DÍA 1:    Sprint Planning → Task Graph → CTO Approval → Dispatch inicial
DÍA 2-5:  Implementación paralela → Daily Reviews → Merges continuos
DÍA 6:    Mid-Sprint Architecture Review
DÍA 7-9:  Continuación de implementación → QA reviews
DÍA 10:   Cierre de tareas restantes → QA Sign-Off Sprint
DÍA 11:   CTO Final Review → Release Preparation
DÍA 12:   Staging Deploy → Verificación → Retrospective
DÍA 13:   (buffer para imprevistos o tareas bloqueadas)
DÍA 14:   Producción Deploy (si está autorizado)
```

Esta es una guía — los sprints son adaptables. Lo que no es adaptable: la Definition of Done.

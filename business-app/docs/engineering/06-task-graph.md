# 06 — Task Graph (DAG)

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial

---

## Qué es el Task Graph

El Task Graph es la representación formal del trabajo de un Sprint. Es un DAG (Directed Acyclic Graph) donde cada nodo es una tarea y cada arista dirigida representa una dependencia: "la tarea B no puede comenzar hasta que la tarea A esté MERGED."

El Task Graph es producido por el Program Manager y aprobado por el CTO Agent antes de que comience cualquier implementación.

---

## Estructura de una Task

Cada tarea en el Task Graph tiene el siguiente formato canónico:

```yaml
task:
  id:           "S{SPRINT}-T{NNN}"        # ej. S04-T001
  title:        string                    # título descriptivo
  description:  string                    # qué debe hacer exactamente

  # Asignación
  department:   string                    # nombre del departamento
  agent:        string                    # agente responsable
  owner:        string                    # igual que agent en v1
  
  # Planificación
  sprint:       integer                   # número de sprint
  priority:     CRITICAL|HIGH|MEDIUM|LOW
  estimatedSessions: integer              # sesiones de trabajo estimadas
  
  # Dependencias
  dependsOn:    string[]                  # lista de task IDs que deben estar MERGED
  parallelWith: string[]                  # tareas que pueden correr simultáneamente
  blocks:       string[]                  # tareas que esta tarea desbloquea
  
  # Alcance
  affectedFiles:
    modifies:   string[]                  # archivos que el agente modificará
    creates:    string[]                  # archivos nuevos que creará
    reads:      string[]                  # archivos que consulta pero no modifica
  
  affectedEvents:
    publishes:  string[]                  # Domain Events nuevos que publica
    consumes:   string[]                  # Domain Events que este trabajo escucha
    modifies:   string[]                  # Domain Events cuyo payload cambia
  
  # Documentación
  referenceDocuments:
    - path:     string                    # ruta relativa a docs/
      reason:   string                    # por qué es relevante
  
  # Resultado
  acceptanceCriteria:
    - description: string                 # criterio verificable
      type: FUNCTIONAL|EVENT|TEST|DOC
  
  deliverables:
    branch:     string                    # nombre de rama: feature/{dept}/{desc}
    prTitle:    string                    # título del PR
    tests:      string[]                  # tests mínimos que se esperan
    documentation: string[]              # documentos que se deben actualizar
  
  # Estado
  status:       BACKLOG|READY|IN_PROGRESS|BLOCKED|IN_REVIEW|ACCEPTED|MERGED|DONE
  riskLevel:    HIGH|MEDIUM|LOW
  riskNotes:    string?
  
  # Tracking
  blockedBy:    string?                   # si BLOCKED: qué lo bloquea
  completedAt:  datetime?
  mergedAt:     datetime?
```

---

## Ejemplo de Task Graph completo — Sprint 4

```
SPRINT 4 — Work Domain + Rate Engine

TASK GRAPH:

S04-T001 [WorkAgent] "Contract entity + repository + CRUD endpoints"
  priority: HIGH
  dependsOn: [S02-T003]  ← Customer domain debe existir
  parallelWith: [S04-T004]
  blocks: [S04-T002, S04-T003]
  estimatedSessions: 2
  acceptanceCriteria:
    - "POST /contracts retorna 201 con el Contract creado"
    - "GET /contracts filtra por businessId del JWT"
    - "Un Contract inactivo no puede recibir WorkEvents"
  deliverables:
    branch: "feature/work/contract-crud"
    tests: ["contract.service.spec.ts", "contract.controller.spec.ts"]
    documentation: ["docs/domain/02-ubiquitous-language.md"]

S04-T002 [WorkAgent] "Rate entity + Rate validation rules"
  priority: HIGH
  dependsOn: [S04-T001]
  parallelWith: [S04-T004]
  blocks: [S04-T003]
  estimatedSessions: 1

S04-T003 [WorkAgent] "WorkEvent CRUD + Shift Validation Rules (SV-001 a SV-007)"
  priority: HIGH
  dependsOn: [S04-T001, S04-T002]
  parallelWith: [S04-T004]  ← Rate Engine puede desarrollarse en paralelo
  blocks: [S04-T005]
  estimatedSessions: 2

S04-T004 [RateEngineAgent] "Rate Engine — cálculo de RateResult con segmentación"
  priority: HIGH
  dependsOn: []  ← sin dependencias, puede empezar desde el inicio del sprint
  parallelWith: [S04-T001, S04-T002, S04-T003]
  blocks: [S04-T005]
  estimatedSessions: 3

S04-T005 [WorkAgent] "WorkEvent confirmation: integración con Rate Engine → RateResult"
  priority: CRITICAL  ← en el critical path
  dependsOn: [S04-T003, S04-T004]
  parallelWith: []
  blocks: [S04-T006]
  estimatedSessions: 1
  affectedEvents:
    publishes: ["WorkEventConfirmed"]

S04-T006 [RevenueAgent] "Handler WorkEventConfirmed → RevenueLine en RevenueDraft"
  priority: CRITICAL
  dependsOn: [S04-T005]
  parallelWith: [S04-T007]  ← Analytics puede prepararse
  blocks: [S04-T008]
  estimatedSessions: 2
  affectedEvents:
    consumes: ["WorkEventConfirmed"]

S04-T007 [AnalyticsAgent] "Read Model: WorkEvent projection"
  priority: MEDIUM
  dependsOn: [S04-T003]  ← necesita saber el schema del evento
  parallelWith: [S04-T006]
  blocks: []
  estimatedSessions: 1

S04-T008 [QAAgent] "Tests E2E: WorkEvent confirmation → Revenue flow"
  priority: HIGH
  dependsOn: [S04-T005, S04-T006]
  parallelWith: [S04-T009]
  blocks: []
  estimatedSessions: 1

S04-T009 [DocumentationAgent] "Actualizar docs/ para Sprint 4"
  priority: MEDIUM
  dependsOn: [S04-T005, S04-T006]
  parallelWith: [S04-T008]
  blocks: []
  estimatedSessions: 1

CRITICAL PATH:
  S04-T001 → S04-T002 → S04-T003 → S04-T005 → S04-T006 → S04-T008
  (7 sesiones en el camino crítico)
  
TAREAS PARALELAS:
  S04-T004 // S04-T001 (can run from day 1)
  S04-T007 // S04-T006
  S04-T008 // S04-T009
```

---

## Diagrama ASCII del DAG

```
Sprint 4 — DAG de dependencias:

S04-T004 (RateEngine) ──────────────────────────────────┐
                                                         │
S04-T001 (Contract)                                      │
    │                                                    │
    ├──► S04-T002 (Rate) ──────────────────────────────►│
    │                                                    ▼
    └──► S04-T003 (WorkEvent) ─────────────────────► S04-T005 (Confirm)
              │                                           │
              └──► S04-T007 (Analytics) [paralelo]       │
                                                         ▼
                                                   S04-T006 (Revenue)
                                                         │
                                              ┌──────────┤
                                              ▼          ▼
                                        S04-T008 (QA) S04-T009 (Docs)
```

---

## Estados de una Task

```
BACKLOG
  → Existe pero no está lista (dependencias sin cumplir o baja prioridad)
  → Transición a READY: cuando todas las dependencias están MERGED

READY
  → Todas las dependencias cumplidas, agente asignado, criterios definidos
  → Transición a IN_PROGRESS: CTO despacha al agente

IN_PROGRESS
  → Agente trabajando activamente
  → Transición a BLOCKED: agente no puede continuar
  → Transición a IN_REVIEW: PR abierto, trabajo completo

BLOCKED
  → Agente no puede continuar
  → Requiere intervención del CTO
  → Transición a READY: bloqueante resuelto

IN_REVIEW
  → QA revisando + CTO review
  → Transición a IN_PROGRESS: cambios solicitados
  → Transición a ACCEPTED: QA aprueba + CTO aprueba

ACCEPTED
  → PR aprobado, listo para merge
  → Transición a MERGED: Release Manager ejecuta merge

MERGED
  → Código en rama principal
  → Documentación actualizada
  → Transición a DONE: verificación en staging

DONE ✅
  → Feature verificado en staging
  → Tareas dependientes pasan a READY
```

---

## Naming conventions

| Elemento | Formato | Ejemplo |
|---|---|---|
| Task ID | `S{Sprint}-T{NNN}` | `S04-T012` |
| Branch | `feature/{dept}/{desc}` | `feature/work/workevent-confirmation` |
| PR title | `[S{N}][{DEPT}] {descripción}` | `[S4][WORK] WorkEvent confirmation + Rate Engine` |
| Epic ID | `EPIC-{N}` | `EPIC-4` |
| Feature ID | `FEAT-{EPIC}-{LETRA}` | `FEAT-4-B` |

---

## Reglas del Task Graph

**TG-001:** El Task Graph es un DAG — sin ciclos. Si existe una dependencia circular, es un problema de diseño que el CTO debe resolver antes de iniciar el sprint.

**TG-002:** Toda tarea tiene exactamente un agente asignado. No hay tareas compartidas ni sin dueño.

**TG-003:** Toda Feature tiene al menos una tarea de QAAgent y una de DocumentationAgent.

**TG-004:** Las tareas de QA y Documentation son siempre las últimas en el orden de dependencias para la Feature que cubren.

**TG-005:** La tarea de QAAgent referencia explícitamente los criterios de aceptación de todas las tareas que valida.

**TG-006:** El Program Manager actualiza el status de cada tarea en tiempo real. Un Task Graph desactualizado es un sprint descontrolado.

**TG-007:** Cuando una tarea pasa a MERGED, el PM verifica automáticamente qué tareas en BACKLOG ahora tienen todas sus dependencias cumplidas → las mueve a READY → notifica al CTO para dispatch.

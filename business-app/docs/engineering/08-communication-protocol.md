# 08 — Protocolo de Comunicación

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial

---

## Principio fundamental

```
Los agentes NUNCA se comunican directamente entre sí.
Toda comunicación pasa por el CTO Agent o el Program Manager.
```

Esta regla no es una convención — es una invariante del sistema de orquestación. Un agente que necesita información de otro agente, la solicita al CTO Agent. El CTO Agent decide cómo resolverlo.

---

## Mapa de comunicación permitida

```
PROGRAM MANAGER ←──────────────────────────── CTO AGENT
       │                                           │
       │ (planificación)          (operación y     │
       │                           decisiones)     │
       └──────────────────────────────────────────►│
                                                   │
       ┌───────────── ◄ ────────────────────────── │
       │              CTO → Agentes                │
       │                                           │
       ▼                                           │
  AGENTES DE DOMINIO ──────────────────────────── ►│
  (PlatformAgent, WorkAgent,        Agentes → CTO  │
   RevenueAgent, BillingAgent,                     │
   FinancialAgent, DocumentAgent,                  │
   etc.)                                           │
                                                   │
       ◄──────────────────────────────────────────────
       CTO → QA Agent                              │
                                                   │
  QA AGENT ──────────────────────────────────────►│
                                                   │
       ◄──────────────────────────────────────────────
       CTO → Release Manager                       │
                                                   │
  RELEASE MANAGER ───────────────────────────────►│
```

---

## Tipos de mensaje

### TYPE: TASK_ASSIGNMENT
**De:** CTO Agent → Agente
**Descripción:** El CTO despacha trabajo a un agente.

```
{
  type:           "TASK_ASSIGNMENT"
  taskId:         "S04-T003"
  to:             "WorkAgent"
  from:           "CTOAgent"
  priority:       "HIGH"
  sprint:         4

  context:        string    — estado actual del codebase relevante
  instructions:   string[]  — pasos específicos a seguir
  references:     string[]  — documentos de arquitectura a leer
  criteria:       string[]  — criterios de aceptación
  restrictions:   string[]  — qué no puede tocar
  parallelWith:   string[]  — otras tareas corriendo simultáneamente
  deliverables: {
    branch:        string
    minTests:      string[]
    documentation: string[]
  }
}
```

---

### TYPE: PROGRESS_REPORT
**De:** Agente → CTO Agent
**Descripción:** Actualización periódica de progreso. No urgente.

```
{
  type:     "PROGRESS_REPORT"
  taskId:   "S04-T003"
  from:     "WorkAgent"
  to:       "CTOAgent"
  urgency:  "LOW"

  summary:  string     — qué está hecho, qué falta
  eta:      string     — estimación de cuándo estará listo
  notes:    string?    — algo relevante que el CTO debe saber
}
```

---

### TYPE: BLOCKED
**De:** Agente → CTO Agent
**Descripción:** El agente no puede continuar. Requiere respuesta inmediata.

```
{
  type:      "BLOCKED"
  taskId:    "S04-T006"
  from:      "RevenueAgent"
  to:        "CTOAgent"
  urgency:   "HIGH"

  reason:    string    — descripción exacta del bloqueante
  impact:    string    — qué se retrasa si no se resuelve
  tried:     string[]  — qué intentó el agente antes de escalar
  proposal:  string?   — solución propuesta por el agente
}
```

**Respuesta esperada del CTO:** en la misma sesión de trabajo o en la siguiente.

---

### TYPE: QUESTION
**De:** Agente → CTO Agent
**Descripción:** El agente necesita clarificación sobre cómo implementar algo.

```
{
  type:      "QUESTION"
  taskId:    "S04-T005"
  from:      "WorkAgent"
  to:        "CTOAgent"
  urgency:   "MEDIUM"

  question:  string    — la pregunta específica
  context:   string    — contexto para entender la pregunta
  options:   string[]  — opciones que el agente considera
  preferred: string?   — opción que el agente prefiere y por qué
}
```

---

### TYPE: ESCALATION
**De:** Agente → CTO Agent
**Descripción:** El agente encontró algo que contradice la arquitectura o requiere una decisión de diseño que el agente no puede tomar.

```
{
  type:        "ESCALATION"
  taskId:      "S04-T004"
  from:        "RateEngineAgent"
  to:          "CTOAgent"
  urgency:     "HIGH"

  situation:   string    — descripción exacta de la contradicción o dilema
  docReference: string   — qué documento de arquitectura está involucrado
  impact:      string    — cómo afecta esto a la implementación
  risk:        string    — qué pasa si se toma la decisión equivocada
  proposal:    string?   — propuesta del agente
}
```

---

### TYPE: COMPLETION
**De:** Agente → CTO Agent
**Descripción:** El agente completó la tarea. PR abierto. Listo para review.

```
{
  type:      "COMPLETION"
  taskId:    "S04-T003"
  from:      "WorkAgent"
  to:        "CTOAgent"
  urgency:   "LOW"

  prBranch:  string    — rama del PR
  prTitle:   string    — título del PR
  summary:   string    — qué se implementó
  tests:     string    — resumen del estado de tests
  docsUpdated: string[] — documentos actualizados
  selfChecklist: boolean — el agente completó su checklist self-review
}
```

---

### TYPE: QA_RESULT
**De:** QA Agent → CTO Agent
**Descripción:** Resultado de la revisión de QA.

```
{
  type:      "QA_RESULT"
  taskId:    "S04-T003"
  from:      "QAAgent"
  to:        "CTOAgent"
  urgency:   "MEDIUM"

  result:    "APPROVED" | "CHANGES_REQUESTED"
  findings:  string[]  — problemas encontrados (vacío si APPROVED)
  tests:     {
    unit:         { passed: integer, failed: integer }
    integration:  { passed: integer, failed: integer }
    e2e:          { passed: integer, failed: integer }
  }
  notes:     string?
}
```

---

### TYPE: PLAN_SUBMISSION
**De:** Program Manager → CTO Agent
**Descripción:** El PM envía el Task Graph de un Sprint para aprobación.

```
{
  type:         "PLAN_SUBMISSION"
  from:         "ProgramManager"
  to:           "CTOAgent"
  sprint:       integer
  urgency:      "HIGH"

  epicsCovered: string[]
  taskGraph:    Task[]    — lista completa de tasks con dependencias
  criticalPath: string[]  — secuencia de task IDs en el critical path
  risks:        string[]  — riesgos identificados
  questions:    string[]  — preguntas para el CTO antes de aprobar
}
```

---

### TYPE: RELEASE_REQUEST
**De:** CTO Agent → Release Manager
**Descripción:** El CTO autoriza un release.

```
{
  type:     "RELEASE_REQUEST"
  from:     "CTOAgent"
  to:       "ReleaseManager"
  urgency:  "MEDIUM"

  sprint:   integer
  tasks:    string[]   — IDs de tasks incluidas en este release
  version:  string     — versión semántica propuesta
  target:   "staging" | "production"
  notes:    string?
}
```

---

## Tiempos de respuesta esperados

| Tipo de mensaje | Urgencia | Respuesta esperada en |
|---|---|---|
| BLOCKED | HIGH | Misma sesión o siguiente |
| ESCALATION | HIGH | Misma sesión o siguiente |
| QUESTION | MEDIUM | Siguiente sesión |
| COMPLETION | LOW | Siguiente 1-2 sesiones |
| PROGRESS_REPORT | LOW | Sin respuesta requerida (solo registro) |
| PLAN_SUBMISSION | HIGH | Misma sesión |

---

## Plantilla de respuesta del CTO a un agente

```
RESPUESTA A TASK-{ID}
De: CTOAgent → {Agente}

DECISIÓN: {UNBLOCKED | CLARIFIED | REFORMULATED | APPROVED | CHANGES_REQUESTED}

ACCIÓN:
  {descripción de lo que debe hacer el agente ahora}

RAZÓN:
  {justificación técnica o referencia a ADR}

RESTRICCIONES ADICIONALES (si aplica):
  {restricciones específicas que el agente debe considerar}

PRÓXIMO CHECK-IN: {cuándo el agente debe reportar de nuevo}
```

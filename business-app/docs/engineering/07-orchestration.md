# 07 — Modelo de Orquestación Multi-Agente

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial

---

## Principio de diseño

El modelo de orquestación permite que múltiples agentes trabajen simultáneamente en diferentes dominios sin conflictos, manteniendo la coherencia arquitectónica del sistema.

La clave es que los **dominios son unidades de trabajo independientes**. Mientras no haya dependencias entre dos tareas, los agentes que las ejecutan pueden trabajar en paralelo sin coordinación entre sí.

---

## El CTO Agent como orquestador central

```
                    ┌──────────────────────────────────┐
                    │          CTO AGENT               │
                    │                                  │
                    │  ┌──────────────────────────┐    │
                    │  │   Feature Queue           │    │
                    │  │   (backlog de features)   │    │
                    │  └──────────────────────────┘    │
                    │                                  │
                    │  ┌──────────────────────────┐    │
                    │  │   Task Graph              │    │
                    │  │   (DAG de dependencias)   │    │
                    │  └──────────────────────────┘    │
                    │                                  │
                    │  ┌──────────────────────────┐    │
                    │  │   Agent Registry          │    │
                    │  │   (quién está disponible) │    │
                    │  └──────────────────────────┘    │
                    └──────────────┬───────────────────┘
                                   │ dispatch
              ┌────────────────────┼──────────────────────┐
              │                    │                       │
              ▼                    ▼                       ▼
     [WorkAgent]           [CalendarAgent]       [AnalyticsAgent]
     TASK-012              TASK-013              TASK-014
     IN_PROGRESS           IN_PROGRESS           IN_PROGRESS
              │                    │                       │
              └────────────────────┴───────────────────────┘
                                   │
                              [QAAgent]
                              (reviews each)
                                   │
                              [CTOAgent]
                              (final approval)
                                   │
                                 MERGE
```

---

## El Task Graph

Toda feature se representa como un DAG (Directed Acyclic Graph) de tareas. Las tareas sin dependencias se pueden ejecutar en paralelo.

**Formato del Task Graph:**

```
FEATURE: "Implementar Shift Work a facturación completa"

GRAPH:
  TASK-001 (WorkAgent: Contract + Rate CRUD)
    └──► TASK-002 (WorkAgent: WorkEvent CRUD)
           └──► TASK-003 (WorkAgent: WorkEvent confirmation + Rate Engine)
                  └──► TASK-004 (RevenueAgent: BillingPeriod + RevenueDraft)
                  └──► TASK-005 (AnalyticsAgent: Revenue Read Models)  ─────────────────────┐
                  └──► TASK-006 (RevenueAgent: BillingPeriodClosed event)                   │
                         └──► TASK-007 (BillingAgent: Invoice Draft creation)               │
                         └──► TASK-008 (AnalyticsAgent: BillingPeriod Read Model)           │
                                └──► TASK-009 (BillingAgent: Invoice approval + send)       │
                                       └──► TASK-010 (DocumentAgent: PDF generation)        │
                                       └──► TASK-011 (CommunicationsAgent: email delivery)◄─┘
                                              └──► TASK-012 (QAAgent: E2E test)
                                              └──► TASK-013 (DocumentationAgent: docs update)

PARALELISMO:
  TASK-005 // TASK-004 // TASK-006  ← pueden correr simultáneamente (misma dependencia)
  TASK-008 // TASK-007              ← pueden correr simultáneamente
  TASK-010 // TASK-011              ← pueden correr simultáneamente (misma dependencia)
  TASK-012 // TASK-013              ← pueden correr simultáneamente (QA y Docs en paralelo)
```

---

## Reglas de paralelismo

**PUEDEN ejecutarse en paralelo:**
- Tareas en el mismo nivel del DAG (misma dependencia, sin dependencia entre ellas)
- Tareas de dominios completamente independientes (Calendar y Revenue no se tocan)
- Backend y Frontend para la misma feature (si el contrato de API está definido)
- QA y Documentation para features ya completadas

**NO pueden ejecutarse en paralelo:**
- Tareas con dependencias directas (B depende de A — A primero)
- Tareas que modifican el mismo archivo o módulo
- Múltiples tareas asignadas al mismo agente (un agente, una tarea a la vez)
- Code Review y nueva feature del mismo dominio (hasta que el review termine)

---

## Capacidad del sistema

El sistema puede ejecutar:
- N agentes de dominio en paralelo (tantos como dominios independientes haya)
- 1 QAAgent revisando múltiples PRs en cola
- 1 CTOAgent coordinando todo (el cuello de botella es el review, no el desarrollo)
- 1 DocumentationAgent procesando en paralelo con QA

**Límite práctico:** En cualquier momento, el número de agentes activos está limitado por el número de tareas sin dependencias pendientes. En un sprint activo, esto puede ser entre 3 y 8 agentes simultáneos.

---

## Ciclo de orquestación

### Ciclo completo de un Sprint

```
INICIO DEL SPRINT
  │
  ▼
CTO Agent: Lee Sprint backlog + dependencias
CTO Agent: Construye Task Graph para el Sprint
CTO Agent: Identifica primer conjunto de tareas READY (sin dependencias)
  │
  ▼
LANZAMIENTO PARALELO
  │ Dispatch simultáneo a todos los agentes con tareas READY
  │
  ├──► WorkAgent     (TASK-001)
  ├──► CalendarAgent (TASK-013)
  └──► FrontendAgent (TASK-020, si el backend ya tiene API definida)
  │
  ▼
MONITOREO CONTINUO
  │ CTO Agent monitorea el estado de cada tarea
  │
  │ Cuando una tarea pasa a COMPLETION:
  │   1. CTO Agent hace code review
  │   2. QAAgent revisa y testea
  │   3. Si APPROVED: merge + desbloquear tareas dependientes
  │   4. Dispatch inmediato a los agentes de las tareas desbloqueadas
  │
  │ Cuando una tarea reporta BLOCKED:
  │   1. CTO Agent interviene
  │   2. Resuelve el bloqueante o reformula la tarea
  │   3. Reactiva el agente
  │
  ▼
FIN DEL SPRINT
  Todo el sprint está DONE cuando:
  - Todas las tareas del sprint están MERGED
  - QA Agent dio sign-off al sprint completo
  - Documentation Agent actualizó docs/
  - Definition of Done verificada por CTO Agent
```

---

## Modelo de disponibilidad de agentes

Los agentes no tienen estado entre sesiones. Cada vez que el CTO Agent asigna una tarea a un agente, el agente recibe:

1. La Task Assignment completa (qué hacer, criterios de aceptación)
2. Los documentos de arquitectura relevantes
3. El contexto de lo que ya fue implementado por otros agentes (si es relevante)

El agente no necesita recordar conversaciones anteriores — toda la información está en la Task Assignment y en el código del repositorio.

**Esta es la ventaja del modelo:** Cualquier agente puede tomar cualquier tarea de su dominio en cualquier momento, porque el contexto está en la arquitectura documentada y en el código.

---

## Gestión de conflictos entre agentes

**Conflicto de archivo:** Dos agentes modifican el mismo archivo.
- Solución: El CTO Agent asigna tareas de forma que nunca haya dos agentes en el mismo módulo simultáneamente. Si es inevitable, se secuencian las tareas.

**Conflicto de contrato:** Dos agentes necesitan acordar el schema de un Domain Event.
- Solución: El CTO Agent define el contrato del evento en un ADR antes de que cualquier agente comience. Ambos agentes reciben el contrato como parte de la Task Assignment.

**Conflicto de decisión:** Un agente toma una decisión de implementación que contradice lo que otro agente está haciendo.
- Solución: Las decisiones de implementación que afectan a otros agentes siempre pasan por el CTO Agent. Nunca directamente entre agentes.

---

## Árbol de decisión para el CTO Agent

Cuando llega una tarea, el CTO Agent sigue este árbol:

```
¿La tarea está claramente definida en la arquitectura?
  SÍ → ¿Qué agente la implementa? → Dispatch
  NO → ¿Necesita decisión arquitectónica? → Crear ADR primero → luego Dispatch

¿Existen dependencias sin cumplir?
  SÍ → Poner en BACKLOG hasta que las dependencias estén MERGED
  NO → Dispatch inmediato

¿Hay agentes disponibles para las dependencias paralelas?
  SÍ → Dispatch paralelo
  NO → Queue para el próximo ciclo

¿El PR del agente pasa el checklist de aprobación?
  SÍ → Aprobar merge → desbloquear dependientes
  NO → Devolver al agente con comentarios específicos
```

---

## Métricas del modelo de orquestación

Para saber si el modelo está funcionando bien, el CTO Agent monitorea:

| Métrica | Target | Señal de alarma |
|---|---|---|
| Tiempo promedio READY → MERGED | < 2 sesiones | > 5 sesiones |
| Tareas en BLOCKED simultáneamente | 0-1 | > 3 |
| PRs rechazados (segunda vuelta) | < 20% | > 40% |
| Tests que fallan en merge | 0 | > 0 |
| Tareas que cruzan boundaries de dominio | 0 | > 0 |
| Sprints completados en tiempo | > 80% | < 60% |

---

## El futuro: automatización completa

El modelo está diseñado para que en el futuro, el proceso de orquestación pueda ser automatizado:

1. Un sistema lee el Feature Backlog
2. Genera automáticamente el Task Graph basado en dependencias de la arquitectura
3. Despliega agentes automáticamente cuando las dependencias se cumplen
4. Ejecuta QA automáticamente
5. Propone merges al CTO Agent para aprobación final

El CTO Agent mantiene siempre el veto final sobre cualquier merge. La automatización acelera el dispatch — no elimina la revisión humana/experta de los contratos arquitectónicos.

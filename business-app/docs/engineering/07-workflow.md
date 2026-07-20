# 07 — Workflow Completo

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial

---

## El flujo canónico

```
FEATURE REQUEST
       │
       ▼
┌──────────────────────────────────────────────┐
│            PROGRAM MANAGER                    │
│                                              │
│  1. Analiza la feature                       │
│  2. Lee documentos de arquitectura           │
│  3. Descompone en Epic → Features → Tasks   │
│  4. Construye el Task Graph (DAG)            │
│  5. Identifica Critical Path                 │
│  6. Envía plan al CTO para aprobación       │
└──────────────────────┬───────────────────────┘
                       │ Plan + Task Graph
                       ▼
┌──────────────────────────────────────────────┐
│              CTO AGENT — PLAN REVIEW          │
│                                              │
│  1. Verifica coherencia con arquitectura     │
│  2. Verifica asignaciones de agentes         │
│  3. Verifica que no hay riesgos ocultos      │
│  ✅ APRUEBA el plan                          │
│  o ❌ DEVUELVE al PM con ajustes             │
└──────────────────────┬───────────────────────┘
                       │ Plan aprobado
                       ▼
┌──────────────────────────────────────────────┐
│         CTO AGENT — TASK DISPATCH             │
│                                              │
│  Despacha simultáneamente todas las          │
│  tareas READY (sin dependencias activas)     │
│                                              │
│  Task Assignment completa para cada agente   │
└──────────────────────┬───────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
   [WorkAgent]  [CalendarAgent]  [AnalyticsAgent]
   IN_PROGRESS  IN_PROGRESS      IN_PROGRESS
          │            │            │
          │            │            │
          ▼            ▼            ▼
   COMPLETION   COMPLETION      COMPLETION
   (PR abierto) (PR abierto)   (PR abierto)
          │
          ▼
┌──────────────────────────────────────────────┐
│              QA AGENT                         │
│                                              │
│  1. Lee criterios de aceptación              │
│  2. Verifica tests pasan                     │
│  3. Verifica comportamientos funcionales     │
│  4. Verifica no hay regresiones              │
│  ✅ APRUEBA el PR                            │
│  o ❌ DEVUELVE con comentarios               │
└──────────────────────┬───────────────────────┘
                       │ QA aprueba
                       ▼
┌──────────────────────────────────────────────┐
│         CTO AGENT — CODE REVIEW               │
│                                              │
│  1. Verifica domain isolation                │
│  2. Verifica event contracts                 │
│  3. Verifica business rules                  │
│  4. Verifica documentación actualizada       │
│  ✅ APRUEBA → ACCEPTED                       │
│  o ❌ DEVUELVE al agente con comentarios     │
└──────────────────────┬───────────────────────┘
                       │ CTO aprueba
                       ▼
┌──────────────────────────────────────────────┐
│            RELEASE MANAGER                    │
│                                              │
│  1. Integra el PR en release branch         │
│  2. Verifica que CI/CD pasa                 │
│  3. Genera release notes                    │
│  4. Ejecuta deploy a staging               │
│  5. Verifica en staging                     │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
                    DEPLOYED ✅
                       │
                       ▼
              PM actualiza Task Graph
              → Tareas dependientes → READY
              → CTO despacha siguientes tareas
```

---

## Flujos secundarios

### Cuando un agente está BLOCKED

```
Agente detecta bloqueante
       │
       │ BLOCKED message → CTO Agent
       │ {razón, impacto, propuesta de resolución}
       ▼
CTO Agent analiza el bloqueante
       │
       ├── [problema técnico solucionable] → CTO toma decisión → Agente continúa
       │
       ├── [dependencia faltante] → CTO escala a PM → PM actualiza secuencia
       │
       ├── [decisión arquitectónica] → CTO crea ADR → docs actualizados → Agente continúa
       │
       └── [tarea mal definida] → CTO reformula Task → reasigna
```

### Cuando QA rechaza un PR

```
QA Agent: CHANGES REQUESTED
       │
       │ Comentarios específicos → CTO Agent
       ▼
CTO Agent → comunica al agente original
       │
Agente: IN_PROGRESS (mismo PR, no nuevo)
       │
       ▼
Agente corrige → PR actualizado
       │
       ▼
QA Agent revisa nuevamente
```

### Cuando el CTO rechaza un PR (2do ciclo)

Si el PR es rechazado dos veces, el CTO Agent detiene el proceso y:
1. Analiza si la tarea estaba bien definida
2. Si el problema es de definición: reformula la Task y la reasigna
3. Si el problema es de implementación: escala al PM para agregar tiempo al sprint

---

## El flujo de un hotfix

```
Bug crítico detectado en producción
       │
       ▼
CTO Agent: HOTFIX declared
       │
       │ → PM: crea TASK urgente en el sprint actual
       │ → Agente responsable: recibe tarea CRITICAL
       ▼
Agente implementa fix (rama hotfix/descripción)
       │
       ▼
QA Agent: revisión acelerada (criterios mínimos)
       │
       ▼
CTO Agent: review acelerado
       │
       ▼
Release Manager: deploy inmediato a producción
       │
       ▼
Post-mortem: PM agrega tarea de regresión test al siguiente sprint
```

---

## Reglas del workflow

**WF-001:** Ninguna tarea se inicia sin Task Assignment del CTO Agent.

**WF-002:** Ningún PR se abre sin haber completado al menos el checklist de self-review del agente.

**WF-003:** QA siempre revisa antes que el CTO. El CTO no revisa código que QA no ha aprobado.

**WF-004:** El PM actualiza el Task Graph inmediatamente cuando el CTO informa de un cambio de estado.

**WF-005:** Si una tarea estuvo en IN_PROGRESS por más de 3 sesiones sin progreso reportado, el CTO investiga y reformula si es necesario.

**WF-006:** Los hotfixes bypasean el Task Graph del sprint pero no bypasean QA ni el CTO review.

**WF-007:** Toda comunicación de un agente al resto del sistema pasa por el CTO Agent. Los agentes nunca se comunican entre sí directamente.

# 04 — Workflow y Ciclo de Vida de Tareas

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial

---

## El flujo completo de un Feature Request

```
FEATURE REQUEST
  │
  │  Llega como: descripción de feature, bug report,
  │  corrección de arquitectura, o deuda técnica
  │
  ▼
┌─────────────────────────────────────────────────────┐
│                  CTO AGENT                           │
│                                                      │
│  1. Lee los documentos de arquitectura relevantes    │
│  2. Determina qué dominios están involucrados        │
│  3. Verifica que no contradice decisiones existentes │
│  4. Descompone en tareas por agente                  │
│  5. Determina dependencias y paralelismo             │
│  6. Escribe Task Assignments para cada agente        │
└───────────────────┬─────────────────────────────────┘
                    │
                    │ Task Assignments (paralelos donde es posible)
         ┌──────────┼──────────────┐
         │          │              │
         ▼          ▼              ▼
    [WorkAgent] [BillingAgent] [AnalyticsAgent]  ← ejecución paralela
         │          │              │
         │          │              │
         ▼          ▼              ▼
┌─────────────────────────────────────────────────────┐
│                  QA AGENT                            │
│                                                      │
│  1. Revisa criterios de aceptación                   │
│  2. Escribe o verifica tests                         │
│  3. Ejecuta test suite                               │
│  4. Reporta resultado: APPROVED o REJECTED           │
└───────────────────┬─────────────────────────────────┘
                    │ QA APPROVED
                    ▼
┌─────────────────────────────────────────────────────┐
│               CTO AGENT — CODE REVIEW                │
│                                                      │
│  1. Verifica domain isolation                        │
│  2. Verifica event contracts                         │
│  3. Verifica business rules implementadas            │
│  4. Verifica documentación actualizada               │
└───────────────────┬─────────────────────────────────┘
                    │ APPROVED
                    ▼
┌─────────────────────────────────────────────────────┐
│           DOCUMENTATION AGENT                        │
│                                                      │
│  1. Actualiza docs/ si no fue actualizada            │
│  2. Crea/actualiza ADR si hay decisión nueva         │
│  3. Actualiza CHANGELOG                              │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
                  MERGE
                    │
                    ▼
                  DEPLOY (según pipeline de Infrastructure Engineering)
                    │
                    ▼
                  DONE ✅
```

---

## Ciclo de vida de una Tarea

### Estados

```
BACKLOG
  │ La tarea existe pero no está lista para ser trabajada.
  │ Puede tener dependencias sin cumplir o simplemente
  │ no es prioridad del sprint actual.
  │
  │ [dependencias cumplidas + prioridad asignada]
  ▼
READY
  │ La tarea tiene todo lo necesario para comenzar:
  │ - Documentos de arquitectura identificados
  │ - Criterios de aceptación definidos
  │ - Dependencias completadas
  │ - Agente asignado
  │
  │ [agente comienza el trabajo]
  ▼
IN_PROGRESS
  │ El agente está trabajando activamente.
  │ Si encuentra un problema que no puede resolver:
  │   → BLOCKED
  │ Si completa el trabajo:
  │   → IN_REVIEW
  │
  ├──── [bloqueante encontrado] ───────────────────────► BLOCKED
  │                                                        │
  │                                                  CTO Agent interviene
  │                                                        │
  │                                              [resuelto] ◄──────────────┘
  │
  │ [trabajo completado, PR abierto]
  ▼
IN_REVIEW
  │ El PR está abierto y en revisión por el CTO Agent.
  │ QA está corriendo tests.
  │ Si QA falla:
  │   → IN_PROGRESS (agente corrige)
  │ Si QA pasa y CTO aprueba:
  │   → ACCEPTED
  │
  ├──── [QA falla o CTO rechaza] ─────────────────────────► IN_PROGRESS
  │
  │ [QA aprueba + CTO aprueba]
  ▼
ACCEPTED
  │ La tarea está completamente revisada y aprobada.
  │ Lista para merge.
  │
  │ [merge ejecutado]
  ▼
MERGED
  │ El código está en la rama principal.
  │ Documentación actualizada.
  │
  │ [deploy automático o manual según el pipeline]
  ▼
RELEASED
  │ El feature está en el environment objetivo (staging o producción).
  │ Verificación final en el environment real.
  │
  │ [verificación OK]
  ▼
DONE ✅
  El feature está completo y funcionando en producción.
```

### Transiciones especiales

**BLOCKED:**
- Un agente declara BLOCKED cuando no puede avanzar por una razón fuera de su control
- Debe incluir: razón del bloqueo, qué necesita para desbloquearse, impacto en el timeline
- El CTO Agent responde en el mismo ciclo de trabajo
- Un BLOCKED que dura más de una sesión indica un problema de planificación

**REJECTED (por CTO):**
- El CTO devuelve la tarea a IN_PROGRESS con comentarios específicos
- El agente NO abre un nuevo PR — actualiza el PR existente
- Máximo 2 ciclos de revisión para un mismo PR — si hay un tercer rechazo, el CTO Agent reformula la tarea

---

## Task Assignment — Estructura formal

Cuando el CTO Agent asigna una tarea, el formato es:

```
TASK-{ID} — {Título descriptivo}
Agente: {NombreDelAgente}
Estado: READY
Sprint: {número}

CONTEXTO:
  Breve descripción de qué existe hoy y qué debe cambiar.
  Incluye referencias a los ADRs o documentos relevantes.

QUÉ HACER:
  1. [acción específica]
  2. [acción específica]
  3. ...

DOCUMENTOS DE REFERENCIA:
  - docs/domain/{dominio}/{archivo}.md — [por qué es relevante]
  - docs/decisions/ADR-{N}.md — [decisión que aplica]

CRITERIOS DE ACEPTACIÓN:
  - [ ] El endpoint {X} retorna {Y} cuando {Z}
  - [ ] El evento {E} se publica con el payload {P}
  - [ ] Los tests pasan
  - [ ] La documentación fue actualizada

RESTRICCIONES:
  - No modifica {módulo} — es propiedad de {OtroAgente}
  - No cambia el schema de {evento} — fue decidido en ADR-{N}

DEPENDENCIAS:
  - TASK-{ID anterior} debe estar MERGED antes de comenzar
  - Puede correr en paralelo con: TASK-{ID}, TASK-{ID}

ENTREGA ESPERADA:
  - PR en rama {feature/nombre-descriptivo}
  - Tests unitarios para {componente}
  - Documentación actualizada en {archivo}
```

---

## Pull Request — Estructura formal

Todo PR debe incluir:

```
## Qué hace este PR
Descripción concisa de los cambios en lenguaje de negocio.
¿Qué feature o comportamiento implementa?

## Dominio(s) afectado(s)
- Work Domain: [qué cambió]
- Revenue Domain: [qué cambió]

## Domain Events nuevos o modificados
- `WorkEventConfirmed` — payload actualizado con campo X

## Decisiones tomadas durante la implementación
Cualquier decisión que no estaba en los documentos de arquitectura.
Si es relevante, referencia al ADR creado.

## Cómo probar
1. [paso]
2. [paso]

## Checklist
- [ ] Tests unitarios pasan
- [ ] Tests de integración pasan
- [ ] No cruza boundaries de dominio
- [ ] Documentación actualizada
- [ ] Sin secrets en el código
```

---

## Reglas de branching

| Tipo | Nombre de rama | Ejemplo |
|---|---|---|
| Feature nueva | `feature/{dominio}/{descripción}` | `feature/work/workevent-confirmation` |
| Bug fix | `fix/{dominio}/{descripción}` | `fix/billing/invoice-amount-calculation` |
| Refactor | `refactor/{dominio}/{descripción}` | `refactor/platform/auth-refresh-rotation` |
| Hotfix | `hotfix/{descripción}` | `hotfix/security-token-expiry` |
| Documentación | `docs/{descripción}` | `docs/adr-011-calendar-events` |
| Infrastructure | `infra/{descripción}` | `infra/mongodb-index-optimization` |

**Regla:** Nunca trabajar directamente en `main`. Siempre en ramas.

**Regla:** Un PR = una tarea. Si el trabajo crece y afecta múltiples dominios, se divide en PRs separados.

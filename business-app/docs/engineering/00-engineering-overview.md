# 00 — Engineering Overview

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial — Sprint 0

---

## Declaración

La arquitectura conceptual del ERP está cerrada (ADR-001 a ADR-010). Este documento inaugura la **fase de ingeniería**: el período en que la arquitectura se transforma en software ejecutable mediante orquestación de agentes especializados.

---

## La fábrica de software

El Engineering Organization es la fábrica que construye el ERP. Cada pieza de la fábrica tiene una responsabilidad exacta:

```
┌──────────────────────────────────────────────────────────────────────┐
│                   ENGINEERING ORGANIZATION                            │
│                                                                      │
│  Feature Request                                                     │
│       ↓                                                              │
│  PROGRAM MANAGER ──── construye el Task Graph (DAG)                 │
│       ↓                                                              │
│  CTO AGENT ──────── aprueba el plan y el código                     │
│       ↓                                                              │
│  AGENTES ESPECIALIZADOS ─── implementan en paralelo                 │
│    PlatformAgent · WorkAgent · RevenueAgent · BillingAgent          │
│    CalendarAgent · FinancialAgent · AccountingAgent                  │
│    DocumentAgent · CommunicationsAgent · AnalyticsAgent             │
│    IntegrationAgent · FrontendAgent                                  │
│       ↓                                                              │
│  QA AGENT ───────── verifica calidad y criterios de aceptación      │
│       ↓                                                              │
│  CTO AGENT ───────── aprueba el merge                               │
│       ↓                                                              │
│  RELEASE MANAGER ─── integra, versiona, despliega                   │
│       ↓                                                              │
│  PRODUCCIÓN ✅                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Roles principales

| Rol | Cantidad | Responsabilidad central |
|---|---|---|
| **Program Manager** | 1 | Convierte roadmap en Task Graph. Planifica. Nunca escribe código. |
| **CTO Agent** | 1 | Aprueba planes, código y merges. Resuelve conflictos técnicos. |
| **Agentes de dominio** | 12 | Implementan código dentro de su bounded context. Nada fuera. |
| **QA Agent** | 1 | Verifica calidad. Nada se aprueba sin su sign-off. |
| **Release Manager** | 1 | Integra, versiona, despliega, gestiona rollbacks. |

---

## Principio de comunicación

```
Los agentes NUNCA hablan entre sí directamente.
Toda comunicación pasa por el Program Manager o el CTO Agent.

Agente → CTO Agent → (si es planificación) → Program Manager
Agente → CTO Agent → (si es decisión técnica) → resuelto por CTO
```

---

## Principio de ownership

```
Cada dominio de la arquitectura tiene exactamente un agente responsable.
Un agente solo modifica archivos dentro de su bounded context.
Cruzar ese límite es un error de diseño, no una solución.
```

---

## Índice completo de documentos

| Archivo | Contenido |
|---|---|
| `00-engineering-overview.md` | Este documento — visión general |
| `01-organization.md` | Estructura organizacional y departamentos (misión, ownership, events) |
| `02-departments.md` | Definición detallada de cada departamento |
| `03-agents.md` | Catálogo de todos los agentes especializados |
| `04-program-manager.md` | Program Manager — planificación y Task Graph |
| `05-cto-agent.md` | CTO Agent — coordinación y aprobación técnica |
| `06-task-graph.md` | Modelo formal del Task Graph (DAG) |
| `07-workflow.md` | Flujo completo Feature Request → Deploy |
| `08-communication-protocol.md` | Protocolo de comunicación entre roles |
| `09-qa.md` | Proceso de QA — criterios, flujo, responsabilidades |
| `10-release-manager.md` | Release Manager — integración, versioning, deploy |
| `11-sprint-lifecycle.md` | Ciclo de vida de un Sprint |
| `12-definition-of-done.md` | Definition of Done oficial |
| `13-checklists.md` | Todos los checklists del proceso |
| `06-roadmap.md` | Roadmap de implementación — 15+ Sprints |

---

## Estado actual

| Sprint | Tema | Estado |
|---|---|---|
| Sprint 0 | Engineering Platform | 🔄 En curso — este documento |
| Sprint 1 | Platform Foundation | 🔄 Parcialmente implementado |
| Sprint 2-15 | Dominios del ERP | ⏳ Pendientes |

---

## La promesa de esta organización

> Cuando termine el Sprint 0, cualquier Feature Request puede transformarse en código entregado a producción siguiendo el mismo proceso, con los mismos agentes, sin redefinir nada.

El proceso es la infraestructura más importante que construimos. El código que sigue es consecuencia de tener el proceso correcto.

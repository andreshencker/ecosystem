# Engineering Organization — Invoice App ERP

**Versión:** 2.0 | **Fecha:** 2026-07-06 | **Estado:** Sprint 0 — Oficial

---

## La fábrica de software

```
Feature Request → Program Manager → CTO Agent → Agentes → QA → CTO → Release Manager → Producción
```

Los agentes nunca se comunican directamente entre sí. Todo pasa por el CTO Agent o el Program Manager.

---

## Documentación canónica

| # | Archivo | Contenido |
|---|---|---|
| 00 | [00-engineering-overview.md](./00-engineering-overview.md) | Visión general de la organización |
| 01 | [01-organization.md](./01-organization.md) | Estructura organizacional y árbol de roles |
| 02 | [02-departments.md](./02-departments.md) | Departamentos: misión, ownership, events, boundaries |
| 03 | [03-agents.md](./03-agents.md) | Catálogo completo de agentes especializados |
| 04 | [04-program-manager.md](./04-program-manager.md) | Program Manager: planificación y Task Graph |
| 05 | [05-cto-agent.md](./05-cto-agent.md) | CTO Agent: coordinación técnica y aprobaciones |
| 06 | [06-task-graph.md](./06-task-graph.md) | Modelo formal del Task Graph (DAG) |
| 07 | [07-workflow.md](./07-workflow.md) | Flujo completo Feature Request → Deploy |
| 08 | [08-communication-protocol.md](./08-communication-protocol.md) | Tipos de mensaje entre roles |
| 09 | [09-qa.md](./09-qa.md) | Proceso de QA: niveles, reglas, mocks |
| 10 | [10-release-manager.md](./10-release-manager.md) | Release Manager: integración, versioning, deploy |
| 11 | [11-sprint-lifecycle.md](./11-sprint-lifecycle.md) | Ciclo de vida de un Sprint |
| 12 | [12-definition-of-done.md](./12-definition-of-done.md) | Definition of Done oficial |
| 13 | [13-checklists.md](./13-checklists.md) | Todos los checklists del proceso |
| — | [06-roadmap.md](./06-roadmap.md) | Roadmap de implementación — 15+ Sprints |

---

## Estado actual

| Sprint | Tema | Estado |
|---|---|---|
| Sprint 0 | Engineering Platform | ✅ Documentado — este Sprint |
| Sprint 1 | Platform Foundation | 🔄 Parcialmente implementado |
| Sprint 2-15 | Dominios del ERP | ⏳ Pendientes |

---

## Roles

| Rol | Responsabilidad central | Puede tocar código |
|---|---|---|
| **Program Manager** | Construye Task Graph, planifica sprints | ❌ |
| **CTO Agent** | Aprueba planes, code reviews, merges | ❌ |
| **Agentes de dominio** | Implementan dentro de su bounded context | ✅ Solo su módulo |
| **QA Agent** | Tests, quality gates, sprint sign-off | ✅ Solo tests |
| **Release Manager** | Integración, versioning, deploy | ✅ Solo CI/CD |
| **Documentation Agent** | Mantiene docs/ | ✅ Solo docs/ |

---

## Documentos legacy (pre-Sprint 0)

Los siguientes documentos existían antes del Sprint 0 y permanecen como referencia histórica. Fueron reemplazados por los documentos canónicos de la tabla anterior.

- `01-organization.md` — reemplazado por 01 + 02
- `02-agents.md` — reemplazado por 03
- `03-cto-agent.md` — reemplazado por 05
- `04-workflow-and-lifecycle.md` — reemplazado por 07
- `05-rules-and-protocols.md` — reemplazado por 08 + 13
- `07-orchestration.md` — integrado en 04 + 06

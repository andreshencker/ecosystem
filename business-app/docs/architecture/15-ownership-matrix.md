# 15 — Ownership Matrix

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial

---

## Principio

Cada agente tiene un dominio de ownership exclusivo. Ningún agente puede modificar archivos fuera de su dominio. Si una tarea requiere cruzar boundaries, debe escalar al CTO Agent para que divida la tarea o defina la responsabilidad explícita.

---

## Matriz de ownership

| Agente | Puede modificar | No puede tocar |
|---|---|---|
| `FrontendAgent` | `business-app/frontend/**` | backend, BI, docs, tests de backend |
| `PlatformAgent` | `business-app/backend/src/platform/**` | frontend, BI, otros dominios |
| `CustomerAgent` | `business-app/backend/src/customer/**` | frontend, BI, platform, otros dominios |
| `WorkAgent` | `business-app/backend/src/work/**` | frontend, BI, billing, revenue |
| `CalendarAgent` | `business-app/backend/src/calendar/**` | frontend, BI, work, billing |
| `RevenueAgent` | `business-app/backend/src/revenue/**` | frontend, BI, billing, work |
| `BillingAgent` | `business-app/backend/src/billing/**` | frontend, BI, accounting, work |
| `FinancialAgent` | `business-app/backend/src/financial/**` | frontend, BI, billing, accounting |
| `AccountingAgent` | `business-app/backend/src/accounting/**` | frontend, BI, billing, financial |
| `DocumentAgent` | `business-app/backend/src/document-platform/**`, `business-app/backend/src/document-management/**` | frontend, BI, billing |
| `CommunicationsAgent` | `business-app/backend/src/communications/**` | frontend, BI, todos los dominios operativos |
| `AnalyticsAgent` | `business-app/backend/src/analytics/**` | frontend, `business-intelligence/**`, dominios operativos |
| `BusinessIntelligenceAgent` | `business-app/business-intelligence/**` | `business-app/frontend/**`, `business-app/backend/**` |
| `IntegrationAgent` | `business-app/backend/src/integration/**` | frontend, BI, dominios operativos |
| `RateEngineAgent` | `business-app/backend/src/rate-engine/**` | frontend, BI, work, billing |
| `ProvisioningAgent` | `business-app/backend/src/provisioning/**` (coordina setup de otros) | BI, frontend |
| `MigrationAgent` | Scripts de migración: `business-app/backend/src/**/migrations/`, `business-intelligence/alembic/` | Código de aplicación |
| `QAAgent` | Tests: `**/*.spec.ts`, `**/*.test.ts`, `business-intelligence/tests/**` | Código de producción (solo tests) |
| `DocumentationAgent` | `docs/**` | Código de producción, tests |
| `ReleaseManagerAgent` | `.github/workflows/`, `docker-compose.yml`, versiones en `package.json` | Código de dominio |
| `InfrastructureAgent` | `docker-compose.yml`, `.env.example`, `Dockerfile`, CI/CD config | Código de dominio |

---

## Shared ownership — zonas de coordinación

Las siguientes zonas requieren coordinación explícita entre agentes:

| Zona | Agentes involucrados | Proceso |
|---|---|---|
| `business-app/backend/src/shared/` | Todos los domain agents | Solo el CTO Agent puede aprobar cambios al shared kernel |
| `business-app/backend/src/settings/bi-client/` | PlatformAgent + BusinessIntelligenceAgent | Contrato entre ambos — cambios requieren aprobación del CTO |
| `business-app/backend/src/infrastructure/events/` | Todos los domain agents | Infraestructura de eventos — cambios por MigrationAgent o InfrastructureAgent |
| `docs/events/` | DocumentationAgent + todos (read) | Solo DocumentationAgent escribe — todos los agentes deben leer antes de implementar |

---

## Regla de escalación

Si un agente necesita:
1. Modificar un archivo fuera de su ownership
2. Agregar una dependencia entre dominios que no está en el Context Map
3. Cambiar un contrato de Domain Event

→ **Debe reportar BLOCKED al CTO Agent con la descripción del conflicto.**

El CTO Agent:
- Decide si el agente puede hacer el cambio (con justificación)
- Crea una tarea adicional para el agente dueño del archivo
- Actualiza el Context Map si es un cambio de arquitectura

---

## Reglas de imports en código

Las reglas de ownership se reflejan en los imports del código:

```typescript
// ✅ CORRECTO — Analytics solo importa su propio módulo
// src/analytics/analytics.service.ts
import { AnalyticsRepository } from './analytics.repository';

// ❌ INCORRECTO — Analytics importando de billing directamente
// src/analytics/analytics.service.ts
import { Invoice } from '../billing/schemas/invoice.schema'; // PROHIBIDO

// ✅ CORRECTO — Analytics consume eventos (no imports directos)
// src/analytics/handlers/invoice-sent.handler.ts
@EventsHandler(InvoiceSentEvent)   // ← el evento es el contrato, no la clase Invoice
async handle(event: InvoiceSentEvent) { ... }
```

El test en `src/shared/tests/dependency-rule.spec.ts` verifica automáticamente que no hay imports cruzados ilegales.

---

## Business Intelligence — ownership estricto

`BusinessIntelligenceAgent` tiene ownership **exclusivo y aislado** de `business-intelligence/`:

```
business-intelligence/
  app/               ← solo BusinessIntelligenceAgent
  alembic/           ← solo BusinessIntelligenceAgent + MigrationAgent
  tests/             ← QAAgent puede agregar tests aquí
  requirements.txt   ← solo BusinessIntelligenceAgent
  .env.example       ← solo BusinessIntelligenceAgent
```

**Ningún otro agente** modifica archivos bajo `business-intelligence/`. Si el `PlatformAgent` necesita cambiar el contrato del endpoint de BI que llama desde `bi-client.service.ts`, debe coordinar con `BusinessIntelligenceAgent` via CTO Agent — nunca directamente.

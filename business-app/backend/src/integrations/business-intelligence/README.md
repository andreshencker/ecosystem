# Business Intelligence Integration

## Qué es

El Business Intelligence (BI) service es un microservicio Python/FastAPI del mismo monorepo que expone métricas, KPIs, y resúmenes analíticos calculados sobre los datos del ERP.

## Para qué sirve en Business App

Business App actúa como proxy entre el frontend y el BI service. El frontend nunca llama al BI directamente — Business App resuelve el `businessId` del JWT y lo reenvía al BI como parámetro.

Módulos que consumen esta integración:
- `src/analytics/` — endpoints de dashboard y resúmenes de clientes

## Autenticación

Autenticación servicio-a-servicio mediante header `x-internal-service-token`. No usa OAuth ni tokens de usuario.

## Variables de entorno requeridas

| Variable | Descripción |
|---|---|
| `BI_SERVICE_URL` | Base URL del BI service (ej: `http://localhost:8000`) |
| `BI_INTERNAL_SERVICE_TOKEN` | Token compartido para autenticación interna |

## Qué provee a otros módulos

| Export | Uso |
|---|---|
| `BusinessIntelligenceService` | `getCustomerSummary()`, `getDashboardSummary()` |

## Estructura interna

```
business-intelligence/
  business-intelligence.module.ts    — módulo NestJS
  business-intelligence.service.ts   — cliente HTTP al BI service
  README.md
```

## Cómo probar la conexión

1. Iniciar el BI service (`business-app/business-intelligence/`)
2. Configurar `BI_SERVICE_URL` y `BI_INTERNAL_SERVICE_TOKEN`
3. Llamar a `GET /analytics/customers/summary` — devuelve datos del BI o fallback vacío

## Documentación detallada

- `docs/integrations/business-intelligence/README.md` — arquitectura y endpoints
- `docs/decisions/ADR-021-business-intelligence-integration.md` — decisión de arquitectura
- `docs/domain/business-intelligence/` — modelo dimensional, KPI catalog, BI roadmap

# Business Intelligence Integration

**Versión:** 1.0 | **Fecha:** 2026-07-08 | **Estado:** Canónico

> **Decisión de arquitectura:** ADR-021 — `src/integrations/business-intelligence/` es la ubicación del cliente HTTP al BI service.

---

## Qué es el BI service

El Business Intelligence service es un microservicio Python/FastAPI en `business-app/business-intelligence/`. Comparte el mismo monorepo que Business App pero se ejecuta como proceso independiente.

Expone endpoints `/internal/...` consumidos exclusivamente por Business App backend. El frontend nunca llama al BI directamente.

```
Frontend
   │
   ▼
Business App (NestJS)
   │  resuelve businessId del JWT
   │  reenvía como parámetro
   ▼
BI Service (FastAPI)
   │  calcula métricas sobre MongoDB
   ▼
Respuesta al frontend
```

---

## Responsabilidades de esta integración

| Responsabilidad | Implementación |
|---|---|
| Autenticación servicio-a-servicio | Header `x-internal-service-token` |
| Resolución del `businessId` | Siempre del JWT — nunca del frontend |
| Proxy de métricas al frontend | `AnalyticsController` consume `BusinessIntelligenceService` |
| Fallback cuando BI no responde | Retorna estructura vacía válida — nunca 500 |

---

## Autenticación

**Método:** `x-internal-service-token` — token estático compartido entre Business App y BI service.

No hay OAuth. No hay rotación automática de token. Es una credencial de infraestructura configurada via env vars.

```
Business App → BI Service
  Header: x-internal-service-token: <BI_INTERNAL_SERVICE_TOKEN>
  Param:  businessId (resuelto del JWT)
```

---

## Endpoints consumidos

| Endpoint | Descripción |
|---|---|
| `GET /internal/customers/summary` | Resumen de clientes por período |
| `GET /internal/dashboard/summary` | Resumen de dashboard |

Parámetros comunes: `businessId` (requerido), `period` (opcional, formato `YYYY-MM`).

---

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `BI_SERVICE_URL` | Base URL del BI service | `http://localhost:8000` |
| `BI_INTERNAL_SERVICE_TOKEN` | Token de autenticación interna | `bi-service-token-xxx` |

---

## Comportamiento ante fallos

El BI service puede no estar disponible en entornos de desarrollo o durante deploys. `BusinessIntelligenceService` nunca lanza excepciones — retorna `null` y el controller devuelve una respuesta vacía válida.

**Principio:** Un BI caído nunca impide que un usuario use el ERP.

---

## Código

```
src/integrations/business-intelligence/
  business-intelligence.module.ts
  business-intelligence.service.ts
  README.md
```

---

## Referencias

| Documento | Contenido |
|---|---|
| `ADR-021-business-intelligence-integration.md` | Decisión de mover BI a `src/integrations/` |
| `ADR-020-integrations-architecture.md` | Arquitectura general de integraciones |
| `docs/domain/business-intelligence/` | Modelo dimensional, KPI catalog, BI roadmap |
| `docs/integrations/README.md` | Índice de todas las integraciones |

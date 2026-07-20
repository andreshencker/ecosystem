# 01 — Business Intelligence Domain

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial

---

## Qué es Business Intelligence

Business Intelligence (BI) es un **microservicio Python separado** ubicado en `business-app/business-intelligence/`. Es la capa de análisis **estratégico y dimensional** del sistema.

**No es Analytics.** Ver la distinción completa abajo.

---

## Analytics vs Business Intelligence — la distinción definitiva

| Criterio | Analytics (BC-10) | Business Intelligence |
|---|---|---|
| Ubicación | `business-app/backend/src/analytics/` | `business-intelligence/` |
| Stack | NestJS + MongoDB | Python + FastAPI + PostgreSQL Neon |
| Propósito | Read models operativos para pantallas del ERP | Data Warehouse dimensional, KPIs estratégicos, ML, reportes avanzados |
| Tipo de datos | Facts + Dimensions + Snapshots + Read Models proyectados desde events | Modelo dimensional (dim_ + fact_), measures, time series |
| Latencia | < 100ms (pre-calculado, tiempo real) | Segundos a minutos (queries analíticos complejos) |
| Tenant scope | Siempre un businessId a la vez | Soporta cross-tenant (platform_admin) y per-tenant |
| Quien lo llama | Business App backend (gateway interno) | Business App backend (único gateway autorizado) |
| Frontend accede directamente | NO | NO (nunca) |
| Implementación en roadmap | Sprint 11 | Servicio operativo desde 2026-07-06. Ingesta de datos se activa en Sprint 11 cuando el flujo end-to-end genera eventos. |

---

## Qué problema resuelve BI

El Analytics operativo (BC-10) responde preguntas del día a día: "¿cuánto facturé este mes?" La respuesta es inmediata porque el dato ya está pre-calculado en MongoDB.

BI responde preguntas que requieren historia y cruce de dimensiones:

```
"¿Qué clientes tienen el mayor riesgo de pago tardío en los próximos 30 días,
basado en el comportamiento histórico de los últimos 18 meses?"

"¿Cuál es la evolución trimestral del revenue por tipo de cliente desde que
el negocio empezó a usar el ERP?"

"¿Cuál es el forecast de revenue para el próximo trimestre basado en
los contratos activos y el historial de turnos?"
```

Estas preguntas no se responden en < 100ms sobre MongoDB. Requieren un Data Warehouse relacional con SQL analítico complejo.

---

## Responsabilidades de BI

| Responsabilidad | Descripción |
|---|---|
| Mantener el Data Warehouse | Tablas dim_ y fact_ en PostgreSQL Neon |
| Calcular KPIs estratégicos | Métricas compuestas que cruzan múltiples dimensiones |
| Proveer datasets | Colecciones estructuradas para análisis y exportación |
| Soportar ML pipelines | Feature Store para modelos predictivos (Fase 3+) |
| Integrarse con herramientas BI | Exponer datos para Metabase, PowerBI, Tableau (Fase 5+) |
| Responder queries desde Business App | Endpoints internos protegidos por service token |

---

## Lo que BI NUNCA debe hacer

```
❌ Autenticar usuarios finales
❌ Validar JWT de sesiones de usuario
❌ Conocer permisos del frontend
❌ Ser llamado directamente desde el Frontend
❌ Modificar datos operativos
❌ Usar MongoDB
❌ Crear Customers, Invoices, Users, Payments
❌ Implementar business rules del ERP
❌ Exponer una API pública
❌ Hardcodear secrets o credenciales
```

---

## Posición en la arquitectura

```
FRONTEND
    │
    │  HTTP + JWT
    ▼
BUSINESS APP BACKEND  (autenticación, RBAC, businessId resolution)
    │
    │  HTTP interno + x-internal-service-token
    │  Pasa businessId ya autenticado
    ▼
BUSINESS INTELLIGENCE  (solo datos, sin auth propia)
    │
    │  SQL
    ▼
POSTGRESQL NEON  (Data Warehouse)
```

El Frontend **nunca** habla con BI directamente. Business App es el único gateway.

---

## Índice de documentos

| Doc | Descripción |
|---|---|
| [01-bi-domain.md](./01-bi-domain.md) | Este documento — visión y límites |
| [02-dimensional-model.md](./02-dimensional-model.md) | Tablas dim_ y fact_ del Data Warehouse |
| [03-kpi-catalog.md](./03-kpi-catalog.md) | Catálogo de KPIs estratégicos |
| [04-dataset-catalog.md](./04-dataset-catalog.md) | Datasets que BI expone vía API |
| [05-bi-api-contracts.md](./05-bi-api-contracts.md) | Contratos de los endpoints internos |
| [06-etl-and-sync.md](./06-etl-and-sync.md) | Cómo llegan los datos a BI |
| [07-security-and-access.md](./07-security-and-access.md) | Service token, autenticación interna |
| [09-bi-roadmap.md](./09-bi-roadmap.md) | Cuándo se implementa cada fase |

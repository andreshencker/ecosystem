# Analytics Domain — Operational Analytics Engine (BC-10)

**Versión:** 1.2 | **Fecha:** 2026-07-06 | **Estado:** Diseño conceptual oficial

> **LÍMITE DE ESTE DOMINIO:** Analytics (BC-10) es el motor analítico **operacional** dentro de `business-app/backend/src/analytics/` usando MongoDB. Sirve los dashboards y pantallas operativas del Business Owner en tiempo real.
>
> **No incluye:** Facts/Dimensions del Data Warehouse, KPIs estratégicos avanzados, ML, forecasting, integración con Metabase/PowerBI, modelo dimensional. Esas capacidades pertenecen a **Business Intelligence** (`business-intelligence/` — Python + PostgreSQL Neon). Ver `docs/domain/business-intelligence/` y `docs/architecture/12-business-intelligence-architecture.md`.

---

## Qué es Analytics

Analytics es el **motor analítico del ERP**. Es el Bounded Context responsable de transformar los hechos operativos del negocio en inteligencia accionable.

No es un dashboard. No es un módulo de gráficos. No es una pantalla con charts.

Es un motor que:
1. **Ingiere** hechos del negocio desde todos los dominios operativos
2. **Acumula** esos hechos en un modelo analítico propio
3. **Responde** preguntas en forma de datasets estructurados
4. **Proyecta** tendencias y patrones históricos

El Business Owner pregunta: *"¿Cuánto facturé este trimestre por cliente?"*
Analytics responde: un dataset de filas `{ customerId, customerName, totalBilled, invoiceCount }`.
El Frontend decide si mostrarlo como tabla, barras, o exportarlo a PDF.

---

## Qué NO es Analytics

| Lo que NO es | Lo que ES en cambio |
|---|---|
| Un dashboard | Un motor que provee los datos para dashboards |
| Un módulo de gráficos | Un motor que entrega datasets estructurados |
| Un módulo operativo | Un consumidor de solo lectura |
| Un módulo de autenticación | Recibe businessId ya autenticado por Business App |
| Una copia de las bases de datos operativas | Un modelo analítico independiente y optimizado para lectura |
| Un servicio que modifica datos | Un servicio que solo responde preguntas |

---

## Principios del dominio

| # | Principio | En una frase |
|---|---|---|
| A1 | **Solo lectura absoluta** | Analytics nunca escribe en ningún dominio operativo. |
| A2 | **Modelo propio** | Analytics trabaja sobre su propio almacén de datos, nunca sobre las DBs operativas. |
| A3 | **Datasets, no visualizaciones** | Analytics entrega datos. El Frontend decide la forma. |
| A4 | **Business App como único gateway** | El Frontend nunca habla directamente con Analytics. |
| A5 | **Eventualmente consistente** | El lag de Analytics respecto a los datos operativos es aceptable. |
| A6 | **Reconstruible desde eventos** | Si el almacén analítico se corrompe, se puede reconstruir desde el historial de eventos. |
| A7 | **Ignorante de identidad** | Analytics no conoce JWT, sesiones, ni permisos. Solo conoce businessId. |
| A8 | **Agnóstico de visualización** | Analytics nunca produce HTML, SVG, ChartJS ni ningún componente visual. |

---

## Arquitectura general

```
┌─────────────────────────────────────────────────────────────────┐
│                    DOMINIO OPERATIVO                             │
│                                                                 │
│  Billing  Work  Calendar  Accounting  Financial  Payments...    │
│     │       │       │          │           │          │         │
│     └───────┴───────┴──────────┴───────────┴──────────┘         │
│                         EVENT BUS                               │
└─────────────────────────────┬───────────────────────────────────┘
                              │ Domain Events (inmutables)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   ANALYTICS DOMAIN                              │
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │ INGESTION LAYER │    │  ANALYTICS      │                    │
│  │                 │───►│  STORE          │                    │
│  │ Event Handlers  │    │                 │                    │
│  │ ETL Jobs        │    │  Facts          │                    │
│  │ Batch Sync      │    │  Dimensions     │                    │
│  └─────────────────┘    │  Snapshots      │                    │
│                         │  Time Series    │                    │
│                         └────────┬────────┘                    │
│                                  │                             │
│                         ┌────────▼────────┐                    │
│                         │  QUERY ENGINE   │                    │
│                         │                 │                    │
│                         │  KPI Service    │                    │
│                         │  Dataset Service│                    │
│                         │  Report Service │                    │
│                         └────────┬────────┘                    │
└──────────────────────────────────┼─────────────────────────────┘
                                   │ Datasets (solo lectura)
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│              BUSINESS APP (Gateway / Orchestrator)              │
│                                                                 │
│  AuthGuard  BusinessIdResolver  Cache  RateLimiting  Compose   │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ Datasets compuestos y autorizados
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                 │
│                                                                 │
│  Line Chart  Bar Chart  Table  Card  PDF Export  CSV Export    │
└─────────────────────────────────────────────────────────────────┘
```

---

## El flujo completo

```
1. Un Business Owner envía una factura
         │
         │  BillingService.sendInvoice()
         ▼
2. Billing persiste la Invoice y publica InvoiceSent
         │
         │  EventBus.publish(InvoiceSent { ... })
         ▼
3. Analytics ingiere el evento
         │
         │  AnalyticsIngestion.onInvoiceSent(event)
         │  → actualiza InvoiceFact
         │  → actualiza RevenueSnapshot(month)
         │  → actualiza CustomerDimension
         ▼
4. Analytics Store refleja el nuevo estado
         │
         │  (lag típico: < 1 segundo)
         ▼
5. Business Owner abre el dashboard
         │
         │  GET /api/analytics/dashboard (via Business App)
         ▼
6. Business App autentica y extrae businessId
         │
         │  authGuard.verify(JWT) → businessId
         ▼
7. Business App consulta Analytics
         │
         │  analyticsService.getBusinessDashboard({ businessId, period })
         ▼
8. Analytics ejecuta la consulta sobre su propio store
         │
         │  returns DashboardDataset { revenue, ar, hours, invoices, ... }
         ▼
9. Business App puede componer, cachear y enriquecer la respuesta
         │
         │  (merge con datos de Business para nombre, currency)
         ▼
10. Frontend recibe el dataset
         │
         │  Dataset { revenueByMonth[], arByCustomer[], hoursThisMonth, ... }
         ▼
11. Frontend decide la representación visual
         │
         │  → Line chart para revenue
         │  → AR Aging table
         │  → KPI cards
```

---

## Por qué Business App es el único gateway

Analytics recibe solo `businessId`, `filters`, `dateRange`, `currency`. Nunca recibe un JWT. Nunca verifica permisos.

```
INCORRECTO — Frontend a Analytics directamente:
  Frontend → GET analytics.internal/kpi?jwt=xxx&businessId=X
  Problema: Analytics necesita verificar el JWT → acoplamiento a Identity
  Problema: ¿Qué pasa si el usuario tiene rol viewer? Analytics no sabe.
  Problema: Rate limiting por usuario imposible.

CORRECTO — Business App como intermediario:
  Frontend → GET businessapp/api/analytics/dashboard (con JWT)
  Business App verifica JWT, extrae businessId, verifica rol
  Business App → analyticsService.getBusinessDashboard({ businessId })
  Analytics devuelve dataset puro
  Business App aplica cache, rate limiting, y retorna al Frontend
```

---

## Índice de documentos

| # | Documento | Descripción |
|---|---|---|
| README | Este archivo | Visión, principios, arquitectura |
| 01 | [analytics-domain.md](./01-analytics-domain.md) | El dominio: responsabilidades, fronteras, ownership |
| 02 | [data-ingestion.md](./02-data-ingestion.md) | Cómo llega la información al Analytics Store |
| 03 | [analytics-model.md](./03-analytics-model.md) | El modelo conceptual: Facts, Dimensions, Measures |
| 04 | [kpi-catalog.md](./04-kpi-catalog.md) | Catálogo completo de KPIs con definiciones y cálculos |
| 05 | [dataset-catalog.md](./05-dataset-catalog.md) | Catálogo de todos los datasets que Analytics produce |
| 06 | [query-contracts.md](./06-query-contracts.md) | Contratos de consulta: inputs, outputs, guarantees |
| 07 | [read-models.md](./07-read-models.md) | Read Models: operacionales, financieros, ejecutivos |
| 08 | [machine-learning.md](./08-machine-learning.md) | Evolución hacia ML y AI: entradas, salidas, dependencias |
| 09 | [analytics-roadmap.md](./09-analytics-roadmap.md) | Roadmap de Analytics en 6 fases |

---

## Orden de lectura recomendado

### Para entender el porqué
```
README → 01-analytics-domain.md → 02-data-ingestion.md
```

### Para diseñar
```
03-analytics-model.md → 04-kpi-catalog.md → 05-dataset-catalog.md → 06-query-contracts.md
```

### Para implementar
```
07-read-models.md → 06-query-contracts.md → 02-data-ingestion.md
```

### Para planificar el futuro
```
08-machine-learning.md → 09-analytics-roadmap.md
```

---

## Relación con otros documentos

| Documento | Ubicación | Relación |
|---|---|---|
| `architecture/01-bounded-contexts.md` BC-10 | `docs/architecture/` | Analytics como BC |
| `architecture/07-read-models.md` | `docs/architecture/` | Read Models operacionales que Analytics proyecta |
| `architecture/04-domain-events.md` | `docs/architecture/` | Eventos que Analytics consume |
| `domain/accounting/` | `docs/domain/accounting/` | Accounting produce eventos que Analytics ingiere |
| `ADR-004-cqrs-read-models.md` | `docs/decisions/` | Decisión de CQRS que fundamenta Analytics |

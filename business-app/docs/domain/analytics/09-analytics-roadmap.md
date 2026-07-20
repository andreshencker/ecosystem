# 09 — Analytics Roadmap

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual oficial

Este roadmap describe la evolución del dominio de Analytics en 6 fases. Cada fase es completamente aditiva — agrega capacidades sin modificar las anteriores.

**Principio del roadmap:**
> Construir la infraestructura de datos correcta primero. Cada fase de Analytics agrega una capa de inteligencia sobre la anterior.

---

## Estado actual (pre-Fase 1 de Analytics)

```
✅ Arquitectura del Analytics Domain definida completamente
✅ Modelo conceptual (Facts, Dimensions, Measures, Snapshots) diseñado
✅ Catálogo de KPIs definido
✅ Catálogo de Datasets definido
✅ Contratos de consulta diseñados
✅ Roadmap de ML diseñado

⏳ Implementación: pendiente (comienza al completar Fase 3 del ERP — Billing)
```

---

## FASE 1 — Operational Analytics

**Horizonte:** Concurrent con Fase 3 del ERP (Billing + Payments)

**Pregunta que responde:**
*"¿Qué está pasando en mi negocio ahora mismo?"*

### Lo que agrega

```
INGESTION LAYER (para Fase 3 del ERP):
  ├── Event Handler: InvoiceSent, InvoiceVoided, InvoicePaid, InvoiceOverdue
  ├── Event Handler: PaymentRecorded, PaymentReversed
  ├── Event Handler: WorkEventConfirmed, WorkEventVoided, WorkEventInvoiced
  ├── Event Handler: CustomerCreated, CustomerDeactivated
  └── Idempotency Store (ProcessedEvents table)

ANALYTICS STORE:
  ├── InvoiceFact
  ├── PaymentFact
  ├── WorkEventFact
  ├── CustomerDimension
  ├── TimeDimension (pre-poblada 2020-2035)
  └── BusinessDimension

READ MODELS (Operational):
  ├── ORM-01 InvoiceListViewModel
  ├── ORM-02 CustomerSummaryViewModel
  ├── ORM-03 WorkEventListViewModel
  └── ERM-01 BusinessDashboardViewModel (versión básica)

KPIs DISPONIBLES:
  ├── KPI-R-001 Gross Revenue
  ├── KPI-R-002 Net Revenue
  ├── KPI-R-003 Cash Revenue
  ├── KPI-R-005 Average Invoice Value
  ├── KPI-AR-001 Total Outstanding AR
  ├── KPI-AR-002 Overdue AR
  ├── KPI-AR-003 DSO
  ├── KPI-AR-004 Collections Rate
  ├── KPI-W-001 Total Hours
  ├── KPI-W-002 Billable Hours
  ├── KPI-W-003 Billable Ratio
  ├── KPI-W-005 Unbilled Hours
  └── KPI-C-001 Active Customers

DATASETS DISPONIBLES:
  ├── DS-REV-001 RevenueByMonth
  ├── DS-REV-002 RevenueByCustomer
  ├── DS-AR-001 ARAgingReport
  ├── DS-AR-002 InvoiceStatusSummary
  ├── DS-AR-003 OverdueInvoices
  ├── DS-WORK-001 HoursByPeriod
  ├── DS-WORK-002 HoursByEmployee
  └── DS-DASH-001 BusinessDashboard (básico)
```

### Lo que NO incluye todavía

- P&L Report (requiere Accounting Engine — Fase 4 del ERP)
- GST Summary (requiere Fase 4)
- Forecasting (requiere datos históricos de al menos 6 meses)

### Resultado al finalizar la Fase

El Business Owner puede ver en tiempo real:
- Cuánto facturó este mes y cómo se compara con el anterior
- Cuánto le deben sus clientes y qué facturas están vencidas
- Cuántas horas trabajó y cuántas aún no facturó
- Su dashboard ejecutivo básico

---

## FASE 2 — Financial Analytics

**Horizonte:** Concurrent con Fase 4 del ERP (Financial Engine + Accounting)

**Pregunta que responde:**
*"¿Cuál es mi posición financiera real?"*

### Lo que agrega

```
INGESTION LAYER (para Fase 4 del ERP):
  ├── Event Handler: FinancialTransactionCreated, TransactionPosted
  ├── Event Handler: JournalEntryPosted
  └── Event Handler: FiscalPeriodClosed, FiscalPeriodLocked

ANALYTICS STORE (nuevas adiciones):
  ├── JournalFact
  ├── FinancialTransactionFact
  └── PeriodSnapshot

READ MODELS (Financial):
  ├── FRM-01 RevenueByPeriodViewModel
  ├── FRM-02 AccountsReceivableViewModel
  ├── FRM-03 GSTPositionViewModel
  └── FRM-04 GeneralLedgerSummaryViewModel

KPIs NUEVOS:
  ├── KPI-T-001 GST Collected
  ├── KPI-T-003 Net GST Payable
  └── KPI-AR-005 Overdue Ratio (refinado con ledger data)

DATASETS NUEVOS:
  ├── DS-FIN-001 ProfitAndLoss
  ├── DS-FIN-002 BalanceSheet
  ├── DS-FIN-004 TrialBalance
  ├── DS-TAX-001 GSTSummary
  └── DS-DASH-002 ExecutiveSummary
```

### Resultado al finalizar la Fase

El Business Owner (y su contador) pueden ver:
- P&L en tiempo real: cuánto ganó y cuánto gastó
- Balance Sheet: cuánto vale su negocio
- Trial Balance: para auditoría y control
- Posición de GST: cuánto debe al ATO en cada trimestre
- El dashboard ejecutivo completo con métricas financieras

---

## FASE 3 — Forecasting Analytics

**Horizonte:** 6 meses después de que Fase 1 de Analytics esté en producción (datos históricos acumulados)

**Pregunta que responde:**
*"¿Qué pasará en mi negocio el próximo mes y el próximo trimestre?"*

### Prerrequisito crítico

```
Mínimo requerido para forecasting:
  ├── 6 meses de datos históricos de Revenue → RevenueForecast básico
  ├── 12 meses de datos históricos → Detección de estacionalidad
  └── 50+ pagos históricos por Business → Late Payment Prediction confiable
```

### Lo que agrega

```
FORECAST INFRASTRUCTURE:
  ├── Feature Store (extracción de features desde Analytics Store)
  ├── Training Pipeline (batch semanal offline)
  └── Model Registry (almacén de modelos entrenados)

ML MODELS — FASE 1:
  ├── ML-001 Revenue Forecast (Prophet o equivalente)
  └── ML-002 Late Payment Prediction (clasificador binario)

READ MODELS (Forecast):
  ├── FORE-01 RevenueForecastViewModel
  └── RevenueTrendViewModel

DATASETS NUEVOS:
  ├── DS-FORE-001 RevenueForecast
  └── DS-REV-003 RevenueByContract (enriquecido con forecast)

KPIs NUEVOS:
  ├── ForecastedRevenue(period) — predicción del próximo mes/trimestre
  └── LatePaymentRisk(invoiceId) — score 0-100
```

### Alertas introducidas en esta Fase

```
ALERTA: Alta probabilidad de pago tardío
  → Trigger: LatePaymentRisk score > 70
  → Aparece: en el dashboard al enviar la factura
  → Acción sugerida: enviar recordatorio preventivo

ALERTA: Revenue forecast por debajo del promedio
  → Trigger: forecastNextMonth < avgLastThreeMonths * 0.8
  → Aparece: en el dashboard semanal
  → Acción sugerida: revisar pipeline de trabajo pendiente
```

### Resultado al finalizar la Fase

- El Business Owner ve una proyección de ingresos para los próximos 3 meses
- Las facturas de alto riesgo de impago están marcadas
- El sistema sugiere cuándo enviar recordatorios preventivos

---

## FASE 4 — Advanced Analytics

**Horizonte:** 12-18 meses después de Fase 3 de Analytics (suficientes datos para ML complejo)

**Pregunta que responde:**
*"¿Cómo está mi negocio comparado con su potencial? ¿Qué debería cambiar?"*

### Lo que agrega

```
ML MODELS — FASE 2:
  ├── ML-003 Cash Flow Projection (regresión + reglas)
  ├── ML-004 Customer Segmentation (clustering K-Means o equivalente)
  └── ML-005 Anomaly Detection (isolation forest o estadístico)

NEW DATASETS:
  ├── DS-FORE-002 CashFlowForecast
  ├── CustomerSegmentDataset
  └── AnomalyAlertsDataset

INSIGHTS ENGINE:
  ├── BusinessHealthScore (ML-006)
  ├── Automated Insights (patrones detectados automáticamente)
  └── Recommendations Engine (acciones sugeridas basadas en ML)
```

### Automated Insights (ejemplos)

```
Insight generado automáticamente:
  "Tu cliente Acme Corp tiene un score de riesgo de 85/100 este mes.
   Su último pago tardó 47 días (tu promedio es 28).
   Tiene 2 facturas por $3,200 pendientes de vencimiento en 7 días.
   Recomendación: Contactar con un recordatorio preventivo hoy."

Insight:
  "Tu ratio de horas billables cayó del 82% al 61% este mes.
   Esto equivale a $1,800 de ingreso no capturado.
   Las horas no billables provienen principalmente de 'Admin/Meetings' (12h) y 'Travel' (8h)."
```

### Resultado al finalizar la Fase

- El Business Owner recibe insights proactivos sin necesidad de revisar el dashboard
- Los segmentos de clientes están identificados con estrategias sugeridas
- Las anomalías se detectan y alertan antes de que se conviertan en problemas
- Un score de salud del negocio da una visión rápida del estado general

---

## FASE 5 — BI Platform Integration

**Horizonte:** Cuando el negocio escala y el Business Owner necesita análisis más profundos que el dashboard nativo

**Pregunta que responde:**
*"¿Cómo puedo exportar mis datos para análisis avanzado con herramientas especializadas?"*

### Lo que agrega

```
DATA EXPORT LAYER:
  ├── Nightly export a Data Warehouse (Snowflake / BigQuery / DuckDB)
  ├── ODBC/JDBC connector (para Tableau, PowerBI, Metabase)
  ├── REST API para consultas ad-hoc (vía Business App)
  └── Webhook notifications cuando snapshots se actualizan

SCHEDULED REPORTS:
  ├── Weekly P&L por email (vía Communications Platform)
  ├── Monthly Executive Summary por email
  ├── Quarterly BAS Summary por email
  └── Configurable reports (custom date ranges, custom recipients)
```

### Principio de la integración BI

```
Business App actúa como data proxy:
  BI Tool → Business App (con API key del Business) → Analytics → Dataset → BI Tool

Nunca:
  BI Tool → Analytics directamente (sin autenticación/autorización de Business App)
```

---

## FASE 6 — Natural Language Analytics

**Horizonte:** Fase 5+ del roadmap de Analytics (largo plazo, 3-5 años)

**Pregunta que responde:**
*"¿Cuánto facturé a Acme Corp el año pasado?" (pregunta en lenguaje natural)*

### Concepto

Un interfaz de lenguaje natural que permite al Business Owner hacer preguntas en su idioma y recibir respuestas en forma de datasets o KPIs.

```
Business Owner escribe:
  "¿Cuánto me pagó Acme Corp desde enero hasta junio?"

NL Processor traduce a:
  GetRevenueByCustomer({
    businessId: X,
    period: '2026-H1',
    customerId: ACME_ID
  })

Analytics responde:
  Dataset { grossRevenue: 24500, cashCollected: 18000, outstanding: 6500, ... }

UI muestra:
  "Acme Corp te facturó $24,500 AUD entre enero y junio. Has cobrado $18,000.
   Quedan $6,500 pendientes."
```

### Consideraciones arquitectónicas

- El procesamiento de lenguaje natural vive en una capa separada (NL Gateway)
- El NL Gateway traduce preguntas en lenguaje natural a Query Contracts formales
- Analytics nunca recibe texto libre — siempre recibe Query Contracts estructurados
- El NL Gateway puede usar LLMs (GPT, Claude) como motor de comprensión

---

## Vista de la evolución

```
Año 1:   Analytics Fase 1 → Dashboard operativo en tiempo real
Año 1-2: Analytics Fase 2 → Reportes financieros (P&L, Balance Sheet, GST)
Año 2:   Analytics Fase 3 → Forecasting de revenue + Late payment prediction
Año 3:   Analytics Fase 4 → ML completo (Cash Flow, Segmentation, Anomalies)
Año 3-4: Analytics Fase 5 → BI Platform Integration (Data Warehouse, PowerBI)
Año 5+:  Analytics Fase 6 → Natural Language Analytics
```

---

## Dependencias con el roadmap del ERP

| Fase Analytics | Depende de Fase ERP | Por qué |
|---|---|---|
| Fase 1 | Fase 3 (Billing + Payments) | InvoiceSent, PaymentRecorded como eventos base |
| Fase 2 | Fase 4 (Accounting Engine) | JournalEntryPosted, PeriodClosed |
| Fase 3 | 6 meses de Fase 1 en producción | Datos históricos para ML training |
| Fase 4 (Expenses) | Fase 6 del ERP (Expenses) | ExpenseApproved events |
| Fase 4 (Cash Flow) | Fase 7 del ERP (Banking) | BankTransactionImported |
| Fase 5 (Payroll) | Fase 9 del ERP (Payroll) | PayrollProcessed events |

---

## Lo que NUNCA cambia en Analytics

Sin importar la fase:

```
✅ Analytics siempre es solo lectura
✅ Business App siempre es el único gateway
✅ Los datasets nunca contienen componentes visuales
✅ Los modelos ML son siempre opcionales
✅ La reconstrucción desde eventos siempre es posible
✅ businessId siempre es el discriminador de tenant
```

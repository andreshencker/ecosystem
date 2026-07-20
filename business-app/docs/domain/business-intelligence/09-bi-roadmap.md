# 09 — BI Roadmap

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial

---

## Estado actual

El proyecto BI existe como skeleton Python/FastAPI. La infraestructura base (config, security, modelos SQLAlchemy, endpoints iniciales) se construye en paralelo con Sprint 2 del ERP.

La ingesta de datos real (Event Bridge, ETL) no arranca hasta Sprint 11.

---

## Fases de BI

### Fase 0 — Infraestructura base (paralela a Sprint 1-11 ERP)

```
✅ Estructura del proyecto Python/FastAPI
✅ Config + Security (service token)
✅ SQLAlchemy models (dim_ y fact_)
✅ Alembic migrations
✅ Endpoints iniciales: /health, /internal/customers/summary
✅ BiClientService en Business App
✅ Gateway endpoint en Business App
```

En esta fase las tablas están vacías. La API responde pero con datos cero/empty. Sirve para validar la infraestructura.

---

### Fase 1 — Operational BI (paralela a Sprint 11 ERP)

```
⏳ Event Bridge (consume Domain Events del ERP)
⏳ Ingestion handlers para CustomerCreated, InvoiceSent, PaymentRecorded, etc.
⏳ KPIs de Revenue y AR
⏳ Dataset DS-REV-001, DS-AR-001
```

Prerequisito: Sprint 11 del ERP (Billing + Payments en producción).

---

### Fase 2 — Financial BI (después de Sprint 11 ERP)

```
⏳ Ingestion de JournalEntryPosted, FiscalPeriodClosed
⏳ KPIs financieros: P&L, Balance Sheet, GST position
⏳ Dataset DS-FIN-001 ProfitAndLoss
```

---

### Fase 3 — Forecasting (6+ meses de datos en producción)

```
⏳ Feature Store
⏳ Revenue Forecast (Prophet / statsforecast)
⏳ Late Payment Prediction
⏳ DS-FORE-001 RevenueForecast
```

---

### Fase 4 — External BI Integration (Año 3+)

```
⏳ Metabase / PowerBI / Tableau via SQL connector
⏳ Scheduled report exports por email
⏳ ODBC/JDBC support
```

---

## Lo que NUNCA cambia en todas las fases

```
✅ Frontend nunca llama directamente a BI
✅ Business App siempre es el único gateway
✅ BI nunca escribe en el ERP
✅ BI nunca usa MongoDB
✅ businessId siempre determina el scope
✅ Service token siempre requerido en /internal/
```

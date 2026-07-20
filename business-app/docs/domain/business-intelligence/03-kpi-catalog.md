# 03 — KPI Catalog (Business Intelligence)

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial

KPIs estratégicos calculados por Business Intelligence desde el Data Warehouse (PostgreSQL Neon). Distintos de los KPIs operativos de Analytics BC-10 (MongoDB).

---

## KPIs de Customer (Sprint 2 scope)

| KPI | Cálculo | Fuente |
|---|---|---|
| Total Customers | COUNT(dim_customer) WHERE business_id = X | dim_customer |
| Active Customers | COUNT WHERE is_active = TRUE | dim_customer |
| Inactive Customers | COUNT WHERE is_active = FALSE | dim_customer |
| New Customers (período) | COUNT WHERE created_at WITHIN period | dim_customer |
| Customers by Type | GROUP BY customer_type | dim_customer |

---

## KPIs de Revenue (Sprint 11+)

| KPI | Cálculo | Fuente |
|---|---|---|
| Gross Revenue | SUM(gross_amount) WHERE is_voided=FALSE | fact_invoice |
| Cash Collected | SUM(amount) WHERE is_reversed=FALSE | fact_payment |
| Outstanding AR | Gross Revenue - Cash Collected | fact_invoice + fact_payment |
| Average Invoice Value | Gross Revenue / COUNT(invoice_id) | fact_invoice |
| Days Sales Outstanding (DSO) | AVG(days_to_payment) | fact_payment |
| Collection Rate | Cash Collected / Gross Revenue | fact_invoice + fact_payment |

---

## KPIs de Work (Sprint 11+)

| KPI | Cálculo | Fuente |
|---|---|---|
| Total Hours | SUM(duration_hours) WHERE is_voided=FALSE | fact_work_event |
| Billable Hours | SUM WHERE billable=TRUE | fact_work_event |
| Billable Ratio | Billable Hours / Total Hours | fact_work_event |
| Effective Hourly Rate | Gross Revenue / Billable Hours | fact_invoice + fact_work_event |

---

## KPIs de Forecasting (Fase 3 BI — después de 6+ meses de datos)

- Revenue Forecast (próximos 3 meses)
- Late Payment Risk Score por Customer
- Cash Flow Projection

---

> **Nota:** Los KPIs marcados como Sprint 11+ o Fase 3 no están implementados todavía. Este documento es el catálogo de diseño — se implementan incrementalmente.

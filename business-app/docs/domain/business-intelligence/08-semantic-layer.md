# 08 — Semantic Layer

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial

---

## Propósito

La Semantic Layer es la capa de abstracción entre los datos del Data Warehouse (tablas dim_/fact_) y los endpoints de la BI API. Los endpoints de BI **nunca escriben SQL ni cálculos complejos directamente** — siempre llaman a la Semantic Layer.

---

## Por qué existe

Sin Semantic Layer:
```python
# ❌ SQL en el endpoint — frágil, difícil de reutilizar, imposible de testear
@router.get("/internal/kpis/revenue")
async def revenue_kpi(businessId: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("""
        SELECT SUM(gross_amount) FROM fact_invoice
        WHERE business_id = :bid AND event_type = 'sent'
        AND issue_date_key BETWEEN :start AND :end
    """), {"bid": businessId, "start": start, "end": end})
    ...
```

Con Semantic Layer:
```python
# ✅ El endpoint solo orquesta — la lógica está en la semantic layer
@router.get("/internal/kpis/revenue")
async def revenue_kpi(businessId: str, period: str, db: AsyncSession = Depends(get_db)):
    return await RevenueKPI(db).calculate(business_id=businessId, period=period)
```

---

## Estructura de archivos

```
business-intelligence/app/semantic/
  __init__.py
  measures/
    __init__.py
    invoice_measures.py      ← SUM(gross_amount), COUNT(invoices), AVG(days_to_due)
    payment_measures.py      ← SUM(amount), AVG(days_to_payment)
    work_measures.py         ← SUM(duration_hours), SUM(calculated_amount)
    customer_measures.py     ← COUNT(customers), active_rate
  kpis/
    __init__.py
    revenue_kpi.py           ← revenue por período (usa invoice_measures)
    collections_kpi.py       ← collections rate, AR aging
    productivity_kpi.py      ← horas trabajadas, utilización
    customer_kpi.py          ← customer lifetime value, risk score
  datasets/
    __init__.py
    customer_summary.py      ← dataset para el endpoint /internal/customers/summary
    dashboard_summary.py     ← dataset para el endpoint /internal/dashboard/summary
    ar_aging.py              ← dataset de Accounts Receivable aging
    revenue_by_period.py     ← dataset de revenue por período
  filters/
    __init__.py
    date_filters.py          ← utilidades para filtrar por período, quarter, fiscal year
    business_filters.py      ← siempre filtrar por business_id (primera condición)
  metrics_registry.py        ← catálogo central de todas las métricas disponibles
```

---

## Measures

Las measures son funciones de agregación sobre las tablas fact_*. Son el bloque de construcción más pequeño.

```python
# app/semantic/measures/invoice_measures.py
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.facts.fact_invoice import FactInvoice
from decimal import Decimal
from datetime import date

async def total_revenue(
    db: AsyncSession,
    business_id: str,
    from_date: date,
    to_date: date,
) -> Decimal:
    """Gross revenue from sent invoices in date range."""
    result = await db.execute(
        select(func.sum(FactInvoice.gross_amount))
        .where(
            FactInvoice.business_id == business_id,   # ← siempre primero
            FactInvoice.event_type == 'sent',
            FactInvoice.issue_date_key >= from_date,
            FactInvoice.issue_date_key <= to_date,
        )
    )
    return result.scalar() or Decimal('0')

async def invoice_count(
    db: AsyncSession,
    business_id: str,
    from_date: date,
    to_date: date,
    event_type: str = 'sent',
) -> int:
    result = await db.execute(
        select(func.count(FactInvoice.fact_id))
        .where(
            FactInvoice.business_id == business_id,
            FactInvoice.event_type == event_type,
            FactInvoice.issue_date_key >= from_date,
            FactInvoice.issue_date_key <= to_date,
        )
    )
    return result.scalar() or 0
```

---

## KPIs

Los KPIs son composiciones de measures + dimensiones + filtros. Representan una métrica de negocio completa.

```python
# app/semantic/kpis/revenue_kpi.py
from dataclasses import dataclass
from decimal import Decimal
from app.semantic.measures.invoice_measures import total_revenue, invoice_count
from app.semantic.filters.date_filters import parse_period

@dataclass
class RevenueKPIResult:
    business_id:    str
    period:         str
    total_revenue:  Decimal
    invoice_count:  int
    avg_invoice:    Decimal
    currency:       str
    calculated_at:  str

class RevenueKPI:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def calculate(self, business_id: str, period: str) -> RevenueKPIResult:
        from_date, to_date = parse_period(period)

        revenue = await total_revenue(self.db, business_id, from_date, to_date)
        count   = await invoice_count(self.db, business_id, from_date, to_date)
        avg     = (revenue / count) if count > 0 else Decimal('0')

        return RevenueKPIResult(
            business_id   = business_id,
            period        = period,
            total_revenue = revenue,
            invoice_count = count,
            avg_invoice   = avg,
            currency      = 'AUD',  # TODO: leer de dim_business
            calculated_at = datetime.utcnow().isoformat(),
        )
```

---

## Datasets

Los datasets son colecciones estructuradas de datos que los endpoints retornan. Pueden combinar múltiples KPIs y dimensiones.

```python
# app/semantic/datasets/dashboard_summary.py
@dataclass
class DashboardSummaryDataset:
    business_id:     str
    period:          str
    customers:       CustomerMetrics
    revenue:         RevenueMetrics
    ar_balance:      Decimal
    calculated_at:   str

class DashboardSummaryBuilder:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def build(self, business_id: str, period: str) -> DashboardSummaryDataset:
        # Compone múltiples KPIs
        revenue_kpi  = await RevenueKPI(self.db).calculate(business_id, period)
        customer_kpi = await CustomerKPI(self.db).calculate(business_id, period)
        ar_kpi       = await ARBalanceKPI(self.db).calculate(business_id)

        return DashboardSummaryDataset(
            business_id  = business_id,
            period       = period,
            customers    = customer_kpi,
            revenue      = revenue_kpi,
            ar_balance   = ar_kpi.balance,
            calculated_at = datetime.utcnow().isoformat(),
        )
```

---

## Filtros

```python
# app/semantic/filters/date_filters.py
from datetime import date
from dateutil.relativedelta import relativedelta

def parse_period(period: str) -> tuple[date, date]:
    """
    Parses period string to (from_date, to_date).
    Formats: '2026-Q2', '2026-06', '2026', 'last-30-days', 'last-12-months'
    """
    today = date.today()
    if period.startswith('last-'):
        ...
    elif '-Q' in period:
        year, q = period.split('-Q')
        ...
    elif len(period) == 7:  # YYYY-MM
        ...
    else:
        raise ValueError(f"Invalid period format: {period}")
```

---

## Metrics Registry

```python
# app/semantic/metrics_registry.py
AVAILABLE_METRICS = {
    "revenue.total":          "Total revenue from sent invoices",
    "revenue.invoice_count":  "Number of sent invoices",
    "revenue.avg_invoice":    "Average invoice value",
    "ar.balance":             "Current accounts receivable balance",
    "ar.days_overdue_avg":    "Average days overdue for unpaid invoices",
    "collections.rate":       "Percentage of invoices collected",
    "work.total_hours":       "Total billable hours",
    "work.utilization_rate":  "Billable hours / total hours",
    "customers.total":        "Total customers",
    "customers.active":       "Active customers",
    "customers.new":          "New customers in period",
}
```

---

## Reglas de la Semantic Layer

```
✅ Todo endpoint de BI llama a un KPI o Dataset de la Semantic Layer
✅ Las measures siempre filtran por business_id como PRIMERA condición SQL
✅ Los KPIs son reutilizables — varios endpoints pueden usar el mismo KPI
✅ Los tests de la Semantic Layer usan queries reales contra Neon (no mocks)
✅ Los KPIs retornan dataclasses — no dicts crudos

❌ SQL directo en controllers o routes
❌ Lógica de negocio del ERP en KPIs (calcular GST, validar reglas de billing)
❌ KPIs que retornan datos de otro business_id
❌ Measures sin filtro de business_id
❌ Hardcodear currency o timezone en measures (leer de dim_business)
```

---

## Estado actual (Sprint 2)

La Semantic Layer aún no está implementada. La estructura de archivos existe parcialmente:

| Componente | Estado |
|---|---|
| `app/services/customer_kpi_service.py` | ✅ Existe (implementación básica sin semantic layer formal) |
| `app/services/dashboard_service.py` | ✅ Existe (implementación básica) |
| `app/semantic/` directory | ❌ No existe |
| Measures formales | ❌ No implementadas |
| KPI classes | ❌ No implementadas (hay servicios ad-hoc) |
| Datasets formales | ❌ No implementadas |
| Metrics Registry | ❌ No implementado |

**Plan:** Refactorizar `app/services/` hacia `app/semantic/` en Sprint 11 cuando BI se active con datos reales.

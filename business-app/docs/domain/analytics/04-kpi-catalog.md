# 04 — KPI Catalog

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual oficial

Un KPI (Key Performance Indicator) es un valor escalar que resume una dimensión del desempeño del negocio en un período dado. Es la unidad de medida más atómica que Analytics produce.

Un KPI no es un dataset. Es un número (o porcentaje) con un contexto: período, moneda, y businessId.

---

## Estructura de un KPI

Todos los KPIs comparten la misma estructura conceptual:

```
KPI {
    name:         string       — nombre canónico del KPI
    value:        decimal      — el valor calculado
    currency:     string?      — si aplica (AUD, NZD, etc.)
    unit:         string       — 'amount' | 'count' | 'percentage' | 'hours' | 'days'
    period:       string       — 'YYYY-MM' | 'YYYY-QN' | 'YYYY' | 'all_time'
    businessId:   ObjectId
    calculatedAt: DateTime     — cuándo fue calculado este valor
    trend:        object?      — comparación con período anterior
}

Trend {
    previousValue:  decimal
    changeAbsolute: decimal    — value - previousValue
    changePct:      decimal    — (value / previousValue - 1) * 100
    direction:      'up' | 'down' | 'flat'
}
```

---

## Categoría 1 — Revenue (Ingresos)

### KPI-R-001: Gross Revenue

| Campo | Valor |
|---|---|
| **Qué mide** | Total bruto facturado en el período (incluyendo impuestos) |
| **Cálculo** | `SUM(InvoiceFact.grossAmount) WHERE period = P AND isVoided = false` |
| **Dominios** | Billing |
| **Frecuencia** | Tiempo real (actualizado con cada InvoiceSent) |
| **Unidad** | amount (moneda del Business) |

---

### KPI-R-002: Net Revenue

| Campo | Valor |
|---|---|
| **Qué mide** | Total neto facturado en el período (sin impuestos) |
| **Cálculo** | `SUM(InvoiceFact.subtotal) WHERE period = P AND isVoided = false` |
| **Dominios** | Billing |
| **Frecuencia** | Tiempo real |
| **Nota** | Es el ingreso "real" del negocio, sin el componente de impuesto que se paga al fisco |

---

### KPI-R-003: Cash Revenue (Collected)

| Campo | Valor |
|---|---|
| **Qué mide** | Dinero efectivamente recibido en el período (pagos cobrados, no facturas emitidas) |
| **Cálculo** | `SUM(PaymentFact.amount) WHERE period = P AND isReversed = false` |
| **Dominios** | Billing (Payments) |
| **Frecuencia** | Tiempo real (actualizado con cada PaymentRecorded) |
| **Diferencia con Gross Revenue** | Revenue reconoce al emitir la factura; Cash Revenue reconoce al cobrar |

---

### KPI-R-004: Revenue Growth

| Campo | Valor |
|---|---|
| **Qué mide** | Crecimiento porcentual del Gross Revenue vs el período anterior |
| **Cálculo** | `(GrossRevenue(P) / GrossRevenue(P-1) - 1) * 100` |
| **Dominios** | Billing |
| **Frecuencia** | Batch (al cierre del período) |
| **Nota** | Requiere datos de al menos 2 períodos completos |

---

### KPI-R-005: Average Invoice Value

| Campo | Valor |
|---|---|
| **Qué mide** | Valor promedio de cada factura emitida en el período |
| **Cálculo** | `GrossRevenue / COUNT(InvoiceFact) WHERE period = P AND isVoided = false` |
| **Dominios** | Billing |
| **Frecuencia** | Batch diario |

---

### KPI-R-006: Voided Revenue

| Campo | Valor |
|---|---|
| **Qué mide** | Monto total de facturas anuladas en el período |
| **Cálculo** | `SUM(InvoiceFact.grossAmount) WHERE period = P AND isVoided = true` |
| **Dominios** | Billing |
| **Uso** | Señal de problemas operativos si es elevado |

---

## Categoría 2 — Accounts Receivable (AR)

### KPI-AR-001: Total Outstanding AR

| Campo | Valor |
|---|---|
| **Qué mide** | Dinero total que los clientes deben al Business en este momento |
| **Cálculo** | `SUM(InvoiceFact.grossAmount - paymentsApplied) WHERE isPaid = false AND isVoided = false` |
| **Dominios** | Billing, Payments |
| **Frecuencia** | Tiempo real (se actualiza con cada PaymentRecorded) |

---

### KPI-AR-002: Overdue AR

| Campo | Valor |
|---|---|
| **Qué mide** | Dinero vencido (facturas con dueDate < hoy y no pagadas) |
| **Cálculo** | `SUM(InvoiceFact.amountDue) WHERE isPaid = false AND overdueAt IS NOT NULL` |
| **Dominios** | Billing |
| **Frecuencia** | Actualizado cuando se dispara InvoiceOverdue |

---

### KPI-AR-003: DSO (Days Sales Outstanding)

| Campo | Valor |
|---|---|
| **Qué mide** | Promedio de días que tarda un cliente en pagar desde que recibe la factura |
| **Cálculo** | `AVG(PaymentFact.daysToPayment) WHERE period includes last 90 days` |
| **Dominios** | Billing, Payments |
| **Frecuencia** | Batch diario |
| **Benchmark** | < 30 días es excelente; > 60 días indica problemas de cobranza |

---

### KPI-AR-004: Collections Rate

| Campo | Valor |
|---|---|
| **Qué mide** | Porcentaje del dinero facturado que fue efectivamente cobrado |
| **Cálculo** | `CashCollected(period) / GrossRevenue(period) * 100` |
| **Dominios** | Billing, Payments |
| **Frecuencia** | Batch diario |
| **Nota** | Para períodos recientes puede ser < 100% simplemente porque las facturas aún no vencieron |

---

### KPI-AR-005: Overdue Ratio

| Campo | Valor |
|---|---|
| **Qué mide** | Porcentaje del AR total que está vencido |
| **Cálculo** | `OverdueAR / TotalAR * 100` |
| **Dominios** | Billing |
| **Frecuencia** | Tiempo real |

---

## Categoría 3 — Work (Trabajo)

### KPI-W-001: Total Hours

| Campo | Valor |
|---|---|
| **Qué mide** | Horas totales trabajadas en el período |
| **Cálculo** | `SUM(WorkEventFact.durationHours) WHERE period = P AND isVoided = false` |
| **Dominios** | Work |
| **Frecuencia** | Tiempo real |

---

### KPI-W-002: Billable Hours

| Campo | Valor |
|---|---|
| **Qué mide** | Horas trabajadas que son facturables |
| **Cálculo** | `SUM(WorkEventFact.durationHours) WHERE billable = true AND period = P AND isVoided = false` |
| **Dominios** | Work |
| **Frecuencia** | Tiempo real |

---

### KPI-W-003: Billable Ratio

| Campo | Valor |
|---|---|
| **Qué mide** | Porcentaje de las horas trabajadas que son facturables |
| **Cálculo** | `BillableHours / TotalHours * 100` |
| **Dominios** | Work |
| **Frecuencia** | Batch diario |
| **Benchmark** | > 80% es saludable para un freelancer |

---

### KPI-W-004: Effective Hourly Rate

| Campo | Valor |
|---|---|
| **Qué mide** | Ingresos reales divididos por horas billables — la tasa efectiva real |
| **Cálculo** | `GrossRevenue(period) / BillableHours(period)` |
| **Dominios** | Billing, Work |
| **Frecuencia** | Batch diario |
| **Nota** | Puede diferir de la Rate nominal si hay facturas anuladas o descuentos |

---

### KPI-W-005: Unbilled Hours

| Campo | Valor |
|---|---|
| **Qué mide** | Horas confirmadas que aún no han sido incluidas en ninguna factura |
| **Cálculo** | `SUM(durationHours) WHERE status = 'confirmed' AND invoicedAt IS NULL` |
| **Dominios** | Work, Billing |
| **Frecuencia** | Tiempo real |
| **Uso** | Señal de trabajo pendiente de facturar |

---

## Categoría 4 — Customer (Clientes)

### KPI-C-001: Active Customers

| Campo | Valor |
|---|---|
| **Qué mide** | Clientes que tuvieron al menos una factura en los últimos 90 días |
| **Cálculo** | `COUNT(DISTINCT customerId) WHERE lastInvoiceDate > today - 90 days` |
| **Dominios** | Billing, Customer |
| **Frecuencia** | Batch diario |

---

### KPI-C-002: Customer Lifetime Value (CLV)

| Campo | Valor |
|---|---|
| **Qué mide** | Total histórico facturado a un Customer específico |
| **Cálculo** | `SUM(InvoiceFact.grossAmount) WHERE customerId = X AND isVoided = false` |
| **Dominios** | Billing |
| **Frecuencia** | Actualizado con cada InvoiceSent/InvoiceVoided |
| **Nota** | Es el CLV realizado, no el proyectado |

---

### KPI-C-003: Average Revenue Per Customer

| Campo | Valor |
|---|---|
| **Qué mide** | Promedio de ingresos por cliente activo en el período |
| **Cálculo** | `GrossRevenue(period) / COUNT(DISTINCT customerId IN period)` |
| **Dominios** | Billing, Customer |
| **Frecuencia** | Batch diario |

---

### KPI-C-004: Top Customer Concentration

| Campo | Valor |
|---|---|
| **Qué mide** | Porcentaje del Revenue total que representa el cliente más grande |
| **Cálculo** | `MAX(RevenueByCustomer) / GrossRevenue * 100` |
| **Dominios** | Billing |
| **Uso** | Un valor > 50% indica alta dependencia de un solo cliente (riesgo) |

---

## Categoría 5 — Profitability (Rentabilidad)

*Estos KPIs requieren Fase 4 (Financial Engine) y Fase 6 (Expenses) para ser completos.*

### KPI-P-001: Gross Profit

| Campo | Valor |
|---|---|
| **Qué mide** | Diferencia entre Revenue y Costo Directo (COGS) |
| **Cálculo** | `NetRevenue - CostOfSales` (de General Ledger) |
| **Dominios** | Financial, Accounting |
| **Disponible desde** | Fase 4 + Fase 10 (Inventory para COGS) |

---

### KPI-P-002: Net Profit

| Campo | Valor |
|---|---|
| **Qué mide** | Diferencia entre Revenue y todos los gastos (operativos + impuestos) |
| **Cálculo** | `NetRevenue - TotalExpenses` (de General Ledger) |
| **Dominios** | Accounting (PeriodSnapshot) |
| **Disponible desde** | Fase 4 + Fase 6 |

---

### KPI-P-003: Profit Margin

| Campo | Valor |
|---|---|
| **Qué mide** | Porcentaje del Revenue que se convierte en ganancia neta |
| **Cálculo** | `NetProfit / NetRevenue * 100` |
| **Frecuencia** | Batch mensual (al cierre del período) |

---

## Categoría 6 — Cash Flow (Flujo de Efectivo)

*Disponible desde Fase 7 (Banking).*

### KPI-CF-001: Net Cash Position

| Campo | Valor |
|---|---|
| **Qué mide** | Posición de caja neta estimada (Payments recibidos - Pagos salientes) |
| **Cálculo** | `CashCollected - TotalOutflows` |
| **Dominios** | Billing (Payments), Expenses, Banking |

---

### KPI-CF-002: Cash Burn Rate

| Campo | Valor |
|---|---|
| **Qué mide** | Cuánto dinero está saliendo por mes (gastos + pagos) |
| **Cálculo** | `AVG(monthly outflows over last 3 months)` |
| **Uso** | Junto con cash position, estima cuántos meses de runway quedan |

---

## Categoría 7 — Tax (Impuestos, Australia)

### KPI-T-001: GST Collected

| Campo | Valor |
|---|---|
| **Qué mide** | GST total cobrado en las facturas emitidas del período |
| **Cálculo** | `SUM(InvoiceFact.taxAmount) WHERE period = P AND isVoided = false` |
| **Dominios** | Billing |
| **Frecuencia** | Tiempo real |

---

### KPI-T-002: GST Claimable

| Campo | Valor |
|---|---|
| **Qué mide** | GST pagado en gastos (Input Tax Credits) |
| **Cálculo** | `SUM(ExpenseFact.taxAmount) WHERE period = P` |
| **Dominios** | Expenses (futuro Fase 6) |

---

### KPI-T-003: Net GST Payable

| Campo | Valor |
|---|---|
| **Qué mide** | GST neto a pagar al ATO = GST collected - GST claimable |
| **Cálculo** | `GSTCollected - GSTClaimable` |
| **Frecuencia** | Batch (al cierre del trimestre BAS) |

---

## Categoría 8 — Communications

### KPI-CM-001: Communication Delivery Rate

| Campo | Valor |
|---|---|
| **Qué mide** | Porcentaje de comunicaciones enviadas exitosamente |
| **Cálculo** | `Delivered / (Delivered + Failed) * 100` |
| **Dominios** | Communication |
| **Frecuencia** | Batch diario |

---

## Resumen del catálogo

| Categoría | KPIs | Fases requeridas |
|---|---|---|
| Revenue | KPI-R-001 a R-006 | Fase 3 (Billing) |
| Accounts Receivable | KPI-AR-001 a AR-005 | Fase 3 (Billing + Payments) |
| Work | KPI-W-001 a W-005 | Fase 2 (Work) |
| Customer | KPI-C-001 a C-004 | Fase 1 (Customer) + Fase 3 (Billing) |
| Profitability | KPI-P-001 a P-003 | Fase 4 (Accounting) + Fase 6 (Expenses) |
| Cash Flow | KPI-CF-001 a CF-002 | Fase 7 (Banking) |
| Tax | KPI-T-001 a T-003 | Fase 3 + Fase 6 |
| Communications | KPI-CM-001 | Fase 3 (Communications live) |

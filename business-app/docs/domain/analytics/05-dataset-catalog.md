# 05 — Dataset Catalog

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual oficial

Un Dataset es la respuesta de Analytics a una consulta. Es una colección estructurada de datos — filas y campos — optimizada para ser consumida por el Frontend o exportada como CSV/PDF.

La diferencia entre un KPI y un Dataset: un KPI es un número escalar. Un Dataset es una colección estructurada de múltiples filas.

---

## Convenciones del catálogo

Cada Dataset tiene:

- **Nombre canónico:** identificador único del dataset
- **Pregunta de negocio:** la pregunta que responde en español natural
- **Parámetros de entrada:** lo que Business App debe enviar para obtenerlo
- **Filtros opcionales:** restricciones adicionales
- **Estructura de salida:** los campos del dataset
- **Consumidores:** quiénes lo usan
- **Frecuencia de actualización:** cuándo cambia el dataset
- **Fases requeridas:** qué módulos deben existir

---

## Categoría 1 — Revenue Datasets

### DS-REV-001: RevenueByMonth

**Pregunta de negocio:** ¿Cuánto facturé cada mes en este rango de tiempo?

**Entrada:**
```
{
    businessId:  ObjectId
    dateFrom:    Date
    dateTo:      Date
    currency:    string?    — si null, usar currency del Business
}
```

**Salida:**
```
{
    meta: { businessId, dateFrom, dateTo, currency, totalGross, totalCash }
    rows: [
        {
            period:         string    — 'YYYY-MM'
            monthName:      string    — 'January 2026'
            grossRevenue:   decimal
            netRevenue:     decimal
            taxCollected:   decimal
            cashCollected:  decimal
            outstanding:    decimal
            invoiceCount:   integer
            paidCount:      integer
        }
    ]
}
```

**Consumidores:** Dashboard (line/area chart), P&L Report, Revenue export
**Actualización:** Tiempo real (InvoiceSent, PaymentRecorded)

---

### DS-REV-002: RevenueByCustomer

**Pregunta de negocio:** ¿Cuánto facturé a cada cliente en este período?

**Entrada:**
```
{
    businessId: ObjectId
    period:     string    — 'YYYY-MM' | 'YYYY-QN' | 'YYYY'
}
```

**Filtros opcionales:**
```
{
    minRevenue:  decimal    — excluir clientes con menos de X
    isActive:    boolean    — solo clientes activos
    limit:       integer    — top N clientes
}
```

**Salida:**
```
{
    meta: { businessId, period, totalGross, customerCount }
    rows: [
        {
            customerId:           ObjectId
            customerName:         string
            grossRevenue:         decimal
            netRevenue:           decimal
            cashCollected:        decimal
            outstandingBalance:   decimal
            invoiceCount:         integer
            averageInvoiceValue:  decimal
            averagePaymentDays:   decimal?
            revenueRankPosition:  integer   — rank dentro del período
            revenuePct:           decimal   — % del total del período
        }
    ]
}
```

**Consumidores:** Customer profitability analysis, Pie/Bar chart, CSV export

---

### DS-REV-003: RevenueByContract

**Pregunta de negocio:** ¿Cuánto generó cada contrato en este período?

**Salida:**
```
rows: [
    {
        contractId:      ObjectId
        contractTitle:   string
        customerId:      ObjectId
        customerName:    string
        grossRevenue:    decimal
        hoursWorked:     decimal
        effectiveRate:   decimal   — revenue / hours
        invoiceCount:    integer
        status:          string    — 'active' | 'completed' | 'cancelled'
    }
]
```

---

### DS-REV-004: RevenueVsBudget (futuro Fase 5)

**Pregunta de negocio:** ¿Estoy alcanzando mis objetivos de ingresos?

*Requiere módulo de Budget/Targets. Placeholder para Fase 5.*

---

## Categoría 2 — Accounts Receivable Datasets

### DS-AR-001: ARAgingReport

**Pregunta de negocio:** ¿Cuánto me deben mis clientes y hace cuánto vencieron esas facturas?

**Entrada:**
```
{
    businessId: ObjectId
    asOf:       Date       — snapshot date (default: today)
}
```

**Salida:**
```
{
    meta: {
        businessId, asOf,
        totalOutstanding, current, overdue1to30, overdue31to60,
        overdue61to90, overdue90plus
    }
    rows: [
        {
            customerId:          ObjectId
            customerName:        string
            invoiceId:           ObjectId
            invoiceNumber:       string
            issueDate:           Date
            dueDate:             Date
            daysOverdue:         integer   — 0 si no vencida
            agingBucket:         string    — 'current' | '1-30' | '31-60' | '61-90' | '90+'
            grossAmount:         decimal
            amountPaid:          decimal
            amountDue:           decimal
        }
    ]
    summary: {
        customerCount:   integer
        invoiceCount:    integer
        oldestInvoiceDays: integer
    }
}
```

**Consumidores:** Collections dashboard, AR table, PDF export para contador

---

### DS-AR-002: InvoiceStatusSummary

**Pregunta de negocio:** ¿En qué estado están mis facturas actualmente?

**Salida:**
```
rows: [
    {
        status:       string    — 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'voided'
        count:        integer
        totalAmount:  decimal
        pct:          decimal   — % del total de facturas
    }
]
```

---

### DS-AR-003: OverdueInvoices

**Pregunta de negocio:** ¿Qué facturas están vencidas ahora mismo?

**Filtros opcionales:**
```
{
    minDaysOverdue: integer   — solo facturas vencidas hace más de N días
    customerId:     ObjectId  — solo para un cliente específico
}
```

**Salida:**
```
rows: [
    {
        invoiceId:       ObjectId
        invoiceNumber:   string
        customerId:      ObjectId
        customerName:    string
        contactEmail:    string    ← desnormalizado de Contact
        dueDate:         Date
        daysOverdue:     integer
        amountDue:       decimal
        totalAmount:     decimal
        lastReminderAt:  DateTime? ← de CommunicationFact
    }
]
```

---

## Categoría 3 — Work Datasets

### DS-WORK-001: HoursByPeriod

**Pregunta de negocio:** ¿Cuántas horas trabajé cada mes?

**Salida:**
```
rows: [
    {
        period:           string
        totalHours:       decimal
        billableHours:    decimal
        nonBillableHours: decimal
        billableRatio:    decimal
        workEventCount:   integer
        invoicedHours:    decimal
        pendingHours:     decimal   — confirmadas pero no facturadas
    }
]
```

---

### DS-WORK-002: HoursByEmployee

**Pregunta de negocio:** ¿Cuántas horas trabajó cada miembro del equipo en este período?

**Salida:**
```
rows: [
    {
        userId:              ObjectId
        userName:            string
        totalHours:          decimal
        billableHours:       decimal
        billableRatio:       decimal
        averageHoursPerDay:  decimal
        workEventCount:      integer
        calculatedRevenue:   decimal   — horas billables * tarifa promedio
    }
]
```

---

### DS-WORK-003: HoursByCustomer

**Pregunta de negocio:** ¿Cuántas horas trabajé para cada cliente?

**Salida:**
```
rows: [
    {
        customerId:          ObjectId
        customerName:        string
        totalHours:          decimal
        billableHours:       decimal
        effectiveRate:       decimal   — revenue / hours
        pendingToInvoice:    decimal   — horas sin facturar
        pendingAmount:       decimal   — valor estimado de las horas sin facturar
    }
]
```

---

### DS-WORK-004: WorkCalendarHeatmap

**Pregunta de negocio:** ¿Cuándo trabajo más durante el año?

**Salida:**
```
rows: [
    {
        date:         Date
        totalHours:   decimal
        intensity:    decimal   — 0.0 a 1.0, normalizado al máximo del rango
    }
]
```

Consumidor: Heatmap calendar en Frontend (similar al GitHub contribution graph).

---

## Categoría 4 — Financial Datasets

### DS-FIN-001: ProfitAndLoss

**Pregunta de negocio:** ¿Cuánto gané y cuánto gasté en este período?

*Requiere Fase 4 (Accounting Engine).*

**Entrada:**
```
{
    businessId:   ObjectId
    fiscalPeriod: string    — 'YYYY-QN' | 'YYYY'
    compareWith:  string?   — período anterior para comparación
}
```

**Salida:**
```
{
    period:        string
    currency:      string

    revenue: {
        total:     decimal
        byAccount: [{ accountCode, accountName, amount, pct }]
    }

    costOfSales: {
        total:     decimal
        byAccount: [{ accountCode, accountName, amount, pct }]
    }

    grossProfit:   decimal
    grossMargin:   decimal   — porcentaje

    operatingExpenses: {
        total:     decimal
        byAccount: [{ accountCode, accountName, amount, pct }]
    }

    netProfit:     decimal
    netMargin:     decimal

    comparison?: {
        previousPeriod:   string
        revenueChange:    decimal
        profitChange:     decimal
        revenueChangePct: decimal
    }
}
```

---

### DS-FIN-002: BalanceSheet

**Pregunta de negocio:** ¿Cuánto vale mi negocio en este momento?

*Requiere Fase 4 (Accounting Engine).*

**Salida:**
```
{
    asOf:         Date
    currency:     string

    assets: {
        current: {
            cash:               decimal
            accountsReceivable: decimal
            prepaidExpenses:    decimal
            totalCurrent:       decimal
        }
        nonCurrent: {
            fixedAssets:              decimal   — futuro Fase 8
            accumulatedDepreciation:  decimal
            totalNonCurrent:          decimal
        }
        totalAssets: decimal
    }

    liabilities: {
        current: {
            accountsPayable:    decimal
            gstPayable:         decimal
            paygPayable:        decimal   — futuro Fase 9
            totalCurrent:       decimal
        }
        totalLiabilities: decimal
    }

    equity: {
        retainedEarnings:   decimal
        currentYearProfit:  decimal
        totalEquity:        decimal
    }

    // Check: totalAssets === totalLiabilities + totalEquity
    isBalanced: boolean
}
```

---

### DS-FIN-003: CashFlowStatement

**Pregunta de negocio:** ¿De dónde vino y adónde fue el dinero en este período?

*Requiere Fase 7 (Banking) para estar completo.*

**Salida:**
```
{
    period:  string

    operating: {
        cashFromCustomers:    decimal
        paymentsToSuppliers:  decimal
        payrollPayments:      decimal   — futuro
        taxPayments:          decimal
        netOperating:         decimal
    }

    investing: {
        assetPurchases:   decimal       — futuro
        assetDisposals:   decimal
        netInvesting:     decimal
    }

    financing: {
        loanProceeds:     decimal       — futuro
        loanRepayments:   decimal
        netFinancing:     decimal
    }

    netCashChange:    decimal
    openingBalance:   decimal
    closingBalance:   decimal
}
```

---

### DS-FIN-004: TrialBalance

**Pregunta de negocio:** ¿Están balanceados mis libros contables?

**Salida:**
```
rows: [
    {
        accountCode:      string
        accountName:      string
        accountType:      string    — 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
        openingBalance:   decimal
        totalDebits:      decimal
        totalCredits:     decimal
        closingBalance:   decimal
    }
]
summary: {
    totalDebits:  decimal
    totalCredits: decimal
    isBalanced:   boolean   — totalDebits === totalCredits
}
```

---

## Categoría 5 — Tax Datasets

### DS-TAX-001: GSTSummary

**Pregunta de negocio:** ¿Cuánto GST debo pagar al ATO este trimestre?

**Entrada:**
```
{
    businessId:    ObjectId
    basQuarter:    string    — 'YYYY-QN' (Q1=Jul-Sep, Q2=Oct-Dec, Q3=Jan-Mar, Q4=Apr-Jun)
}
```

**Salida:**
```
{
    quarter:           string
    period:            { from: Date, to: Date }
    lodgmentDueDate:   Date

    // W1: Total Sales
    totalSales:        decimal

    // W2: Export Sales
    exportSales:       decimal

    // G1: GST on Sales
    gstCollected:      decimal

    // G11: Purchases with GST Credits
    gstClaimable:      decimal

    // 1A: Net GST payable (or refund)
    netGSTPayable:     decimal
    isRefund:          boolean

    // Detail para auditoria
    invoiceCount:          integer
    expenseCount:          integer
    gstFreeInvoices:       integer
    gstExemptInvoices:     integer
}
```

---

## Categoría 6 — Dashboard Datasets (compuestos)

### DS-DASH-001: BusinessDashboard

**Pregunta de negocio:** ¿Cómo está mi negocio hoy?

Este es el dataset más consultado. Entrega todos los KPIs del dashboard principal en una sola consulta.

**Entrada:**
```
{
    businessId:   ObjectId
    period:       string    — por defecto: mes actual
    currency:     string?
}
```

**Salida:**
```
{
    businessId:   ObjectId
    period:       string
    generatedAt:  DateTime

    // Revenue
    revenue: {
        grossThisMonth:     decimal
        grossPrevMonth:     decimal
        growthPct:          decimal
        cashCollected:      decimal
        outstanding:        decimal
    }

    // AR
    ar: {
        totalOutstanding:   decimal
        overdueAmount:      decimal
        overdueRatio:       decimal
        dso:                decimal
    }

    // Work
    work: {
        totalHoursThisMonth:    decimal
        billableHoursThisMonth: decimal
        billableRatio:          decimal
        unbilledHours:          decimal
        unbilledAmount:         decimal   — valor estimado
    }

    // Invoices
    invoices: {
        draftCount:    integer
        sentCount:     integer
        overdueCount:  integer
        paidThisMonth: integer
    }

    // Top performers
    topCustomers: [
        { customerId, customerName, revenue, rank }    — top 5
    ]

    // Alerts
    alerts: [
        {
            type:     'overdue_invoices' | 'unbilled_hours' | 'low_collections'
            severity: 'info' | 'warning' | 'critical'
            message:  string
            count:    integer?
            amount:   decimal?
        }
    ]
}
```

---

### DS-DASH-002: ExecutiveSummary

**Pregunta de negocio:** ¿Cuál es el resumen ejecutivo del negocio este trimestre?

Dataset más detallado que el Dashboard, usado para reportes ejecutivos periódicos.

**Incluye:**
- Revenue by month (últimos 12 meses)
- AR Aging summary
- Top 10 customers by revenue
- Hours by employee
- KPIs principales con comparación QoQ

---

## Categoría 7 — Forecast Datasets (Fase 3 Analytics+)

### DS-FORE-001: RevenueForecast

**Pregunta de negocio:** ¿Cuánto debería facturar el próximo mes/trimestre?

*Requiere datos históricos de al menos 6 meses. Disponible en Fase 3 de Analytics.*

**Salida:**
```
{
    generatedAt:   DateTime
    horizon:       integer    — días hacia adelante

    predictions: [
        {
            period:         string
            predicted:      decimal
            confidenceLow:  decimal
            confidenceHigh: decimal
            confidence:     decimal    — 0.0 a 1.0
        }
    ]

    assumptions: [
        'Based on 12 months of historical data',
        'Assumes 2 active contracts continuing',
        'Adjusted for seasonal patterns (Q4 historically 15% higher)'
    ]

    accuracy: {
        mape:   decimal    — Mean Absolute Percentage Error del modelo
        rmse:   decimal
    }
}
```

---

### DS-FORE-002: CashFlowForecast

**Pregunta de negocio:** ¿Cuánto dinero tendré en 30/60/90 días?

**Salida:**
```
{
    horizon:       integer
    projections: [
        {
            date:          Date
            predicted:     decimal
            confidence:    decimal
            components: {
                expectedInflows:   decimal   — pagos esperados de AR
                expectedOutflows:  decimal   — gastos recurrentes
                netChange:         decimal
            }
        }
    ]
}
```

---

## Catálogo resumen

| Dataset | Categoría | Fases requeridas | Actualización |
|---|---|---|---|
| DS-REV-001 RevenueByMonth | Revenue | Fase 3 | Tiempo real |
| DS-REV-002 RevenueByCustomer | Revenue | Fase 3 | Tiempo real |
| DS-REV-003 RevenueByContract | Revenue | Fase 3 | Tiempo real |
| DS-AR-001 ARAgingReport | AR | Fase 3 | Tiempo real |
| DS-AR-002 InvoiceStatusSummary | AR | Fase 3 | Tiempo real |
| DS-AR-003 OverdueInvoices | AR | Fase 3 | Tiempo real |
| DS-WORK-001 HoursByPeriod | Work | Fase 2 | Tiempo real |
| DS-WORK-002 HoursByEmployee | Work | Fase 2 | Tiempo real |
| DS-WORK-003 HoursByCustomer | Work | Fase 2 + Fase 3 | Tiempo real |
| DS-WORK-004 WorkCalendarHeatmap | Work | Fase 2 | Tiempo real |
| DS-FIN-001 ProfitAndLoss | Financial | Fase 4 | Batch diario |
| DS-FIN-002 BalanceSheet | Financial | Fase 4 | Batch diario |
| DS-FIN-003 CashFlowStatement | Financial | Fase 7 | Batch diario |
| DS-FIN-004 TrialBalance | Financial | Fase 4 | Batch diario |
| DS-TAX-001 GSTSummary | Tax | Fase 4 | Batch semanal |
| DS-DASH-001 BusinessDashboard | Dashboard | Fase 3 | Tiempo real |
| DS-DASH-002 ExecutiveSummary | Dashboard | Fase 4 | Batch diario |
| DS-FORE-001 RevenueForecast | Forecast | Analytics Fase 3 | Batch semanal |
| DS-FORE-002 CashFlowForecast | Forecast | Analytics Fase 3 + Banking | Batch semanal |

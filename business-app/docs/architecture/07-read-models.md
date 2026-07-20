# 07 — Read Models

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

Los Read Models son representaciones optimizadas de datos para consulta, construidas a partir de Domain Events. Siguen el patrón CQRS (Command Query Responsibility Segregation): el lado de escritura usa los Aggregate Roots; el lado de lectura usa los Read Models.

---

## Por qué Read Models separados

**Sin Read Models:**

```
Dashboard: "Dame los ingresos del mes"
    → Query Invoices (Billing domain)
    → Query Payments (Billing domain)
    → Query JournalEntries (Accounting domain)
    → Calcular en runtime
    → Acoplamiento entre dominios
    → Query lenta con joins
    → Si cambia el schema de Invoice, el dashboard se rompe
```

**Con Read Models:**

```
Dashboard: "Dame los ingresos del mes"
    → Query IncomeReadModel (Analytics domain)
    → Pre-calculado desde Domain Events
    → Query instantánea (sin joins)
    → Completamente desacoplado de Billing y Accounting
    → Si cambia el schema de Invoice, se reconstruye el Read Model
```

---

## Principio de construcción

Todo Read Model se construye **únicamente a partir de Domain Events**. Nunca consulta directamente el modelo de escritura de otro dominio.

```
Domain Events → Event Handler → Read Model proyectado
```

Si los Domain Events son completos y bien diseñados, el Read Model siempre puede reconstruirse desde cero reproduciendo los eventos.

---

## Read Models Operacionales

Sirven a la UI operativa — los módulos que el Business Owner y su equipo usan a diario.

---

### RM-OP-01 — WorkEventListView

**Sirve a:** Work Management UI
**Construido desde:** WorkEventCreated, WorkEventImported, WorkEventConfirmed, WorkEventVoided, WorkEventInvoiced

```
WorkEventListView {
    businessId
    workEventId
    date
    startTime
    endTime
    durationFormatted    — '8h 30m'
    customerName         — desnormalizado desde Customer
    contractTitle        — desnormalizado desde Contract
    rateName             — desnormalizado desde Rate
    calculatedAmount     — formateado
    currency
    status               — draft | confirmed | invoiced | void
    billable
    source               — manual | calendar
    calendarEventTitle   — si vino del calendario
}
```

**Por qué desnormalizado:** La UI de WorkEvents necesita mostrar el nombre del Customer sin hacer un join con la colección de Customers. Al construir el Read Model desde los eventos, se incluye el nombre del Customer en el momento en que se conocía.

---

### RM-OP-02 — InvoiceListView

**Sirve a:** Billing UI
**Construido desde:** InvoiceGenerated, InvoiceSent, InvoicePaid, InvoiceOverdue, InvoiceVoided, PaymentRecorded

```
InvoiceListView {
    businessId
    invoiceId
    invoiceNumber
    customerName
    issueDate
    dueDate
    status
    total
    amountPaid
    amountDue
    currency
    daysOverdue         — calculado si overdue
    paymentCount        — cuántos Payments tiene
    itemCount           — cuántos InvoiceItems tiene
}
```

---

### RM-OP-03 — CustomerSummaryView

**Sirve a:** Customer Management UI
**Construido desde:** CustomerCreated, CustomerUpdated, CustomerDeactivated, InvoiceSent, PaymentRecorded

```
CustomerSummaryView {
    businessId
    customerId
    name
    type
    contactEmail
    isActive
    activeContracts      — count
    outstandingInvoices  — count
    totalBilled          — lifetime
    totalPaid            — lifetime
    totalOutstanding     — suma de amountDue de facturas activas
    lastInvoiceDate
    lastPaymentDate
}
```

---

### RM-OP-04 — ContractStatusView

**Sirve a:** Contract Management UI
**Construido desde:** ContractCreated, ContractActivated, ContractCompleted

```
ContractStatusView {
    businessId
    contractId
    customerName
    title
    status
    startDate
    endDate
    billingCycle
    rateCount
    confirmedWorkEvents  — count pendientes de facturar
    totalInvoiced        — suma histórica
}
```

---

### RM-OP-05 — CommunicationHistoryView

**Sirve a:** Communication Log UI
**Construido desde:** CommunicationDelivered, CommunicationFailed

```
CommunicationHistoryView {
    businessId
    logId
    eventKey
    resourceType
    resourceId
    recipientEmail
    channel
    success
    requestedAt
    errorMessage     — si failed
}
```

---

## Read Models Financieros

Sirven a la UI de finanzas y reportes — sin consultar Accounting directamente.

---

### RM-FIN-01 — RevenueByPeriodView

**Sirve a:** Financial Dashboard, P&L Report
**Construido desde:** InvoiceSent, InvoiceVoided, PaymentRecorded, TransactionPosted

```
RevenueByPeriodView {
    businessId
    period              — 'YYYY-MM' o 'YYYY-QN'
    grossRevenue        — suma de InvoiceSent.total
    netRevenue          — suma de InvoiceSent.subtotal
    taxCollected        — suma de InvoiceSent.taxAmount
    cashReceived        — suma de PaymentRecorded.amount
    outstanding         — grossRevenue - cashReceived
    invoiceCount
    paidInvoiceCount
    overdueInvoiceCount
}
```

---

### RM-FIN-02 — AccountsReceivableView

**Sirve a:** AR Aging Report, Collections Dashboard
**Construido desde:** InvoiceSent, InvoicePaid, InvoiceVoided, PaymentRecorded

```
AccountsReceivableView {
    businessId
    asOf                — fecha del snapshot
    totalOutstanding    — suma de todos los amountDue
    current             — facturas no vencidas
    overdue_1_30        — 1-30 días vencidas
    overdue_31_60       — 31-60 días vencidas
    overdue_61_90       — 61-90 días vencidas
    overdue_90plus      — más de 90 días vencidas
    byCustomer: [
        { customerId, customerName, outstanding, oldestInvoiceDays }
    ]
}
```

---

### RM-FIN-03 — CashFlowView

**Sirve a:** Cash Flow Statement
**Construido desde:** PaymentRecorded, PaymentReversed, FinancialTransactionCreated (BANK_*)

```
CashFlowView {
    businessId
    period
    operatingActivities: {
        cashFromCustomers
        paymentToSuppliers
        payrollPayments
        taxPayments
        netOperating
    }
    investingActivities: {
        assetPurchases
        assetDisposals
        netInvesting
    }
    financingActivities: {
        loanProceeds
        loanRepayments
        netFinancing
    }
    netCashChange
    openingBalance
    closingBalance
}
```

---

### RM-FIN-04 — GSTPositionView (Australia)

**Sirve a:** BAS Preparation, Tax Dashboard
**Construido desde:** InvoiceSent, PaymentRecorded (expenses con GST), TAX_PAYMENT transactions

```
GSTPositionView {
    businessId
    period              — trimestre fiscal
    gstCollected        — suma GST en facturas emitidas
    gstClaimable        — suma GST en gastos (Input Tax Credits)
    netGSTPayable       — gstCollected - gstClaimable
    basLodgmentDue      — fecha límite ATO
    lodged              — boolean
}
```

---

### RM-FIN-05 — GeneralLedgerSummaryView

**Sirve a:** Trial Balance UI, accountant view
**Construido desde:** JournalEntryPosted, FiscalPeriodClosed

```
GeneralLedgerSummaryView {
    businessId
    fiscalPeriod
    accounts: [
        {
            accountCode
            accountName
            accountType
            openingBalance
            totalDebits
            totalCredits
            closingBalance
        }
    ]
    totalDebits         — debe igualar totalCredits (Trial Balance check)
    totalCredits
    isBalanced
}
```

**Importante:** Este es un Read Model construido desde JournalEntryPosted. No consulta el GeneralLedger del Accounting domain directamente.

---

## Read Models de Analytics

Sirven a dashboards ejecutivos, proyecciones y ML.

---

### RM-ANAL-01 — BusinessDashboardView

**Sirve a:** Dashboard principal del Business Owner
**Construido desde:** múltiples eventos de todos los dominios

```
BusinessDashboardView {
    businessId
    updatedAt

    // Ingresos
    revenueThisMonth
    revenuePrevMonth
    revenueGrowthPct

    // Cobranza
    outstandingReceivables
    overdueAmount
    averagePaymentDays

    // Trabajo
    hoursConfirmedThisMonth
    hoursInvoicedThisMonth
    pendingToInvoice        — horas confirmadas no facturadas

    // Facturas
    invoicesDraftCount
    invoicesSentCount
    invoicesOverdueCount

    // Efectivo (si hay Banking integrado)
    bankBalance             — opcional

    // Comunicaciones
    lastCommunicationAt
    failedCommunicationsCount
}
```

---

### RM-ANAL-02 — RevenueByCustomerView

**Sirve a:** Customer profitability analysis
**Construido desde:** InvoiceSent, PaymentRecorded

```
RevenueByCustomerView {
    businessId
    period
    customers: [
        {
            customerId
            customerName
            grossBilled
            netCollected
            outstandingAmount
            averagePaymentDays
            invoiceCount
            hoursWorked
            effectiveHourlyRate   — grossBilled / hoursWorked
        }
    ]
}
```

---

### RM-ANAL-03 — WorkloadAnalysisView

**Sirve a:** Work hours analysis, capacity planning
**Construido desde:** WorkEventConfirmed, WorkEventVoided

```
WorkloadAnalysisView {
    businessId
    period
    byUser: [
        {
            userId
            userName
            totalHours
            billableHours
            nonBillableHours
            billablePercent
            averageHoursPerDay
        }
    ]
    byCustomer: [
        {
            customerId
            customerName
            totalHours
            pendingToInvoice
        }
    ]
}
```

---

### RM-ANAL-04 — ForecastView (Futuro ML)

**Sirve a:** Revenue forecasting
**Construido desde:** Análisis histórico de RevenueByPeriodView

```
ForecastView {
    businessId
    generatedAt
    horizon             — días a futuro
    projectedRevenue: [
        { date, amount, confidence: 0.0-1.0 }
    ]
    projectedCashflow: [
        { date, amount, confidence }
    ]
    assumptions: [
        'Based on 12 months of historical data'
        'Assumes 2 active contracts continuing'
    ]
}
```

---

## Reconstrucción de Read Models

Si un Read Model se corrompe o necesita actualizarse (nuevo campo, nueva lógica), se reconstruye desde cero reproduciendo los Domain Events:

```
RecreateReadModel(modelType: string, businessId: ObjectId) {
    1. Drop existing read model for businessId
    2. Replay all Domain Events for businessId in chronological order
    3. Apply event handlers to rebuild the model
    4. Mark as complete
}
```

Esto es posible porque:
- Los Domain Events son inmutables (nunca se borran)
- Los event handlers son deterministas (mismos inputs → mismos outputs)
- El orden cronológico está garantizado por `occurredAt`

---

## Consistencia eventual

Los Read Models son **eventualmente consistentes** con el dominio de escritura. Hay un gap entre cuando el Domain Event ocurre y cuando el Read Model refleja ese cambio.

Para la mayoría de casos de uso, un lag de < 1 segundo es aceptable. Para casos donde la consistencia inmediata es crítica (ej. el número de factura no puede repetirse), la escritura usa el Aggregate Root directamente, no el Read Model.

```
¿Necesita consistencia inmediata?
    Sí → Usar Aggregate Root (escritura)
    No → Usar Read Model (lectura eventual)
```

# 07 — Read Models (BC-10, MongoDB)

**Versión:** 1.1 | **Fecha:** 2026-07-06 | **Estado:** Diseño conceptual oficial

> **Scope de este documento:** Read Models del Analytics Store operacional (MongoDB, dentro de `business-app/backend`). Sirven las pantallas del Business Owner — dashboard, listados, KPIs en tiempo real. **No son los reportes del Business Intelligence Service** (PostgreSQL Neon). Los reportes BI son queries SQL sobre tablas fact_/dim_.

Los Read Models son **vistas pre-calculadas y optimizadas** del Analytics Store. Existen para que el Query Engine pueda responder consultas frecuentes en milisegundos sin necesidad de agregar los Facts en tiempo real.

---

## La jerarquía de Read Models

```
ANALYTICS STORE
      │
      ├── FACTS (datos crudos inmutables)
      │
      └── READ MODELS (vistas pre-calculadas)
              │
              ├── Operational Read Models     — estado operativo del Business
              ├── Financial Read Models        — posición financiera
              ├── Executive Read Models        — KPIs ejecutivos compuestos
              ├── Report Read Models           — estructurados para reportes
              └── Forecast Read Models         — proyecciones (Fase 3+)
```

La diferencia entre un Fact y un Read Model:
- Un **Fact** es un registro de lo que ocurrió (inmutable, uno por evento)
- Un **Read Model** es un cálculo derivado de múltiples Facts (mutable, actualizado con cada evento relevante)

---

## Operational Read Models

Sirven a las pantallas operativas del Business App — las que el Business Owner usa diariamente.

---

### ORM-01: InvoiceListViewModel

**Sirve a:** Listado de facturas con filtros y ordenamiento

**Construido desde:** InvoiceGenerated, InvoiceSent, InvoiceOverdue, InvoicePaid, InvoiceVoided, PaymentRecorded

```
InvoiceListViewModel {
    businessId:          ObjectId
    invoiceId:           ObjectId
    invoiceNumber:       string
    customerId:          ObjectId
    customerName:        string       ← desnormalizado
    issueDate:           Date
    dueDate:             Date
    status:              string
    grossAmount:         decimal
    amountPaid:          decimal
    amountDue:           decimal
    currency:            string
    daysOverdue:         integer?
    paymentCount:        integer
    workEventCount:      integer
    lastUpdatedAt:       DateTime
}
```

**Índices necesarios:** businessId + status, businessId + dueDate, businessId + customerId

---

### ORM-02: CustomerSummaryViewModel

**Sirve a:** Listado de clientes con métricas de facturación

**Construido desde:** CustomerCreated, CustomerDeactivated, InvoiceSent, InvoicePaid, PaymentRecorded

```
CustomerSummaryViewModel {
    businessId:              ObjectId
    customerId:              ObjectId
    name:                    string
    type:                    string
    isActive:                boolean
    contactEmail:            string?      ← desnormalizado del Contact principal

    // Métricas calculadas
    lifetimeBilled:          decimal
    lifetimeCollected:       decimal
    outstandingBalance:      decimal
    overdueBalance:          decimal
    activeContractCount:     integer
    pendingInvoiceCount:     integer
    averagePaymentDays:      decimal?
    lastInvoiceDate:         Date?
    lastPaymentDate:         Date?
    firstInvoiceDate:        Date?
    totalInvoiceCount:       integer
    revenueRank:             integer     ← rank por lifetime billed dentro del Business
}
```

---

### ORM-03: WorkEventListViewModel

**Sirve a:** Listado de turnos con filtros por empleado, cliente, período

**Construido desde:** WorkEventCreated, WorkEventImported, WorkEventConfirmed, WorkEventVoided, WorkEventInvoiced

```
WorkEventListViewModel {
    businessId:         ObjectId
    workEventId:        ObjectId
    userId:             ObjectId
    userName:           string        ← desnormalizado
    customerId:         ObjectId
    customerName:       string        ← desnormalizado
    contractId:         ObjectId?
    contractTitle:      string?       ← desnormalizado
    rateName:           string?       ← desnormalizado
    workDate:           Date
    period:             string
    durationFormatted:  string        — '8h 30m'
    durationHours:      decimal
    calculatedAmount:   decimal
    currency:           string
    status:             string
    billable:           boolean
    source:             string
    calendarEventTitle: string?
    invoiceNumber:      string?       ← si ya fue facturado
}
```

---

### ORM-04: ContractStatusViewModel

**Sirve a:** Listado de contratos con estado y métricas

**Construido desde:** ContractCreated, ContractActivated, ContractCompleted, WorkEventConfirmed, InvoiceSent

```
ContractStatusViewModel {
    businessId:                  ObjectId
    contractId:                  ObjectId
    customerId:                  ObjectId
    customerName:                string
    title:                       string
    status:                      string
    startDate:                   Date
    endDate:                     Date?
    billingCycle:                string
    defaultRateAmount:           decimal?
    confirmedPendingHours:       decimal   ← horas confirmadas sin facturar
    confirmedPendingAmount:      decimal   ← valor estimado
    totalInvoicedAmount:         decimal   ← histórico
    lastWorkEventDate:           Date?
    lastInvoiceDate:             Date?
    activeRateCount:             integer
}
```

---

### ORM-05: CommunicationHistoryViewModel

**Sirve a:** Log de comunicaciones enviadas

**Construido desde:** CommunicationDelivered, CommunicationFailed

```
CommunicationHistoryViewModel {
    businessId:       ObjectId
    logId:            ObjectId
    eventKey:         string
    resourceType:     string?    — 'invoice' | 'user' | 'system'
    resourceId:       ObjectId?
    resourceNumber:   string?    ← ej: 'INV-042' si es una factura
    recipientEmail:   string
    channel:          string
    success:          boolean
    requestedAt:      DateTime
    errorMessage:     string?
}
```

---

## Financial Read Models

Sirven a las pantallas financieras y al contador.

---

### FRM-01: RevenueByPeriodViewModel

**Sirve a:** Revenue chart, P&L summary

**Construido desde:** InvoiceSent, InvoiceVoided, PaymentRecorded

```
RevenueByPeriodViewModel {
    businessId:          ObjectId
    period:              string
    grossRevenue:        decimal
    netRevenue:          decimal
    taxCollected:        decimal
    voidedAmount:        decimal
    cashCollected:       decimal
    outstanding:         decimal
    invoiceCount:        integer
    paidCount:           integer
    collectionRate:      decimal    — cashCollected / grossRevenue
}
```

---

### FRM-02: AccountsReceivableViewModel

**Sirve a:** AR dashboard, aging report

**Construido desde:** InvoiceSent, InvoicePaid, InvoiceVoided, PaymentRecorded

```
AccountsReceivableViewModel {
    businessId:          ObjectId
    asOf:                DateTime
    totalOutstanding:    decimal
    current:             decimal
    overdue1to30:        decimal
    overdue31to60:       decimal
    overdue61to90:       decimal
    overdue90plus:       decimal

    // Por cliente
    byCustomer: [
        {
            customerId:          ObjectId
            customerName:        string
            outstanding:         decimal
            overdue:             decimal
            oldestInvoiceDays:   integer
            invoiceCount:        integer
        }
    ]
}
```

---

### FRM-03: GSTPositionViewModel (Australia)

**Sirve a:** BAS preparation, GST tax dashboard

**Construido desde:** InvoiceSent, PaymentRecorded (con GST), TAX_PAYMENT FinancialTransactions

```
GSTPositionViewModel {
    businessId:        ObjectId
    period:            string    — trimestre fiscal
    fiscalQuarter:     integer

    // Outputs del BAS
    totalSales:        decimal   — W1
    exportSales:       decimal   — W2
    gstCollected:      decimal   — G1
    gstClaimable:      decimal   — G11 (disponible en Fase 6)
    netGSTPayable:     decimal   — 1A
    isRefund:          boolean

    lodgmentDueDate:   Date
    lodged:            boolean
    lodgedAt:          DateTime?
}
```

---

### FRM-04: GeneralLedgerSummaryViewModel

**Sirve a:** Trial balance UI, accountant view

**Construido desde:** JournalEntryPosted, FiscalPeriodClosed

```
GeneralLedgerSummaryViewModel {
    businessId:      ObjectId
    fiscalPeriod:    string
    isLocked:        boolean
    accounts: [
        {
            accountCode:      string
            accountName:      string
            accountType:      string
            openingBalance:   decimal
            totalDebits:      decimal
            totalCredits:     decimal
            closingBalance:   decimal
        }
    ]
    totalDebits:     decimal
    totalCredits:    decimal
    isBalanced:      boolean
}
```

---

## Executive Read Models

Vistas compuestas y pre-calculadas para los KPIs del dashboard ejecutivo.

---

### ERM-01: BusinessDashboardViewModel

**Sirve a:** Pantalla principal del Business Owner

**Construido desde:** Todos los eventos relevantes

```
BusinessDashboardViewModel {
    businessId:      ObjectId
    period:          string
    calculatedAt:    DateTime
    freshness:       string    — 'realtime' | 'cached'

    revenue: {
        thisMonth:          decimal
        prevMonth:          decimal
        growthPct:          decimal
        cashCollected:      decimal
        outstanding:        decimal
        collectionRate:     decimal
    }

    ar: {
        totalOutstanding:   decimal
        overdue:            decimal
        overdueRatio:       decimal
        dso:                decimal
    }

    work: {
        hoursThisMonth:     decimal
        billableHours:      decimal
        billableRatio:      decimal
        unbilledHours:      decimal
        unbilledEstimate:   decimal
    }

    invoices: {
        draft:     integer
        sent:      integer
        overdue:   integer
        paidThisMonth: integer
    }

    topCustomers: [
        { customerId, customerName, revenue }    — top 5
    ]

    alerts: [
        { type, severity, message, count?, amount? }
    ]
}
```

---

### ERM-02: BusinessKPIViewModel

**Sirve a:** KPI panel — valores únicos para tarjetas métricas

**Construido desde:** Múltiples eventos

```
BusinessKPIViewModel {
    businessId:               ObjectId
    calculatedAt:             DateTime
    period:                   string

    grossRevenue:             decimal
    netRevenue:               decimal
    cashCollected:            decimal
    revenueGrowthPct:         decimal
    totalAROutstanding:       decimal
    overdueAR:                decimal
    dso:                      decimal
    collectionsRate:          decimal
    totalHours:               decimal
    billableHours:            decimal
    billableRatio:            decimal
    effectiveHourlyRate:      decimal
    unbilledHours:            decimal
    unbilledAmount:           decimal
    activeCustomers:          integer
    invoiceCount:             integer
    overdueInvoiceCount:      integer
    gstCollected:             decimal?      — si Fase 4+
    netProfit:                decimal?      — si Fase 4+
}
```

---

## Report Read Models

Datos estructurados para generación de reportes PDF/CSV.

---

### RRM-01: InvoiceDetailReportModel

**Sirve a:** Generación de listado detallado de facturas para exportar

```
InvoiceDetailReportModel {
    // Metadata del reporte
    generatedAt:         DateTime
    businessId:          ObjectId
    businessName:        string
    period:              string
    currency:            string

    // Summary
    totalInvoices:       integer
    totalGross:          decimal
    totalPaid:           decimal
    totalOutstanding:    decimal
    totalVoided:         decimal

    // Rows
    invoices: [
        {
            invoiceNumber
            customerName
            issueDate
            dueDate
            status
            grossAmount
            taxAmount
            amountPaid
            amountDue
            daysOverdue?
        }
    ]
}
```

---

## Forecast Read Models

*Disponibles en Fase 3 de Analytics.*

---

### FORE-01: RevenueForecastViewModel

**Sirve a:** Forecast chart, revenue planning

**Construido desde:** Análisis histórico + modelos de proyección

```
RevenueForecastViewModel {
    businessId:      ObjectId
    generatedAt:     DateTime
    modelVersion:    string

    historical: [
        { period, grossRevenue }    — últimos 12 meses
    ]

    forecast: [
        {
            period:         string
            predicted:      decimal
            lowerBound:     decimal    — intervalo de confianza 80%
            upperBound:     decimal
            confidence:     decimal    — 0.0-1.0
        }
    ]

    accuracy: {
        mape:   decimal
        rmse:   decimal
    }

    assumptions: string[]
}
```

---

## Política de actualización de Read Models

| Read Model | Trigger de actualización | Política |
|---|---|---|
| ORM-01 InvoiceList | InvoiceSent, InvoicePaid, etc. | Inmediato (event handler) |
| ORM-02 CustomerSummary | InvoiceSent, PaymentRecorded | Inmediato |
| ORM-03 WorkEventList | WorkEventConfirmed, etc. | Inmediato |
| FRM-01 RevenueByPeriod | InvoiceSent, PaymentRecorded | Inmediato |
| FRM-02 AccountsReceivable | InvoiceSent, PaymentRecorded | Inmediato |
| FRM-03 GSTPosition | InvoiceSent, TaxPayment | Inmediato + batch semanal |
| FRM-04 GeneralLedger | JournalEntryPosted | Inmediato |
| ERM-01 BusinessDashboard | Todos los anteriores | Inmediato (compuesto) |
| ERM-02 BusinessKPI | Todos los anteriores | Batch cada 5 min |
| FORE-01 RevenueForecast | Batch semanal (domingo) | Batch periódico |

---

## Reconstrucción de Read Models

Si un Read Model necesita reconstruirse (por bug en handler, migración de schema, o nueva lógica):

```
Procedure: RebuildReadModel(modelType, businessId?, fromDate?)

1. Si businessId es null → rebuild para TODOS los tenants (operación larga, background)
2. Si fromDate es null → rebuild desde el inicio de los datos

Pasos:
  a. Marcar el Read Model como 'rebuilding'
  b. Eliminar los datos existentes del período
  c. Reproducir todos los eventos relevantes en orden cronológico
  d. Reconstruir el Read Model desde los Facts
  e. Marcar como 'active' al completar
  f. Business App recibe notificación de completion
```

Durante la reconstrucción, Business App puede:
- Mostrar datos del Read Model anterior (posiblemente stale)
- Mostrar un indicador de "datos actualizándose"
- Consultar directamente el dominio operativo para datos críticos

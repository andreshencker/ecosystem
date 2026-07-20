# 03 — Analytics Model (BC-10, MongoDB)

**Versión:** 1.1 | **Fecha:** 2026-07-06 | **Estado:** Diseño conceptual oficial

> **Scope de este documento:** El modelo descrito aquí es el del Analytics Store dentro de `business-app/backend` (MongoDB). Es el modelo **operacional** — Facts, Dimensions, Snapshots pre-calculados que sirven los dashboards del Business Owner. **No es el modelo dimensional de Business Intelligence** (PostgreSQL Neon). El modelo dimensional BI está definido en `docs/architecture/12-business-intelligence-architecture.md`.

El Analytics Model es la estructura conceptual que organiza los datos en el Analytics Store. No es un schema de base de datos. Es el vocabulario que describe cómo los datos analíticos están organizados y relacionados.

---

## Por qué el modelo analítico difiere del operativo

Los modelos operativos están optimizados para **escritura correcta y transaccional**:
- Normalización para evitar duplicación
- Validación de invariantes
- Transacciones ACID

Los modelos analíticos están optimizados para **lectura rápida y flexible**:
- Desnormalización para evitar joins costosos
- Precálculo de agregaciones
- Historial completo (nunca se borran hechos)
- Dimensiones que cambian con el tiempo

```
OPERATIVO:                    ANALÍTICO:
Invoice {                     InvoiceFact {
  id                            id
  customerId (ref)              customerId
  status (mutable)              customerName  ← desnormalizado
  ...                           status (al momento del evento)
}                               billedAmount
                                period
Customer {                      invoicedAt
  id                            ...
  name (mutable)              }
}
```

---

## Los cinco elementos del modelo

```
ANALYTICS MODEL
    │
    ├── FACTS          — Qué pasó (eventos inmutables)
    │
    ├── DIMENSIONS     — Quién, dónde, cuándo (contexto de los hechos)
    │
    ├── MEASURES       — Cuánto (valores numéricos derivados)
    │
    ├── SNAPSHOTS      — Estado acumulado en un momento dado
    │
    └── TIME SERIES    — Evolución de una medida a lo largo del tiempo
```

---

## Elemento 1 — Facts

Los Facts son **representaciones inmutables** de hechos de negocio ya ocurridos. Una vez registrado, un Fact nunca se modifica. Si el hecho es revertido (ej. una factura anulada), se registra un nuevo Fact de reversión — no se modifica el original.

### InvoiceFact

```
InvoiceFact {
    // Identidad
    factId:            UUID           — ID analítico único
    invoiceId:         ObjectId       — ID en Billing domain
    eventId:           UUID           — eventId del evento que lo originó (idempotencia)
    businessId:        ObjectId

    // Snapshot del momento del evento
    customerId:        ObjectId
    customerName:      string         ← desnormalizado (nombre al momento del envío)
    invoiceNumber:     string
    issueDate:         Date
    dueDate:           Date
    period:            string         — 'YYYY-MM' del issueDate

    // Montos
    subtotal:          decimal
    taxAmount:         decimal
    grossAmount:       decimal
    currency:          string
    baseCurrencyAmount: decimal        ← si hay cambio de moneda

    // Estado
    sentAt:            DateTime
    paidAt:            DateTime?
    voidedAt:          DateTime?
    overdueAt:         DateTime?
    isVoided:          boolean
    isPaid:            boolean

    // Contexto
    workEventCount:    integer        — cuántos WorkEvents incluyó
    jurisdicction:     string
}
```

**Por qué desnormalizar `customerName`:**
Si la consulta "Revenue by Customer" necesita el nombre del customer, y solo tenemos `customerId`, habría que hacer un join con `CustomerDimension`. Pero ¿qué nombre usamos? ¿El nombre actual o el nombre al momento de la factura? Al desnormalizar en el momento del evento, capturamos el estado histórico correcto.

---

### PaymentFact

```
PaymentFact {
    factId:            UUID
    paymentId:         ObjectId
    businessId:        ObjectId
    invoiceId:         ObjectId
    customerId:        ObjectId
    customerName:      string         ← desnormalizado

    amount:            decimal
    currency:          string
    paymentDate:       Date
    period:            string          — 'YYYY-MM' del paymentDate

    method:            string          — 'bank_transfer', 'cash', 'card', 'other'
    isReversed:        boolean
    reversedAt:        DateTime?

    daysToPayment:     integer         ← (paymentDate - invoiceIssueDate) calculado al ingerir
}
```

`daysToPayment` es un ejemplo de **medida derivada capturada en el Fact**. Calcularlo después requeriría un join. Calcularlo al ingerir es O(1).

---

### WorkEventFact

```
WorkEventFact {
    factId:            UUID
    workEventId:       ObjectId
    businessId:        ObjectId
    userId:            ObjectId
    userName:          string         ← desnormalizado
    customerId:        ObjectId
    customerName:      string         ← desnormalizado
    contractId:        ObjectId?
    contractTitle:     string?        ← desnormalizado

    workDate:          Date
    period:            string          — 'YYYY-MM'
    durationMinutes:   integer
    durationHours:     decimal         ← calculado (minutes/60)
    calculatedAmount:  decimal
    currency:          string
    billable:          boolean
    rateType:          string          — 'standard', 'overtime', 'weekend', etc.

    confirmedAt:       DateTime
    invoicedAt:        DateTime?
    isVoided:          boolean
    source:            string          — 'manual', 'calendar'
}
```

---

### JournalFact

```
JournalFact {
    factId:            UUID
    journalEntryId:    ObjectId
    businessId:        ObjectId
    sourceTransactionId: ObjectId?    — FinancialTransaction origen

    entryDate:         Date
    period:            string
    fiscalPeriod:      string

    totalDebits:       decimal
    totalCredits:      decimal        — siempre igual a totalDebits (asiento cuadrado)
    currency:          string

    accountsAffected:  [
        {
            accountCode:   string
            accountName:   string     ← desnormalizado
            accountType:   string     — 'asset', 'liability', 'revenue', etc.
            side:          'debit' | 'credit'
            amount:        decimal
        }
    ]

    transactionType:   string         — tipo de FinancialTransaction origen
    postedAt:          DateTime
}
```

---

## Elemento 2 — Dimensions

Las Dimensions son entidades que dan **contexto** a los Facts. A diferencia de los Facts, las Dimensions pueden cambiar (SCD — Slowly Changing Dimensions).

### BusinessDimension

```
BusinessDimension {
    businessId:        ObjectId
    businessName:      string
    jurisdiction:      string
    currency:          string
    timezone:          string
    hasCompleteFiscalProfile: boolean
    activeUsersCount:  integer
    createdAt:         DateTime
    planType:          string         — futuro: 'free', 'starter', 'pro', 'enterprise'
}
```

### CustomerDimension

```
CustomerDimension {
    customerId:        ObjectId
    businessId:        ObjectId

    // SCD Type 1 (sobrescritura — no hay historial de cambios de nombre)
    name:              string
    type:              string          — 'company' | 'individual'
    isActive:          boolean

    // Métricas calculadas (actualizadas por batch job)
    lifetimeBilled:    decimal
    lifetimeCollected: decimal
    outstandingBalance: decimal
    firstInvoiceDate:  Date?
    lastInvoiceDate:   Date?
    averagePaymentDays: decimal?
    invoiceCount:      integer
}
```

**SCD Type 1 vs Type 2:**
- Type 1 (usado en `CustomerDimension.name`): cuando el cliente cambia de nombre, solo guardamos el nuevo. No necesitamos el historial del nombre para analytics financiero.
- Type 2 (para datos donde el historial importa): se guarda la versión anterior con `validTo` y se crea una nueva entrada con `validFrom`. Ejemplo: si la tasa del GST cambia, necesitamos saber qué tasa aplicaba en cada período.

### TimeDimension

```
TimeDimension {
    dateKey:           Date            — 2026-07-05

    year:              integer         — 2026
    quarter:           integer         — 3 (Q3)
    fiscalQuarter:     integer         — depende de la jurisdicción
    month:             integer         — 7
    monthName:         string          — 'July'
    week:              integer         — 27 (ISO week)
    dayOfWeek:         integer         — 6 (Saturday)
    dayOfMonth:        integer         — 5
    isWeekend:         boolean
    isPublicHoliday:   boolean?        — futuro (por jurisdicción)
    fiscalYear:        integer         — puede diferir del año calendario (AU: julio-junio)
}
```

La Time Dimension es especial: se pre-genera para todos los días de los próximos 10 años. Es una tabla estática que nunca se actualiza por eventos.

---

## Elemento 3 — Measures

Las Measures son **valores numéricos derivados** que se calculan desde los Facts. No se almacenan como entidades independientes — se calculan en el Query Engine cuando se solicitan, o se pre-calculan en los Snapshots.

### Measures de Revenue

```
GrossRevenue(businessId, period)
    = SUM(InvoiceFact.grossAmount)
      WHERE businessId = X AND period = P AND isVoided = false

NetRevenue(businessId, period)
    = SUM(InvoiceFact.subtotal)
      WHERE businessId = X AND period = P AND isVoided = false

TaxCollected(businessId, period)
    = SUM(InvoiceFact.taxAmount)
      WHERE businessId = X AND period = P AND isVoided = false

CashCollected(businessId, period)
    = SUM(PaymentFact.amount)
      WHERE businessId = X AND period = P AND isReversed = false
```

### Measures de Accounts Receivable

```
TotalAR(businessId, asOf)
    = SUM(InvoiceFact.grossAmount - paymentsApplied)
      WHERE businessId = X AND sentAt <= asOf AND isPaid = false AND isVoided = false

OverdueAR(businessId, asOf)
    = TotalAR WHERE overdueAt IS NOT NULL

OverdueRatio(businessId, asOf)
    = OverdueAR / TotalAR
```

### Measures de Work

```
TotalHours(businessId, period)
    = SUM(WorkEventFact.durationHours)
      WHERE businessId = X AND period = P AND isVoided = false

BillableHours(businessId, period)
    = SUM WHERE billable = true

BillableRatio(businessId, period)
    = BillableHours / TotalHours

EffectiveHourlyRate(businessId, period)
    = GrossRevenue / BillableHours
```

---

## Elemento 4 — Snapshots

Los Snapshots son **agregaciones pre-calculadas para un momento o período dado**. Almacenarlos evita recalcular sobre todos los Facts en cada query.

### RevenueSnapshot

```
RevenueSnapshot {
    snapshotId:         UUID
    businessId:         ObjectId
    period:             string         — 'YYYY-MM'
    calculatedAt:       DateTime

    grossRevenue:       decimal
    netRevenue:         decimal
    taxCollected:       decimal
    voidedAmount:       decimal
    cashCollected:      decimal
    outstandingAmount:  decimal

    invoiceCount:       integer
    paidInvoiceCount:   integer
    voidedInvoiceCount: integer
    overdueInvoiceCount: integer

    averageInvoiceValue: decimal
}
```

Calculado: al final de cada día (batch job nocturno). Actualizado incrementalmente en tiempo real cuando llega un evento.

---

### ARSnapshot

```
ARSnapshot {
    snapshotId:         UUID
    businessId:         ObjectId
    asOf:               DateTime       — exactamente cuándo fue calculado
    calculatedAt:       DateTime

    totalOutstanding:   decimal
    current:            decimal        — no vencido
    overdue1to30:       decimal
    overdue31to60:      decimal
    overdue61to90:      decimal
    overdue90plus:      decimal

    byCustomer: [
        {
            customerId:       ObjectId
            customerName:     string
            outstanding:      decimal
            oldestInvoiceDays: integer
        }
    ]
}
```

Calculado: cada hora durante el horario laboral.

---

### PeriodSnapshot (General Ledger)

```
PeriodSnapshot {
    snapshotId:         UUID
    businessId:         ObjectId
    fiscalPeriod:       string         — 'YYYY-QN' o 'YYYY-MM'
    isClosed:           boolean
    isLocked:           boolean
    closedAt:           DateTime?

    // Balances de apertura y cierre
    accounts: [
        {
            accountCode:    string
            accountName:    string
            accountType:    string
            openingBalance: decimal
            totalDebits:    decimal
            totalCredits:   decimal
            closingBalance: decimal
        }
    ]

    totalRevenue:       decimal        — suma de cuentas de Revenue
    totalExpenses:      decimal        — suma de cuentas de Expense
    netProfit:          decimal        — Revenue - Expenses
}
```

Calculado: cuando se cierra el período fiscal (evento `FiscalPeriodClosed`).

---

## Elemento 5 — Time Series

Un Time Series es una secuencia ordenada de la misma medida a lo largo del tiempo. Es el elemento que permite ver tendencias, crecimiento y estacionalidad.

```
RevenueTimeSeries {
    businessId: ObjectId
    metric:     'gross_revenue' | 'cash_collected' | 'outstanding_ar'
    granularity: 'daily' | 'weekly' | 'monthly' | 'quarterly'

    dataPoints: [
        { period: '2026-01', value: 15000.00 },
        { period: '2026-02', value: 12000.00 },
        { period: '2026-03', value: 18000.00 },
        ...
    ]

    // Métricas derivadas
    trend:            'up' | 'down' | 'flat'
    growthPct:        decimal              — vs período anterior
    yoyGrowthPct:     decimal              — vs mismo período año anterior
    movingAvg3:       decimal[]             — media móvil 3 períodos
}
```

---

## Slowly Changing Dimensions (SCD)

Las dimensiones no son siempre estáticas. Cuando un Customer cambia su nombre, o cuando cambia la tasa de GST, los datos históricos deben seguir siendo correctos.

### Estrategias por dimensión

| Dimensión | Campo | Estrategia | Justificación |
|---|---|---|---|
| CustomerDimension | name | SCD Type 1 (sobrescritura) | Para analytics, el nombre actual es suficiente |
| CustomerDimension | lifetimeBilled | Calculado (no SCD) | Siempre actual |
| InvoiceFact | customerName | Snapshot al momento del evento | Capture del nombre histórico exacto |
| TimeDimension | isPublicHoliday | SCD Type 1 | Las fechas de feriados rara vez cambian retroactivamente |
| PostingRuleVersion | effectiveFrom | SCD Type 2 (historial) | El período al que aplica una regla es inmutable |

---

## Relación entre los elementos

```
TIME DIMENSION                    BUSINESS DIMENSION
     │                                    │
     │                           CUSTOMER DIMENSION
     │                                    │
     └────────────────┬───────────────────┘
                      │
                 INVOICE FACT
                 PAYMENT FACT
                 WORKEVENT FACT
                 JOURNAL FACT
                      │
                      ▼
                  MEASURES
                 (calculados)
                      │
                      ▼
                  SNAPSHOTS
               (pre-calculados)
                      │
                      ▼
                 TIME SERIES
              (tendencias históricas)
```

Los Facts son la base. Las Dimensions los contextualizan. Las Measures los cuantifican. Los Snapshots los aceleran. Los Time Series los narran en el tiempo.

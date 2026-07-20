# 06 — Query Contracts

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual oficial

Un Query Contract define el **contrato formal** entre Business App (el único caller autorizado) y Analytics (el proveedor). Es tecnológicamente agnóstico: no es REST, no es GraphQL, no es gRPC. Es el contrato semántico que cualquier implementación debe respetar.

---

## Estructura de un Query Contract

```
QueryContract {
    name:           string         — nombre canónico del contrato
    description:    string         — qué responde
    input:          QueryInput     — parámetros de entrada
    guarantees:     string[]       — lo que Analytics garantiza sobre la respuesta
    freshness:      FreshnessLevel — qué tan actualizada es la respuesta
    output:         QueryOutput    — estructura de la respuesta
}

FreshnessLevel {
    'realtime'   — datos reflejan eventos con lag < 2 segundos
    'near_realtime' — lag < 30 segundos
    'eventual'   — lag hasta 1 hora (snapshots batch)
    'periodic'   — actualizado en un schedule específico
}
```

---

## Contratos de Revenue

### QC-REV-001: GetRevenueByMonth

```
QueryContract {
    name:        'GetRevenueByMonth'
    description: 'Retorna el revenue mensual bruto y neto en un rango de fechas'

    input: {
        businessId:  ObjectId     — REQUERIDO
        dateFrom:    Date         — REQUERIDO (primer día del mes más antiguo)
        dateTo:      Date         — REQUERIDO (último día del mes más reciente)
        currency:    string?      — OPCIONAL (default: currency del Business)
        includeVoided: boolean?   — OPCIONAL (default: false)
    }

    guarantees: [
        'Retorna exactamente un row por mes dentro del rango',
        'Los meses sin actividad tienen valor 0, no se omiten',
        'Todos los amounts están en la currency solicitada',
        'El campo period sigue el formato YYYY-MM',
        'dateFrom y dateTo son inclusivos a nivel de mes (no de día)',
    ]

    freshness: 'realtime'

    output: Dataset<RevenueByMonthRow>
}
```

**Restricciones:**
- `dateTo - dateFrom` no puede superar 36 meses (3 años) en una sola llamada
- Business App puede hacer múltiples llamadas si necesita rango mayor

---

### QC-REV-002: GetRevenueByCustomer

```
QueryContract {
    name:        'GetRevenueByCustomer'
    description: 'Retorna el revenue agrupado por cliente para un período dado'

    input: {
        businessId:  ObjectId     — REQUERIDO
        period:      string       — REQUERIDO ('YYYY-MM' | 'YYYY-QN' | 'YYYY')
        limit:       integer?     — OPCIONAL (default: 50, max: 200)
        minRevenue:  decimal?     — OPCIONAL (filtro mínimo de revenue)
        sortBy:      string?      — OPCIONAL ('revenue_desc' | 'customer_name')
    }

    guarantees: [
        'Retorna exactamente un row por Customer activo en el período',
        'Los amounts están en la currency del Business',
        'Si limit < total de customers, retorna los top N por revenue',
        'El campo revenuePct suma 100 exactamente (o 99.9x por redondeo)',
    ]

    freshness: 'realtime'

    output: Dataset<RevenueByCustomerRow>
}
```

---

## Contratos de Accounts Receivable

### QC-AR-001: GetARAgingReport

```
QueryContract {
    name:        'GetARAgingReport'
    description: 'Retorna todas las facturas no pagadas clasificadas por antigüedad de vencimiento'

    input: {
        businessId:  ObjectId    — REQUERIDO
        asOf:        Date?       — OPCIONAL (default: hoy)
        customerId:  ObjectId?   — OPCIONAL (filtrar por cliente específico)
    }

    guarantees: [
        'Solo incluye facturas con amountDue > 0',
        'Facturas anuladas no aparecen',
        'daysOverdue es 0 para facturas no vencidas (current bucket)',
        'Los buckets de aging son mutuamente excluyentes y exhaustivos',
        'El summary.totalOutstanding === sum(rows.amountDue)',
    ]

    freshness: 'realtime'

    output: Dataset<ARAgingRow>
}
```

---

### QC-AR-002: GetARSnapshot

```
QueryContract {
    name:        'GetARSnapshot'
    description: 'Retorna los saldos de AR agrupados en buckets de aging'

    input: {
        businessId:  ObjectId    — REQUERIDO
        asOf:        Date?
    }

    guarantees: [
        'El snapshot refleja el estado en el momento asOf',
        'Si asOf es en el pasado, retorna el snapshot más cercano disponible',
        'La suma de todos los buckets === totalOutstanding',
    ]

    freshness: 'near_realtime'

    output: ARSnapshot
}
```

---

## Contratos de Work

### QC-WORK-001: GetHoursByPeriod

```
QueryContract {
    name:        'GetHoursByPeriod'
    description: 'Retorna el resumen de horas trabajadas por mes en un rango'

    input: {
        businessId:  ObjectId    — REQUERIDO
        dateFrom:    Date        — REQUERIDO
        dateTo:      Date        — REQUERIDO
        userId:      ObjectId?   — OPCIONAL (filtrar por empleado)
        customerId:  ObjectId?   — OPCIONAL (filtrar por cliente)
        billable:    boolean?    — OPCIONAL (solo billable o solo non-billable)
    }

    guarantees: [
        'Un row por período dentro del rango',
        'Períodos sin actividad tienen valor 0',
        'durationHours tiene precisión de 2 decimales',
        'billableRatio está en escala 0.0 a 1.0 (no porcentaje)',
    ]

    freshness: 'realtime'

    output: Dataset<HoursByPeriodRow>
}
```

---

### QC-WORK-002: GetUnbilledWorkSummary

```
QueryContract {
    name:        'GetUnbilledWorkSummary'
    description: 'Retorna las horas confirmadas que no han sido facturadas todavía'

    input: {
        businessId:  ObjectId    — REQUERIDO
        customerId:  ObjectId?   — OPCIONAL
    }

    guarantees: [
        'Solo incluye WorkEvents con status: confirmed Y invoicedAt IS NULL',
        'estimatedAmount es calculado con la Rate del WorkEvent (si existe) o null',
        'No incluye WorkEvents voided',
    ]

    freshness: 'realtime'

    output: Dataset<UnbilledWorkRow>
}
```

---

## Contratos de Dashboard

### QC-DASH-001: GetBusinessDashboard

```
QueryContract {
    name:        'GetBusinessDashboard'
    description: 'Dataset compuesto con todos los KPIs del dashboard principal'

    input: {
        businessId:    ObjectId    — REQUERIDO
        period:        string?     — OPCIONAL (default: mes actual)
        includeTrends: boolean?    — OPCIONAL (default: true — incluye comparación con período anterior)
    }

    guarantees: [
        'Todos los campos numéricos tienen valor (nunca null — 0 si no hay datos)',
        'alerts[] está siempre presente (puede estar vacío)',
        'La respuesta incluye el timestamp generatedAt para cache invalidation',
        'El campo period en la respuesta siempre refleja el período real consultado',
    ]

    freshness: 'realtime'

    output: BusinessDashboardDataset
}
```

**Nota sobre freshness:**
Business App puede cachear esta respuesta por hasta 60 segundos para reducir carga. Analytics no impone el cache — eso es responsabilidad de Business App.

---

## Contratos Financieros

### QC-FIN-001: GetProfitAndLoss

```
QueryContract {
    name:        'GetProfitAndLoss'
    description: 'Estado de resultados para un período fiscal'

    input: {
        businessId:    ObjectId    — REQUERIDO
        fiscalPeriod:  string      — REQUERIDO ('YYYY-QN' | 'YYYY-MM' | 'YYYY')
        compareWith:   string?     — OPCIONAL (período anterior para comparación)
    }

    preconditions: [
        'El businessId debe tener un Chart of Accounts configurado',
        'Debe haber al menos un JournalEntry en el período',
    ]

    guarantees: [
        'Revenue.total + CostOfSales.total + OperatingExpenses.total = 0 - NetProfit (identidad contable)',
        'byAccount[] lista solo cuentas con movimiento en el período',
        'Si el período no está cerrado, los datos son provisionales (isProvisional: true)',
    ]

    freshness: 'eventual'    — puede tener hasta 1 hora de lag respecto a JournalEntryPosted

    output: ProfitAndLossDataset
}
```

---

### QC-FIN-002: GetTrialBalance

```
QueryContract {
    name:        'GetTrialBalance'
    description: 'Balance de sumas y saldos del período fiscal'

    input: {
        businessId:   ObjectId    — REQUERIDO
        fiscalPeriod: string      — REQUERIDO
    }

    guarantees: [
        'La suma de totalDebits === suma de totalCredits (si no, hay un error crítico en Accounting)',
        'isBalanced siempre es true en producción — false indica error del sistema',
        'Incluye todas las cuentas del Chart of Accounts, aunque tengan saldo 0',
    ]

    freshness: 'eventual'

    output: TrialBalanceDataset
}
```

---

## Contratos de KPIs individuales

### QC-KPI-001: GetKPI

```
QueryContract {
    name:        'GetKPI'
    description: 'Retorna un KPI específico calculado para un período dado'

    input: {
        businessId:  ObjectId    — REQUERIDO
        kpiName:     string      — REQUERIDO (ver KPI Catalog)
        period:      string      — REQUERIDO
        includeTrend: boolean?   — OPCIONAL (default: true)
    }

    guarantees: [
        'Si el kpiName no existe, retorna error KPI_NOT_FOUND',
        'Si no hay datos suficientes para calcular el trend, trend es null',
        'El campo calculatedAt indica la frescura real del dato',
    ]

    freshness:  depends_on_kpi    — varía según el KPI (ver KPI Catalog)

    output: KPIResult
}
```

---

### QC-KPI-002: GetMultipleKPIs

```
QueryContract {
    name:        'GetMultipleKPIs'
    description: 'Retorna múltiples KPIs en una sola llamada (batch KPI fetch)'

    input: {
        businessId:  ObjectId    — REQUERIDO
        kpiNames:    string[]    — REQUERIDO (max: 20 KPIs por llamada)
        period:      string      — REQUERIDO
    }

    guarantees: [
        'Retorna todos los KPIs solicitados aunque algunos tengan valor null',
        'KPIs no disponibles en las fases actuales retornan status: unavailable',
        'La respuesta sigue el mismo orden que kpiNames[]',
    ]

    freshness: 'realtime'

    output: { results: KPIResult[] }
}
```

---

## Contratos de Export

### QC-EXP-001: GetDatasetForExport

```
QueryContract {
    name:        'GetDatasetForExport'
    description: 'Retorna un dataset completo preparado para exportar (CSV / PDF)'

    input: {
        businessId:    ObjectId    — REQUERIDO
        datasetName:   string      — REQUERIDO (ver Dataset Catalog)
        params:        object      — REQUERIDO (parámetros específicos del dataset)
        format:        'csv' | 'json'  — REQUERIDO
        maxRows:       integer?    — OPCIONAL (default: 10000)
    }

    guarantees: [
        'Si format es csv, los headers siguen el nombre canónico de cada campo',
        'Los valores decimales usan punto como separador (no coma)',
        'Las fechas siguen ISO 8601 (YYYY-MM-DD)',
        'Los campos nulos se representan como cadena vacía en CSV',
    ]

    freshness: 'same_as_dataset'

    output: ExportableDataset
}
```

---

## Manejo de errores en contratos

Todo Query Contract puede retornar uno de estos errores:

| Error | Significado |
|---|---|
| `INVALID_BUSINESS_ID` | El businessId no existe en Analytics |
| `INVALID_DATE_RANGE` | dateFrom > dateTo o el rango excede el límite |
| `DATASET_NOT_FOUND` | El nombre del dataset no existe en el catálogo |
| `KPI_NOT_FOUND` | El nombre del KPI no existe en el catálogo |
| `INSUFFICIENT_DATA` | No hay suficientes datos históricos para el cálculo (ej. forecast) |
| `PERIOD_NOT_CLOSED` | El período fiscal aún no está cerrado (para P&L, Trial Balance) |
| `STORE_UNAVAILABLE` | El Analytics Store no está disponible temporalmente |

Business App es el responsable de traducir estos errores al formato HTTP/gRPC que el Frontend entiende. Analytics nunca devuelve códigos HTTP.

---

## Principios de los contratos

**PC-01 — Los contratos son estables**
Una vez publicado, el contrato no cambia su nombre ni sus campos de salida sin un período de deprecación. Business App depende de estos contratos para funcionar.

**PC-02 — Los contratos son independientes de la implementación**
El mismo contrato puede implementarse con una base de datos columnar, un data lake, o un store en memoria. El caller no sabe la diferencia.

**PC-03 — Los contratos no devuelven errores de dominio operativo**
Si una Invoice fue anulada, Analytics no retorna error — simplemente no la incluye en los totales. Los errores de Analytics son errores de consulta, no errores de negocio.

**PC-04 — Los contratos siempre incluyen metadata**
Toda respuesta incluye `{ businessId, period, calculatedAt, freshness }` para que Business App pueda hacer cache invalidation y mostrar el timestamp de los datos al usuario.

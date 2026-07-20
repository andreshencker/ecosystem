# 08 — Machine Learning

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual — Fase 4+ de Analytics

Este documento diseña cómo Analytics evolucionará hacia capacidades de Machine Learning e Inteligencia Artificial. No describe una implementación. Describe los modelos conceptuales, sus entradas, sus salidas, y sus dependencias — para que cuando llegue el momento de implementar, no haya decisiones arquitectónicas que tomar.

---

## Principio fundamental de ML en Analytics

> **Los modelos de ML son consumidores del Analytics Store. Nunca son productores de datos operativos. Sus predicciones son siempre opcionales y nunca bloquean ninguna operación del negocio.**

```
CORRECTO:
  ML Model predice "esta factura tiene 70% de probabilidad de pagarse tarde"
  → La predicción aparece como una alerta opcional en el dashboard
  → El Business Owner puede ignorarla o actuar en consecuencia
  → Si el modelo no está disponible, el dashboard sigue funcionando

INCORRECTO:
  ML Model bloquea el envío de una factura hasta hacer una predicción
  ML Model modifica el estado de una factura automáticamente
  ML Model genera cobros automáticos sin acción humana
```

---

## ML-001: Revenue Forecast

### Qué responde
*"¿Cuánto debería facturar el próximo mes/trimestre?"*

### Por qué es valioso
Un freelancer con contratos recurrentes puede proyectar su ingreso con razonable precisión. Esta predicción permite planificar gastos, inversiones, y el calendario de vacaciones.

### Entradas del modelo

```
Training data (histórico):
  ├── RevenueByPeriodViewModel (últimos 24+ meses)
  ├── ContractStatusViewModel (contratos activos y su billingCycle)
  ├── CustomerDimension (clientes activos y su comportamiento)
  ├── WorkloadSnapshot (horas promedio por mes)
  └── SeasonalityFactors (de TimeDimension — holidays, patrones históricos)

Input para inferencia (tiempo real):
  ├── businessId
  ├── activeContracts: [{ contractId, estimatedMonthlyHours, rate }]
  ├── forecastHorizon: integer (días)
  └── includeSeasonality: boolean
```

### Salida del modelo

```
RevenueForecast {
    businessId:      ObjectId
    generatedAt:     DateTime
    horizon:         integer

    predictions: [
        {
            period:         string
            predicted:      decimal
            lowerBound:     decimal    — CI 80%
            upperBound:     decimal    — CI 80%
            confidence:     decimal    — 0.0 a 1.0
            components: {
                contractRevenue:    decimal   — de contratos activos
                estimatedNewWork:   decimal   — estimación de trabajo nuevo
                seasonalAdjustment: decimal   — factor estacional
            }
        }
    ]

    modelMetrics: {
        algorithm:   string    — 'linear_regression' | 'arima' | 'prophet' | etc.
        mape:        decimal   — error promedio del backtesting
        rmse:        decimal
        trainedOn:   integer   — cantidad de meses de datos usados
        lastTrained: DateTime
    }
}
```

### Dependencias de datos

- Mínimo 6 meses de datos de Revenue para entrenamiento básico
- Mínimo 12 meses para detectar estacionalidad
- Mínimo 24 meses para estacionalidad anual confiable

### Limitaciones

- No predice nuevos clientes (solo proyecta basado en patrones existentes)
- No considera eventos externos (recesión, pérdida de un cliente clave)
- La predicción es una estimación probabilística, no una garantía

---

## ML-002: Late Payment Prediction (Invoice Payment Likelihood)

### Qué responde
*"¿Qué probabilidad tiene esta factura de pagarse fuera del plazo pactado?"*

### Por qué es valioso
Permite al Business Owner priorizar cuáles facturas requieren seguimiento proactivo, antes de que venzan.

### Entradas del modelo

```
Features por factura (en el momento del envío):
  ├── customer.averagePaymentDays    ← del CustomerDimension
  ├── customer.latePaymentRatio      ← % histórico de facturas pagadas tarde
  ├── invoice.grossAmount            ← facturas más grandes se pagan más tarde?
  ├── invoice.dueDate.dayOfWeek      ← viernes tiene más probabilidad de retraso
  ├── invoice.daysToPaymentFromTerms ← términos pactados (30/60/90 días)
  ├── customer.totalOutstandingOther ← si tiene otras facturas vencidas
  ├── period.month                   ← estacionalidad (diciembre = retrasos)
  └── customer.invoiceCount          ← los clientes frecuentes pagan más rápido?
```

### Salida del modelo

```
PaymentLikelihoodScore {
    invoiceId:           ObjectId
    scoredAt:            DateTime
    onTimeProb:          decimal    — probabilidad 0.0 a 1.0 de pago on time
    lateProb:            decimal    — probabilidad de pago tardío
    veryLateProb:        decimal    — probabilidad de pago muy tardío (> 90 días)
    predictedPaymentDate: Date?     — fecha de pago más probable
    riskLevel:           'low' | 'medium' | 'high' | 'very_high'
    topFactors: [
        { factor: string, contribution: decimal, direction: 'positive' | 'negative' }
    ]
}
```

### Cómo se usa en la UI

```
Invoice enviada → ML scoring ejecutado (async, < 5 segundos)
    → Si riskLevel = 'high' o 'very_high':
        → Dashboard muestra alerta: "Esta factura tiene alta probabilidad de retraso"
        → Business Owner puede elegir enviar recordatorio preventivo
        → Analytics registra la predicción (para evaluar accuracy del modelo)
    → Si riskLevel = 'low':
        → No se muestra ninguna alerta
```

---

## ML-003: Cash Flow Projection

### Qué responde
*"¿Cuánto dinero tendré disponible en los próximos 30/60/90 días?"*

### Por qué es valioso
Permite al Business Owner saber si puede aceptar un gasto grande, cuándo puede tomar vacaciones, o si necesita acelerar cobros.

### Entradas del modelo

```
├── ARSnapshot (facturas pendientes con dueDate)
├── PaymentLikelihoodScores (de ML-002)
├── RecurringExpenses (futuro — de Expenses domain)
├── ScheduledPayments (futuro — de AP domain)
└── historicalCashFlow (de CashFlowSnapshot)
```

### Salida del modelo

```
CashFlowProjection {
    horizon:    integer    — días

    projections: [
        {
            date:               Date
            openingBalance:     decimal
            expectedInflows:    decimal    — cobros esperados
            expectedOutflows:   decimal    — pagos esperados
            projectedBalance:   decimal
            confidence:         decimal

            inflows: [
                {
                    invoiceId:    ObjectId
                    invoiceNumber: string
                    amount:       decimal
                    expectedDate: Date
                    probability:  decimal
                }
            ]
        }
    ]

    riskAlerts: [
        {
            date:     Date
            type:     'low_cash' | 'cash_negative'
            balance:  decimal
            message:  string
        }
    ]
}
```

---

## ML-004: Customer Segmentation

### Qué responde
*"¿Cómo puedo clasificar a mis clientes según su comportamiento de pago y valor?"*

### Por qué es valioso
Permite al Business Owner enfocar sus esfuerzos en los clientes de mayor valor y menor riesgo, y tomar decisiones informadas sobre clientes problemáticos.

### Modelo conceptual

Segmentación no supervisada (clustering). Sin labels predefinidos — el modelo descubre los segmentos naturales.

```
Features por cliente:
  ├── lifetimeBilled
  ├── averagePaymentDays
  ├── latePaymentRatio
  ├── invoicesPerMonth (frecuencia)
  ├── averageInvoiceSize
  ├── customerAge (meses desde primera factura)
  └── revenueGrowthTrend
```

### Segmentos esperados (hipotéticos — el modelo los descubrirá)

| Segmento | Descripción | Estrategia |
|---|---|---|
| Champions | Alta facturación, pago rápido | Retener, ofrecer mejores condiciones |
| Loyal | Facturación media, pago consistente | Mantener, considerar expansión |
| At Risk | Alta facturación histórica, pagos recientes tardíos | Contacto proactivo |
| Dormant | Sin actividad en 90+ días | Campaña de reactivación |
| Low Value | Baja facturación, pago lento | Revisar si merece continuar |

### Salida del modelo

```
CustomerSegmentResult {
    customerId:      ObjectId
    segment:         string       — nombre del segmento
    segmentId:       integer
    score:           decimal      — distancia al centroide (confianza)
    features: {
        lifetimeBilled:       decimal
        averagePaymentDays:   decimal
        latePaymentRatio:     decimal
        // etc.
    }
    updatedAt:       DateTime
}
```

---

## ML-005: Anomaly Detection

### Qué responde
*"¿Hay algo inusual en mi actividad financiera hoy?"*

### Tipos de anomalías detectadas

| Anomalía | Descripción | Acción sugerida |
|---|---|---|
| Invoice de monto inusualmente alto | 3x mayor al promedio histórico | Verificar que no es un error de digitación |
| Aumento súbito de facturas vencidas | 50% más que el promedio | Revisar si hay problema de cobranza sistémico |
| Pago de un cliente inactivo (no esperado) | Cliente sin actividad en 180 días pagó | Verificar que es legítimo |
| Caída abrupta de horas trabajadas | 60% menos que el promedio semanal | Alerta de sub-utilización |
| WorkEvent con duración inusual | 24h en un solo día | Posible error de importación del calendario |

### Entradas del modelo

```
Para cada nuevo evento, el modelo compara contra:
  ├── Distribución histórica de la misma métrica
  ├── Media y desviación estándar del Business
  └── Reglas estáticas (WorkEvent > 18h = anomalía)
```

### Salida del modelo

```
AnomalyAlert {
    alertId:         UUID
    businessId:      ObjectId
    detectedAt:      DateTime
    entityType:      string
    entityId:        ObjectId
    anomalyType:     string
    severity:        'info' | 'warning' | 'critical'
    description:     string
    value:           decimal
    expectedRange:   { min: decimal, max: decimal }
    suggestedAction: string?
}
```

---

## ML-006: Business Performance Scoring

### Qué responde
*"¿Cómo está el desempeño de mi negocio en términos generales, en una escala del 1 al 100?"*

### Concepto

Un score compuesto que combina múltiples KPIs en un índice único, comparable entre períodos. Similar a un "credit score" pero para la salud del negocio.

```
BusinessHealthScore = weighted_average of:
  + CollectionRate (peso: 25%)
  + BillableRatio (peso: 20%)
  + RevenueGrowth (peso: 20%)
  + DSO (peso: 15%, invertido — menor DSO = mejor score)
  + InvoiceVoidRatio (peso: 10%, invertido)
  + CustomerConcentration (peso: 10%, invertido)
```

### Salida del modelo

```
BusinessHealthScore {
    businessId:      ObjectId
    period:          string
    score:           integer    — 0 a 100
    grade:           'A' | 'B' | 'C' | 'D' | 'F'
    trend:           'improving' | 'stable' | 'declining'
    components: [
        { metric, value, weight, contribution, benchmark }
    ]
    topImprovements: [
        { metric, currentValue, targetValue, potentialImpact }
    ]
}
```

---

## Infraestructura de ML — Diseño conceptual

```
ANALYTICS STORE
      │
      │  (batch export, frecuencia configurable)
      ▼
FEATURE STORE
  ├── CustomerFeatures (actualizado con cada InvoiceSent, PaymentRecorded)
  ├── BusinessFeatures (actualizado batch diario)
  └── InvoiceFeatures (calculado en el momento del scoring)

      │
      ▼
ML TRAINING PIPELINE (offline, batch semanal)
  ├── Extraer datos del Feature Store
  ├── Entrenar modelos
  ├── Evaluar accuracy (backtesting)
  ├── Si accuracy mejora → promover a producción
  └── Registrar métricas de cada entrenamiento

      │
      ▼
MODEL REGISTRY
  ├── RevenueForecasterV1 (deployed)
  ├── PaymentLikelihoodV2 (deployed)
  └── CustomerSegmenterV1 (in-training)

      │
      ▼
INFERENCE PIPELINE (online, < 5 segundos)
  ├── Recibe evento (InvoiceSent, WorkEventConfirmed)
  ├── Construye el feature vector
  ├── Llama al modelo del registry
  └── Almacena la predicción en Analytics Store
```

---

## Principios de ML en este ERP

**Principio ML-1 — Predicciones no bloquean operaciones**
El sistema funciona perfectamente sin ML. Las predicciones son un valor añadido, no un requisito.

**Principio ML-2 — Transparencia sobre el modelo**
El Business Owner siempre puede ver por qué se hizo una predicción (topFactors, assumptions).

**Principio ML-3 — Feedback loop incorporado**
Cuando el Business Owner actúa basado en una predicción (ej. envía un recordatorio porque el modelo dijo "riesgo alto"), el sistema registra la acción y el resultado para mejorar el modelo.

**Principio ML-4 — El ML opera sobre Analytics Store, nunca sobre datos operativos**
Los modelos nunca consultan la colección `invoices` de Billing directamente.

**Principio ML-5 — Privacidad por diseño**
Los datos de un Business nunca se usan para entrenar modelos que beneficien a otro Business. Los benchmarks comparativos usan únicamente datos agregados y anónimos.

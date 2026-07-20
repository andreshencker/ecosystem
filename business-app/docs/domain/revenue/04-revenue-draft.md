# 04 — Revenue Draft

**Versión:** 1.1 | **Fecha:** 2026-07-08 | **Estado:** ⚠ SUPERSEDADO PARCIALMENTE — ver ADR-023

> **ADR-023 (2026-07-08):** El WorkEvent ES el borrador vivo. No existe un concepto separado de `InvoiceDraft` ni de `RevenueDraft` como entidad persistida. Este documento es útil como modelo conceptual del flujo de acumulación, pero la implementación usará WorkEvent directamente como draft. Los campos `RevenueDraft` y `RevenueLine` descritos aquí corresponden en la implementación a `WorkEvent` y sus líneas calculadas por el BI. Ver `docs/decisions/ADR-023-work-event-as-revenue-draft.md`.

Un Revenue Draft es la representación viva del ingreso acumulado y pendiente de facturar para un período de facturación específico. Es el concepto central del dominio Revenue: el estado del dinero que el Business ganó pero todavía no ha formalizado en una Invoice.

---

## Qué es

Un RevenueDraft es el estado intermedio del ingreso entre la confirmación del trabajo (Work domain) y la creación de la factura (Billing domain). Existe mientras hay trabajo confirmado que todavía no fue facturado.

Cada RevenueDraft está scoped a:
- Un `businessId` (el Business que generó el ingreso)
- Un `customerId` (el Customer a quien se le facturará)
- Un `contractId` (el Contract que define las tarifas y el billing cycle)
- Un `billingPeriodId` (el período de facturación al que pertenece)

Esta combinación es única. No pueden existir dos RevenueDrafts para el mismo período y contrato.

---

## Qué almacena

### El estado del ingreso

El RevenueDraft responde en todo momento:
- ¿Cuánto ingreso acumulado hay en este período?
- ¿Cuáles WorkEvents están incluidos?
- ¿Cuál es el desglose por tarifa?
- ¿Puede modificarse todavía este ingreso?

### Las RevenueLines

El corazón del RevenueDraft es su lista de RevenueLines. Cada RevenueLine representa un WorkEvent confirmado y contiene:

| Campo | Descripción |
|---|---|
| `workEventId` | Referencia al WorkEvent que originó esta línea |
| `workEventDate` | Fecha del trabajo (para ordenamiento y agrupación) |
| `lineItems` | Los segmentos de tarifa del RateResult: lista de `{ description, durationMinutes, unitRate, unit, amount }` |
| `subtotal` | Suma de todos los `lineItems.amount` de esta RevenueLine |
| `status` | `ACTIVE` (en el draft) \| `VOIDED` (WorkEvent fue anulado) |

### El total del período

```
RevenueDraft.totalAmount = sum(revenueLine.subtotal) para todas las líneas ACTIVE
```

Este total se recalcula automáticamente cada vez que se agrega, modifica, o elimina una RevenueLine.

---

## Qué calcula automáticamente

El RevenueDraft no calcula tarifas — eso es responsabilidad del Rate Engine. Lo que calcula automáticamente es:

**1. El total corriente del período:**
Cada vez que llega un `WorkEventConfirmed`, el RevenueDraft agrega la RevenueLine y recalcula el `totalAmount`.

**2. El número de WorkEvents acumulados:**
Un contador de líneas activas — útil para el dashboard del Business Owner ("tienes 12 turnos confirmados pendientes de facturar").

**3. La distribución por tipo de tarifa:**
Suma de segmentos por `ruleType` (BASE, OVERTIME, ALLOWANCE). Esta distribución permite al Business Owner ver "¿cuánto es tarifa base y cuánto es tarifa nocturna en este período?".

---

## Qué todavía puede cambiar

Mientras el BillingPeriod está `OPEN` y el RevenueDraft está `ACCUMULATING`:

| Cambio | Cómo ocurre |
|---|---|
| Agregar una RevenueLine | Un nuevo `WorkEventConfirmed` llega al período |
| Eliminar una RevenueLine | El WorkEvent asociado es anulado (raro — solo pre-invoice) |
| El total del RevenueDraft | Se recalcula automáticamente con cada cambio |

El Business Owner no modifica el RevenueDraft directamente. Los cambios llegan como eventos del Work domain.

---

## Qué queda congelado

Cuando el BillingPeriod llega a `CLOSED` y el RevenueDraft pasa a `FROZEN`:

| Elemento congelado | Por qué |
|---|---|
| La lista de RevenueLines | No pueden agregarse ni eliminarse líneas |
| Los lineItems de cada RevenueLine | El RateResult es inmutable — los segmentos no cambian |
| El totalAmount | No puede cambiar porque las líneas están congeladas |
| La referencia al BillingPeriod | No puede reasignarse a un período diferente |

El RevenueDraft FROZEN es la "oferta" formal al dominio Billing: "estos son exactamente los ítems y el total que debes facturar".

---

## Cómo interactúa con RateResult

El RateResult es la vista pública de la RateCalculation que el Rate Engine produce. Es el contrato entre Work y Revenue.

```
Rate Engine produce:
  RateResult {
    workEventId: X,
    totalAmount: $166,
    currency: AUD,
    lineItems: [
      { description: "Vie 18:00-20:00 Tarifa diurna",  durationMinutes: 120, unitRate: 38, amount: 76  },
      { description: "Vie 20:00-22:00 Tarifa nocturna", durationMinutes: 120, unitRate: 45, amount: 90  }
    ]
  }

Revenue lo convierte en:
  RevenueLine {
    workEventId:  X,
    workEventDate: "2026-07-04",
    lineItems: [mismo contenido que RateResult.lineItems],
    subtotal: $166,
    status: ACTIVE
  }
```

Revenue almacena los `lineItems` del RateResult tal como los recibe. No los recalcula, no los reformatea. La responsabilidad del cálculo quedó en Work — Revenue solo los almacena y los agrega.

**Lo que Revenue nunca pide al Rate Engine:** Los detalles del RatePlan, las RateRules, los DayPatterns. Revenue no sabe (ni necesita saber) por qué el WorkEvent generó $76 en el primer segmento — solo sabe que generó $76.

---

## Cómo interactúa con BillingPeriod

El RevenueDraft y el BillingPeriod tienen ciclos de vida sincronizados:

```
BillingPeriod estado    →    RevenueDraft estado
─────────────────────────────────────────────────
OPEN                    →    ACCUMULATING
CLOSED                  →    FROZEN
INVOICED                →    TRANSFERRED
CLOSED_EMPTY            →    (no se crea RevenueDraft)
```

Cuando el BillingPeriod pasa a `CLOSED`, el RevenueDraft pasa automáticamente a `FROZEN`. No es una acción separada — es una transición atómica.

---

## Estados del RevenueDraft

```
ACCUMULATING (BillingPeriod OPEN)
  │  RevenueLines pueden agregarse y eliminarse
  │  totalAmount cambia con cada operación
  │
  │  [BillingPeriod cierra]
  ▼
FROZEN (BillingPeriod CLOSED)
  │  Ninguna modificación posible
  │  totalAmount es definitivo
  │  Revenue publica BillingPeriodClosed
  │
  │  [Billing confirma recepción del RevenueDraft]
  ▼
TRANSFERRED (BillingPeriod INVOICED)
  │  Billing tomó ownership de las líneas
  │  Revenue no puede modificar ni reclamar las líneas
  │
  │  [período de retención cumplido]
  ▼
ARCHIVED [terminal]

ACCUMULATING
  │  [período sin ningún WorkEvent, llega a fecha de cierre]
  ▼
EMPTY [si el período se cerró sin ninguna línea — no genera transferencia]
```

---

## El RevenueDraft como fuente de verdad del ingreso pendiente

El RevenueDraft es la respuesta canónica a "¿cuánto dinero tiene el Business ganado pero no cobrado?".

Para un Business en cualquier momento, la suma de todos los `RevenueDraft.totalAmount` en estado `ACCUMULATING` o `FROZEN` es el **ingreso pendiente de facturación** del Business.

Este número es diferente de:
- El **ingreso facturado** (sum de Invoices en estado `sent`, `viewed`, `partial`, `overdue`)
- El **ingreso cobrado** (sum de Payments registrados)
- El **ingreso reconocido contablemente** (sum de JournalEntries posted de tipo INVOICE_ISSUED)

Los cuatro números tienen significado de negocio distinto y deben estar disponibles en el dashboard de Analytics.

---

## El momento de la transferencia

Cuando Revenue publica `BillingPeriodClosed`, incluye en el payload del evento el RevenueDraft completo: todas las RevenueLines con sus lineItems, el totalAmount, el contractId, el customerId, y el billingPeriodId.

Billing recibe este evento y crea el Invoice Draft. En ese momento, los lineItems del RevenueDraft se convierten en InvoiceItems en el Invoice Draft — uno por cada entry de `lineItem` en cada RevenueLine.

```
RevenueDraft (al momento de la transferencia)
  totalAmount: $502
  lines: [
    RevenueLine (workEvent A):
      lineItems: [{ "Lun 09-17 BASE", 480min, $38/h, $304 }]
      subtotal: $304

    RevenueLine (workEvent B):
      lineItems: [
        { "Vie 18-20 diurno", 120min, $38/h, $76 },
        { "Vie 20-22 nocturno", 120min, $45/h, $90 }
      ]
      subtotal: $166

    RevenueLine (workEvent C):
      lineItems: [{ "Dom 10-10:30 Domingo", 30min, $50/h, $25 }]
      subtotal: $25  ← (incl. en next period? No, pertenece a Jul)
  ]

Invoice Draft (creado por Billing desde el RevenueDraft):
  InvoiceItem 1: "Lun 09-17 Tarifa diurna" · 8h · $38 = $304
  InvoiceItem 2: "Vie 18-20 Tarifa diurna" · 2h · $38 = $76
  InvoiceItem 3: "Vie 20-22 Tarifa nocturna" · 2h · $45 = $90
  InvoiceItem 4: "Dom 10-10:30 Tarifa domingo" · 0.5h · $50 = $25
  ─────────────────────────────────────────────────────────────
  Subtotal: $495 + GST $49.50 = Total $544.50
```

La granularidad total del Rate Engine queda preservada hasta el InvoiceItem final.

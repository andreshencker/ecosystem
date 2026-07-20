# 03 — Billing Period

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

Un Billing Period es el intervalo de tiempo que determina qué WorkEvents se agrupan en una misma Invoice. Es la unidad de ritmo del ciclo de facturación: el BillingPeriod define "cuándo se factura", mientras que el RevenueDraft define "cuánto se factura".

---

## Qué representa

Un BillingPeriod representa una ventana de tiempo con inicio y fin definidos, durante la cual se acumulan los WorkEvents confirmados de un Contract específico. Al cierre del período, todos los WorkEvents acumulados se convierten en la base de una Invoice.

Cada BillingPeriod es único para la combinación `(businessId, contractId, periodStart, periodEnd)`. No puede existir dos BillingPeriods solapados para el mismo Contract.

---

## Tipos de Billing Period

El tipo de BillingPeriod se deriva del `billingCycle` del Contract:

| BillingCycle | Duración del Período | Ejemplo |
|---|---|---|
| `WEEKLY` | 7 días (Lun → Dom o según configuración) | Semana 1 Jul: 30 Jun – 06 Jul |
| `FORTNIGHTLY` | 14 días | 01 Jul – 14 Jul |
| `MONTHLY` | Mes calendario | Julio 2026: 01 Jul – 31 Jul |
| `QUARTERLY` | 3 meses | Q3 2026: 01 Jul – 30 Sep |
| `PER_PROJECT` | Sin fecha de fin automática — cierre manual | Proyecto "Rediseño web" |
| `PER_MILESTONE` | Cierre condicional por evento de negocio (futuro) | Al completar el entregable N |
| `CUSTOM` | Fechas definidas manualmente por el Business Owner | 15 Jul – 31 Jul |

---

## Quién lo crea

Los BillingPeriods se crean automáticamente. El disparador es la llegada del primer WorkEvent confirmado que no pertenece a ningún BillingPeriod activo del Contract.

```
WorkEvent confirmado → Revenue verifica:
  ¿Existe un BillingPeriod OPEN para este (contractId, date)?
    SÍ → Asignar el WorkEvent al período existente
    NO → Crear nuevo BillingPeriod basado en el billingCycle del Contract
```

Para Contracts con `billingCycle: PER_PROJECT`, el primer BillingPeriod se crea cuando el Contract se activa — no cuando llega el primer WorkEvent. Este período permanece abierto hasta cierre manual.

---

## Cuándo comienza

| BillingCycle | Inicio del período |
|---|---|
| `WEEKLY` | El lunes (o el día configurado como inicio de semana laboral) |
| `FORTNIGHTLY` | El día 1 o el día 15 del mes |
| `MONTHLY` | El día 1 del mes calendario |
| `PER_PROJECT` | La fecha de activación del Contract |
| `CUSTOM` | La fecha definida por el Business Owner |

El `periodStart` siempre es la fecha del inicio del intervalo. El primer WorkEvent puede caer en cualquier punto del período, no necesariamente en el primer día.

---

## Cuándo termina

Un BillingPeriod se cierra por dos vías:

**Cierre automático (trigger por fecha):**
El sistema ejecuta un job diario que detecta BillingPeriods cuya fecha `periodEnd` fue alcanzada y los marca como `CLOSED`. Este job es idempotente: si un período ya fue cerrado, lo ignora.

**Cierre manual:**
El Business Owner puede cerrar un BillingPeriod antes de su fecha de fin cuando considera que el trabajo del período está completo. Esto es común en proyectos que terminan antes del período completo.

---

## Cómo agrupa WorkEvents

Cada WorkEvent confirmado es asignado a un BillingPeriod basado en la fecha de inicio del WorkEvent (`workEvent.startTime.date`), no en la fecha de confirmación ni en la fecha de importación.

```
Regla de asignación:
  workEvent.startTime.date ≥ billingPeriod.periodStart
  workEvent.startTime.date ≤ billingPeriod.periodEnd
  workEvent.contractId     = billingPeriod.contractId
```

**Caso especial — WorkEvent nocturno que cruza medianoche:**
Si un WorkEvent comienza el último día del período y termina el primer día del período siguiente, pertenece al período en que COMENZÓ. La fecha de inicio del WorkEvent es el discriminador.

```
BillingPeriod: 01 Jul – 31 Jul
WorkEvent: 31 Jul 22:00 → 01 Aug 02:00
→ Pertenece al BillingPeriod de Julio (inició el 31 Jul)
```

---

## Cómo evita duplicidad

Cada RevenueLine en un RevenueDraft referencia exactamente un WorkEvent. El sistema verifica al crear la RevenueLine que ese WorkEvent no existe ya en ningún RevenueDraft activo del mismo Contract.

Si por alguna razón de sistema (retry de evento, duplicación) se intenta crear dos RevenueLines para el mismo WorkEvent, el sistema rechaza la segunda con una violación de idempotencia por `workEventId`.

---

## Estados del BillingPeriod

```
OPEN
  │  [fecha de fin alcanzada] o [cierre manual]
  ▼
CLOSED
  │  [Revenue publica BillingPeriodClosed y Billing crea Invoice Draft]
  ▼
INVOICED [terminal normal]

OPEN
  │  [cerrado, pero sin WorkEvents]
  ▼
CLOSED_EMPTY [terminal — no genera Invoice]

CLOSED
  │  [reabierto antes de que Billing cree el Invoice Draft]
  ▼
OPEN (reapertura — solo si RevenueDraft aún es FROZEN)
```

---

## Qué ocurre si un WorkEvent cambia después del cierre

Una vez que el BillingPeriod está `CLOSED`, no se aceptan nuevas RevenueLines. Si un WorkEvent confirmado llega tarde (fue importado con retraso del calendario), cae en el siguiente BillingPeriod — no se retroagrega al cerrado.

**Caso: WorkEvent en período cerrado pero Invoice Draft no creado aún (RevenueDraft FROZEN):**
El Business Owner puede reabrir el período (si el RevenueDraft todavía no fue transferido a Billing), agregar el WorkEvent faltante, y volver a cerrar el período.

**Caso: WorkEvent en período cerrado con Invoice Draft ya creado (RevenueDraft TRANSFERRED):**
El WorkEvent no puede ser retroagregado al período cerrado. El Business Owner tiene dos opciones:
1. Incluirlo como ítem libre en el Invoice Draft actual (antes de aprobarlo)
2. Incluirlo en el siguiente BillingPeriod

**Caso: WorkEvent voided después del cierre del período:**
Si el RevenueDraft está `FROZEN`: se elimina la RevenueLine y el total del draft se recalcula.
Si el RevenueDraft está `TRANSFERRED` (Invoice Draft existe): no es posible modificar el RevenueDraft. El void del WorkEvent se gestiona como anulación de la Invoice o como Credit Note.

---

## Cómo se reabre

Un BillingPeriod en estado `CLOSED` puede retornar a `OPEN` solo si se cumplen ambas condiciones:
1. El RevenueDraft asociado todavía está en estado `FROZEN` (no fue transferido a Billing)
2. El Business Owner o Business Admin ejecuta la reapertura manualmente con una justificación

La reapertura retorna el BillingPeriod a `OPEN` y el RevenueDraft a `ACCUMULATING`. El sistema registra el evento de reapertura en el audit log del Business.

**Un BillingPeriod en estado `INVOICED` nunca puede reabrirse.** Si la Invoice necesita ser corregida, se gestiona a través del flujo de anulación en Billing.

---

## Relación con el RevenueDraft

La relación BillingPeriod ↔ RevenueDraft es 1:1 para una combinación de Contract:

```
BillingPeriod OPEN
  └── RevenueDraft ACCUMULATING (running total)
              └── RevenueLine 1 (WorkEvent A)
              └── RevenueLine 2 (WorkEvent B)
              └── RevenueLine 3 (WorkEvent C)

BillingPeriod CLOSED
  └── RevenueDraft FROZEN (total fijo)
              └── Las mismas RevenueLines — inmutables

BillingPeriod INVOICED
  └── RevenueDraft TRANSFERRED
              └── Las líneas fueron consumidas por Billing
```

---

## Reglas del BillingPeriod

**BR-BP-001:** Un BillingPeriod no puede solaparse con otro BillingPeriod del mismo Contract. Para cualquier fecha, un WorkEvent pertenece a exactamente un período.

**BR-BP-002:** Un BillingPeriod `CLOSED_EMPTY` nunca genera un Invoice Draft ni un RevenueDraft. El sistema lo marca y lo archiva.

**BR-BP-003:** El cierre automático de un BillingPeriod es idempotente. Ejecutarlo dos veces no duplica el evento `BillingPeriodClosed`.

**BR-BP-004:** Un BillingPeriod `INVOICED` es terminal. Solo puede archivarse — no puede reabrirse ni modificarse.

**BR-BP-005:** La fecha de asignación de un WorkEvent a un BillingPeriod usa la fecha de inicio del WorkEvent, no la fecha de confirmación ni la fecha de importación del calendario.

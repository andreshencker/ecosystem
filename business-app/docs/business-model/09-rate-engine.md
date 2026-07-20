# 09 — Rate Engine

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial
**Dominio dueño:** Work

El Rate Engine es el motor de cálculo económico del ERP. Transforma un WorkEvent (un hecho temporal: cuándo y cuánto tiempo se trabajó) en una RateCalculation (un hecho económico: cuánto vale ese trabajo). Es la pieza que conecta el tiempo registrado con el dinero a facturar.

El Rate Engine no es una función de `horas × precio`. Es un motor de reglas que determina cuánto vale cada fracción de tiempo según el día de la semana, la hora del día, el tipo de trabajo, y el acuerdo específico con cada Customer — y lo hace automáticamente, sin intervención del usuario.

---

## Principios

**Principio 1 — El cálculo es automático e invisible:**
Cuando un User confirma un WorkEvent, el sistema calcula el valor sin que el User intervenga. El Rate Engine no es una calculadora que el usuario maneja — es un motor que el sistema invoca.

**Principio 2 — Cada Contract tiene su propio esquema:**
Dos Customers del mismo Business pueden tener esquemas de cálculo completamente distintos. No existe una tarifa global del Business — solo Rates por Contract.

**Principio 3 — WorkEvent es tiempo; RateCalculation es dinero:**
Son conceptos con ciclos de vida distintos y responsabilidades distintas. Un WorkEvent puede recalcularse antes de ser confirmado. Una vez confirmado, su RateCalculation es inmutable.

**Principio 4 — Los cálculos históricos nunca cambian:**
Que el RatePlan de un Contract sea modificado en el futuro no afecta los WorkEvents ya confirmados. El pasado no se recalcula (BR-RAT-003).

**Principio 5 — La granularidad es total y nunca se pierde:**
Si un turno cruza un límite de tarifa, el sistema lo divide en segmentos automáticamente. No se aplica un promedio ni un valor único al turno completo.

**Principio 6 — El modelo de segmentos es la unidad de billing:**
Un WorkEvent genera uno o más RateSegments. Cada RateSegment se convierte en un InvoiceItem. El Customer ve exactamente qué se le está cobrando y a qué tarifa.

---

## Reconciliación con el modelo existente

El documento `01-business-glossary.md` define `Rate` como "el precio unitario acordado dentro de un Contract". Esta definición sigue siendo correcta para el caso simple (tarifa fija). El Rate Engine la extiende sin contradecirla:

```
MODELO SIMPLE (tarifa fija):
  Rate = un valor monetario por unidad de trabajo
  Un Contract tiene una o más Rates

MODELO COMPLETO (Rate Engine):
  Rate → RatePlan → RateRules
  Una Rate simple es un RatePlan con exactamente una RateRule de tipo BASE
  La semántica existente de "Rate" es el caso degenerado del modelo completo
```

El lenguaje canónico del CBM mantiene "Rate" como el concepto público del Work domain. "RatePlan", "RateRule", y "RateCalculation" son el vocabulario interno del Rate Engine — la implementación conceptual de ese concepto cuando tiene complejidad.

---

## Los conceptos del dominio

### RATE PLAN

**Qué es:**
Un RatePlan es el esquema completo de cálculo asociado a un Contract. Es el contenedor que agrupa todas las RateRules que el Rate Engine aplica para calcular el valor de los WorkEvents de ese Contract.

**Tipos de RatePlan:**

| PlanType | Descripción | Ejemplo |
|---|---|---|
| `FLAT` | Una sola tarifa para todo el tiempo | $50/h siempre, cualquier día y hora |
| `DAY_VARIABLE` | Tarifa distinta según el día de la semana | Lun-Vie $38, Sáb $45, Dom $50 |
| `DAY_AND_TIME_VARIABLE` | Tarifa distinta según día y franja horaria | Lun-Vie diurno $38, nocturno $45 |
| `DAILY_RATE` | Tarifa por día completo, no por hora | $300/día hasta 8h, $40/h adicional |
| `WEEKLY_RATE` | Tarifa semanal fija | $1.500/semana |
| `FIXED_SHIFT` | Monto fijo por turno sin importar duración | $200/turno |
| `CUSTOM` | Combinación libre de reglas enterprise | Múltiples tipos combinados |

**Propiedades conceptuales:**
- Pertenece a exactamente un Contract
- Tiene un período de vigencia (`effectiveFrom`, `effectiveTo`)
- Tiene una moneda base
- Define si los minutos de break se descuentan del tiempo pagado (`breakDeductionPolicy`)
- Contiene una lista ordenada de RateRules

**Invariante temporal:**
Cuando un RatePlan cambia, el cambio solo afecta WorkEvents nuevos. Los WorkEvents ya `confirmed` siguen usando el plan vigente en el momento de su confirmación. Esta garantía se implementa mediante el RatePlan Snapshot dentro de la RateCalculation.

---

### RATE UNIT

La unidad de medida de la remuneración en una RateRule:

| RateUnit | Cómo se calcula | Ejemplo |
|---|---|---|
| `HOURLY` | Por hora (o fracción proporcional) | $38/h → 90 min = $57 |
| `DAILY` | Por día completo, independiente de las horas | $300/día |
| `WEEKLY` | Por semana completa | $1.500/semana |
| `MONTHLY` | Por mes | $5.000/mes |
| `FIXED_SHIFT` | Monto fijo, sin relación con el tiempo | $200/turno |
| `PER_KM` | Por kilómetro (Travel Time — futuro) | $0.85/km |
| `PER_PIECE` | Por unidad producida (piecework — futuro) | $3.50/pieza |

---

### DAY PATTERN

El patrón de días al que aplica una RateRule:

| DayPattern | Alcance |
|---|---|
| `MON_TO_FRI` | Lunes a viernes inclusive |
| `SATURDAY` | Solo sábado |
| `SUNDAY` | Solo domingo |
| `WEEKEND` | Sábado y domingo |
| `MON_TO_SAT` | Lunes a sábado inclusive |
| `ANY_DAY` | Sin restricción de día (comodín) |
| `SPECIFIC_DAYS` | Lista explícita: `[MON, WED, FRI]` |
| `PUBLIC_HOLIDAY` | Días feriados según el calendario de la jurisdicción (futuro) |

**Jerarquía de especificidad** (de mayor a menor):
`PUBLIC_HOLIDAY > SPECIFIC_DAYS > SATURDAY > SUNDAY > WEEKEND > MON_TO_FRI > ANY_DAY`

Esta jerarquía determina qué regla tiene prioridad cuando más de una podría aplicar al mismo día.

---

### TIME RANGE

El rango horario al que aplica una RateRule dentro de un día:

| Campo | Descripción |
|---|---|
| `startTime` | Hora de inicio en formato 24h (ej. `08:00`) |
| `endTime` | Hora de fin en formato 24h (ej. `20:00`) |
| `crossesMidnight` | `true` si el rango atraviesa las 00:00 (ej. `22:00 → 06:00`) |
| `ANY_TIME` | Sin restricción horaria — aplica todo el día |

**Invariante de cobertura:**
En un RatePlan de tipo `DAY_AND_TIME_VARIABLE`, la unión de todos los TimeRanges para un DayPattern debe cubrir exactamente 24 horas sin brechas ni solapamientos. El sistema valida esto al guardar el RatePlan.

---

### RATE RULE

**Qué es:**
Una RateRule es una regla individual dentro de un RatePlan. Define exactamente en qué contexto aplica (qué días, qué horario, qué condición), cuánto vale la unidad de tiempo en ese contexto, y con qué prioridad gana sobre otras reglas.

**Tipos de RateRule:**

| RuleType | Descripción | Ejemplo |
|---|---|---|
| `BASE` | Regla estándar — aplica cuando ninguna otra es más específica | $38/h Lun-Vie diurno |
| `OVERTIME` | Se activa después de N horas acumuladas en el turno | $57/h después de 8h |
| `DOUBLE_TIME` | Se activa después de N horas de overtime (futuro) | $76/h después de 12h |
| `HOLIDAY` | Aplica en feriados según el calendario (futuro) | $76/h en Public Holiday |
| `PENALTY` | Recargo porcentual o fijo por condición especial (futuro) | +25% en Sáb nocturno |
| `ALLOWANCE` | Monto fijo por turno o día, no proporcional al tiempo (futuro) | +$15/turno de tarde |
| `TRAVEL` | Por tiempo o distancia de desplazamiento (futuro) | $20/h de viaje |
| `MINIMUM_SHIFT` | Garantía de pago mínimo por turno (futuro) | Mínimo 3h por turno |
| `BREAK_DEDUCTION` | Descuento por tiempo de descanso no pagado | -30 min del turno |

**Propiedades de una RateRule:**
- `ruleType`: el tipo de la regla
- `dayPattern`: a qué días aplica
- `timeRange`: a qué franja horaria aplica
- `unit`: RateUnit
- `amount`: valor monetario por unidad
- `currency`: moneda (hereda del RatePlan)
- `priority`: número entero — la regla de mayor prioridad gana en conflicto
- `condition`: trigger opcional para reglas condicionales (ej. `{ afterHours: 8 }` para overtime)
- `isActive`: si la regla está vigente dentro del plan

---

### RATE ENGINE

**Qué es:**
El Rate Engine es el servicio de dominio del Work domain que, dado un WorkEvent y su RatePlan, produce una RateCalculation. No tiene estado propio. Es una función pura: el mismo WorkEvent con el mismo RatePlan siempre produce la misma RateCalculation.

**Algoritmo conceptual:**

```
ENTRADA:
  WorkEvent (startTime, endTime, breakMinutes, contractId)
  RatePlan (rules, currency, breakDeductionPolicy)
  [Futuro] HolidayCalendar (del Business Personality)

PROCESO:

  Paso 1 — Calcular el tiempo efectivo:
    Si breakDeductionPolicy = true:
      tiempoEfectivo = (endTime - startTime) - breakMinutes
    Si no:
      tiempoEfectivo = (endTime - startTime)

  Paso 2 — Identificar los límites de tarifa:
    Límites = [
      medianoche (si el WorkEvent cruza el día),
      todos los TimeRange.start y TimeRange.end de las RateRules,
      [Futuro] inicio y fin de cada feriado,
      [Futuro] umbral de overtime (si hay RuleType.OVERTIME)
    ]
    Ordenar límites cronológicamente.

  Paso 3 — Segmentar el WorkEvent en los límites:
    Para cada intervalo entre límites consecutivos dentro del WorkEvent:
      Crear un RateSegment(startTime, endTime)

  Paso 4 — Resolver la RateRule para cada segmento:
    Para cada RateSegment:
      Determinar el DayPattern del día en que cae el segmento
      Determinar el TimeRange al que pertenece
      Encontrar la RateRule de mayor prioridad que coincida
      Si ninguna RateRule coincide: ERROR — el plan tiene una brecha

  Paso 5 — Calcular el amount de cada segmento:
    Para HOURLY:  amount = (durationMinutes / 60) × unitRate
    Para DAILY:   amount = unitRate (si el turno califica como día completo)
    Para FIXED:   amount = unitRate (sin relación con duración)
    Para PER_KM:  amount = kilometers × unitRate

  Paso 6 — Ensamblar la RateCalculation:
    RateCalculation.segments = [todos los segmentos calculados]
    RateCalculation.totalAmount = sum(segment.amount)
    RateCalculation.ratePlanSnapshot = copia completa del RatePlan actual

SALIDA:
  RateCalculation (segments[], totalAmount, currency, ratePlanSnapshot)
```

**Validación pre-cálculo:**
El Rate Engine no valida la integridad del RatePlan en tiempo de cálculo. La validación (ausencia de brechas, ausencia de conflictos entre reglas) ocurre cuando el RatePlan es guardado. En tiempo de cálculo, el motor confía en que el plan es válido.

---

### RATE SEGMENT

**Qué es:**
Un RateSegment es la unidad mínima de cálculo del Rate Engine. Representa la fracción de tiempo del WorkEvent donde una sola RateRule aplica de forma uniforme.

Un RateSegment es también la unidad de billing: se convierte directamente en un InvoiceItem cuando el WorkEvent es incluido en una Invoice.

**Propiedades:**
- `startTime`: inicio del segmento
- `endTime`: fin del segmento
- `durationMinutes`: duración en minutos
- `appliedRuleType`: qué tipo de RateRule se aplicó (`BASE`, `OVERTIME`, `ALLOWANCE`, etc.)
- `unitRate`: el monto por unidad
- `unit`: RateUnit usado
- `amount`: valor total calculado para este segmento
- `description`: texto legible para el Customer (ej. `"Viernes 18:00-20:00 – Tarifa diurna"`)

---

### RATE CALCULATION

**Qué es:**
Una RateCalculation es el resultado completo e inmutable de aplicar el Rate Engine a un WorkEvent. Una vez en estado `CONFIRMED`, no puede modificarse.

**Propiedades:**
- `workEventId`: el WorkEvent que originó este cálculo
- `ratePlanSnapshot`: copia completa del RatePlan en el momento del cálculo
- `segments`: lista de RateSegments
- `totalAmount`: suma de todos los segmentos
- `currency`: moneda
- `calculatedAt`: timestamp del cálculo
- `status`: `DRAFT` → `CONFIRMED` → (solo si hay intervención) `OVERRIDDEN`
- `overrideReason`: obligatorio si el status es `OVERRIDDEN`

**El snapshot garantiza la inmutabilidad histórica:**
La copia del RatePlan dentro de la RateCalculation asegura que si el RatePlan del Contract es modificado en el futuro, los cálculos históricos siguen usando exactamente las reglas que estaban vigentes cuando se confirmó cada WorkEvent.

**Ciclo de vida:**

```
[WorkEvent creado o modificado]
        │
        ▼
RateCalculation DRAFT
(puede recalcularse si el WorkEvent cambia antes de confirmar)
        │
        │ [User confirma el WorkEvent]
        ▼
RateCalculation CONFIRMED (inmutable)
        │
        │ [Solo con justificación explícita — caso excepcional]
        ▼
RateCalculation OVERRIDDEN (override manual — queda en audit log)
```

---

### RATE RESULT

**Qué es:**
El RateResult es la vista pública de la RateCalculation que el dominio de Billing consume. Es el contrato de interfaz entre Work y Billing: solo contiene lo que Billing necesita para crear InvoiceItems.

**Por qué existe separado de RateCalculation:**
Billing no debe conocer los detalles del Rate Engine (DayPatterns, RateRules, snapshots). El RateResult es un contrato de lectura simple. Si la RateCalculation cambia internamente, el RateResult puede permanecer estable.

**Propiedades:**
- `workEventId`
- `totalAmount`
- `currency`
- `lineItems`: lista de `{ description, durationMinutes, unitRate, unit, amount }` — uno por RateSegment
- `calculationRef`: referencia a la RateCalculation para trazabilidad

---

## ¿Qué almacena WorkEvent?

### Las tres opciones

**Opción A — WorkEvent almacena solo el turno + referencia a RateCalculation**

WorkEvent = startTime, endTime, breakMinutes, contractId, rateCalculationId

**Opción B — WorkEvent almacena el turno + el total desnormalizado**

WorkEvent = startTime, endTime, breakMinutes, contractId, confirmedAmount (campo plano)

**Opción C — WorkEvent almacena el turno + la RateCalculation embebida completa**

WorkEvent = startTime, endTime, breakMinutes, contractId, rateCalculation: { segments[], total }

### La decisión: Opción A con campo de conveniencia

WorkEvent almacena el turno y una referencia a su RateCalculation. Adicionalmente, tiene un campo de conveniencia `confirmedAmount` (desnormalizado) solo para queries que necesitan el total sin hacer join.

El `confirmedAmount` nunca se usa como base de facturación — para facturar siempre se usa la RateCalculation con sus segmentos.

**Comparación de opciones:**

| Criterio | A (referencia) | B (total plano) | C (embedded) |
|---|---|---|---|
| Separación de responsabilidades | ✅ Perfecta | ⚠️ Parcial | ❌ Violada |
| Recalculable antes de confirmar | ✅ Sí — se reemplaza la referencia | ⚠️ Sí — se sobreescribe el campo | ⚠️ Sí — se reemplaza el objeto |
| Granularidad de segmentos disponible | ✅ Completa en RateCalculation | ❌ Perdida | ✅ Disponible |
| Snapshot del RatePlan | ✅ En RateCalculation separada | ❌ No existe | ⚠️ Depende del diseño |
| Inmutabilidad post-confirmación | ✅ RateCalculation separada se congela | ⚠️ El campo se congela | ✅ El objeto embedded se congela |
| Trazabilidad de auditoría | ✅ Completa | ❌ Solo el total | ⚠️ Sin snapshot del plan |
| Queries simples de total | ⚠️ Join requerido (salvo campo de conveniencia) | ✅ Directo | ✅ Directo |

**Conclusión:**
Opción A con `confirmedAmount` como campo de conveniencia captura las ventajas de ambos mundos: separación correcta de responsabilidades, granularidad completa, snapshot de inmutabilidad histórica — y la misma facilidad de query que la Opción B para el caso común.

---

## WorkEvent → múltiples InvoiceItems

Este es uno de los principios de diseño más importantes del Rate Engine.

### ¿Por qué no un solo InvoiceItem por WorkEvent?

```
❌ MODELO SIMPLE (un total):
  WorkEvent Vie 18:00-22:00
    → 1 InvoiceItem: "4h trabajadas: $166"

✅ MODELO DE SEGMENTOS (granularidad completa):
  WorkEvent Vie 18:00-22:00
    → InvoiceItem 1: "Viernes 18:00-20:00 — Tarifa diurna: 2h × $38 = $76"
    → InvoiceItem 2: "Viernes 20:00-22:00 — Tarifa nocturna: 2h × $45 = $90"
```

### Ventajas del modelo de segmentos

| Beneficio | Por qué importa |
|---|---|
| Transparencia para el Customer | El Customer ve exactamente qué se le cobra y a qué tarifa — no un número opaco |
| Cumplimiento legal | En Australia y otras jurisdicciones, penalties, overtime, y cargas especiales deben estar itemizadas en la factura |
| Trazabilidad de auditoría | Un auditor puede trazar cada InvoiceItem hasta el RateRule exacto y el WorkEvent que lo originó |
| Resolución de disputas | Si el Customer disputa un cobro, el sistema muestra la regla aplicada en cada fracción de tiempo |
| Reporting granular | El Business puede analizar qué porcentaje de su revenue viene de trabajo diurno vs nocturno vs fin de semana |
| Extensibilidad | Cuando se agreguen Overtime, Allowances, o Holiday Pay, cada uno es un nuevo tipo de RateSegment — no requiere cambiar el modelo de InvoiceItem |

---

## El flujo completo

```
Calendar (Google Calendar u Outlook)
        │
        │  [CalendarSyncService importa el evento]
        ▼
WorkEvent DRAFT
  (startTime, endTime, breakMinutes, contractId)
        │
        │  [Rate Engine calcula automáticamente — previsualización]
        ▼
RateCalculation DRAFT
  (segments[], totalAmount — provisional, no confirmado)
        │
        │  [User revisa y confirma el WorkEvent]
        ▼
Rate Engine invocado oficialmente
        │
        ▼
RateCalculation CONFIRMED (inmutable)
  ratePlanSnapshot: {copia completa del plan}
  segments: [
    { Vie 18:00-20:00, 120min, $38/h, BASE, $76 },
    { Vie 20:00-22:00, 120min, $45/h, BASE, $90 }
  ]
  totalAmount: $166
        │
        │  WorkEvent pasa a estado `confirmed`
        │  WorkEvent.confirmedAmount = $166 (campo de conveniencia)
        │
        │  [Business Owner crea Invoice]
        ▼
RateResult expuesto a Billing
  lineItems: [
    { "Vie 18:00-20:00 Tarifa diurna",  120min, $38/h, $76  },
    { "Vie 20:00-22:00 Tarifa nocturna", 120min, $45/h, $90  }
  ]
        │
        ▼
InvoiceItems creados (uno por lineItem)
  InvoiceItem 1: Vie 18:00-20:00 — $76 — workEventId: X
  InvoiceItem 2: Vie 20:00-22:00 — $90 — workEventId: X
        │
        ▼
Invoice
  total = $76 + $90 = $166
```

---

## Resolución de conflictos entre RateRules

Cuando dos o más RateRules podrían aplicar al mismo segmento, el Rate Engine usa la siguiente jerarquía determinista:

```
NIVEL 1 — Especificidad de día (mayor especificidad gana):
  PUBLIC_HOLIDAY > SPECIFIC_DAYS > SATURDAY > SUNDAY > WEEKEND > MON_TO_FRI > ANY_DAY

NIVEL 2 — Dentro del mismo DayPattern, especificidad de tiempo:
  TIME_SPECIFIC > ANY_TIME

NIVEL 3 — Dentro del mismo DayPattern y TimeRange, tipo de regla:
  OVERTIME / DOUBLE_TIME > HOLIDAY > PENALTY > BASE

NIVEL 4 — Desempate final:
  mayor `priority` numérico gana
```

**Regla de conflicto irresolvable:**
Si dos RateRules tienen exactamente el mismo DayPattern + TimeRange + tipo + prioridad, el RatePlan es inválido. El sistema rechaza el RatePlan al guardarlo con un error que identifica exactamente cuál es el conflicto.

**El Rate Engine nunca resuelve ambigüedades silenciosamente.**

---

## Casos soportados

### CASO 1 — Tarifa Fija

```
RatePlan: FLAT
  RateRule 1:
    type:        BASE
    dayPattern:  ANY_DAY
    timeRange:   ANY_TIME
    unit:        HOURLY
    amount:      $50 AUD
```

**WorkEvent:** Jueves 09:00 → 17:00 (8h, 30 min break no pagado)

```
Tiempo bruto:  8h 00min
Break:        -0h 30min
Tiempo neto:   7h 30min

Segmento 1:  Thu 09:00-17:00 → 7.5h × $50 = $375

TOTAL: $375 — 1 InvoiceItem
```

---

### CASO 2 — Variable por Día

```
RatePlan: DAY_VARIABLE
  RateRule 1: BASE · MON_TO_FRI · ANY_TIME · HOURLY · $38 AUD
  RateRule 2: BASE · SATURDAY   · ANY_TIME · HOURLY · $45 AUD
  RateRule 3: BASE · SUNDAY     · ANY_TIME · HOURLY · $50 AUD
```

**WorkEvent A:** Lunes 09:00 → 17:00

```
Segmento 1:  Mon 09:00-17:00 → 8h × $38 = $304
TOTAL: $304 — 1 InvoiceItem
```

**WorkEvent B:** Sábado 10:00 → 14:00

```
Segmento 1:  Sat 10:00-14:00 → 4h × $45 = $180
TOTAL: $180 — 1 InvoiceItem
```

---

### CASO 3 — Variable por Día y Hora

```
RatePlan: DAY_AND_TIME_VARIABLE
  RateRule 1: BASE · MON_TO_FRI · 08:00-20:00             · HOURLY · $38 AUD
  RateRule 2: BASE · MON_TO_FRI · 20:00-08:00 (overnight) · HOURLY · $45 AUD
  RateRule 3: BASE · SATURDAY   · 08:00-20:00             · HOURLY · $45 AUD
  RateRule 4: BASE · SATURDAY   · 20:00-08:00 (overnight) · HOURLY · $50 AUD
```

**WorkEvent A:** Viernes 18:00 → 22:00

Límite de tarifa detectado: `20:00` (transición de RateRule 1 a RateRule 2)

```
Segmento 1:  Vie 18:00-20:00 → 2h × $38 = $76   [RateRule 1 — MON_TO_FRI diurno]
Segmento 2:  Vie 20:00-22:00 → 2h × $45 = $90   [RateRule 2 — MON_TO_FRI nocturno]

TOTAL: $166 — 2 InvoiceItems
```

**WorkEvent B:** Viernes 22:00 → Sábado 03:00 (turno nocturno que cruza la medianoche)

Límites de tarifa detectados: `00:00` (transición de Viernes a Sábado — cambio de DayPattern)

```
Segmento 1:  Vie 22:00-00:00 → 2h × $45 = $90   [RateRule 2 — MON_TO_FRI nocturno]
Segmento 2:  Sáb 00:00-03:00 → 3h × $50 = $150  [RateRule 4 — SATURDAY nocturno]

TOTAL: $240 — 2 InvoiceItems
```

**WorkEvent C:** Viernes 08:00 → Sábado 04:00 (turno largo, cruza medianoche y múltiples franjas)

Límites detectados: `20:00` (Vie) y `00:00` (medianoche → Sab)

```
Segmento 1:  Vie 08:00-20:00 → 12h  × $38 = $456  [RateRule 1]
Segmento 2:  Vie 20:00-00:00 →  4h  × $45 = $180  [RateRule 2]
Segmento 3:  Sáb 00:00-04:00 →  4h  × $50 = $200  [RateRule 4]

TOTAL: $836 — 3 InvoiceItems
```

---

## Evolución futura

El modelo de RatePlan + RateRules + RateSegments está diseñado para absorber las siguientes extensiones sin modificar la estructura central:

| Feature | Cómo se incorpora | Impacto en el modelo existente |
|---|---|---|
| **Public Holidays** | Nuevo DayPattern `PUBLIC_HOLIDAY`. El Rate Engine consulta el `HolidayCalendar` del Business antes de determinar el DayPattern de cada segmento | Agregar HolidayCalendar como dependencia del Rate Engine. Sin cambios en RateRule ni RateSegment |
| **Overtime** | Nueva RuleType `OVERTIME` con `condition: { afterHours: 8 }`. El Rate Engine acumula horas durante la segmentación y activa la regla al superar el umbral | Agregar lógica de acumulación al algoritmo. El RateSegment de overtime ya es soportado por el modelo |
| **Double Time** | Idéntico a Overtime con `condition: { afterHours: 12 }` y rate 2× la base | Solo agregar el RuleType al catálogo — sin cambios estructurales |
| **Penalties** | Nueva RuleType `PENALTY` con `surchargePercent`. Genera un RateSegment adicional de tipo PENALTY que se agrega al segmento BASE del mismo período | Agregar RuleType. El InvoiceItem de PENALTY es una línea separada con descripción propia |
| **Unpaid Breaks** | El RatePlan ya tiene `breakDeductionPolicy`. Extender para múltiples breaks con duración y tipo (`PAID` / `UNPAID`) | Agregar `breakSchedule: []` al RatePlan. El algoritmo ya soporta la deducción |
| **Allowances** | Nueva RuleType `ALLOWANCE`. Monto fijo por turno o por día, no proporcional al tiempo. `durationMinutes: 0` en el RateSegment | Agregar RuleType. El RateSegment ya puede representar montos planos |
| **Travel Time** | Nueva RuleType `TRAVEL`. Puede ser `unit: HOURLY` (hora de viaje) o `unit: PER_KM`. WorkEvent agrega campos opcionales `travelMinutes` y `travelKm` | Agregar RateUnit.PER_KM y campos opcionales al WorkEvent. Sin cambios en RateCalculation |
| **Mileage** | Variante de Travel con `unit: PER_KM`. El Rate Engine multiplica `travelKm × amountPerKm` | Nuevo RateUnit — sin cambios estructurales |
| **Fixed Shift Payments** | RuleType BASE + `unit: FIXED_SHIFT`. El Rate Engine genera un único RateSegment con el monto fijo independientemente de la duración | RateUnit.FIXED_SHIFT ya está en el catálogo. Lógica de cálculo trivial |
| **Daily Rates** | `unit: DAILY` + condición de máximo de horas incluidas. Overtime aplica sobre el exceso horario | Agregar RateUnit.DAILY y lógica de exceso al algoritmo |
| **Weekly / Monthly Rates** | `unit: WEEKLY` / `MONTHLY`. El Rate Engine agrega WorkEvents del período para determinar si se superó el límite incluido | Agregar lógica de agregación cross-WorkEvent. Es el cambio más significativo del modelo |
| **Payroll** | Agregar `perspective: CLIENT \| EMPLOYEE` al RatePlan. Un WorkEvent puede tener dos RateCalculations: una para billing al cliente, otra para payroll al empleado | Agregar campo `perspective`. Las dos RateCalculations comparten el WorkEvent pero tienen RatePlans distintos |
| **Multi-country** | Agregar `jurisdiction` al RatePlan. El Rate Engine usa el HolidayCalendar de la jurisdicción correcta | Sin cambios estructurales — solo agregar campo |
| **Multi-currency** | `currency` ya está en el RatePlan. La conversión FX ocurre en el momento de generar la Invoice — nunca en el cálculo | La Invoice usa el tipo de cambio del día de emisión |

**Invariante de evolución:**
Ninguna extensión futura debe modificar el algoritmo de segmentación base. Toda nueva funcionalidad se expresa como un nuevo RuleType, un nuevo RateUnit, o una nueva condición — no como un cambio al motor de segmentación.

---

## Diagrama conceptual del Rate Engine

```
Contract
    │
    └── RatePlan (el esquema de cálculo del Contract)
              │
              ├── RateRule 1 (MON_TO_FRI, 08:00-20:00, $38/h)
              ├── RateRule 2 (MON_TO_FRI, 20:00-08:00, $45/h)
              ├── RateRule 3 (SATURDAY, 08:00-20:00, $45/h)
              └── RateRule 4 (SATURDAY, 20:00-08:00, $50/h)

WorkEvent (Vie 18:00 → 22:00)
    │
    └── Rate Engine invocado
              │
              ├── Detecta límite: 20:00
              ├── Segmento 1: 18:00-20:00 → RateRule 1 → $76
              └── Segmento 2: 20:00-22:00 → RateRule 2 → $90
              │
              ▼
        RateCalculation
          snapshot: {copia del RatePlan}
          segments: [Seg1, Seg2]
          total:    $166
          status:   CONFIRMED
              │
              ▼
        RateResult (para Billing)
          lineItems: [
            { "Tarifa diurna  2h × $38", $76 },
            { "Tarifa nocturna 2h × $45", $90 }
          ]
              │
              ▼
        InvoiceItems
          Item 1: $76 (workEventId: X)
          Item 2: $90 (workEventId: X)
              │
              ▼
        Invoice
          total: $166
```

---

## Reglas del dominio

**BR-RE-001** `[DOMINIO]`
Un RatePlan de tipo `DAY_AND_TIME_VARIABLE` debe cubrir las 24 horas del día para cada DayPattern configurado. No puede tener brechas de cobertura. El sistema valida esto al guardar el RatePlan — no en tiempo de cálculo.

**BR-RE-002** `[DOMINIO]`
Dos RateRules del mismo RatePlan no pueden tener el mismo DayPattern + TimeRange + prioridad. Un RatePlan con reglas ambiguas es inválido y no puede activarse.

**BR-RE-003** `[DOMINIO]`
El Rate Engine es la única entidad del sistema que puede crear RateCalculations. Ningún módulo externo — incluyendo Billing — puede calcular valores de WorkEvents directamente.

**BR-RE-004** `[DOMINIO]`
Una RateCalculation en estado `CONFIRMED` es absolutamente inmutable. Para corregir un cálculo confirmado, se anula el WorkEvent y se crea uno nuevo — la RateCalculation original permanece en el historial.

**BR-RE-005** `[DOMINIO]`
El snapshot del RatePlan en la RateCalculation es una copia completa en el momento del cálculo. No es una referencia. Si el RatePlan cambia en el futuro, los cálculos históricos conservan el plan que estaba vigente.

**BR-RE-006** `[DOMINIO]`
Si el Rate Engine no puede encontrar ninguna RateRule aplicable para un segmento de tiempo, el cálculo falla con error explícito. El Rate Engine nunca asume $0 como valor por defecto de un segmento sin regla.

**BR-RE-007** `[DOMINIO]`
Un WorkEvent que cruza la medianoche se segmenta automáticamente en el límite del día. Los segmentos pertenecen al WorkEvent original — no se crean WorkEvents separados por el cruce de día.

**BR-RE-008** `[DOMINIO]`
El RateResult expuesto a Billing no contiene referencias a RateRules, DayPatterns, ni detalles internos del Rate Engine. Solo contiene líneas de facturación legibles: descripción, duración, tarifa unitaria, monto.

**BR-RE-009** `[DOMINIO]`
Un override manual de una RateCalculation (`status: OVERRIDDEN`) requiere `overrideReason` obligatorio y queda registrado en el audit log del Business. Un override sin justificación es rechazado.

**BR-RE-010** `[DOMINIO]`
La relación WorkEvent → InvoiceItem es 1:N. Un WorkEvent puede generar uno o más InvoiceItems — nunca cero. Un WorkEvent sin InvoiceItems en una Invoice es una violación del modelo.

---

## Decisiones arquitectónicas

**DEC-RE-001 — El Rate Engine vive en el Work domain:**
El Rate Engine y las RateCalculations pertenecen al Work domain. Billing no puede calcular valores de WorkEvents directamente. Billing recibe el RateResult ya calculado. Esta frontera se documenta en BND-04 de `06-business-boundaries.md`.

**DEC-RE-002 — RateCalculation siempre incluye snapshot:**
El snapshot del RatePlan en la RateCalculation es obligatorio. Sin él, no hay garantía de inmutabilidad histórica. Esta es la implementación del principio BR-RAT-003 de `04-business-rules.md`.

**DEC-RE-003 — Un WorkEvent genera N InvoiceItems:**
La relación WorkEvent → InvoiceItem es 1:N. Billing puede presentar los items como quiera en la UI, pero el origen siempre es granular.

**DEC-RE-004 — La segmentación precede al cálculo:**
El Rate Engine no es un calculador de totales. Es un segmentador de tiempo que luego calcula cada segmento. Cualquier extensión futura (overtime, allowances) se agrega como un nuevo tipo de segmento — no como un ajuste al total.

**DEC-RE-005 — Validación del RatePlan en save, nunca en runtime:**
La integridad del plan (ausencia de brechas, ausencia de conflictos) se valida cuando el RatePlan es guardado. En tiempo de cálculo, el motor confía en que el plan es válido. Esta separación protege el rendimiento del cálculo y ubica los errores en el momento correcto: la configuración.

**DEC-RE-006 — WorkEvent almacena referencia, no cálculo embebido:**
WorkEvent tiene `rateCalculationId` (referencia) y `confirmedAmount` (campo de conveniencia desnormalizado). La RateCalculation vive como entidad separada con su propio ciclo de vida. El `confirmedAmount` es solo para queries rápidas — nunca para facturación.

---

## Relación con otros dominios

| Dominio | Relación |
|---|---|
| **Work** | Dueño del Rate Engine, RatePlan, RateRule, RateCalculation, RateSegment. Es el único dominio que ejecuta cálculos económicos sobre WorkEvents |
| **Billing** | Consume únicamente el RateResult (lineItems) para crear InvoiceItems. Nunca accede al Rate Engine ni a las RateRules directamente |
| **Calendar** | Provee WorkEvents `draft` al Work domain. No conoce el Rate Engine ni las RateRules |
| **Business** | El Business Personality define la jurisdicción y (en el futuro) el HolidayCalendar que el Rate Engine consulta para PublicHoliday rules |
| **Analytics** | Puede consumir RateCalculation data para análisis de revenue por tipo de tarifa. Solo lectura — nunca modifica cálculos |
| **Financial** | No interactúa con el Rate Engine. Recibe FinancialTransactions desde Billing, que a su vez vienen de InvoiceItems que vienen del RateResult |
| **Identity** | El User que confirma el WorkEvent dispara el Rate Engine. Identity no conoce la lógica de cálculo |

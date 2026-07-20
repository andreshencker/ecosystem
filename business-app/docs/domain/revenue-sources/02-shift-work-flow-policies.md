# 02 — Shift Work Flow Policies

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial

---

## Alcance de este documento

Este documento define exclusivamente las políticas del flujo **Shift Work**.

Estas políticas NO aplican al ERP en general. NO pertenecen al Billing Domain. NO pertenecen al Revenue Domain. Son reglas internas del Revenue Source Shift Work.

Cualquier otra política (Payment Terms, Due Date, Reminder Policy) es una **Financial Policy** compartida por todos los Revenue Sources. Ver `docs/domain/financial-policies/01-financial-policies.md`.

---

## Posición del flujo Shift Work

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SHIFT WORK — REVENUE SOURCE                             │
│                                                                              │
│   Calendar     →    Work Domain    →   Revenue Domain   →   Billing Domain  │
│   (shifts)          (WorkEvents,        (BillingPeriod,      (Invoices,      │
│                      Rates,              RevenueDraft,         InvoiceItems)  │
│                      Contracts)          RevenueLines)                        │
│                                                                              │
│   Flow Policies aplican aquí ───────────────────────────►                   │
│   Financial Policies aplican                               aquí ───────────► │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## POLÍTICA 1 — Billing Period

**Definición:** El Billing Period define la ventana de tiempo durante la cual se acumulan los WorkEvents de un Contract para producir una Invoice.

**Responsable:** Revenue Domain, configurado por el `billingCycle` del Contract.

### Tipos de Billing Period

| Tipo | Duración | Inicio automático | Cierre automático |
|---|---|---|---|
| `DAILY` | 1 día | Al confirmar el primer WorkEvent del día | Al finalizar el día (23:59) |
| `WEEKLY` | 7 días | Lunes (configurable) | Domingo 23:59 (configurable) |
| `FORTNIGHTLY` | 14 días | Día 1 o Día 15 del mes | Día 14 o último día del mes |
| `MONTHLY` | Mes calendario | Día 1 del mes | Último día del mes |
| `CUSTOM` | Fechas definidas | Fecha definida por Business Owner | Fecha definida por Business Owner |
| `MANUAL` | Sin fecha fija | Al activar el Contract | Cuando Business Owner lo cierra |

**Regla de creación:** El BillingPeriod se crea automáticamente cuando llega el primer WorkEvent confirmado que no pertenece a ningún BillingPeriod activo del Contract. Para Contracts con `billingCycle: MANUAL`, el BillingPeriod se crea cuando el Contract se activa.

**Regla de solapamiento:** Dos BillingPeriods del mismo Contract nunca pueden solaparse. Para cualquier fecha, un WorkEvent pertenece a exactamente un BillingPeriod.

---

## POLÍTICA 2 — Billing Cut-Off

**Definición:** El Billing Cut-Off es el momento exacto en que un BillingPeriod se cierra y deja de aceptar nuevos WorkEvents.

**Responsable:** Revenue Domain.

### Configuración del Cut-Off por tipo de período

| Tipo | Cut-Off por defecto | Configurable |
|---|---|---|
| `DAILY` | 23:59 hora local del Business | No |
| `WEEKLY` | Domingo 23:59 hora local | Sí — día y hora de corte |
| `FORTNIGHTLY` | Último día del período a las 23:59 | Sí — hora de corte |
| `MONTHLY` | Último día del mes a las 23:59 | Sí — día del mes (ej. día 25) |
| `CUSTOM` | La fecha de fin definida | No — es la fecha elegida |
| `MANUAL` | No hay Cut-Off automático | N/A |

### Ejemplos de Cut-Off configurados

```
Business: Hospitality contractor
  billingCycle: WEEKLY
  cutOffDay: FRIDAY
  cutOffTime: 18:00
  → El período cierra el viernes a las 18:00 horas locales.
  → Los shifts del sábado y domingo van al período siguiente.

Business: IT consultant
  billingCycle: MONTHLY
  cutOffDay: 15  (día 15 del mes)
  → El período cierra el día 15.
  → Del 16 al siguiente 15 es un nuevo período.

Business: Events agency
  billingCycle: MANUAL
  → Sin corte automático. El Business Owner cierra cuando decide.
```

---

## POLÍTICA 3 — WorkEvent Assignment

**Definición:** La regla que determina a qué BillingPeriod pertenece un WorkEvent.

**Responsable:** Revenue Domain.

**Regla canónica:** Un WorkEvent se asigna al BillingPeriod cuyo rango `[periodStart, periodEnd]` contiene la fecha de inicio del WorkEvent (`workEvent.startTime.date`).

```
Regla de asignación:
  workEvent.startTime.date ≥ billingPeriod.periodStart
  workEvent.startTime.date ≤ billingPeriod.periodEnd
  workEvent.contractId     = billingPeriod.contractId
```

**Caso especial — turno nocturno que cruza medianoche:**
Si un WorkEvent comienza el último día del período y termina el primer día del período siguiente, pertenece al período en que comenzó. La fecha de inicio del WorkEvent es el único discriminador.

```
Ejemplo:
  BillingPeriod: 01 Jul – 31 Jul (MONTHLY)
  WorkEvent: 31 Jul 22:00 → 01 Aug 02:00
  → Pertenece al BillingPeriod de Julio (inició el 31 Jul)
```

**Regla de inmutabilidad de asignación:** Una vez que un WorkEvent es asignado a un BillingPeriod y ese período está `CLOSED`, la asignación no puede cambiar. Un WorkEvent confirmado después del cierre va al período siguiente.

---

## POLÍTICA 4 — Late Work Events

**Definición:** Un Late Work Event es un WorkEvent cuya fecha de inicio corresponde a un BillingPeriod ya cerrado, pero que fue confirmado después del cierre.

**Escenarios posibles:**

### Escenario A — BillingPeriod CLOSED, RevenueDraft FROZEN (Invoice Draft no creado)

El Business Owner puede reabrir el BillingPeriod, agregar el WorkEvent, y volver a cerrar el período.

```
CLOSED + FROZEN → [Business Owner reabre] → OPEN + ACCUMULATING
→ WorkEvent asignado → BillingPeriod vuelve a cerrar → CLOSED + FROZEN
```

**Condición:** Solo posible si el RevenueDraft todavía no fue transferido a Billing.

### Escenario B — BillingPeriod INVOICED, Invoice en estado DRAFT

El WorkEvent no puede ser retroagregado al período. El Business Owner puede:
1. Incluirlo como InvoiceItem manual en el Invoice Draft actual
2. Incluirlo en el siguiente BillingPeriod

### Escenario C — BillingPeriod INVOICED, Invoice en estado SENT o posterior

El WorkEvent debe incluirse en el BillingPeriod siguiente o en una Credit Note / Invoice adicional según el caso.

**Regla:** El Revenue Domain RECHAZA intentos de agregar un WorkEvent a un BillingPeriod en estado `INVOICED`. Registra el intento en el audit log con `reason: PERIOD_ALREADY_INVOICED`.

---

## POLÍTICA 5 — Period Reopening

**Definición:** El proceso por el cual un BillingPeriod `CLOSED` retorna a `OPEN` para permitir modificaciones.

**Responsable:** Revenue Domain. Requiere acción explícita del Business Owner o Business Admin.

### Condiciones para reapertura

| Condición | ¿Puede reabrirse? |
|---|---|
| BillingPeriod `CLOSED`, RevenueDraft `FROZEN` | ✅ Sí |
| BillingPeriod `INVOICED`, Invoice en `DRAFT` | ⚠️ Solo si el Invoice Draft es cancelado primero |
| BillingPeriod `INVOICED`, Invoice en `SENT` o posterior | ❌ No — solo Credit Note o Invoice adicional |

**Proceso de reapertura:**

```
1. Business Owner solicita reapertura (con justificación)
2. Revenue Domain verifica condiciones
3. Si se cumple: BillingPeriod → OPEN, RevenueDraft → ACCUMULATING
4. Registro en audit log: { reopenedBy, reason, timestamp, previousState }
5. El Business Owner realiza los ajustes necesarios
6. Business Owner cierra nuevamente → BillingPeriod → CLOSED, RevenueDraft → FROZEN
```

**Invariante de reapertura:** Un BillingPeriod `INVOICED` con Invoice `SENT` nunca puede reabrirse. Esta es una regla absoluta — protege la integridad del documento financiero ya enviado al Customer.

---

## POLÍTICA 6 — Rate Snapshot

**Definición:** El Rate Snapshot es el registro inmutable de la tarifa aplicada a un WorkEvent en el momento de su confirmación.

**Responsable:** Work Domain (Rate Engine).

**Cuándo se captura:** Cuando el Business Admin confirma el WorkEvent. En ese momento, el Rate Engine calcula el monto del WorkEvent usando la Rate vigente del Contract y almacena el resultado en un `RateCalculation` inmutable.

**Por qué es inmutable:** Si la Rate del Contract es modificada después de confirmar el WorkEvent, el monto histórico del WorkEvent NO cambia. Los hechos del pasado son inmutables (BR-RAT-003).

```
Rate en vigencia al confirmar:
  StandardRate: $45/h
  WorkEvent: 8 horas trabajadas
  → RateCalculation: { unitRate: 45, hours: 8, amount: 360 }

Rate modificada después de confirmar:
  StandardRate: $50/h (nueva tarifa)
  → El RateCalculation existente permanece: { amount: 360 }
  → Los futuros WorkEvents usarán la nueva tarifa ($50/h)
```

**Segmentos de tarifa:** El Rate Engine puede aplicar múltiples segmentos en un WorkEvent (estándar, overtime, nocturno). El snapshot captura todos los segmentos.

---

## POLÍTICA 7 — Invoice Generation

**Definición:** El proceso por el cual un BillingPeriod cerrado se convierte en un Invoice Draft.

**Disparador:** El evento `BillingPeriodClosed` publicado por Revenue Domain.

**Flujo:**

```
BillingPeriod → CLOSED
  Revenue Domain:
    1. Congela el RevenueDraft (FROZEN)
    2. Verifica que totalAmount > 0 (si es 0, marca CLOSED_EMPTY — no genera Invoice)
    3. Publica: BillingPeriodClosed { revenueDraftId, contractId, lines[], totalAmount }
  
  Billing Domain:
    4. Crea Invoice en estado DRAFT
    5. Crea InvoiceItem por cada RevenueLine del draft
    6. Aplica GST según FiscalProfile
    7. Calcula dueDate según PaymentTerms del Contract o FiscalProfile

  Revenue Domain:
    8. Actualiza RevenueDraft → TRANSFERRED
    9. Actualiza BillingPeriod → INVOICED
```

**Regla de período vacío:** Un BillingPeriod con `totalAmount = 0` (sin WorkEvents confirmados o con todos los WorkEvents anulados) no genera Invoice Draft. Se marca como `CLOSED_EMPTY` y se archiva. No genera errores — es una situación esperada.

**Generación automática vs manual:** La generación puede ser automática (al cerrar el período, Billing crea el Invoice Draft inmediatamente) o manual (el Business Owner debe confirmar la generación). Esta es una configuración del Business (`autoGenerateInvoice: true | false`).

---

## POLÍTICA 8 — Invoice Approval

**Definición:** El proceso de revisión y aprobación del Invoice Draft antes de enviarlo al Customer.

**Responsable:** Billing Domain. El Business Owner o Business Admin es el actor humano.

**Estados:**

```
Invoice DRAFT
  │  [Business Owner revisa]
  ├─ Aprueba → Invoice APPROVED → [Envío al Customer] → Invoice SENT
  └─ Cancela → Invoice CANCELLED → [BillingPeriod retorna a CLOSED para corrección]
```

**Aprobación automática:** Si el Business configura `autoApproveInvoice: true`, el Invoice Draft pasa automáticamente a `APPROVED` y se envía sin revisión manual. Esta es una configuración de Flow Policy del Shift Work, no de Financial Policy.

**Qué puede modificar el Business Owner en estado DRAFT:**
- Agregar InvoiceItems manuales (por ítems no incluidos en el RevenueDraft)
- Cambiar la fecha de vencimiento (si las condiciones del Customer lo permiten)
- Agregar notas al Customer
- Cambiar el número de factura (solo si el contador lo permite)

**Qué NO puede modificar:**
- Los InvoiceItems que vienen del RevenueDraft (son inmutables una vez en DRAFT)
- El Customer al que pertenece la Invoice
- El período de facturación representado

---

## POLÍTICA 9 — Shift Validation Rules

**Definición:** Las reglas que un WorkEvent debe cumplir para ser considerado válido y billable en el flujo Shift Work.

**Responsable:** Work Domain.

| Regla | Descripción |
|---|---|
| **SV-001** | `endTime > startTime` (con lógica de cruce de medianoche) |
| **SV-002** | `breakMinutes < durationMinutes` (el descanso no puede ser mayor que el turno) |
| **SV-003** | El WorkEvent debe pertenecer a un Contract activo (`status: 'active'`) |
| **SV-004** | El WorkEvent debe tener un Customer con al menos un Contact configurado para poder generar una Invoice |
| **SV-005** | Un WorkEvent `billable: false` nunca puede alcanzar estado `invoiced` |
| **SV-006** | El mismo WorkEvent no puede aparecer en más de un Invoice activo |
| **SV-007** | El WorkEvent no puede superponerse con otro WorkEvent del mismo User en el mismo Contract (misma fecha y horas) |

**Validación al confirmar:** Cuando el Business Admin confirma un WorkEvent, las reglas SV-001 a SV-007 son verificadas. Si alguna falla, el WorkEvent no puede confirmar y se retorna el error específico al actor.

---

## Configuración del Business para Shift Work

La configuración específica del flujo Shift Work reside en el Business, separada de la configuración financiera general:

### ShiftWorkConfiguration (por Business)

```
ShiftWorkConfiguration {
  billingCycle:         WEEKLY | FORTNIGHTLY | MONTHLY | DAILY | CUSTOM | MANUAL
  cutOffDay:            MONDAY | TUESDAY | ... | SUNDAY  (para WEEKLY)
  cutOffTime:           string  — '18:00', '23:59', etc.
  weekStartDay:         MONDAY | SUNDAY (por defecto: lunes)
  autoClosePeriod:      boolean — ¿el sistema cierra el período automáticamente al Cut-Off?
  autoGenerateInvoice:  boolean — ¿el sistema genera el Invoice Draft automáticamente al cerrar?
  autoApproveInvoice:   boolean — ¿el Invoice Draft se aprueba automáticamente?
  allowPeriodReopening: boolean — ¿los Business Admins pueden reabrir períodos cerrados?
  lateEventBehavior:    NEXT_PERIOD | REJECT | NOTIFY_OWNER
}
```

Esta configuración aplica únicamente al flujo Shift Work. No existe para flujos de Services, Products, ni Subscriptions — cada flujo tiene su propia configuración equivalente.

---

## Lo que estas políticas NO son

| Lo que parece una Flow Policy pero es Financial Policy | Pertenece a |
|---|---|
| Payment Terms (Net 7, Net 30, etc.) | Financial Policies → Billing Domain |
| Due Date de la Invoice | Financial Policies → Billing Domain |
| Recordatorios de pago al Customer | Financial Policies → Billing Domain + Automation |
| Política de overdue | Financial Policies → Billing Domain |
| Cobranza y follow-up | Financial Policies → Billing Domain + Automation |

Las Flow Policies del Shift Work terminan cuando el BillingPeriod se cierra y el RevenueDraft es transferido al Billing Domain. A partir de ese momento, la gestión de la Invoice es responsabilidad de las Financial Policies.

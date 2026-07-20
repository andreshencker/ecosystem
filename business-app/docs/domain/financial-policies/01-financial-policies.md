# 01 — Financial Policies

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial

---

## Propósito

Las Financial Policies son las reglas que aplican a **todos los Revenue Sources** del ERP, sin excepción. Una Invoice de Shift Work, una Invoice de Services, y una Invoice de Products comparten exactamente las mismas Financial Policies.

Estas políticas son responsabilidad del **Billing Domain**. No son responsabilidad del Revenue Source que originó la Invoice.

> Si una regla solo aplica al flujo Shift Work, es una **Flow Policy** (ver `docs/domain/revenue-sources/02-shift-work-flow-policies.md`).
> Si aplica a toda Invoice, cualquiera sea su origen, es una **Financial Policy** (este documento).

---

## POLÍTICA 1 — Payment Terms

**Definición:** El plazo que el Customer tiene para pagar una Invoice desde su fecha de emisión.

**Responsable:** Billing Domain. Configurado en FiscalProfile del Business, con override posible por Contract.

### Tipos de Payment Terms

| Tipo | Descripción | dueDate |
|---|---|---|
| `NET_7` | 7 días corridos | issueDate + 7 días |
| `NET_14` | 14 días corridos | issueDate + 14 días |
| `NET_30` | 30 días corridos | issueDate + 30 días |
| `NET_45` | 45 días corridos | issueDate + 45 días |
| `NET_60` | 60 días corridos | issueDate + 60 días |
| `IMMEDIATE` | Pago al recibir | issueDate (dueDate = issueDate) |
| `CUSTOM` | Días definidos por el Business Owner | issueDate + N días |
| `END_OF_MONTH` | Último día del mes de emisión | Fin del mes de issueDate |
| `END_OF_NEXT_MONTH` | Último día del mes siguiente | Fin del mes siguiente |

### Jerarquía de Payment Terms

```
1. Customer-specific override (si el Customer tiene términos especiales)
2. Contract override (si el Contract define términos específicos)
3. Business default (FiscalProfile.defaultPaymentTerms)
```

**Regla:** Los Payment Terms se resuelven al crear el Invoice Draft y quedan fijos en la Invoice. Si el Business cambia sus PaymentTerms por defecto, las Invoices existentes no cambian.

---

## POLÍTICA 2 — Due Date

**Definición:** La fecha en que vence la obligación de pago del Customer.

**Cálculo:** `dueDate = issueDate + paymentTermsDays`

**Reglas:**

| Situación | Regla |
|---|---|
| `dueDate` cae sábado o domingo | Se traslada al siguiente lunes hábil (configurable) |
| `dueDate` cae en feriado nacional | Se traslada al siguiente día hábil (según jurisdicción) |
| Payment Terms = `IMMEDIATE` | `dueDate = issueDate` |
| Payment Terms = `END_OF_MONTH` | `dueDate = último día del mes de issueDate` |

**Inmutabilidad:** Una vez que la Invoice está en estado `SENT`, la `dueDate` es inmutable. Si el Business Owner necesita extender el plazo, debe emitir una nota de crédito y una nueva Invoice, o registrar un acuerdo de pago.

---

## POLÍTICA 3 — Reminder Policy

**Definición:** Las reglas que determinan cuándo y cuántas veces se notifica al Customer sobre una Invoice pendiente de pago.

**Responsable:** Billing Domain + Automation Domain. Communications ejecuta el envío.

### Triggers de recordatorio

| Trigger | Descripción | Por defecto |
|---|---|---|
| `BEFORE_DUE` | Antes del vencimiento | 3 días antes de `dueDate` |
| `ON_DUE` | El día del vencimiento | El día de `dueDate` |
| `AFTER_DUE_1` | Primer recordatorio post-vencimiento | 7 días después de `dueDate` |
| `AFTER_DUE_2` | Segundo recordatorio post-vencimiento | 14 días después de `dueDate` |
| `AFTER_DUE_3` | Tercer recordatorio post-vencimiento | 30 días después de `dueDate` |

**Configuración:** El Business Owner configura qué triggers están activos y con qué cadencia. No todos los triggers son obligatorios — el Business puede elegir solo `AFTER_DUE_1` y `AFTER_DUE_2`.

**Idempotencia:** Un recordatorio no se envía si la Invoice ya está en estado `PAID` o `CANCELLED` al momento del trigger.

**Regla de escalada:** Los recordatorios deben ser progresivamente más formales:
- `BEFORE_DUE`: Recordatorio amigable
- `AFTER_DUE_1`: Recordatorio formal
- `AFTER_DUE_2`: Aviso de mora
- `AFTER_DUE_3`: Aviso de gestión de cobranza

---

## POLÍTICA 4 — Overdue Policy

**Definición:** Las reglas que se aplican cuando una Invoice supera su `dueDate` sin pago registrado.

**Responsable:** Billing Domain (detección) + Automation Domain (acciones).

### Detección de Overdue

Un job diario detecta Invoices con `dueDate < hoy` y `status ∈ {sent, viewed, partial}`. Cuando detecta una, la transiciona a `status: overdue` y publica `InvoiceOverdue`.

**Frecuencia:** Una vez por día, en horario nocturno (configurable por el operador de la plataforma).

### Estados de Overdue

```
Invoice OVERDUE
  │ [pago parcial recibido]
  ├───────────────────────────────► Invoice PARTIAL + OVERDUE flag
  │
  │ [pago total recibido]
  ├───────────────────────────────► Invoice PAID (overdue flag limpiado)
  │
  │ [Business Owner anula]
  └───────────────────────────────► Invoice VOID
```

### Consecuencias del Overdue

| Consecuencia | Automático | Manual |
|---|---|---|
| Cambio de estado a `overdue` | ✅ | — |
| Envío de reminder `AFTER_DUE_1` | ✅ (si está configurado) | — |
| Nota en el perfil del Customer | ✅ | — |
| Bloquear nuevas Invoices al Customer | ❌ | ✅ (decisión del Business Owner) |
| Pasar a Collection | ❌ | ✅ (ver Política 6) |

**Regla anti-spam:** Si una Invoice ya tiene un recordatorio enviado en las últimas 24 horas, el sistema no envía otro aunque el trigger esté activo. Protege al Customer de spam.

---

## POLÍTICA 5 — Interest on Late Payment (futuro)

**Definición:** El cargo por demora que el Business puede aplicar a Invoices vencidas.

**Estado:** Diseñado conceptualmente. Implementación en fase futura.

**Regla:** Si el Business configura una tasa de interés por mora, el sistema puede generar automáticamente una Invoice adicional por el interés acumulado cuando el Customer paga una Invoice overdue. Esto es un InvoiceItem adicional — no modifica la Invoice original.

---

## POLÍTICA 6 — Collection Policy

**Definición:** Las reglas que determinan cuándo una Invoice pasa del proceso de recordatorios al proceso formal de cobranza.

**Responsable:** Billing Domain + Business Owner (decisión).

### Criterios de escalada a cobranza

Una Invoice puede pasar a `IN_COLLECTION` cuando se cumplan todas las condiciones:
1. `status: overdue`
2. `overduedays >= collectionThresholdDays` (configurable por Business, por defecto: 60 días)
3. El Business Owner confirma la escalada explícitamente

**El sistema NUNCA escala a cobranza automáticamente.** La escalada siempre requiere confirmación del Business Owner. El sistema solo alerta cuando se cumplen los criterios.

### Estados de cobranza

```
Invoice OVERDUE
  │ [60+ días sin pago, Business Owner confirma]
  ▼
Invoice IN_COLLECTION
  │
  ├─ [acuerdo de pago] ─────────────────────────► Payment Plan activo
  │
  ├─ [pago recibido] ───────────────────────────► Invoice PAID
  │
  └─ [incobrabilidad declarada] ────────────────► Invoice WRITTEN_OFF
```

### Registro contable de baja (Write-Off)

Cuando una Invoice es declarada incobrable:

```
FinancialTransaction: BAD_DEBT_WRITTEN_OFF
  DR: Bad Debt Expense    (monto neto)
  DR: GST Liability adj   (reversal del GST)
  CR: Accounts Receivable (monto total)
```

El Business Owner puede reclamar el GST pagado al ATO cuando la deuda es declarada incobrable (Bad Debt Adjustment). El sistema prepara los datos para el BAS del período.

---

## POLÍTICA 7 — Accounts Receivable Lifecycle

**Definición:** El ciclo de vida completo del Accounts Receivable (AR) abierto por una Invoice.

**Responsable:** Billing Domain (gestión) + Financial Engine + Accounting Engine.

```
Invoice SENT
  │ FinancialTransaction: INVOICE_ISSUED
  │ JournalEntry: DR Accounts Receivable / CR Revenue / CR GST Collected
  │
  │ → AR ABIERTO
  │   amountDue = Invoice.total
  │
  │ [Payment parcial registrado]
  ├──────────────────────────────────────────────►  AR PARCIALMENTE CANCELADO
  │   FinancialTransaction: PAYMENT_RECEIVED         amountDue -= payment.amount
  │   JournalEntry: DR Bank / CR Accounts Receivable
  │
  │ [Payment total registrado]
  ▼
AR CANCELADO
  Invoice PAID
  amountDue = 0
  FinancialTransaction: PAYMENT_RECEIVED
  JournalEntry: DR Bank / CR Accounts Receivable

CASOS ESPECIALES:
  Invoice VOID → AR REVERTIDO
    FinancialTransaction: INVOICE_VOIDED
    JournalEntry: Reversal completo (DR Revenue / DR GST / CR AR)

  Invoice WRITTEN_OFF → AR BAJA
    FinancialTransaction: BAD_DEBT_WRITTEN_OFF
    JournalEntry: DR Bad Debt / CR AR
```

**Invariante AR:** `Invoice.amountDue = Invoice.total - sum(Payments)`. Esta invariante se verifica con cada Payment registrado.

---

## POLÍTICA 8 — Invoice Lifecycle (Financial States)

**Definición:** Los estados financieros que puede tener una Invoice desde su emisión hasta su cierre.

Esta es la vista financiera del ciclo de vida. La vista operacional (draft, approved, etc.) se documenta en las Flow Policies de cada Revenue Source.

```
DRAFT ─────────────────────────────────────────────────► CANCELLED
  │            (antes de SENT — sin consecuencias financieras)
  ▼
SENT ──────────────────────────────────────────────────► VOID
  │       (primer hecho financiero: AR abierto)              │
  │                                                          │ (reversal de AR)
  ├──── [email abierto] ─────────────────────────────────► VIEWED (no es estado financiero)
  │
  ├──── [dueDate superado] ──────────────────────────────► OVERDUE
  │                                                          │
  │                                                    Reminders
  │                                                          │
  │                                               [60+ días sin pago]
  │                                                          ▼
  │                                               IN_COLLECTION
  │                                                          │
  │                                               [incobrable]
  │                                                          ▼
  │                                               WRITTEN_OFF
  │
  ├──── [Payment parcial] ───────────────────────────────► PARTIAL
  │                                                          │
  │                                               [Payment adicional]
  │                                                          │
  ▼                                                          ▼
PAID ◄──────────────────────────────────────────────────────
  (AR cancelado, ciclo cerrado)
```

**Regla de estados terminales:** `PAID`, `VOID`, `CANCELLED`, y `WRITTEN_OFF` son terminales. Una Invoice en cualquiera de estos estados no cambia de estado nunca más. Para corregir una Invoice `PAID` o `VOID`, se emite una nueva Invoice o Credit Note.

---

## POLÍTICA 9 — Payment Lifecycle

**Definición:** El ciclo de vida de un Payment registrado contra una Invoice.

```
PENDING ─────────────────────────────────────────────────► REVERSED
  │       (registro manual del Business Owner)               │
  │                                                          │ [Payment revertido]
  │ [cleared — confirmación manual o bancaria]               │ FinancialTransaction: PAYMENT_REVERSED
  ▼                                                          │ JournalEntry: reversal del DR Bank
CLEARED ─────────────────────────────────────────────────► REVERSED
  (hecho económico irrebatible)                              (con nuevo Payment)
```

**Estados:**

| Estado | Descripción |
|---|---|
| `PENDING` | Payment registrado por el Business Owner, pendiente de confirmación |
| `CLEARED` | Payment confirmado (dinero efectivamente recibido) |
| `REVERSED` | Payment revertido (cheque rechazado, cargo disputado, etc.) |

**Regla de reversión:** La reversión no modifica el Payment original. Se crea una nueva FinancialTransaction de tipo `PAYMENT_REVERSED`. El `amountDue` de la Invoice retorna al estado previo al Payment.

**Regla de fecha:** Un Payment no puede tener `paymentDate` anterior a `Invoice.issueDate` (BR-PAY-003). El sistema rechaza intentos de registrar pagos con fechas inválidas.

---

## Matriz de Financial Policies por Revenue Source

Todos los Revenue Sources comparten exactamente las mismas Financial Policies:

| Financial Policy | Shift Work | Services | Products | Subscriptions | Proyectos |
|---|---|---|---|---|---|
| Payment Terms | ✅ | ✅ | ✅ | ✅ | ✅ |
| Due Date | ✅ | ✅ | ✅ | ✅ | ✅ |
| Reminder Policy | ✅ | ✅ | ✅ | ✅ | ✅ |
| Overdue Policy | ✅ | ✅ | ✅ | ✅ | ✅ |
| Collection Policy | ✅ | ✅ | ✅ | ✅ | ✅ |
| AR Lifecycle | ✅ | ✅ | ✅ | ✅ | ✅ |
| Invoice Lifecycle | ✅ | ✅ | ✅ | ✅ | ✅ |
| Payment Lifecycle | ✅ | ✅ | ✅ | ✅ | ✅ |

Solo cambia qué originó la Invoice. La gestión post-emisión es idéntica.

---

## Separación de responsabilidades

```
REVENUE SOURCE                    FINANCIAL DOMAIN
(Flow Policies)                   (Financial Policies)
────────────────                  ─────────────────────────────────
¿Cuándo cerrar el período?        ¿Cuándo vence la Invoice?
¿Cómo agrupar los billable units? ¿Cuándo se envía el recordatorio?
¿Qué validaciones pasan el turno? ¿Qué pasa si no pagan en 60 días?
¿Cuándo generar el Invoice Draft? ¿Cómo se registra el pago?
¿Quién aprueba el Invoice Draft?  ¿Cuándo se declara incobrable?

Termina aquí ──────────────────────────────────────────────► Comienza aquí
  cuando RevenueDraft → TRANSFERRED                   cuando Invoice → SENT
```

# 05 — Financial Impact Matrix

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial — Decisión arquitectónica de alto impacto

Este documento es la **fuente de verdad** sobre qué eventos del ciclo de ingreso representan hechos económicos formales. Esta clasificación determina qué eventos generan FinancialTransactions (y por lo tanto JournalEntries) y cuáles no.

Esta matriz es la base del diseño del Financial Engine y del Analytics Engine. Debe consultarse antes de implementar cualquier módulo que interactúe con Accounting.

---

## Principio de clasificación

No todo evento de negocio es un hecho económico formal. La diferencia es fundamental:

```
EVENTO OPERATIVO:
  Representa un cambio de estado del negocio.
  Ejemplo: WorkEvent confirmado, Invoice enviada.
  Puede o no generar un hecho económico.

EVENTO FINANCIERO:
  Representa una transacción económica que debe registrarse
  en el libro mayor. Genera una FinancialTransaction
  que el Accounting Engine convierte en JournalEntry.
  Ejemplo: Invoice enviada al Customer (nace la deuda exigible).

EVENTO ANALÍTICO:
  Solo actualiza métricas, KPIs, y Read Models.
  No genera FinancialTransactions ni modifica estado operativo.
  Ejemplo: Invoice abierta por el Customer (tracking de engagement).
```

Un evento puede ser simultáneamente Operativo + Financiero + Analítico. La matriz muestra cuáles aplican a cada caso.

---

## Decisión de Revenue Recognition

El sistema usa el **método de reconocimiento al momento del envío de la Invoice** (invoice-basis accrual):

> El ingreso se reconoce cuando la Invoice es enviada al Customer — no cuando se confirma el trabajo, no cuando se crea el borrador, y no cuando se recibe el pago.

Esta decisión implica:
- Antes de `Invoice.Sent` → no hay JournalEntry de ingreso
- Al `Invoice.Sent` → nace el Accounts Receivable y el ingreso
- Al `Payment.Received` → se cancela el AR (no se "crea" el ingreso de nuevo)

Alternativa futura: en contabilidad de caja estricta, el ingreso se reconoce al recibir el pago. El Financial Engine puede soportar ambos modos configurando las PostingRules apropiadas.

---

## La Matriz Completa

| # | Evento | Dominio Origen | Operativo | Financiero | Analítico | FinancialTransaction | Descripción del impacto |
|---|---|---|---|---|---|---|---|
| 1 | `WorkEvent.Created` | Work | ✅ | ❌ | ❌ | — | El trabajo existe pero no está confirmado — no es todavía un hecho económico |
| 2 | `WorkEvent.Confirmed` | Work | ✅ | ❌ | ✅ | — | El trabajo es billable. Actualiza: Billable Hours KPI, Revenue Pending |
| 3 | `RateCalculation.Created` | Work | ✅ | ❌ | ✅ | — | Se calculó el valor — actualiza KPI de valor pendiente de facturar |
| 4 | `BillingPeriod.Opened` | Revenue | ✅ | ❌ | ❌ | — | Apertura administrativa del período |
| 5 | `RevenueDraft.Updated` | Revenue | ✅ | ❌ | ✅ | — | Actualiza KPI de ingreso pendiente de facturar del Business |
| 6 | `BillingPeriod.Closed` | Revenue | ✅ | ❌ | ✅ | — | Actualiza KPI de velocidad de cierre de período |
| 7 | `RevenueDraft.Transferred` | Revenue | ✅ | ❌ | ✅ | — | Ingreso transferido al ciclo de billing — ya no está "pendiente" |
| 8 | `Invoice.DraftCreated` | Billing | ✅ | ❌ | ❌ | — | El borrador existe pero no es un compromiso formal todavía |
| 9 | `Invoice.Approved` | Billing | ✅ | ❌* | ✅ | — | *Ver nota sobre accrual estricto |
| **10** | **`Invoice.Sent`** | **Billing** | **✅** | **✅** | **✅** | **`INVOICE_ISSUED`** | **El primer hecho económico formal. Nace el AR. DR: AR / CR: Revenue + GST Collected** |
| 11 | `Invoice.Viewed` | Billing | ✅ | ❌ | ✅ | — | Solo tracking — el Customer abrió el email. Actualiza engagement analytics |
| 12 | `Invoice.Overdue` | Billing | ✅ | ❌ | ✅ | — | Sin impacto financiero directo — actualiza AR aging KPI |
| 13 | `Reminder.Sent` | Communications | ✅ | ❌ | ✅ | — | Solo comunicación — actualiza contador de recordatorios enviados |
| **14** | **`Payment.Received`** | **Billing** | **✅** | **✅** | **✅** | **`PAYMENT_RECEIVED`** | **Cancela AR (total o parcial). DR: Bank / CR: AR** |
| 15 | `Invoice.PartiallyPaid` | Billing | ✅ | ✅ | ✅ | `PAYMENT_RECEIVED` (parcial) | Misma transacción que payment.received — el estado Invoice pasa a PARTIAL |
| 16 | `Invoice.FullyPaid` | Billing | ✅ | ❌ | ✅ | — | Estado que se infiere del último Payment — no genera FT adicional |
| **17** | **`Invoice.Voided`** | **Billing** | **✅** | **✅** | **✅** | **`INVOICE_VOIDED`** | **Reversa el INVOICE_ISSUED. DR: Revenue / CR: AR (reversal)** |
| 18 | `Invoice.Cancelled` | Billing | ✅ | ❌ | ✅ | — | Solo si la Invoice nunca fue enviada (draft/approved) — no hay FT porque nunca hubo INVOICE_ISSUED |
| **19** | **`Payment.Reversed`** | **Billing** | **✅** | **✅** | **✅** | **`PAYMENT_REVERSED`** | **Reversa el PAYMENT_RECEIVED. DR: AR / CR: Bank (reversal)** |
| **20** | **`CreditNote.Issued`** | **Billing** | **✅** | **✅** | **✅** | **`CREDIT_NOTE_ISSUED`** | **Reduce el AR por un monto parcial. DR: Revenue / CR: AR** |
| 21 | `WorkEvent.Voided` | Work | ✅ | ❌* | ✅ | — | *Si el WorkEvent ya fue facturado: el impacto se gestiona via Invoice.Voided |
| 22 | `BillingPeriod.Reopened` | Revenue | ✅ | ❌ | ✅ | — | Sólo posible si no hay Invoice Draft — sin impacto financiero |

---

## Los 5 hechos económicos formales

De toda la matriz, solo estos eventos generan FinancialTransactions y por lo tanto JournalEntries:

### FT-01: INVOICE_ISSUED
**Trigger:** `Invoice.Sent`
**Significado:** El Business emitió una factura. Nace la deuda del Customer.
**Asiento contable (referencia — PostingRules la determinan):**
```
DR: Accounts Receivable    $110.00  (total inc. GST)
    CR: Revenue             $100.00  (monto neto)
    CR: GST Collected        $10.00  (impuesto recaudado)
```

### FT-02: PAYMENT_RECEIVED
**Trigger:** `Payment.Received`
**Significado:** El Business recibió dinero del Customer. La deuda se cancela (total o parcialmente).
**Asiento contable (referencia):**
```
DR: Bank Account           $110.00  (monto recibido)
    CR: Accounts Receivable $110.00  (se cancela el AR)
```

### FT-03: INVOICE_VOIDED
**Trigger:** `Invoice.Voided`
**Significado:** La Invoice fue anulada. La deuda del Customer deja de existir.
**Asiento contable (referencia — reversal de FT-01):**
```
DR: Revenue                $100.00
DR: GST Collected           $10.00
    CR: Accounts Receivable $110.00
```

### FT-04: PAYMENT_REVERSED
**Trigger:** `Payment.Reversed`
**Significado:** Un pago fue revertido (NSF, chargeback). La deuda del Customer vuelve a existir.
**Asiento contable (referencia — reversal de FT-02):**
```
DR: Accounts Receivable    $110.00
    CR: Bank Account        $110.00
```

### FT-05: CREDIT_NOTE_ISSUED
**Trigger:** `CreditNote.Issued`
**Significado:** El Business emitió una nota de crédito, reduciendo parcialmente la deuda del Customer.
**Asiento contable (referencia):**
```
DR: Revenue                 $50.00  (reducción del ingreso)
DR: GST Collected            $5.00  (reducción del GST)
    CR: Accounts Receivable  $55.00  (reducción del AR)
```

---

## Nota sobre Invoice.Approved y revenue recognition estricto

En contabilidad de caja y en la mayoría de sistemas SMB, el ingreso se reconoce al enviar la Invoice. Por eso `Invoice.Approved` no genera FinancialTransaction en el modelo base.

Sin embargo, en contabilidad de acumulación estricta (large enterprises), el ingreso puede reconocerse al aprobar la Invoice (cuando el trabajo está "earned"). La arquitectura de PostingRules permite soportar este modelo en el futuro configurando una PostingRule para el evento `Invoice.Approved` — sin cambiar el modelo de Revenue ni de Billing.

Esta es una **Pregunta Abierta** (PO-REV-001) — no se decide en v1.

---

## Eventos que NUNCA generan FinancialTransaction

Los siguientes eventos son claramente operativos o analíticos — documentarlos explícitamente evita que sean tratados incorrectamente en la implementación:

| Evento | Por qué NO genera FT |
|---|---|
| `WorkEvent.Confirmed` | El trabajo es billable, pero no es un hecho contable hasta que se factura |
| `RevenueDraft.Updated` | Es el estado interno del Revenue domain — no tiene existencia contable |
| `Invoice.DraftCreated` | Un borrador no es un documento financiero emitido |
| `Invoice.Viewed` | El Customer abrió el email — no tiene consecuencia financiera |
| `Invoice.Overdue` | Es un cambio de estado (vencida) — el hecho financiero ya ocurrió al enviarla |
| `Invoice.FullyPaid` | El hecho financiero fue cada `Payment.Received` — este es solo el estado resultante |
| `Invoice.Cancelled` | Solo si nunca fue enviada — no hay INVOICE_ISSUED que revertir |
| `Reminder.Sent` | Comunicación — sin impacto financiero |
| `BillingPeriod.*` | Eventos administrativos del ciclo de revenue |

---

## Cuándo actualiza Analytics

Los eventos que actualizan KPIs y Read Models son la mayoría — casi todo lo que ocurre en el ciclo tiene relevancia analítica. Los más importantes:

| Evento | KPI / Read Model actualizado |
|---|---|
| `WorkEvent.Confirmed` | Billable Hours MTD, Revenue Pending, Workload View |
| `RevenueDraft.Updated` | Revenue Pending (actualización en tiempo real) |
| `Invoice.Sent` | AR Balance, Revenue MTD, AR Aging (comienza) |
| `Invoice.Viewed` | Invoice Engagement Rate |
| `Invoice.Overdue` | AR Aging (overdue bucket), Collections at Risk |
| `Payment.Received` | AR Balance (reducción), Collections Rate, Cash Flow |
| `Invoice.Paid` | Collections Rate, DSO (Days Sales Outstanding) |
| `Invoice.Voided` | Revenue ajustado, AR Balance |

---

## Garantías de idempotencia para hechos financieros

Todo evento financiero debe ser idempotente para evitar doble contabilización:

| Evento financiero | Clave de idempotencia |
|---|---|
| `Invoice.Sent` → FT-01 | `(invoiceId, INVOICE_ISSUED)` — un solo INVOICE_ISSUED por invoiceId |
| `Payment.Received` → FT-02 | `(paymentId, PAYMENT_RECEIVED)` — un solo FT por paymentId |
| `Invoice.Voided` → FT-03 | `(invoiceId, INVOICE_VOIDED)` — un solo INVOICE_VOIDED por invoiceId |
| `Payment.Reversed` → FT-04 | `(paymentId, PAYMENT_REVERSED)` — un solo FT por paymentId |
| `CreditNote.Issued` → FT-05 | `(creditNoteId, CREDIT_NOTE_ISSUED)` — un solo FT por creditNoteId |

Si el Financial Engine recibe dos veces el mismo evento con la misma clave, rechaza el segundo con una violación de idempotencia (BR-FIN-005).

---

## Addendum — Recognition Policy (ver `09-recognition-policy.md`)

**Actualización de la decisión de Revenue Recognition:**

La sección "Decisión de Revenue Recognition" de este documento establecía que el sistema usa invoice-basis como política hardcodeada. Esta decisión ha sido revisada y mejorada arquitectónicamente.

**Decisión actualizada:**
La política de reconocimiento de ingresos es **configuración del Financial domain** (Recognition Policy), no lógica hardcodeada de Revenue ni de Billing. Revenue y Billing publican hechos económicos crudos; el Financial Engine consulta la RecognitionPolicy del Business para decidir cuándo crear cada FinancialTransaction.

**Implicación para esta Matriz:**
La columna "FinancialTransaction" debe leerse como: "¿es este un hecho económico que PUEDE generar una FT?" — no como "¿siempre genera una FT al ocurrir?". El cuándo depende de la RecognitionPolicy.

| Policy | Evento que dispara INVOICE_ISSUED | Evento que dispara PAYMENT_RECEIVED |
|---|---|---|
| `INVOICE_BASIS` (default v1) | `Invoice.Sent` | `Payment.Received` |
| `CASH_BASIS` | N/A (no hay INVOICE_ISSUED) | `Payment.Received` (incluye Revenue + Pago) |
| `ACCRUAL_STRICT` | `Invoice.Sent` (reclasificación AR) | `Payment.Received` |
| `ACCRUAL_STRICT` (extra) | `WorkEvent.Confirmed` → `REVENUE_ACCRUED` | — |

Ver documento completo: `09-recognition-policy.md`.

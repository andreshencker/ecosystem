# 02 — Revenue Lifecycle

**Versión:** 1.1 | **Fecha:** 2026-07-08 | **Estado:** Oficial — Actualizado por ADR-023

> **ADR-023 (2026-07-08):** El WorkEvent es el borrador vivo del revenue. No existe `InvoiceDraft` como entidad. La Invoice se crea como snapshot final después de que el Business Admin revisa y aprueba el WorkEvent. Invoice lifecycle: `draft → approved → sent → paid → cancelled`. Una Invoice enviada no se modifica — se cancela y se crea una nueva. Ver `docs/decisions/ADR-023-work-event-as-revenue-draft.md`.

El ciclo de vida del ingreso describe el camino que recorre el valor económico desde que es generado por el trabajo hasta que es reconocido formalmente en el libro contable. Cada estado representa una etapa diferente del ciclo con sus propias reglas de transición.

---

## El ciclo completo

```
TRABAJO REALIZADO
  WorkEvent CONFIRMED
        │
        │ WorkEventConfirmed (evento publicado por Work)
        ▼
INGRESO GENERADO
  RevenueDraft ACCUMULATING
  BillingPeriod OPEN
        │
        │ (cada nuevo WorkEvent confirmado agrega una RevenueLine)
        │
        │ [fecha de cierre del período alcanzada]
        │  o [Business Owner cierra manualmente]
        ▼
INGRESO CONSOLIDADO
  RevenueDraft FROZEN
  BillingPeriod CLOSED
        │
        │ BillingPeriodClosed (evento publicado por Revenue)
        ▼
FACTURA SOLICITADA
  Revenue ha transferido el control a Billing
  RevenueDraft TRANSFERRED
  BillingPeriod INVOICED
        │
        │ [Billing crea el Invoice Draft]
        ▼
FACTURA EN BORRADOR
  Invoice DRAFT
        │
        │ [Business Owner revisa y aprueba]
        ▼
FACTURA APROBADA
  Invoice APPROVED
        │
        │ [Business Owner envía al Customer]
        ▼
FACTURA ENVIADA ←─── PRIMER HECHO FINANCIERO FORMAL
  Invoice SENT
  FinancialTransaction INVOICE_ISSUED creada
        │
        ├──────────────────────────────────────►  Invoice VIEWED (tracking)
        │                                          (no cambia el estado financiero)
        │
        ├── [fecha de vencimiento superada sin pago]
        │                           ▼
        │                    Invoice OVERDUE
        │                           │
        │                           │ [Reminder sent]
        │◄──────────────────────────┘
        │
        │ [Payment parcial registrado]
        ├────────────────────────────────────────► Invoice PARTIAL
        │                                               │
        │◄──────────────────────────────────────────────┘
        │
        │ [Payment total registrado]
        ▼
INGRESO COBRADO
  Invoice PAID
  FinancialTransaction PAYMENT_RECEIVED creada
        │
        ▼
CICLO CERRADO
  JournalEntry posted (via Accounting Engine)
  Analytics KPIs actualizados
  RevenueDraft archivado
```

---

## Estados del ciclo

### TRABAJO REALIZADO

**Estado:** WorkEvent `confirmed`, RateCalculation `confirmed`
**Descripción:** El trabajo ocurrió, fue registrado, y su valor fue calculado por el Rate Engine. El trabajo es billable pero no está en ninguna factura todavía.
**Qué puede cambiar:** Nada — el WorkEvent confirmado y su RateCalculation son inmutables.
**Quién actúa:** Work domain.

---

### INGRESO GENERADO

**Estado:** RevenueDraft `accumulating`, BillingPeriod `open`
**Descripción:** El valor del WorkEvent confirmado fue capturado por Revenue como una nueva RevenueLine en el RevenueDraft del período correspondiente. El total del RevenueDraft se actualizó.
**Qué puede cambiar:** Nuevas RevenueLines pueden agregarse al RevenueDraft mientras el BillingPeriod esté abierto. Si un WorkEvent confirmado es anulado (raro, solo si la Invoice no fue creada), su RevenueLine se elimina del draft.
**Responde a:** "¿Cuánto ha generado este Contract en lo que va del período?"
**Quién actúa:** Revenue domain (reacciona a `WorkEventConfirmed`).

---

### INGRESO CONSOLIDADO

**Estado:** RevenueDraft `frozen`, BillingPeriod `closed`
**Descripción:** El BillingPeriod llegó a su fecha de cierre (o fue cerrado manualmente). No pueden agregarse nuevas RevenueLines. El total del RevenueDraft es definitivo.
**Qué puede cambiar:** Nada — el RevenueDraft está congelado.
**Qué no puede cambiar:** La lista de RevenueLines y el total.
**Quién actúa:** Revenue domain (trigger automático por fecha o acción manual del Business Owner).

**Transición especial — reapertura:**
Un BillingPeriod cerrado puede reabrirse si no se ha creado todavía el Invoice Draft (RevenueDraft todavía en `frozen`, no en `transferred`). Una vez que el Invoice Draft existe, el período no puede reabrirse — solo puede anularse la Invoice.

---

### FACTURA SOLICITADA

**Estado:** RevenueDraft `transferred`, BillingPeriod `invoiced`
**Descripción:** Revenue publicó `BillingPeriodClosed` con el RevenueDraft completo. Billing consumió el evento y creó el Invoice Draft. Revenue registra que este período ya fue transferido — no puede volver a publicarlo.
**Qué puede cambiar:** Nada en Revenue. El control pasó a Billing.
**Quién actúa:** Billing domain (crea el Invoice Draft desde el payload del evento).

---

### FACTURA EN BORRADOR

**Estado:** Invoice `draft`
**Descripción:** Existe un Invoice Draft con un InvoiceItem por cada RevenueLine del RevenueDraft transferido. El Business Owner puede revisar, ajustar manualmente ítems libres, o descartar el borrador.
**Qué puede cambiar:** El Business Owner puede agregar ítems libres al borrador, cambiar fechas, o ajustar términos. Los InvoiceItems que vienen del Revenue Draft no deberían modificarse, pero el sistema no lo impide en draft.
**Quién actúa:** Billing domain. El Business Owner interactúa a través del portal.

---

### FACTURA APROBADA

**Estado:** Invoice `approved`
**Descripción:** El Business Owner revisó el borrador y lo marcó como aprobado para envío. Los InvoiceItems quedan congelados a partir de este momento.
**Qué puede cambiar:** Nada en los items. Solo puede actualizarse la fecha de envío o cancelarse el borrador.
**Quién actúa:** Business Owner (acción manual) o proceso automático según configuración.

---

### FACTURA ENVIADA — PRIMER HECHO FINANCIERO

**Estado:** Invoice `sent`
**Descripción:** La Invoice fue enviada al Customer. Este es el momento en que nace el primer hecho económico formal: la deuda del Customer es exigible. Se crea una `FinancialTransaction` de tipo `INVOICE_ISSUED`.
**Qué genera:**
- `FinancialTransaction` → `JournalEntry` (Debit: AR / Credit: Revenue + GST Collected)
- Accounts Receivable abierto para este Customer/Invoice
- Analytics: AR aging actualizado, revenue del período registrado
**Quién actúa:** Billing domain + Financial Engine (reacciona al evento `InvoiceSent`).

---

### ACCOUNTS RECEIVABLE ABIERTO

**Estado:** Invoice `sent` / `viewed` / `overdue`
**Descripción:** Hay una deuda exigible del Customer. El Business Owner puede ver en su dashboard cuánto le deben, desde cuándo, y si está vencido.
**Qué puede cambiar:** El estado puede progresar a `viewed` (tracking de apertura), `partial` (pago parcial), u `overdue` (vencida sin pago).
**Quién actúa:** Sistema (job diario para detectar overdue), Customer (al abrir el email), Billing domain (al registrar Payments).

---

### INGRESO COBRADO

**Estado:** Invoice `paid`
**Descripción:** El Business Owner registró el Payment. La Invoice está completamente cancelada. Se crea una `FinancialTransaction` de tipo `PAYMENT_RECEIVED`.
**Qué genera:**
- `FinancialTransaction` → `JournalEntry` (Debit: Bank / Credit: AR)
- Analytics: Collections rate actualizada, cash flow actualizado
**Quién actúa:** Business Owner (registra el pago) → Billing domain.

---

### CICLO CERRADO

**Estado:** JournalEntries posted, Analytics actualizado
**Descripción:** El ciclo de ingreso está completo. El dinero ganado por trabajo realizado pasó por Revenue, Billing, Financial Engine, y quedó registrado en el General Ledger. El RevenueDraft puede archivarse.

---

## Transiciones prohibidas

| De | A | Por qué nunca ocurre |
|---|---|---|
| RevenueDraft FROZEN → ACCUMULATING | Solo si no se creó Invoice Draft — ver reapertura de BillingPeriod | El período reabierto retorna a OPEN, no directamente a ACCUMULATING |
| RevenueDraft TRANSFERRED → cualquier estado anterior | El control pasó a Billing | Solo puede resolverse vía anulación de Invoice en Billing |
| Invoice PAID → cualquier estado anterior | El pago es un hecho económico irreversible | Se crea una reversión como nuevo hecho — no se modifica el pago |
| BillingPeriod INVOICED → OPEN | Ya existe un Invoice Draft | El período solo puede reabrirse si el Invoice Draft fue cancelado en `draft` |

---

## Escenarios especiales

### WorkEvent voided ANTES de que el BillingPeriod cierre

```
WorkEvent CONFIRMED → RevenueLine en RevenueDraft ACCUMULATING
[Business Owner detecta error y voids el WorkEvent]
WorkEvent VOID → RevenueLine ELIMINATED → RevenueDraft total recalculado
```

El RevenueDraft refleja la corrección automáticamente. No hay impacto en facturación porque el período sigue abierto.

### WorkEvent voided DESPUÉS de que el BillingPeriod cierre (Invoice Draft existe)

```
RevenueDraft TRANSFERRED → Invoice DRAFT existe
[Business Owner intenta void el WorkEvent]
Sistema rechaza: "Este WorkEvent está incluido en un Invoice Draft activo."
```

El Business Owner tiene dos opciones:
1. Cancelar el Invoice Draft (solo si está en estado `draft`) → el BillingPeriod retorna a `closed` → se puede corregir manualmente
2. Enviar la Invoice, recibirla, y luego emitir una Credit Note

### BillingPeriod sin WorkEvents

Si un BillingPeriod llega a su fecha de cierre sin ningún WorkEvent confirmado, se cierra automáticamente pero no genera Invoice Draft. No tiene sentido emitir una factura vacía. El sistema registra el período como `closed_empty`.

### Pago parcial

```
Invoice SENT → Invoice PARTIAL (pago parcial registrado)
[FinancialTransaction PAYMENT_RECEIVED (monto parcial)]
[amountDue reducido, AR balance actualizado]
[si pago adicional llega] → Invoice PAID o PARTIAL (acumulativo)
```

Cada Payment parcial genera su propia `FinancialTransaction`. La Invoice llega a PAID cuando `amountPaid >= total`.

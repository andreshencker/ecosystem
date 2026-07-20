# 08 — Revenue Domain Roadmap

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

Este documento describe cómo el diseño del Revenue domain habilita la expansión del ERP hacia módulos futuros sin modificar el núcleo del ciclo de ingreso.

---

## El diseño como base para el crecimiento

El Revenue domain fue diseñado con una abstracción deliberada: en lugar de ser "el módulo que conecta WorkEvents con Invoices", es "el ciclo de ingreso". Esta diferencia no es semántica — es arquitectónica.

```
DISEÑO ESTRECHO:  WorkEvent → Invoice
  Problema: solo funciona para trabajo por hora

DISEÑO AMPLIO:    Hecho Económico → RevenueDraft → Invoice
  Virtud: funciona para cualquier tipo de ingreso
```

Cualquier hecho económico que genere ingreso para el Business — trabajo, gastos recuperables, cuotas de suscripción, fees de proyecto, ventas de producto — puede pasar por el Revenue domain sin modificar su núcleo.

---

## Expenses recuperables

**Módulo futuro:** Fase 6 (Expenses)

Algunos contratos incluyen la recuperación de gastos: el Business incurre en un gasto (hospedaje, materiales, software) y se lo factura al Customer.

**Cómo se integra:**

```
ExpenseApproved (Work/Expenses domain)
    │
    ▼
Revenue domain recibe ExpenseApproved
  → Crea una RevenueLine de tipo EXPENSE_REIMBURSABLE
  → La agrega al RevenueDraft del período correspondiente

BillingPeriodClosed
  → Las líneas de trabajo y las de gastos recuperables van en el mismo Invoice Draft
  → El Customer ve: "Turno: $304 + Hospedaje: $180 = $484"
```

**Qué no cambia en Revenue:**
El mecanismo de RevenueDraft + BillingPeriod + RevenueLine es exactamente el mismo. Solo se agrega un nuevo tipo de RevenueLine (`EXPENSE_REIMBURSABLE`) y un nuevo consumidor del evento `ExpenseApproved`.

**Qué no cambia en Billing:**
Billing recibe el mismo `BillingPeriodClosed` con las mismas RevenueLines. No sabe si una línea viene de un WorkEvent o de un Expense.

---

## Accounts Payable (AP)

**Módulo futuro:** Fase 6

El AP es el lado simétrico al Revenue: en lugar de ingresos del Customer, son gastos hacia Suppliers.

**El modelo simétrico:**

```
REVENUE CYCLE (Accounts Receivable — lo que nos deben):
  WorkEvent → RevenueDraft → Invoice → AR → Payment.In → Financial

AP CYCLE (Accounts Payable — lo que debemos):
  SupplierBill → APDraft → AP Invoice → AP → Payment.Out → Financial
```

El diseño del Revenue domain es el template del AP domain. Las mismas abstracciones aplican:
- `APDraft` = RevenueDraft para el lado de gastos
- `APBillingPeriod` = el ciclo de pago del Supplier
- `APLine` = una línea de gasto pendiente de pago

Los Domain Events del AP ciclo (`SupplierBillReceived`, `SupplierPaymentSent`) son financieros de la misma forma que los del Revenue cycle, generando sus propias FinancialTransactions (`SUPPLIER_BILL_RECEIVED`, `SUPPLIER_PAYMENT_MADE`).

---

## Payroll

**Módulo futuro:** Fase 9

El Payroll es la perspectiva interna del Revenue: mientras el Revenue cycle gestiona cuánto cobra el Business a sus Customers, el Payroll cycle gestiona cuánto paga el Business a sus Employees.

**La extensión del Revenue domain para Payroll:**

El RatePlan puede tener una perspectiva `EMPLOYEE` además de la perspectiva `CLIENT` (DEC-RE mencionado en `09-rate-engine.md`). El mismo WorkEvent puede generar dos RateResults: uno para el Revenue cycle (cuánto cobrar al cliente) y otro para el Payroll cycle (cuánto pagarle al empleado).

```
WorkEvent confirmado
    │
    ├── RateResult CLIENT → RevenueDraft → Invoice
    │                           (Revenue cycle — lo que cobra el Business)
    │
    └── RateResult EMPLOYEE → PayrollDraft → PaySlip
                                (Payroll cycle — lo que paga el Business)
```

**Qué no cambia en Revenue:**
El Revenue cycle no sabe que existe una perspectiva EMPLOYEE. Solo procesa los RateResults de tipo CLIENT como siempre.

---

## Fixed Assets y Depreciación

**Módulo futuro:** Fase 8

La depreciación de activos genera FinancialTransactions pero **no pasa por el Revenue domain**. La depreciación es un gasto contable periódico — no es un ciclo de ingreso.

La depreciación va directamente al Financial domain:
```
AssetDepreciationJob (mensual)
    │
    ▼
FinancialTransaction tipo ASSET_DEPRECIATION
    │
    ▼
Accounting Engine → JournalEntry
```

El Revenue domain no interviene. Esta es la demostración de que el Revenue domain es específico para ciclos de ingreso y AP — no para todos los hechos financieros del Business.

---

## Inventory y ventas de producto

**Módulo futuro:** Fase 10

Cuando el Business vende productos físicos, el ciclo de ingreso es similar al de servicios pero con dos componentes adicionales:
1. El ingreso por la venta (Revenue cycle — igual que servicios)
2. El costo del inventario vendido (COGS — Expense cycle / Financial cycle)

**Cómo se integra con Revenue:**

```
ProductSold → RevenueLine de tipo PRODUCT_SALE → RevenueDraft → Invoice

ProductDelivered → FinancialTransaction tipo INVENTORY_REDUCTION → JournalEntry
  (este es el COGS — no pasa por Revenue, va directo al Financial domain)
```

El Revenue domain solo gestiona el lado del ingreso de la venta. El lado del costo (COGS) es responsabilidad del Inventory domain y del Financial domain.

**Extensión de Billing (Fase 10):**
En Fase 10, un `InvoiceItem` puede referenciar un `productId` además de un `workEventId`. Esta es la única extensión de Billing mencionada en `07-business-evolution.md` — y no requiere cambios en el Revenue domain.

---

## Subscriptions y Recurring Billing

**Módulo futuro:** Post-Fase 10

Las suscripciones son un caso especial de BillingPeriod donde el ciclo es automático y el monto es fijo (no basado en WorkEvents).

**Cómo se integra:**

```
SubscriptionPlan {
  billingCycle: MONTHLY,
  amount: $299/month,
  autoClose: true
}

Cada mes:
  SubscriptionBillingPeriod creado automáticamente
    → RevenueDraft creado con una sola RevenueLine de tipo SUBSCRIPTION
      → BillingPeriodClosed automático al fin del mes
        → Invoice Draft creado automáticamente
```

**Qué no cambia en Revenue:**
El mecanismo de BillingPeriod + RevenueDraft + RevenueLine es exactamente el mismo. La diferencia es que la RevenueLine de suscripción no proviene de un WorkEvent — proviene de una SubscriptionPlan configuration. Revenue no distingue el origen — solo la línea y su monto.

---

## Revenue Recognition (GAAP/IFRS)

**Módulo futuro:** Enterprise tier

Para empresas que deben seguir GAAP o IFRS, el reconocimiento de ingresos puede ser más complejo:
- Una Invoice de un proyecto de 6 meses no se reconoce completamente al enviarse
- Se reconoce proporcionalmente según el cumplimiento de "performance obligations"

**Cómo se integra:**

El Revenue domain ya tiene el estado correcto para esto. La FinancialTransaction `INVOICE_ISSUED` puede tener un `recognitionSchedule` que define cuándo y cuánto del ingreso se reconoce:

```
Invoice por $12,000 (proyecto 6 meses)
  FinancialTransaction INVOICE_ISSUED
    grossAmount: $12,000
    recognitionSchedule: [
      { month: 1, amount: $2,000 },
      { month: 2, amount: $2,000 },
      ...
    ]

Cada mes:
  FinancialTransaction REVENUE_RECOGNIZED (parcial)
    → JournalEntry: DR Deferred Revenue / CR Revenue
```

Esta extensión no cambia el Revenue domain ni Billing — solo extiende el Financial domain con un tipo adicional de FinancialTransaction y las PostingRules correspondientes.

---

## Lo que nunca cambiará

Independientemente de cuántos módulos se agreguen al ERP, los siguientes principios del Revenue domain son permanentes:

| Invariante | Por qué es permanente |
|---|---|
| `businessId` como discriminador de tenant | Todos los datos de Revenue son de un Business específico |
| RevenueDraft es la fuente de verdad del ingreso pendiente | Es la respuesta canónica a "¿cuánto tengo ganado sin facturar?" |
| BillingPeriod + RevenueDraft → Invoice Draft | El mecanismo de agrupación y transferencia es el contrato con Billing |
| Revenue no calcula — solo acumula | Los cálculos siempre vienen del origen (Rate Engine, Subscription, etc.) |
| Los eventos financieros solo nacen en Billing (al enviar la Invoice) | El reconocimiento formal siempre ocurre en el documento, no en el draft |
| Revenue no envía comunicaciones | El canal de salida siempre pertenece a Communications + Automation |

---

## Decisiones que aún deben tomarse (Preguntas Abiertas)

**PO-REV-001 — Revenue Recognition method:**
¿El sistema usará invoice-basis (default v1), cash-basis, o permitirá configurar por Business? La respuesta afecta cuándo se genera el `INVOICE_ISSUED` FinancialTransaction.

**PO-REV-002 — Multi-currency en RevenueDraft:**
Si un Business tiene Contracts en múltiples monedas, ¿el RevenueDraft de un período puede mezclar monedas? ¿O cada RevenueDraft es de una sola moneda y se necesita conversión en la Invoice?

**PO-REV-003 — Ingreso pendiente de facturar en el balance sheet:**
En contabilidad de acumulación estricta, el ingreso pendiente de facturar (RevenueDraft en ACCUMULATING) debería aparecer como "Unbilled Revenue" en el Balance Sheet. ¿Se implementa en v1 o en Enterprise tier?

**PO-REV-004 — Partial billing:**
¿Puede el Business Owner facturar solo parte de un RevenueDraft (ej. facturar 10 de 15 WorkEvents del período y dejar los restantes para el siguiente período)?

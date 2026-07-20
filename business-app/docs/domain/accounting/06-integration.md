# 06 — Integration: Operational Modules → Financial Engine

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual

---

## El contrato de integración

La integración entre los módulos operativos y el Financial Engine sigue **siempre el mismo patrón**, sin excepciones:

```
Módulo Operativo
    │
    │  publica Domain Event
    ▼
FinancialTransactionFactory
    │
    │  produce FinancialTransaction normalizada
    ▼
AccountingEngine
    │
    │  procesa y genera JournalEntry
    ▼
GeneralLedger
```

Ningún módulo operativo llama directamente al AccountingEngine. El módulo publica un evento de dominio y no sabe qué pasa después.

---

## La capa de adaptación: FinancialTransactionFactory

Para cada módulo operativo existe un **FinancialTransactionFactory** — un componente que:

1. Suscribe a los Domain Events del módulo
2. Extrae la información financiera relevante
3. Crea una `FinancialTransaction` normalizada
4. La pasa al AccountingEngine

Esta capa vive **en el Financial Engine**, no en el módulo operativo. El módulo de Billing no sabe que existe el Financial Engine. El Financial Engine sabe que existe Billing (porque suscribe a sus eventos), pero lo trata como una caja negra que produce eventos.

---

## Integración 1: Billing

### Eventos que genera Billing

| Domain Event | FinancialTransaction generada |
|---|---|
| `InvoiceSent` | `INVOICE_ISSUED` |
| `InvoiceVoided` | `INVOICE_VOIDED` |
| `InvoiceCancelled` | `INVOICE_VOIDED` |
| `InvoiceCredited` (futuro) | `INVOICE_CREDITED` |
| `InvoiceWrittenOff` (futuro) | `INVOICE_WRITTEN_OFF` |

### Flujo detallado: InvoiceSent

```
1. BillingService.sendInvoice(invoiceId)
   → invoice.status = 'sent'
   → events.publish(InvoiceSent {
         invoiceId,
         businessId,
         customerId,
         customerName,
         invoiceNumber: 'INV-2026-0042',
         issueDate: Date,
         subtotal: Money(100, 'AUD'),
         taxAmount: Money(10, 'AUD'),
         total: Money(110, 'AUD'),
         taxType: 'gst',
         jurisdiction: 'AU'
     })

2. BillingFinancialTransactionFactory.onInvoiceSent(event)
   → FinancialTransaction {
         type:             'INVOICE_ISSUED',
         direction:        'inbound',
         nature:           'revenue',
         referenceId:      event.invoiceId,
         referenceType:    'invoice',
         businessId:       event.businessId,
         grossAmount:      event.total,
         netAmount:        event.subtotal,
         taxAmount:        event.taxAmount,
         taxType:          event.taxType,
         taxRate:          0.10,
         transactionDate:  event.issueDate,
         counterparty:     event.customerName,
         counterpartyId:   event.customerId,
         counterpartyType: 'customer',
         jurisdiction:     event.jurisdiction,
         description:      'Invoice INV-2026-0042 issued to J Production',
         originatingEvent: 'InvoiceSent'
     }

3. AccountingEngine.process(transaction)
   → selecciona PostingRule: INVOICE_ISSUED_AU
   → genera JournalEntry con 3 líneas
   → posta al GeneralLedger
   → publica TransactionPosted
```

### Lo que Billing NO necesita para este flujo

```
Chart of Accounts   ← Billing nunca lo importa
JournalEntry        ← Billing no sabe que existe
DebitCredit         ← términos contables fuera del vocabulario de Billing
PostingRule         ← seleccionada por AccountingEngine
General Ledger      ← Billing no lo actualiza directamente
```

---

## Integración 2: Payments

### Eventos que genera Payments

| Domain Event | FinancialTransaction generada |
|---|---|
| `PaymentRecorded` | `PAYMENT_RECEIVED` |
| `PaymentReversed` | `PAYMENT_REVERSED` |

### Flujo detallado: PaymentRecorded

```
1. PaymentsService.record(invoiceId, amount, date, method)
   → payment.status = 'cleared'
   → events.publish(PaymentRecorded {
         paymentId,
         invoiceId,
         businessId,
         customerId,
         customerName,
         amount: Money(110, 'AUD'),
         date: Date,
         method: 'bank_transfer',
         jurisdiction: 'AU'
     })

2. PaymentsFinancialTransactionFactory.onPaymentRecorded(event)
   → FinancialTransaction {
         type:             'PAYMENT_RECEIVED',
         direction:        'inbound',
         nature:           'asset',
         referenceId:      event.paymentId,
         referenceType:    'payment',
         grossAmount:      event.amount,
         netAmount:        event.amount,
         taxAmount:        Money(0, 'AUD'),  ← el pago no tiene impuesto propio
         taxType:          'none',
         transactionDate:  event.date,
         counterpartyId:   event.customerId,
         counterpartyType: 'customer',
         description:      'Payment received — Invoice INV-2026-0042'
     }

3. AccountingEngine.process(transaction)
   → selecciona PostingRule: PAYMENT_RECEIVED_AU
   → genera JournalEntry:
       DEBIT  Bank (1000)                  $110.00
       CREDIT Accounts Receivable (1100)   $110.00
   → posta al GeneralLedger
```

### Por qué Payments no conoce Accounts Receivable

El módulo de Payments registra que "se recibió un pago de J Production por $110". Punto. No sabe nada de la cuenta 1100. Si mañana el contador decide separar las cuentas por cobrar por tipo de cliente, solo cambia la Posting Rule — Payments no necesita actualizarse.

---

## Integración 3: Expenses (futuro)

### Eventos que generará Expenses

| Domain Event | FinancialTransaction generada |
|---|---|
| `ExpenseRecorded` | `EXPENSE_RECORDED` |
| `ExpenseReimbursed` | `EXPENSE_REIMBURSED` |

### Flujo conceptual: ExpenseRecorded

```
1. ExpensesService.record(businessId, amount, taxAmount, category, supplierId)
   → events.publish(ExpenseRecorded { ... })

2. ExpensesFinancialTransactionFactory.onExpenseRecorded(event)
   → FinancialTransaction {
         type:      'EXPENSE_RECORDED',
         direction: 'outbound',
         nature:    'expense',
         ...
     }

3. AccountingEngine.process(transaction)
   → selecciona PostingRule: EXPENSE_RECORDED_AU
   → genera JournalEntry:
       DEBIT  Expense Account (categoría)  $200.00
       DEBIT  GST Input Tax Credit (1200)  $20.00
       CREDIT Accounts Payable (2000)      $220.00
```

**Nótese:** El mismo AccountingEngine, el mismo proceso, una Posting Rule diferente. El módulo de Expenses es tan ignorante de contabilidad como el de Billing.

---

## Lo que NO pasa por el Financial Engine

Estos módulos generan datos pero NO tienen consecuencias contables directas:

| Módulo | Por qué NO genera FinancialTransactions |
|---|---|
| Calendar Integration | Los WorkEvents son registros de tiempo, no hechos económicos hasta que son facturados. |
| WorkEvent | Un WorkEvent es "tiempo trabajado". No es un hecho contable hasta que se convierte en InvoiceItem. |
| CommunicationLog | El envío de un email no tiene consecuencias contables (salvo que sea un costo de email, que sería un Expense). |
| User Management | Crear o invitar usuarios no tiene impacto financiero. |
| Business Settings | Configurar el timezone o el logo no es un hecho económico. |

**La prueba de fuego:** ¿Este evento cambia la posición financiera del Business? Si la respuesta es no, no genera `FinancialTransaction`.

---

## Diagrama completo de integración (v1 + futuro)

```
                    MÓDULOS OPERATIVOS
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   BILLING   │  │  PAYMENTS   │  │  EXPENSES   │  │  PAYROLL    │
│             │  │             │  │  (futuro)   │  │  (futuro)   │
│ InvoiceSent │  │ PaymentRec. │  │ ExpenseRec. │  │ PayrollProc.│
│ InvoiceVoid │  │ PaymentRev. │  │ ExpenseReim.│  │ SuperAccr.  │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │                │
       ▼                ▼                ▼                ▼
┌──────────────────────────────────────────────────────────────────┐
│              FINANCIAL TRANSACTION FACTORIES                      │
│                                                                  │
│   BillingFactory   PaymentsFactory   ExpenseFactory   PayrollFact│
│                                                                  │
│   Normalizan Domain Events → FinancialTransaction canónica       │
└─────────────────────────────┬────────────────────────────────────┘
                              │  FinancialTransaction
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    ACCOUNTING ENGINE                             │
│                                                                  │
│  Validate → Select Rule → PostingEngine → Validate → Post Ledger │
└──────────────────────────┬───────────────────────────────────────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
      JournalEntry    GeneralLedger   Events Published
      (inmutable)     (actualizado)   (TransactionPosted)
                           │
                    ┌──────┴──────┐
                    ▼             ▼
              TrialBalance   Financial
              (check)        Statements
                             (Reporting)
```

---

## Módulos que NO participan en la integración contable

```
Calendar Integration → WorkEvent → Invoice → [Billing Integration]
                                              ↑
                                     Aquí empieza la contabilidad.
                                     No antes.

CommunicationLog → [ningún efecto contable]

User Management → [ningún efecto contable]

Business Settings → [ningún efecto contable]
```

---

## Manejo de errores en la integración

### Escenario 1: Posting Rule no configurada

```
InvoiceSent → FinancialTransaction(INVOICE_ISSUED, jurisdiction='NZ')
AccountingEngine: No hay PostingRule para (INVOICE_ISSUED, 'NZ')
→ TransactionRejected { reason: 'NO_POSTING_RULE_FOUND' }
→ Transaction queda en status: 'rejected'
→ Alerta al Platform Admin
→ Billing no falla — el invoice ya fue enviado al cliente
```

Billing completó su función. El error contable es operativo del Financial Engine, no de Billing.

### Escenario 2: Fiscal Period cerrado

```
InvoiceSent (issueDate: 2026-06-30) → FinancialTransaction(transactionDate: 2026-06-30)
AccountingEngine: FiscalPeriod de Junio 2026 está 'closed'
→ TransactionRejected { reason: 'FISCAL_PERIOD_CLOSED' }
→ El contador debe reabrir el período de junio para procesar
→ Billing no falla
```

### Escenario 3: Procesamiento diferido (transacción retroactiva)

Un Business registra un gasto de hace dos meses con un recibo encontrado en un cajón. El período está cerrado. El contador reabre el período, el accountant registra el gasto con la fecha correcta, el Accounting Engine procesa la transacción en el período correcto.

---

## Consideraciones de consistencia eventual

En el modelo asíncrono (recomendado para escala), hay un gap entre cuando Billing emite la factura y cuando el Accounting Engine la procesa. Durante ese gap:

- La factura existe en Billing como `sent`
- El asiento aún no existe en el Journal
- El General Ledger aún no refleja el ingreso

Este es el estado de **consistencia eventual** — correcto por diseño en sistemas distribuidos. La respuesta HTTP de `POST /invoices/:id/send` confirma que la factura fue enviada al cliente, no que el asiento contable existe.

El sistema debe gestionar la visibilidad de este estado:
- Si el usuario ve el P&L antes de que el asiento sea procesado, puede estar desactualizado.
- Un mecanismo de "transacciones pendientes de contabilizar" puede mostrar qué está en cola.
- El dashboard de contabilidad puede mostrar "actualizado hasta: [timestamp]".

---

## La pregunta central de integración

Durante el diseño de cualquier feature nueva, hacer esta pregunta:

> **¿Este hecho cambia la posición financiera del Business?**

Si sí → genera una `FinancialTransaction` del tipo correcto.
Si no → no hay integración con el Financial Engine.

Si la respuesta es dudosa, preguntarse:
- ¿Aparecería en el P&L?
- ¿Aparecería en el Balance Sheet?
- ¿Afectaría la posición de GST?

Si alguna de estas es sí, genera `FinancialTransaction`. Si todas son no, no lo hace.

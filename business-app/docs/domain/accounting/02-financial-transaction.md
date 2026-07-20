# 02 — Financial Transaction

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual

---

## El concepto más importante del dominio

La `FinancialTransaction` es el **formato canónico de intercambio financiero** entre todos los módulos operativos y el Accounting Engine. Es el contrato que hace posible que el Financial Engine sea completamente agnóstico de los módulos que lo alimentan.

Toda operación con consecuencias financieras — en cualquier módulo, ahora o en el futuro — debe convertirse en una `FinancialTransaction` antes de llegar al Accounting Engine.

No existe ninguna excepción a esta regla.

---

## Qué representa una FinancialTransaction

Una FinancialTransaction representa un **hecho económico ya ocurrido** que tiene consecuencias en la posición financiera del Business.

Más precisamente:
- Es un hecho real, no una intención
- Ocurrió en un momento específico
- Involucra una cantidad de valor monetario
- Afecta la relación económica entre el Business y algún otro ente (Customer, proveedor, banco, fisco)
- Tiene exactamente un origen (la operación que lo generó)
- Es inmutable — los hechos del pasado no cambian

Una `FinancialTransaction` **no es** un asiento contable. Describe el hecho económico en lenguaje del negocio, no en lenguaje contable. El Accounting Engine es quien lo traduce a lenguaje contable.

---

## Anatomía de una FinancialTransaction

### Identificación
```
transactionId       — identificador único global de la transacción financiera
referenceId         — ID del documento origen (invoiceId, paymentId, expenseId, etc.)
referenceType       — tipo del documento origen ('invoice', 'payment', 'expense', 'bill', etc.)
businessId          — Business propietario de la transacción
```

### Qué pasó
```
type                — tipo de transacción financiera (ver catálogo de tipos más abajo)
direction           — 'inbound' (dinero entra) | 'outbound' (dinero sale) | 'neutral' (ajuste)
nature              — 'revenue' | 'expense' | 'asset' | 'liability' | 'equity' | 'tax' | 'transfer'
status              — 'pending' | 'posted' | 'reversed' | 'void'
```

### Cuánto
```
grossAmount         — monto bruto total (Money VO: amount + currency)
netAmount           — monto neto sin impuestos (Money VO)
taxAmount           — monto de impuesto (Money VO)
taxType             — tipo de impuesto ('gst' | 'vat' | 'sales_tax' | 'none')
taxRate             — tasa aplicada (ej. 0.10 para 10% GST)
exchangeRate        — tasa de cambio si la moneda difiere del currency base del Business
baseCurrencyAmount  — equivalente en moneda base del Business (Money VO)
```

### Cuándo
```
transactionDate     — fecha en que el hecho económico ocurrió (no la fecha de creación del registro)
postedDate          — fecha en que fue procesado por el Accounting Engine
fiscalPeriod        — período fiscal al que pertenece (derivado de transactionDate)
```

### Quién
```
counterparty        — descripción del otro lado de la transacción
counterpartyId      — ID del Customer o Supplier en el sistema (nullable si es externo)
counterpartyType    — 'customer' | 'supplier' | 'employee' | 'bank' | 'tax_authority' | 'other'
```

### Contexto y trazabilidad
```
jurisdiction        — jurisdicción fiscal ('AU' | 'NZ' | 'CA' | 'GB' | etc.)
description         — descripción legible en lenguaje de negocio (no términos contables)
memo                — nota opcional del operador
tags                — etiquetas opcionales para filtrado (ej. ['project:X', 'department:ops'])
originatingEvent    — nombre del Domain Event que originó esta transacción
createdAt           — timestamp de creación del registro
createdBy           — sistema o usuario que creó la transacción
```

---

## Lo que una FinancialTransaction NUNCA debe contener

Esta lista es tan importante como lo que sí contiene:

```
accountCode         — nunca. Eso lo decide el PostingEngine.
debitAccount        — nunca. Eso lo decide el PostingEngine.
creditAccount       — nunca. Eso lo decide el PostingEngine.
journalEntryId      — nunca. El JournalEntry es creado por el AccountingEngine después.
postingRuleId       — nunca. El AccountingEngine selecciona la regla.
invoiceUIData       — nunca. La FinancialTransaction no conoce cómo se presenta en la UI.
workEventId         — nunca. Los WorkEvents son un concepto operativo, no financiero.
recipientEmail      — nunca. Las comunicaciones son responsabilidad de otro dominio.
templateId          — nunca.
calendarEventId     — nunca.
```

Si alguno de estos campos aparece en una FinancialTransaction, hay un problema de diseño.

---

## Catálogo de tipos de FinancialTransaction

El `type` es el campo más importante después del `businessId`. Define qué Posting Rule aplicará el PostingEngine.

### Originadas en Billing
| Tipo | Descripción |
|---|---|
| `INVOICE_ISSUED` | Se emitió una factura a un Customer |
| `INVOICE_CREDITED` | Se emitió una nota de crédito (reversa parcial o total de una factura) |
| `INVOICE_VOIDED` | Se anuló una factura (reversa completa) |
| `INVOICE_WRITTEN_OFF` | Se declara incobrable una factura |

### Originadas en Payments
| Tipo | Descripción |
|---|---|
| `PAYMENT_RECEIVED` | Se recibió un pago de un Customer |
| `PAYMENT_REVERSED` | Se revirtió un pago previamente registrado |
| `PAYMENT_REFUNDED` | Se reembolsó dinero al Customer |
| `PAYMENT_ON_ACCOUNT` | Pago recibido sin factura específica asignada |

### Originadas en Expenses (futuro)
| Tipo | Descripción |
|---|---|
| `EXPENSE_RECORDED` | Se registró un gasto operativo |
| `EXPENSE_REIMBURSED` | Se reembolsó un gasto a un empleado |

### Originadas en Accounts Payable (futuro)
| Tipo | Descripción |
|---|---|
| `SUPPLIER_BILL_RECEIVED` | Se recibió una factura de proveedor |
| `SUPPLIER_PAYMENT_MADE` | Se pagó a un proveedor |
| `SUPPLIER_BILL_CREDITED` | Nota de crédito de proveedor |

### Originadas en Payroll (futuro)
| Tipo | Descripción |
|---|---|
| `PAYROLL_PROCESSED` | Se procesó una nómina |
| `PAYROLL_TAX_PAID` | Se pagaron impuestos sobre nómina |
| `SUPERANNUATION_ACCRUED` | Se devengó superannuation (Australia) |
| `SUPERANNUATION_PAID` | Se pagó superannuation |

### Originadas en Banking (futuro)
| Tipo | Descripción |
|---|---|
| `BANK_DEPOSIT` | Depósito bancario |
| `BANK_WITHDRAWAL` | Retiro bancario |
| `BANK_FEE` | Comisión bancaria |
| `BANK_INTEREST_RECEIVED` | Interés recibido |
| `BANK_INTEREST_PAID` | Interés pagado |
| `BANK_TRANSFER` | Transferencia entre cuentas propias |

### Originadas en Assets (futuro)
| Tipo | Descripción |
|---|---|
| `ASSET_PURCHASED` | Compra de activo fijo |
| `ASSET_DEPRECIATION` | Depreciación periódica |
| `ASSET_DISPOSED` | Venta o baja de activo |
| `ASSET_REVALUED` | Revaluación de activo |

### Originadas en Inventory (futuro)
| Tipo | Descripción |
|---|---|
| `INVENTORY_PURCHASED` | Compra de inventario |
| `INVENTORY_SOLD` | Venta de inventario (costo de ventas) |
| `INVENTORY_ADJUSTED` | Ajuste de inventario |
| `INVENTORY_WRITTEN_OFF` | Baja por deterioro |

### Ajustes y correcciones
| Tipo | Descripción |
|---|---|
| `MANUAL_ADJUSTMENT` | Ajuste manual por el contador |
| `PERIOD_CLOSING_ENTRY` | Asiento de cierre de período |
| `ACCRUAL` | Devengamiento de ingreso o gasto |
| `PREPAYMENT` | Pago anticipado por servicios no prestados |
| `EXCHANGE_RATE_GAIN` | Ganancia por diferencia de cambio |
| `EXCHANGE_RATE_LOSS` | Pérdida por diferencia de cambio |
| `TAX_PAYMENT` | Pago de impuesto (GST, Income Tax, etc.) |

---

## Cómo nace una FinancialTransaction: el adaptador

Cada módulo operativo tiene un `FinancialTransactionFactory` (o adaptador equivalente) cuya única responsabilidad es convertir el evento de dominio del módulo en una `FinancialTransaction` normalizada.

```
Billing emite:  InvoiceSent(invoiceId, businessId, customerId, total, taxAmount, currency, ...)
                    │
                    ▼
BillingFinancialTransactionFactory.fromInvoiceSent(event)
                    │
                    ▼
FinancialTransaction {
    transactionId:    UUID generado
    referenceId:      event.invoiceId
    referenceType:    'invoice'
    businessId:       event.businessId
    type:             'INVOICE_ISSUED'
    direction:        'inbound'
    nature:           'revenue'
    status:           'pending'
    grossAmount:      event.total (Money)
    netAmount:        event.subtotal (Money)
    taxAmount:        event.taxAmount (Money)
    taxType:          'gst'
    taxRate:          0.10
    transactionDate:  event.issueDate
    counterparty:     event.customerName
    counterpartyId:   event.customerId
    counterpartyType: 'customer'
    jurisdiction:     'AU'
    description:      'Invoice INV-2026-0042 issued to J Production'
    originatingEvent: 'InvoiceSent'
    createdAt:        now()
}
```

El módulo de Billing no sabe qué pasa después. Solo publica el evento. El Factory (que puede vivir en el Financial Engine como un consumidor del evento) hace la traducción.

---

## Ejemplos de FinancialTransactions por módulo

### De una Invoice emitida

```
type:             INVOICE_ISSUED
direction:        inbound        ← el Business va a recibir dinero
nature:           revenue        ← es un ingreso
grossAmount:      $110.00 AUD
netAmount:        $100.00 AUD
taxAmount:        $10.00 AUD    ← GST 10%
taxType:          gst
transactionDate:  2026-07-05
counterpartyType: customer
jurisdiction:     AU
```

### De un Pago recibido

```
type:             PAYMENT_RECEIVED
direction:        inbound        ← dinero ya en el banco
nature:           asset          ← aumenta el activo (banco)
grossAmount:      $110.00 AUD
netAmount:        $110.00 AUD
taxAmount:        $0.00 AUD     ← el pago no tiene impuesto propio
transactionDate:  2026-07-10
counterpartyType: customer
jurisdiction:     AU
```

### De un Gasto registrado (futuro)

```
type:             EXPENSE_RECORDED
direction:        outbound       ← el Business gasta dinero
nature:           expense        ← es un gasto
grossAmount:      $220.00 AUD
netAmount:        $200.00 AUD
taxAmount:        $20.00 AUD    ← GST claimable
taxType:          gst
transactionDate:  2026-07-03
counterpartyType: supplier
jurisdiction:     AU
```

### De un Pago de impuesto

```
type:             TAX_PAYMENT
direction:        outbound
nature:           tax
grossAmount:      $1,500.00 AUD
netAmount:        $1,500.00 AUD
taxAmount:        $0.00 AUD
taxType:          none
transactionDate:  2026-07-28
counterpartyType: tax_authority
jurisdiction:     AU
```

---

## Principios de diseño de la FinancialTransaction

**Principio 1 — Un hecho, una transacción**
Una factura con 10 líneas produce una sola `FinancialTransaction` de tipo `INVOICE_ISSUED`. El detalle de las líneas es información operativa del módulo de Billing — no es relevante para la contabilidad general.

**Principio 2 — Inmutabilidad**
Una `FinancialTransaction` no se modifica. Si hay un error, se crea una transacción de reversión (`INVOICE_VOIDED`) y una nueva transacción correcta.

**Principio 3 — La fecha del hecho, no la del registro**
`transactionDate` es cuando el hecho económico ocurrió — la fecha de la factura, la fecha del pago, la fecha del gasto. No la fecha en que se cargó al sistema ni la fecha en que el Accounting Engine la procesó.

**Principio 4 — Agnóstica de contabilidad**
Una `FinancialTransaction` puede ser leída, entendida y validada por alguien que no sabe nada de contabilidad. No contiene términos contables.

**Principio 5 — Referencialmente completa**
La `FinancialTransaction` contiene suficiente información para:
- Reconstruir qué pasó sin ir al módulo origen
- Generar el asiento contable sin consultar al módulo origen
- Auditar la transacción sin acceso al sistema operativo

**Principio 6 — Multi-jurisdicción**
El campo `jurisdiction` hace que la misma FinancialTransaction pueda procesarse con distintas reglas según el país. Una `INVOICE_ISSUED` en Australia aplica GST. La misma en Canadá aplica HST/PST. La misma en Europa aplica IVA. El tipo es el mismo; el tratamiento contable depende de la jurisdicción.

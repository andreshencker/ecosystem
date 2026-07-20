# 05 — Accounting Domain Entities

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual

Las entidades de este documento pertenecen exclusivamente al **Accounting Bounded Context**. Ningún otro contexto puede leer ni escribir directamente en ellas — solo el Accounting Engine tiene acceso de escritura. Los otros contextos pueden leer reportes pero a través de interfaces publicadas, no acceso directo.

---

## El principio de partida doble

Toda la contabilidad descansa sobre un principio de 500 años de antigüedad:

> **Por cada hecho económico, el total de débitos debe igualar el total de créditos.**

Este principio no es opcional. Es la invariante fundamental que el sistema debe hacer cumplir en cada registro. Un asiento descuadrado es un error — no una advertencia, no un warning — y debe rechazarse.

La naturaleza de débito y crédito depende del tipo de cuenta:

| Tipo de cuenta | Aumenta con | Disminuye con | Saldo normal |
|---|---|---|---|
| Activo (Asset) | Débito | Crédito | Deudor |
| Pasivo (Liability) | Crédito | Débito | Acreedor |
| Patrimonio (Equity) | Crédito | Débito | Acreedor |
| Ingreso (Revenue) | Crédito | Débito | Acreedor |
| Gasto (Expense) | Débito | Crédito | Deudor |

---

## ENT-ACC-01 — Chart of Accounts

**Responsabilidad:** Definir la estructura completa de cuentas contables de un Business. Es el catálogo que determina cómo se clasifica cada movimiento financiero.

**Por qué existe:** Dos Businesses pueden tener estructuras contables distintas. Una empresa de IT puede necesitar categorías de gasto diferentes a una empresa de construcción. El Chart of Accounts permite que el Posting Engine use la terminología contable del Business.

### Conceptos clave

```
ChartOfAccounts {
    chartId
    businessId         — un Chart por Business
    name               — nombre descriptivo
    jurisdiction       — 'AU' | 'NZ' | etc. — determina qué templates estándar aplican
    currency           — moneda base del Business
    fiscalYearStart    — mes en que comienza el año fiscal (ej. 7 para julio en Australia)
    status             — 'active' | 'locked'
    version            — las cuentas pueden evolucionar entre años fiscales
    accounts           — la colección de cuentas (ver Account)
}
```

### Cuentas estándar por jurisdicción

Invoice App puede proveer plantillas de Chart of Accounts por jurisdicción:

```
Australia Standard — basado en clasificación ATO
New Zealand Standard — basado en clasificación IRD
Canada Standard — GAAP canadiense
United Kingdom Standard — Companies House
```

Un Business puede usar la plantilla estándar sin modificación, o personalizarla agregando o renombrando cuentas.

### Lo que nunca debe conocer
- Invoices, Payments, WorkEvents, Customers
- La UI de Billing
- Cualquier entidad operativa

---

## ENT-ACC-02 — Account

**Responsabilidad:** Representar una cuenta individual dentro del Chart of Accounts. Es el nodo elemental del sistema contable.

**Por qué existe:** Cada movimiento financiero debe asignarse a una cuenta específica para poder categorizar, resumir y reportar la posición financiera.

### Conceptos clave

```
Account {
    accountCode        — código único dentro del Chart (ej. '1100', '4000')
    accountName        — nombre legible (ej. 'Accounts Receivable', 'Revenue — Services')
    accountType        — 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
    accountSubType     — clasificación más específica (ver catálogo abajo)
    normalBalance      — 'DEBIT' | 'CREDIT' (determinado por accountType)
    isSystemAccount    — true si es requerida por el sistema (no puede eliminarse)
    isTaxAccount       — true si acumula montos de impuesto
    taxType            — 'gst' | 'vat' | 'none' (si isTaxAccount: true)
    parentAccountCode  — para estructura jerárquica (ej. 4000 es padre de 4100, 4200)
    isActive           — false si fue dada de baja (no puede recibir nuevos asientos)
    description        — descripción del propósito de la cuenta
}
```

### Catálogo de SubTypes

**Assets:**
`current_asset`, `bank`, `accounts_receivable`, `inventory`, `prepaid_expense`, `other_current_asset`, `fixed_asset`, `accumulated_depreciation`, `other_non_current_asset`

**Liabilities:**
`accounts_payable`, `tax_payable`, `gst_liability`, `accrued_liability`, `current_portion_long_term_debt`, `long_term_debt`, `other_liability`

**Equity:**
`retained_earnings`, `owner_equity`, `paid_in_capital`, `dividend`, `opening_balance`

**Revenue:**
`service_revenue`, `product_revenue`, `other_revenue`, `interest_income`, `exchange_gain`

**Expense:**
`cost_of_goods_sold`, `payroll_expense`, `rent_expense`, `utilities_expense`, `marketing_expense`, `professional_fees`, `depreciation_expense`, `interest_expense`, `exchange_loss`, `other_expense`

---

## ENT-ACC-03 — Journal

**Responsabilidad:** Ser el libro donde se registran los `JournalEntry` antes de ser pasados al `GeneralLedger`. En contabilidad clásica, un "diario" es el registro cronológico de las transacciones.

**Por qué existe:** Permite organizar los asientos por tipo de fuente (Billing, Payments, Adjustments) y facilita la revisión antes de confirmar que todo está correcto.

### Conceptos clave

```
Journal {
    journalId
    businessId
    name           — 'Sales Journal', 'Payments Journal', 'General Journal', 'Adjustments'
    type           — 'sales' | 'purchases' | 'cash_receipts' | 'cash_payments' | 'general'
    source         — 'system_billing' | 'system_payments' | 'system_expenses' | 'manual'
    isDefault      — true para el diario general (receptor de todos los tipos)
    entries        — colección de JournalEntry
}
```

### Tipos de diario

En contabilidad tradicional existen diarios especializados:
- **Diario de Ventas** — recibe todos los `INVOICE_ISSUED`
- **Diario de Cobros** — recibe todos los `PAYMENT_RECEIVED`
- **Diario de Compras** — recibe todos los `SUPPLIER_BILL_RECEIVED`
- **Diario de Pagos** — recibe todos los `SUPPLIER_PAYMENT_MADE`
- **Diario General** — recibe ajustes, correcciones, y todo lo que no encaja en los anteriores

En una implementación v1, un único `GeneralJournal` puede recibir todos los tipos. La especialización viene con el volumen.

---

## ENT-ACC-04 — Journal Entry

**Responsabilidad:** Representar un asiento contable completo y balanceado. Es la unidad atómica de la contabilidad.

**Por qué existe:** Es la traducción formal de una `FinancialTransaction` al lenguaje contable. Cada asiento debe estar cuadrado (suma de débitos = suma de créditos).

### Conceptos clave

```
JournalEntry {
    journalEntryId
    journalId              — a qué Journal pertenece
    businessId
    sourceTransactionId    — la FinancialTransaction que lo originó
    referenceId            — el documento origen (invoiceId, paymentId, etc.)
    referenceType          — 'invoice' | 'payment' | 'expense' | 'adjustment'
    postingRuleId          — qué Posting Rule generó este asiento
    entryDate              — fecha del hecho económico
    postedDate             — fecha en que el Accounting Engine lo procesó
    fiscalPeriod           — período fiscal al que pertenece
    description            — descripción legible del asiento
    status                 — 'draft' | 'posted' | 'reversed'
    reversalEntryId        — si este asiento fue revertido, ID del asiento de reversión
    lines                  — las líneas del asiento (ver JournalLine)
}
```

### Invariantes del Journal Entry

1. `status: 'posted'` es irreversible — para corregir, crear un asiento de reversión.
2. `sum(DEBIT lines) === sum(CREDIT lines)` siempre y sin excepción.
3. Todas las cuentas referenciadas existen en el Chart of Accounts del mismo Business.
4. `entryDate` cae dentro de un FiscalPeriod abierto.
5. Un `JournalEntry` de reversión apunta al asiento original via `reversalEntryId`.

---

## ENT-ACC-05 — Journal Line

**Responsabilidad:** Representar una línea individual de un asiento contable — un débito o un crédito a una cuenta específica.

**Por qué existe:** Es la granularidad mínima de la contabilidad. Un asiento tiene al menos dos líneas (un débito y un crédito). Puede tener más en asientos compuestos.

### Conceptos clave

```
JournalLine {
    lineId
    journalEntryId         — a qué JournalEntry pertenece
    accountCode            — cuenta afectada
    accountName            — nombre de la cuenta (denormalizado para legibilidad)
    entry                  — 'DEBIT' | 'CREDIT'
    amount                 — Money (amount + currency)
    amountInBaseCurrency   — equivalente en moneda base si hay conversión
    description            — descripción de esta línea específica
    lineOrder              — orden de presentación
}
```

### La invariante que todo asiento debe cumplir

```
Para todo JournalEntry:
  Σ(lines donde entry='DEBIT').amount  =  Σ(lines donde entry='CREDIT').amount
```

---

## ENT-ACC-06 — General Ledger

**Responsabilidad:** Mantener los saldos actualizados de todas las cuentas para un Business. Es el libro mayor — la foto del estado financiero en cualquier momento.

**Por qué existe:** Sumar todos los `JournalLines` de todos los `JournalEntries` para obtener el saldo de una cuenta es ineficiente. El General Ledger mantiene los saldos pre-calculados.

### Conceptos clave

```
LedgerAccount {
    ledgerAccountId
    businessId
    accountCode
    accountName
    fiscalPeriod           — período al que corresponde este saldo
    openingBalance         — saldo al inicio del período
    totalDebits            — suma de todos los débitos del período
    totalCredits           — suma de todos los créditos del período
    closingBalance         — saldo al cierre del período
    transactions           — referencia a los JournalLines que afectaron esta cuenta
}
```

### Cómo se actualiza

Cada vez que el Accounting Engine posta un `JournalEntry`, actualiza el `LedgerAccount` correspondiente a cada línea:

```
Para una línea DEBIT en una cuenta Asset:
    ledgerAccount.totalDebits += line.amount
    ledgerAccount.closingBalance = openingBalance + totalDebits - totalCredits

Para una línea CREDIT en una cuenta Asset:
    ledgerAccount.totalCredits += line.amount
    ledgerAccount.closingBalance = openingBalance + totalDebits - totalCredits
```

El signo del cierre varía según el tipo de cuenta (Assets y Expenses tienen saldo deudor normal; Liabilities, Equity, Revenue tienen saldo acreedor normal).

---

## ENT-ACC-07 — Trial Balance

**Responsabilidad:** Verificar que el General Ledger está balanceado — que la suma de todos los saldos deudores iguala la suma de todos los saldos acreedores.

**Por qué existe:** Si en algún momento la suma de débitos ≠ suma de créditos en el General Ledger, hay un error en el sistema. El Trial Balance es la herramienta de verificación.

### Conceptos clave

```
TrialBalance {
    trialBalanceId
    businessId
    asOf               — la fecha hasta la cual se considera
    fiscalPeriod
    accounts: [
        {
            accountCode
            accountName
            debitBalance
            creditBalance
        }
    ]
    totalDebits        — debe igualar totalCredits
    totalCredits
    isBalanced         — true si totalDebits === totalCredits
    generatedAt
}
```

Un Trial Balance se genera periódicamente (fin de mes, antes de cerrar el período) o a demanda por el contador.

---

## ENT-ACC-08 — Financial Statement

**Responsabilidad:** Producir reportes financieros formales a partir del General Ledger.

**Por qué existe:** Los asientos contables son el dato crudo. Las Financial Statements son la síntesis que los dueños, contadores e inversores necesitan.

### Tipos de Financial Statements

**Profit & Loss (Income Statement)**
Muestra ingresos, gastos y utilidad neta para un período.

```
Revenue
  Revenue — Services         $45,000
  Other Revenue              $2,000
Total Revenue                $47,000

Expenses
  Office Supplies            ($1,200)
  Professional Fees          ($3,500)
  Depreciation               ($500)
Total Expenses               ($5,200)

Net Profit                   $41,800
```

**Balance Sheet**
Muestra la posición financiera en un momento — activos, pasivos y patrimonio.

```
Assets
  Current Assets
    Bank                     $32,000
    Accounts Receivable      $18,000
  Total Current Assets       $50,000

Liabilities
  Current Liabilities
    GST Liability            $4,500
    Accounts Payable         $2,000
  Total Liabilities          $6,500

Equity
  Retained Earnings          $43,500
Total Equity                 $43,500

Total Liabilities + Equity   $50,000   ← debe igualar Total Assets
```

**Cash Flow Statement** *(futuro)*
Muestra las entradas y salidas reales de efectivo.

**BAS / Tax Return** *(Australia — futuro)*
Business Activity Statement para declaración de GST.

---

## ENT-ACC-09 — Fiscal Period

**Responsabilidad:** Definir los períodos de tiempo sobre los que se reporta la actividad financiera y controlar qué períodos están abiertos para registro.

**Por qué existe:** La contabilidad necesita saber cuándo ocurrió algo para asignarlo al período correcto. Los períodos se cierran para evitar retroactivos no autorizados.

### Conceptos clave

```
FiscalPeriod {
    periodId
    businessId
    name           — 'July 2026', 'Q1 FY2027', 'FY2026'
    periodType     — 'month' | 'quarter' | 'year'
    startDate
    endDate
    status         — 'open' | 'closed' | 'locked'
    closedAt       — cuando fue cerrado
    closedBy       — quien lo cerró
}
```

### Transiciones de estado

```
open → closed    (cierre mensual — solo el contador o business_owner)
closed → locked  (cierre anual o de auditoría — definitivo)
locked → [ninguno] — estado terminal
```

Un período `closed` puede reabrirse por el contador si hay correcciones necesarias. Un período `locked` nunca puede reabrirse.

---

## ENT-ACC-10 — Accounting Policy

**Responsabilidad:** Registrar las decisiones contables del Business que afectan cómo se contabilizan ciertos tipos de transacciones.

**Por qué existe:** La contabilidad tiene opciones. ¿Los activos se deprecian por línea recta o acelerada? ¿El inventario se valúa por FIFO o promedio? ¿Los ingresos se reconocen al devengo o al cobro? Las Accounting Policies registran estas decisiones.

### Conceptos clave

```
AccountingPolicy {
    policyId
    businessId
    jurisdiction
    name           — 'Revenue Recognition Method'
    type           — 'revenue_recognition' | 'depreciation' | 'inventory_valuation' | etc.
    value          — 'accrual' | 'cash' | 'straight_line' | 'declining_balance' | 'fifo' | 'average'
    effectiveFrom
    effectiveTo
    description
}
```

Para un freelancer o pequeño Business en v1, las políticas son simples y predeterminadas (contabilidad en base devengado, sin inventario). En empresas más complejas, este dominio se vuelve más relevante.

---

## ENT-ACC-11 — Posting Rule

**Responsabilidad:** Definir cómo transformar un tipo específico de `FinancialTransaction` en líneas contables. Es el motor de transformación.

(Ver documento `04-posting-engine.md` para el diseño detallado.)

```
PostingRule {
    ruleId
    transactionType
    jurisdiction
    businessId       — null si es regla global
    name
    version
    effectiveFrom
    effectiveTo
    lines: PostingRuleLine[]
}
```

---

## Resumen: quién puede escribir y quién puede leer

| Entidad | Escritura | Lectura |
|---|---|---|
| Chart of Accounts | Sistema (setup) + contador | Posting Engine, Reporting |
| Account | Sistema (setup) + contador | Posting Engine, Reporting |
| Journal / JournalEntry | Solo Accounting Engine | Reporting, Auditor |
| Journal Line | Solo Accounting Engine | Reporting, Auditor |
| General Ledger | Solo Accounting Engine | Reporting, Auditor, Business Owner |
| Trial Balance | Generado por Reporting | Business Owner, Accountant |
| Financial Statement | Generado por Reporting | Business Owner, Accountant |
| Fiscal Period | Contador, Business Owner | Todos (para validación) |
| Accounting Policy | Contador, Business Owner | Posting Engine |
| Posting Rule | Solo Platform Admin | Accounting Engine |

**La regla fundamental:** Ningún módulo operativo (Billing, Payments, Expenses) tiene acceso de escritura a ninguna de estas entidades. Solo el Accounting Engine escribe. Solo el módulo de Reporting lee directamente del General Ledger.

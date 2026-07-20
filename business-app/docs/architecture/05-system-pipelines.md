# 05 — System Pipelines

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

Un pipeline es el flujo de extremo a extremo de un proceso de negocio. Muestra cómo los datos y eventos atraviesan múltiples Bounded Contexts desde el hecho inicial hasta el resultado final — incluyendo el impacto en el General Ledger y los Analytics.

---

## Pipeline 1 — Shift to Cash (El flujo principal)

El flujo de mayor valor del ERP. Desde el turno trabajado hasta el dinero en el banco.

```
ENTRADA
  Turno registrado manualmente o importado del calendario

                    │
          ┌─────────▼──────────┐
          │     CALENDAR       │
          │                    │
          │ (si viene de sync) │
          │ CalendarEventImported
          └─────────┬──────────┘
                    │
          ┌─────────▼──────────┐
          │       WORK         │
          │                    │
          │  WorkEvent         │
          │  status: draft     │
          │       ↓            │
          │  WorkEventCalculationService
          │  (horas × tarifa)  │
          │       ↓            │
          │  status: confirmed │
          │  WorkEventConfirmed event
          └─────────┬──────────┘
                    │
          ┌─────────▼──────────┐
          │      BILLING       │
          │                    │
          │  InvoiceGenerationService
          │  selecciona WorkEvents confirmados
          │       ↓            │
          │  Invoice (draft)   │
          │  InvoiceItems      │
          │       ↓            │
          │  Business Owner revisa
          │       ↓            │
          │  Invoice (sent)    │
          │  InvoiceSent event │
          └────┬───────────┬───┘
               │           │
    ┌──────────▼──┐   ┌────▼──────────────┐
    │ COMMUNICATION│   │     FINANCIAL     │
    │              │   │                  │
    │ Email al     │   │ FinancialTransaction:
    │ Customer     │   │ INVOICE_ISSUED   │
    │ con PDF      │   │       ↓          │
    └──────────────┘   │ Accounting Engine│
                       │       ↓          │
                       │ JournalEntry:    │
                       │  DR: Accounts   │
                       │      Receivable │
                       │  CR: Revenue    │
                       │  CR: GST        │
                       └──────┬───────────┘
                              │
                    (tiempo después)
                              │
          ┌───────────────────▼────────────────────┐
          │                BILLING                  │
          │                                        │
          │  Customer paga                         │
          │  PaymentRecorded event                 │
          │  Invoice.amountPaid += payment.amount  │
          │  Invoice.status → paid                 │
          └────────────────┬───────────────────────┘
                           │
          ┌────────────────▼───────────────────────┐
          │               FINANCIAL                 │
          │                                        │
          │  FinancialTransaction: PAYMENT_RECEIVED │
          │         ↓                              │
          │  Accounting Engine                     │
          │         ↓                              │
          │  JournalEntry:                         │
          │    DR: Bank/Cash                       │
          │    CR: Accounts Receivable             │
          └────────────────┬───────────────────────┘
                           │
          ┌────────────────▼───────────────────────┐
          │              ANALYTICS                  │
          │                                        │
          │  Revenue actualizado                   │
          │  Outstanding receivables reducidos     │
          │  Cash balance aumentado                │
          └────────────────────────────────────────┘

SALIDA
  Dinero en banco · General Ledger actualizado · P&L refleja ingreso
```

---

## Pipeline 2 — Overdue Invoice (Gestión de cobranza)

```
ENTRADA
  Job diario: detectar Invoices con dueDate < hoy y status ∈ {sent, viewed, partial}

          ┌─────────────────────┐
          │       BILLING       │
          │                     │
          │ OverdueInvoiceDetectionService
          │ Invoice.status → overdue
          │ InvoiceOverdue event│
          └──────────┬──────────┘
                     │
          ┌──────────▼──────────┐
          │    COMMUNICATION    │
          │                     │
          │ CommunicationDispatchService
          │ event: 'invoices.invoice_overdue'
          │ Email al Customer   │
          └──────────┬──────────┘
                     │
          ┌──────────▼──────────┐
          │     ANALYTICS       │
          │                     │
          │ Overdue balance actualizado
          │ Aging report actualizado
          └─────────────────────┘

SALIDA
  Customer notificado · Métricas de cobranza actualizadas
```

---

## Pipeline 3 — Invoice Voided (Anulación)

```
ENTRADA
  Business Owner vuelve una Invoice (error, disputa, etc.)

          ┌─────────────────────┐
          │       BILLING       │
          │                     │
          │ Invoice.status → void
          │ InvoiceVoided event │
          └──────┬──────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
 WORK        FINANCIAL    ANALYTICS
    │            │
 WorkEvents   INVOICE_VOIDED
 revertidos   FinancialTransaction
 → confirmed       │
                   ▼
              JournalEntry
              (reversión):
                DR: Revenue
                DR: GST Liability
                CR: Accounts Receivable

SALIDA
  WorkEvents disponibles para refacturar · Ledger revertido
```

---

## Pipeline 4 — Calendar Sync to WorkEvent

```
ENTRADA
  Job periódico o acción manual del usuario

          ┌─────────────────────┐
          │      CALENDAR       │
          │                     │
          │ CalendarSyncService │
          │ → fetch from Google │
          │ → deduplicate by    │
          │   calendarEventId   │
          │ CalendarEventImported
          └──────────┬──────────┘
                     │
          ┌──────────▼──────────┐
          │       WORK          │
          │                     │
          │ WorkEvent (draft)   │
          │ calendarEventId set │
          │ Usuario revisa      │
          │ WorkEventConfirmed  │
          └──────────┬──────────┘
                     │
                 → Pipeline 1

SALIDA
  WorkEvents en draft listos para revisión del usuario
```

---

## Pipeline 5 — New Business Registration

```
ENTRADA
  Usuario completa el formulario de registro

          ┌─────────────────────┐
          │      IDENTITY       │
          │                     │
          │ User creado         │
          │ UserRegistered event│
          └──────────┬──────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
    ▼                ▼                ▼
BUSINESS         COMMUN.         ACCOUNTING
    │                │
Business         Email de        Chart of Accounts
creado           verificación    por defecto (template
    │            enviado         jurisdicción)
BusinessCreated      │
    │            CalendarSync
FiscalProfile    no disponible
pendiente        hasta configurar

SALIDA
  Cuenta activa · Email de verificación en camino · CoA inicializado
```

---

## Pipeline 6 — Expense to General Ledger (Futuro)

```
ENTRADA
  Staff o Business Admin registra un gasto con recibo

          ┌─────────────────────┐
          │      EXPENSES       │
          │   (futuro módulo)   │
          │                     │
          │ Expense (pending)   │
          │ Business Admin aprueba
          │ Expense (approved)  │
          │ ExpenseApproved event
          └──────────┬──────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
    ▼                ▼                ▼
FINANCIAL        ANALYTICS       ACCOUNTS PAYABLE
    │                             (si aún no pagado)
FinancialTransaction
EXPENSE_RECORDED
    │
Accounting Engine
    │
JournalEntry:
  DR: Expense Account
  DR: GST Input Tax Credit
  CR: Accounts Payable
  (o CR: Bank si pagado)

SALIDA
  Gasto registrado · P&L actualizado · AP actualizado (si pendiente)
```

---

## Pipeline 7 — Payroll Processing (Futuro Australia)

```
ENTRADA
  Fin de período de pago — job automático o manual

          ┌─────────────────────┐
          │      PAYROLL        │
          │   (futuro módulo)   │
          │                     │
          │ Calcular:           │
          │ - Salario bruto     │
          │ - PAYG withholding  │
          │ - Superannuation    │
          │ - Pago neto         │
          │                     │
          │ PayrollProcessed event
          │ SuperannuationAccrued event
          └──────────┬──────────┘
                     │
          ┌──────────▼──────────┐
          │      FINANCIAL      │
          │                     │
          │ PAYROLL_PROCESSED   │
          │ SUPERANNUATION_ACCRUED
          └──────────┬──────────┘
                     │
          ┌──────────▼──────────┐
          │     ACCOUNTING      │
          │                     │
          │ JournalEntry (payroll):
          │  DR: Wages Expense  │
          │  DR: Super Expense  │
          │  CR: PAYG Payable   │
          │  CR: Super Payable  │
          │  CR: Bank (net pay) │
          └──────────┬──────────┘
                     │
          ┌──────────▼──────────┐
          │     ANALYTICS       │
          │ Labor costs updated │
          └─────────────────────┘

SALIDA
  Nómina procesada · PAYG devengado · Superannuation devengado
  P&L refleja costos de nómina
```

---

## Pipeline 8 — Bank Reconciliation (Futuro)

```
ENTRADA
  Importación de extracto bancario (OFX, CSV, Open Banking API)

          ┌─────────────────────┐
          │    INTEGRATION      │
          │                     │
          │ BankStatement       │
          │ importado           │
          │ Transacciones raw   │
          └──────────┬──────────┘
                     │
          ┌──────────▼──────────┐
          │      BANKING        │
          │   (futuro módulo)   │
          │                     │
          │ Matching engine:    │
          │ bankTx ↔ Payment   │
          │ bankTx ↔ Expense    │
          │ bankTx ↔ Payroll    │
          │ Unmatched → manual  │
          └──────────┬──────────┘
                     │
          ┌──────────▼──────────┐
          │      FINANCIAL      │
          │                     │
          │ BANK_FEE transactions
          │ BANK_INTEREST transactions
          └──────────┬──────────┘
                     │
          ┌──────────▼──────────┐
          │     ACCOUNTING      │
          │                     │
          │ JournalEntries para │
          │ comisiones e intereses
          └─────────────────────┘

SALIDA
  Cuenta bancaria conciliada · Diferencias identificadas
```

---

## Pipeline 9 — GST/BAS Return (Australia, Futuro)

```
ENTRADA
  Fin del trimestre fiscal · Business genera BAS

          ┌─────────────────────┐
          │     ACCOUNTING      │
          │                     │
          │ GeneralLedger:      │
          │ - GST Collected (CR)│
          │ - GST Claimable (DR)│
          │ Net = payable/refund│
          └──────────┬──────────┘
                     │
          ┌──────────▼──────────┐
          │     ANALYTICS/BI    │
          │                     │
          │ BAS Report:         │
          │ W1: Total Sales     │
          │ W2: GST on Sales    │
          │ W3: GST on Purchases│
          │ W4: Net GST         │
          └──────────┬──────────┘
                     │
          ┌──────────▼──────────┐
          │      FINANCIAL      │
          │                     │
          │ TAX_PAYMENT event   │
          │ cuando se paga el   │
          │ GST al ATO          │
          └──────────┬──────────┘
                     │
          ┌──────────▼──────────┐
          │     ACCOUNTING      │
          │ JournalEntry:       │
          │  DR: GST Liability  │
          │  CR: Bank           │
          └─────────────────────┘

SALIDA
  BAS completado · Pago de GST registrado · Ledger balanceado
```

---

## Principios de diseño de pipelines

**P1 — Un pipeline no puede saltar dominios**
El pipeline de Shift to Cash pasa por Work → Billing → Financial → Accounting. No existe un atajo donde Work escribe directamente en Accounting.

**P2 — Cada dominio procesa su parte y publica el resultado**
Ningún dominio dirige el pipeline completo. Cada uno reacciona a un evento, hace su trabajo, y publica el siguiente evento.

**P3 — Los pipelines son observables**
En cada paso, hay un Domain Event. Si algo falla en el medio del pipeline, el estado parcial es visible en los events publicados y los no publicados.

**P4 — Los pipelines son recuperables**
Si el Accounting Engine falla al procesar una FinancialTransaction, la transacción queda en estado `pending`. Un job de retry puede volver a intentarlo sin re-ejecutar todo el pipeline desde el inicio.

**P5 — Analytics recibe todos los pipelines**
Analytics es el consumidor universal. No importa qué pipeline se ejecute — al final, los datos de Analytics están actualizados.

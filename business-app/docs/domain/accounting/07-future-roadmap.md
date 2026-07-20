# 07 — Future Roadmap: Extensibility of the Financial Engine

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual

---

## El principio de extensión sin modificación

La arquitectura del Financial Engine fue diseñada para cumplir un principio fundamental:

> **Agregar un nuevo módulo financiero requiere únicamente agregar nuevas Posting Rules y un nuevo FinancialTransactionFactory. No modificar el Accounting Engine. No modificar los módulos existentes.**

Cada extensión es aditiva, no modificativa. Esta es la única forma de construir un ERP que pueda crecer durante años sin convertirse en un monolito inmanejable.

---

## Cómo se extiende el sistema

Para agregar soporte a un nuevo módulo operativo, se necesitan exactamente tres cosas:

```
1. El nuevo módulo operativo (Expenses, Payroll, Inventory, etc.)
   → con sus propias entidades, reglas, y Domain Events

2. Un FinancialTransactionFactory para ese módulo
   → suscribe a los Domain Events del módulo
   → transforma en FinancialTransaction del tipo correspondiente

3. Las Posting Rules para los nuevos tipos de transacción
   → por jurisdicción
   → los tipos de cuentas afectadas
```

**El AccountingEngine no cambia.** El PostingEngine no cambia. El GeneralLedger no cambia.

---

## Extensión 1: Expenses (Gastos operativos)

**Qué agrega:** Registro de gastos del Business — suministros de oficina, herramientas, transporte, publicidad, servicios profesionales.

**Domain Events nuevos:**
- `ExpenseRecorded` → `EXPENSE_RECORDED`
- `ExpenseReimbursed` → `EXPENSE_REIMBURSED`

**Posting Rules nuevas:**
```
EXPENSE_RECORDED_AU
  DEBIT  Expense Account (categoría dinámica)
  DEBIT  GST Input Tax Credit (si aplica)
  CREDIT Accounts Payable o Bank (según si está pagado o pendiente)

EXPENSE_REIMBURSED_AU
  DEBIT  Expense Account
  CREDIT Employee Reimbursement Payable
```

**Nuevo en el Chart of Accounts:**
- Cuentas de gasto por categoría (Office Supplies, Travel, Marketing, etc.)
- GST Input Tax Credit (si no existe ya)

**Sin cambios en:** Billing, Payments, AccountingEngine, PostingEngine, GeneralLedger.

---

## Extensión 2: Accounts Payable (Cuentas a pagar)

**Qué agrega:** Registro de facturas de proveedores y seguimiento de pagos a realizar.

**Domain Events nuevos:**
- `SupplierBillReceived` → `SUPPLIER_BILL_RECEIVED`
- `SupplierPaymentMade` → `SUPPLIER_PAYMENT_MADE`
- `SupplierBillCredited` → `SUPPLIER_BILL_CREDITED`

**Posting Rules nuevas:**
```
SUPPLIER_BILL_RECEIVED_AU
  DEBIT  Expense/Asset (según tipo de compra)
  DEBIT  GST Input Tax Credit (si aplica)
  CREDIT Accounts Payable

SUPPLIER_PAYMENT_MADE_AU
  DEBIT  Accounts Payable
  CREDIT Bank
```

**El espejo del Billing:** Si Billing es "lo que nos deben", Accounts Payable es "lo que debemos". Misma arquitectura, distinta dirección del flujo.

---

## Extensión 3: Bank Reconciliation (Conciliación bancaria)

**Qué agrega:** Importación de extractos bancarios y matching con Payments y Expenses ya registrados.

**Domain Events nuevos:**
- `BankTransactionImported` → `BANK_DEPOSIT` / `BANK_WITHDRAWAL` / `BANK_FEE` / `BANK_TRANSFER`
- `BankReconciliationCompleted`

**Posting Rules nuevas:**
```
BANK_FEE_AU
  DEBIT  Bank Fees Expense
  CREDIT Bank

BANK_INTEREST_RECEIVED_AU
  DEBIT  Bank
  CREDIT Interest Income
```

**Nuevo concepto:** `BankReconciliation` es un proceso que une transacciones bancarias importadas con registros ya existentes en el sistema. Si el extracto muestra un depósito de $110 y hay un `PaymentRecorded` de $110 del mismo día para el mismo Customer, el sistema los "concilia" automáticamente. Las diferencias quedan pendientes de revisión manual.

---

## Extensión 4: Inventory (Inventario)

**Qué agrega:** Valuación y seguimiento de productos en stock.

**Domain Events nuevos:**
- `InventoryPurchased` → `INVENTORY_PURCHASED`
- `InventorySold` → `INVENTORY_SOLD` (se dispara en paralelo con la Invoice)
- `InventoryAdjusted` → `INVENTORY_ADJUSTED`
- `InventoryWrittenOff` → `INVENTORY_WRITTEN_OFF`

**Posting Rules nuevas:**
```
INVENTORY_PURCHASED_AU
  DEBIT  Inventory Asset
  DEBIT  GST Input Tax Credit
  CREDIT Accounts Payable

INVENTORY_SOLD_AU
  DEBIT  Cost of Goods Sold (COGS)
  CREDIT Inventory Asset
```

**Nota importante:** Cuando se vende un producto, se generan DOS FinancialTransactions simultáneamente:
1. `INVOICE_ISSUED` — el ingreso de la venta (ya existe)
2. `INVENTORY_SOLD` — el costo de lo vendido (nuevo)

Ambas son independientes. El Financial Engine las procesa por separado. El P&L muestra Revenue ($) y COGS ($) como líneas separadas, resultando en Gross Profit.

---

## Extensión 5: Fixed Assets y Depreciación

**Qué agrega:** Registro de activos fijos y cálculo automático de depreciación.

**Domain Events nuevos:**
- `AssetPurchased` → `ASSET_PURCHASED`
- `AssetDepreciated` → `ASSET_DEPRECIATION` (disparado por job mensual)
- `AssetDisposed` → `ASSET_DISPOSED`

**Posting Rules nuevas:**
```
ASSET_PURCHASED_AU
  DEBIT  Fixed Asset (categoría dinámica: Equipment, Vehicles, etc.)
  DEBIT  GST Input Tax Credit
  CREDIT Bank o Accounts Payable

ASSET_DEPRECIATION_AU (job mensual)
  DEBIT  Depreciation Expense
  CREDIT Accumulated Depreciation

ASSET_DISPOSED_AU
  DEBIT  Accumulated Depreciation (hasta fecha de baja)
  DEBIT  Loss on Disposal (si aplica)
  CREDIT Fixed Asset
  CREDIT Gain on Disposal (si aplica)
```

**El job de depreciación:** Un servicio periódico calcula la depreciación de cada activo según la `AccountingPolicy.depreciationMethod` del Business (línea recta, decreciente, unidades producidas) y genera las `FinancialTransaction` de tipo `ASSET_DEPRECIATION` automáticamente al cierre de cada período.

---

## Extensión 6: Payroll (Nómina)

**Qué agrega:** Cálculo y registro de salarios, impuestos sobre nómina y superannuation en Australia.

**Domain Events nuevos:**
- `PayrollProcessed` → `PAYROLL_PROCESSED`
- `SuperannuationAccrued` → `SUPERANNUATION_ACCRUED`
- `SuperannuationPaid` → `SUPERANNUATION_PAID`
- `PayrollTaxPaid` → `PAYROLL_TAX_PAID`

**Posting Rules nuevas:**
```
PAYROLL_PROCESSED_AU
  DEBIT  Wages & Salaries Expense
  DEBIT  Superannuation Expense
  CREDIT PAYG Withholding Payable (impuesto retenido)
  CREDIT Superannuation Payable
  CREDIT Bank (pago neto al empleado)

SUPERANNUATION_PAID_AU
  DEBIT  Superannuation Payable
  CREDIT Bank
```

**Nota de complejidad:** Payroll es el módulo más complejo del ERP. La cantidad de reglas fiscales (tasas de superannuation, umbrales de PAYG, tax file number declarations, Single Touch Payroll para Australia) hace que este módulo sea casi un proyecto por sí solo. La arquitectura del Financial Engine lo soporta — el AccountingEngine recibe `FinancialTransaction`, no le importa la complejidad del cálculo que ocurrió antes.

---

## Extensión 7: GST / BAS (Australia)

**Qué agrega:** Generación automática de la Business Activity Statement para declaración trimestral de GST ante el ATO.

**No es un nuevo módulo operativo** — es un módulo de reporting que lee del General Ledger.

**Cómo funciona:**
```
LedgerAccount(GST Liability: 2200)     → GST Collected (W1 del BAS)
LedgerAccount(GST Input Tax Credit)   → GST Credits (W2 del BAS)
Difference                            → Net GST payable/refundable (W3)
```

El BAS es una vista del General Ledger para el período fiscal trimestral. No requiere nueva lógica contable — solo una vista que suma las cuentas de GST del período.

**Cuando se paga el GST:**
```
TAX_PAYMENT → FinancialTransaction
  DEBIT  GST Liability (limpia la deuda con el ATO)
  CREDIT Bank (sale el dinero)
```

---

## Extensión 8: Loans y Financiamiento

**Qué agrega:** Registro de préstamos recibidos, pagos de cuotas e intereses.

**Domain Events nuevos:**
- `LoanReceived` → `BANK_DEPOSIT` + `LIABILITY_CREATED` (composite)
- `LoanPaymentMade` → tipo mixto (parte capital + parte interés)

**Posting Rules nuevas:**
```
LOAN_RECEIVED
  DEBIT  Bank
  CREDIT Loan Payable (pasivo largo plazo)

LOAN_PAYMENT_MADE
  DEBIT  Loan Payable (parte capital)
  DEBIT  Interest Expense (parte interés)
  CREDIT Bank
```

---

## Extensión 9: Multi-jurisdicción

La arquitectura del Financial Engine hace que agregar un nuevo país sea **solo agregar Posting Rules**. No hay que tocar ningún módulo operativo.

### Qué se necesita para agregar un país nuevo

```
Paso 1: Definir el Chart of Accounts template estándar para el país
        → cuentas estándar, códigos, tipos

Paso 2: Crear las Posting Rules para cada transaction type en esa jurisdicción
        → INVOICE_ISSUED_NZ, PAYMENT_RECEIVED_NZ, EXPENSE_RECORDED_NZ, etc.

Paso 3: Configurar los FiscalPeriod defaults para el año fiscal del país
        → NZ: año fiscal 1 abril – 31 marzo
        → AU: año fiscal 1 julio – 30 junio
        → CA: año fiscal 1 enero – 31 diciembre

Paso 4: Si hay impuestos especiales, agregar tipos de Tax al catálogo
        → NZ: GST 15%
        → CA: HST/PST variables por provincia
        → UK: VAT 20% (estándar), 5% (reducido), 0% (exento)
```

Ningún módulo operativo sabe en qué país opera. El campo `jurisdiction` en la `FinancialTransaction` es lo único que cambia.

---

## Extensión 10: Machine Learning y Business Intelligence

**Qué agrega:** Análisis predictivo de ingresos, detección de anomalías, proyecciones.

**Cómo se integra:**
```
GeneralLedger (fuente de verdad histórica)
    │
    ▼
BI Export Pipeline (batch o streaming)
    │
    ▼
Analytics Data Warehouse (Snowflake, BigQuery, etc.)
    │
    ▼
ML Models:
  → Revenue prediction (next 30/60/90 days)
  → Invoice payment likelihood scoring
  → Anomaly detection (transacción inusual)
  → Cash flow forecasting
  → Customer profitability analysis
```

El Financial Engine no sabe nada de ML. El ML consume el General Ledger como datos históricos. No hay acoplamiento.

---

## Mapa de extensibilidad completo

```
                    HOY (v1)                 FUTURO
                 ┌───────────┐           ┌───────────┐
MÓDULOS          │  Billing  │           │  Expenses │
OPERATIVOS       │  Payments │           │  Payroll  │
                 └─────┬─────┘           │  Inventory│
                       │                 │  Assets   │
                       │ Domain Events   │  Loans    │
                       ▼                 └─────┬─────┘
                 ┌─────────────────────────────┘
                 │
                 ▼
          FinancialTransaction Factories
          (una por módulo operativo)
                 │
                 ▼
         ┌───────────────┐
         │ AccountingEngine│  ← NUNCA cambia
         │                 │
         │  PostingEngine  │  ← Solo recibe nuevas Posting Rules
         └───────┬─────────┘
                 │
                 ▼
         ┌───────────────┐
         │ General Ledger│  ← NUNCA cambia
         └───────┬───────┘
                 │
         ┌───────┴───────┐
         ▼               ▼
   Reporting           Tax/BAS
   (P&L, BS,           Declarations
   Cash Flow)          (GST, Income Tax)
         │
         ▼
    Analytics/BI
    (ML, Forecasting)
```

---

## La promesa de la arquitectura

Cuando en 2028 Invoice App quiera soportar nómina en Australia para pequeñas empresas:

1. Se construye el módulo de Payroll con su lógica propia (cálculo de PAYG, super, etc.)
2. Se crea `PayrollFinancialTransactionFactory` que convierte los eventos de Payroll en FinancialTransactions
3. Se configuran las Posting Rules para Australia para los tipos `PAYROLL_PROCESSED_AU`, `SUPERANNUATION_PAID_AU`
4. El AccountingEngine empieza a procesar esas transacciones sin una línea de código nueva en el engine

Billing no sabe que existe Payroll.
El General Ledger no cambia.
Los reportes P&L empiezan a mostrar Salarios como categoría de gasto automáticamente.
El BAS incluye los montos de PAYG automáticamente.

Eso es lo que significa construir el núcleo financiero correctamente desde el inicio.

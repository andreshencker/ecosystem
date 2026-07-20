# ADR-003: FinancialTransaction como único contrato entre el mundo operativo y la contabilidad

**Fecha:** 2026-07-05
**Estado:** Aceptado
**Autor:** Architecture Review Session

---

## Contexto

### El problema de conectar operaciones con contabilidad

En un ERP, cada operación de negocio tiene consecuencias contables:

| Operación | Consecuencia contable |
|---|---|
| Invoice enviada | DR: Accounts Receivable / CR: Revenue + GST |
| Payment recibido | DR: Bank / CR: Accounts Receivable |
| Expense registrado | DR: Expense + GST Input Tax / CR: Accounts Payable |
| Payroll procesado | DR: Wages + Super / CR: PAYG Payable + Super Payable + Bank |
| Activo adquirido | DR: Fixed Asset / CR: Bank o Accounts Payable |

El Accounting Engine necesita procesar todos estos hechos. La pregunta es: ¿qué contrato existe entre los módulos que generan hechos y el motor que los contabiliza?

### Opciones de diseño del contrato

**Opción A — Llamada directa por tipo de hecho**

Cada módulo llama al AccountingEngine con sus parámetros específicos:

```
// Billing llama directamente
AccountingEngine.postInvoice(invoiceId, customerId, total, taxAmount, currency, accounts)

// Payments llama directamente
AccountingEngine.postPayment(paymentId, invoiceId, amount, bankAccountCode)

// Expenses llama directamente (futuro)
AccountingEngine.postExpense(expenseId, categoryCode, amount, gstClaimable)
```

Consecuencias:
- (+) Explícito — cada módulo sabe exactamente qué está haciendo contablemente
- (-) El AccountingEngine tiene N métodos diferentes (uno por módulo)
- (-) Cada nuevo módulo requiere un nuevo método en el AccountingEngine
- (-) Los módulos operativos conocen términos contables (accountCode, DR/CR)
- (-) Las reglas fiscales están mezcladas con la lógica operativa
- (-) Cambiar la tasa del GST requiere actualizar el AccountingEngine Y los módulos que lo llaman

**Opción B — Interfaz genérica con payload libre**

```
AccountingEngine.process({
  type: 'invoice',
  data: { ...anyObject }  // el engine deduce qué hacer
})
```

Consecuencias:
- (+) Sin código por módulo
- (-) Sin tipado — cualquier error pasa en runtime
- (-) El AccountingEngine necesita lógica de detección del tipo de operación
- (-) Imposible de validar y auditar correctamente

**Opción C — FinancialTransaction como formato canónico**

Cada módulo produce una `FinancialTransaction` normalizada. El AccountingEngine solo acepta `FinancialTransaction`:

```
// Billing convierte InvoiceSent → FinancialTransaction
BillingFinancialTransactionFactory.fromInvoiceSent(event):
  FinancialTransaction {
    type: 'INVOICE_ISSUED',
    direction: 'inbound',
    nature: 'revenue',
    grossAmount: Money(110, 'AUD'),
    taxAmount: Money(10, 'AUD'),
    taxType: 'gst',
    jurisdiction: 'AU',
    ...
  }

// El AccountingEngine tiene UN solo método
AccountingEngine.process(transaction: FinancialTransaction): void
```

Consecuencias:
- (+) AccountingEngine es completamente agnóstico de los módulos operativos
- (+) Nuevo módulo = nuevo Factory (sin tocar el AccountingEngine)
- (+) Las reglas contables (PostingRules) son completamente independientes de los módulos
- (+) La FinancialTransaction es auditable independientemente del módulo origen
- (+) El AccountingEngine se puede testear con FinancialTransactions sintéticas
- (-) Capa adicional de traducción (el Factory)
- (-) El schema de FinancialTransaction debe ser comprehensivo desde el inicio

---

## Decisión

**Se adopta la `FinancialTransaction` como el único contrato entre el mundo operativo y el Accounting Engine. No existe ningún otro camino.**

Esta decisión aplica a todos los módulos actuales y futuros:
- Billing, Payments (Fase 3)
- Financial Engine, Accounting (Fase 4)
- Expenses, AP (Fase 6)
- Banking (Fase 7)
- Fixed Assets (Fase 8)
- Payroll (Fase 9)
- Inventory (Fase 10)

---

## Justificación

### Argumento central: el AccountingEngine no debe saber de negocios

Un contador profesional no necesita saber que "una factura fue enviada". Solo necesita saber que hay un ingreso de $100 AUD (neto) con $10 AUD de GST, con fecha de hoy, contra la cuenta "Cuentas por cobrar".

El AccountingEngine es ese contador. Procesa hechos financieros normalizados. No procesa facturas, ni pagos, ni gastos — procesa `FinancialTransaction`.

### Extensibilidad garantizada

```
Sin FinancialTransaction bridge:

Año 1: AccountingEngine.postInvoice(), AccountingEngine.postPayment()
Año 3: + AccountingEngine.postExpense(), AccountingEngine.postSupplierBill()
Año 4: + AccountingEngine.postPayroll(), AccountingEngine.postSuperannuation()
Año 5: + AccountingEngine.postAssetPurchase(), AccountingEngine.postDepreciation()
Año 6: + AccountingEngine.postInventoryPurchase(), AccountingEngine.postCOGS()

→ 12 métodos en el AccountingEngine, cada uno acoplado a un módulo.

Con FinancialTransaction bridge:

Año 1-6: AccountingEngine.process(transaction: FinancialTransaction) — siempre el mismo
→ Cero cambios en el AccountingEngine. Solo nuevos Factories.
```

### Las reglas fiscales son datos, no código

Con la `FinancialTransaction`, las Posting Rules (cómo un tipo de transacción se traduce en débitos y créditos) son registros de base de datos — no código en el AccountingEngine.

Cuando Australia cambia la tasa del GST:
- **Sin FinancialTransaction**: actualizar Billing, Payments, Expenses, Payroll, cada uno con su lógica de GST → deploy de múltiples módulos
- **Con FinancialTransaction**: actualizar el PostingRule de tipo `INVOICE_ISSUED` para jurisdicción `AU` en la base de datos → cero deploy

---

## El Factory como adaptador

Cada módulo tiene un `FinancialTransactionFactory` que es responsable de la traducción. Este Factory:

1. Vive en el módulo de Financial (no en el módulo operativo)
2. Suscribe a los Domain Events del módulo operativo
3. Traduce el evento al formato `FinancialTransaction`
4. Llama al AccountingEngine (o publica un evento para que lo consuma)

```
ESTRUCTURA DE FACTORIES:

Financial/
  factories/
    billing-financial-transaction.factory.ts     ← reacciona a InvoiceSent, etc.
    payments-financial-transaction.factory.ts    ← reacciona a PaymentRecorded, etc.
    expenses-financial-transaction.factory.ts    ← (futuro) reacciona a ExpenseApproved
    payroll-financial-transaction.factory.ts     ← (futuro) reacciona a PayrollProcessed
```

El módulo de Billing nunca sabe que existe el Factory. El Factory suscribe al event bus.

---

## Reglas obligatorias del contrato

### Regla 1 — La FinancialTransaction NUNCA contiene terminología de módulo operativo

```
// CORRECTO — lenguaje financiero neutro
{
  type: 'INVOICE_ISSUED',
  grossAmount: 110,
  netAmount: 100,
  taxAmount: 10
}

// INCORRECTO — lenguaje del módulo de Billing
{
  invoiceId: '...',
  invoiceNumber: 'INV-001',
  workEventIds: [...],
  billingCycle: 'monthly'
}
```

La FinancialTransaction sí contiene `referenceId` y `referenceType` para trazabilidad de auditoría. No para lógica de procesamiento.

### Regla 2 — La FinancialTransaction nunca contiene cuentas contables

```
// INCORRECTO — la FinancialTransaction no decide las cuentas
{
  debitAccount: '1100',    ← PROHIBIDO
  creditAccount: '4000'    ← PROHIBIDO
}
```

Las cuentas las decide el PostingEngine según la PostingRule. La FinancialTransaction solo describe el hecho económico.

### Regla 3 — Una FinancialTransaction por hecho económico

Una factura con 10 líneas genera UNA FinancialTransaction de tipo `INVOICE_ISSUED`. No 10 transacciones (una por línea). El detalle de líneas es información de Billing, no del Financial Engine.

**Excepción:** Si los items tienen diferentes tasas de impuesto (ej. algunos con GST y otros exentos), se puede generar una transacción por grupo impositivo. Esto se decide en el Factory, no en el AccountingEngine.

### Regla 4 — Idempotencia garantizada por (referenceId, type)

```
// El AccountingEngine verifica antes de procesar
if (exists FinancialTransaction where referenceId = event.invoiceId AND type = 'INVOICE_ISSUED') {
  return; // ya procesada — descartar
}
```

---

## Catálogo de tipos de FinancialTransaction por fase

| Fase | Módulo | Tipos de FinancialTransaction |
|---|---|---|
| Fase 3 | Billing | INVOICE_ISSUED, INVOICE_VOIDED, INVOICE_CREDITED |
| Fase 3 | Payments | PAYMENT_RECEIVED, PAYMENT_REVERSED, PAYMENT_REFUNDED |
| Fase 6 | Expenses | EXPENSE_RECORDED, EXPENSE_REIMBURSED |
| Fase 6 | Accounts Payable | SUPPLIER_BILL_RECEIVED, SUPPLIER_PAYMENT_MADE |
| Fase 7 | Banking | BANK_FEE, BANK_INTEREST_RECEIVED, BANK_TRANSFER |
| Fase 8 | Fixed Assets | ASSET_PURCHASED, ASSET_DEPRECIATION, ASSET_DISPOSED |
| Fase 9 | Payroll | PAYROLL_PROCESSED, SUPERANNUATION_ACCRUED, PAYROLL_TAX_PAID |
| Fase 10 | Inventory | INVENTORY_PURCHASED, INVENTORY_SOLD, INVENTORY_ADJUSTED |
| Cualquier | Accounting | MANUAL_ADJUSTMENT, PERIOD_CLOSING_ENTRY, ACCRUAL |
| Cualquier | Tax | TAX_PAYMENT, EXCHANGE_RATE_GAIN, EXCHANGE_RATE_LOSS |

---

## Comparación de trade-offs

| Criterio | Opción A (directa) | Opción B (genérica) | Opción C (FinancialTx) |
|---|---|---|---|
| Tipado | ✅ Fuerte | ❌ Ninguno | ✅ Fuerte |
| Independencia del AccountingEngine | ❌ Acoplado | ⚠️ Parcial | ✅ Total |
| Extensibilidad por nuevo módulo | ❌ Requiere cambio en engine | ⚠️ Requiere cambio | ✅ Solo nuevo Factory |
| Cambios fiscales sin deploy de módulos | ❌ No | ❌ No | ✅ Sí |
| Auditabilidad independiente | ❌ Depende del módulo | ❌ No tipado | ✅ Autocontenida |
| Complejidad de implementación | Baja | Baja | Media |
| Testing del AccountingEngine aislado | ❌ Necesita mocks de módulos | ⚠️ Parcial | ✅ Solo FinancialTransaction sintéticas |

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Schema de FinancialTransaction insuficiente para caso futuro | Media | Alto | Diseño inicial comprehensivo. Campo `tags[]` para extensión ligera. |
| Factory con lógica de negocio excesiva | Media | Medio | El Factory es un adaptador — sin lógica de dominio. Si hay lógica, vive en el módulo operativo. |
| Desincronización entre evento y FinancialTransaction | Baja | Alto | Idempotencia + transaccionalidad outbox pattern en implementación |
| Campo `referenceType` con inconsistencias | Media | Bajo | Catálogo formal de referenceType values como enum |

---

## Consecuencias de esta decisión

### Positivas
- El AccountingEngine puede implementarse y testearse completamente sin los módulos operativos
- Agregar Payroll en Fase 9 no toca una sola línea de código del AccountingEngine
- Las reglas fiscales de múltiples jurisdicciones son configuración, no código
- El audit trail financiero es completamente independiente del estado operativo

### Negativas
- Capa adicional de traducción (Factories) que debe implementarse por cada módulo
- El schema de FinancialTransaction debe diseñarse con cuidado desde el inicio — cambios posteriores son costosos
- Los desarrolladores de módulos operativos deben entender qué información exponer en los eventos para que los Factories puedan construir FinancialTransactions completas

---

## Documentos relacionados

- `docs/domain/accounting/01-financial-domain.md` — Por qué existe el Financial Engine
- `docs/domain/accounting/02-financial-transaction.md` — Diseño detallado de la FinancialTransaction
- `docs/domain/accounting/03-accounting-engine.md` — El motor de procesamiento
- `docs/domain/accounting/04-posting-engine.md` — Cómo se generan los asientos
- `ADR-002-event-driven-integration.md` — Por qué los módulos se comunican via eventos
- `ADR-005-posting-rules-as-configuration.md` — Por qué las reglas contables son datos

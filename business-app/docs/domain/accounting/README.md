# Financial & Accounting Engine — Architecture

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual

Este directorio contiene la arquitectura conceptual del **Financial & Accounting Engine** de Invoice App. Es el núcleo financiero que transforma los hechos operativos del ERP en registros contables formales.

> **Regla de lectura:** Antes de diseñar cualquier módulo que tenga consecuencias financieras, leer primero este directorio. Antes de implementar cualquier cosa de este directorio, leer todos los documentos en orden.

---

## Por qué este directorio existe

La contabilidad no es un módulo más. Es la capa que da **significado financiero** a todas las operaciones del ERP.

Sin este motor:
- Billing genera facturas sin reflejo contable
- Payments registra cobros sin actualizar el libro mayor
- Al final del año, un contador externo reconstruye todo desde cero

Con este motor:
- Cada operación se refleja automáticamente en el General Ledger
- Los reportes financieros existen en tiempo real
- Agregar un nuevo módulo (Payroll, Inventory, Assets) solo requiere nuevas Posting Rules

---

## Índice

| # | Documento | Descripción |
|---|---|---|
| 01 | [Financial Domain](./01-financial-domain.md) | Por qué existe el Financial Engine. Por qué Billing no genera asientos. |
| 02 | [Financial Transaction](./02-financial-transaction.md) | El formato canónico de intercambio. La pieza más importante. |
| 03 | [Accounting Engine](./03-accounting-engine.md) | El motor que procesa transacciones y genera asientos. |
| 04 | [Posting Engine](./04-posting-engine.md) | Cómo se traduce una transacción en débitos y créditos. |
| 05 | [Accounting Domain](./05-accounting-domain.md) | Todas las entidades: Chart of Accounts, Journal, Ledger, etc. |
| 06 | [Integration](./06-integration.md) | Cómo se conectan los módulos operativos con el Financial Engine. |
| 07 | [Future Roadmap](./07-future-roadmap.md) | Cómo esta arquitectura soporta Expenses, Payroll, Inventory, y más. |

---

## Orden de lectura recomendado

### Primera lectura (entender el porqué)
```
01 → 02 → 03
```
Primero el problema, luego el concepto central, luego el motor.

### Segunda lectura (entender el cómo)
```
04 → 05 → 06
```
Cómo se generan los asientos, qué entidades existen, cómo se integra todo.

### Para planificar el futuro
```
07
```

---

## El flujo en una sola imagen

```
 MÓDULOS OPERATIVOS
 ┌──────────────────────────────────────────────────────┐
 │  Billing    Payments    Expenses    Payroll    ...    │
 │      │           │           │         │             │
 │  InvoiceSent  PaymentRec.  ExpenseRec.  PayrollProc. │
 └──────┬───────────┬───────────┬──────────┬────────────┘
        │           │           │          │
        ▼           ▼           ▼          ▼
 FinancialTransactionFactories (un adaptador por módulo)
        │
        ▼ FinancialTransaction normalizada
 ┌──────────────────────────────────────────────────────┐
 │                  ACCOUNTING ENGINE                    │
 │                                                      │
 │  1. Validate (período abierto, regla existe, etc.)   │
 │  2. Select PostingRule (type + jurisdiction)         │
 │  3. PostingEngine → genera JournalEntry              │
 │  4. Validate balance (debits = credits)              │
 │  5. Post to General Ledger                           │
 │  6. Publish TransactionPosted event                  │
 └──────────────────────────────────────────────────────┘
        │
        ├── JournalEntry (inmutable)
        ├── GeneralLedger (actualizado)
        └── Events → Reporting → P&L, Balance Sheet, BAS
```

---

## Las tres reglas de oro

**Regla 1 — Ningún módulo operativo escribe en el Journal ni en el Ledger**
Solo el Accounting Engine tiene acceso de escritura al Journal, JournalEntry, y GeneralLedger.

**Regla 2 — Toda operación financiera pasa por FinancialTransaction**
No hay atajos. No hay llamadas directas al AccountingEngine con parámetros ad-hoc. El único contrato es `FinancialTransaction`.

**Regla 3 — El Accounting Engine no conoce ningún módulo operativo**
El engine recibe `FinancialTransaction`. No sabe qué es una Invoice, un WorkEvent, un Customer, o una comunicación. Su única dependencia es el Chart of Accounts del Business y las Posting Rules.

---

## Frontera con el dominio operativo

```
DOMINIO OPERATIVO                    DOMINIO CONTABLE
─────────────────────────────────────────────────────
Business                         Chart of Accounts
Customer                         Account
Contract                         Journal
WorkEvent                        Journal Entry
Invoice                          Journal Line
InvoiceItem                      General Ledger
Payment                          Trial Balance
Expense (futuro)                 Financial Statement
                                 Fiscal Period
         ┌──────────────┐        Accounting Policy
         │  Financial   │        Posting Rule
         │ Transaction  │  ←────────────────────────
         │  (el puente) │
         └──────────────┘
```

La `FinancialTransaction` es exactamente la frontera entre los dos dominios. No hay nada más que cruce esa línea.

---

## Documentos relacionados (fuera de esta carpeta)

| Documento | Ubicación | Relevancia |
|---|---|---|
| `03-bounded-contexts.md` | `docs/domain/` | El Financial Engine es el BC-10+ |
| `07-domain-services.md` | `docs/domain/` | `CommunicationDispatchService` sigue el mismo patrón |
| `08-domain-events.md` | `docs/domain/` | Los eventos que generan FinancialTransactions |
| `11-roadmap.md` | `docs/domain/` | El Financial Engine aparece en Fase 5+ del roadmap |
| `ADR-001` | `docs/decisions/` | La migración Business/companyId no afecta este diseño |

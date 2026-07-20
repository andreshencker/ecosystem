# 03 — The Accounting Engine

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual

---

## Qué es el Accounting Engine

El Accounting Engine es el **corazón del Financial Engine**. Es el proceso que toma una `FinancialTransaction` normalizada y produce registros contables formales — `JournalEntry` — que se asientan en el `GeneralLedger`.

No es una pantalla. No es un formulario. No es un módulo que el usuario abre. Es una máquina que opera silenciosamente cada vez que algo financieramente significativo ocurre en el sistema.

```
FinancialTransaction
        │
        ▼
  AccountingEngine
        │
   ┌────┴────┐
   │ Validate │  ← ¿La transacción es válida para contabilizar?
   └────┬────┘
        │
   ┌────▼────────────┐
   │ Select Rule      │  ← ¿Qué Posting Rule aplica?
   └────┬────────────┘
        │
   ┌────▼────────────┐
   │ PostingEngine   │  ← Genera el JournalEntry
   └────┬────────────┘
        │
   ┌────▼────────────┐
   │ Validate Entry   │  ← ¿El asiento está cuadrado?
   └────┬────────────┘
        │
   ┌────▼────────────┐
   │ Post to Ledger   │  ← Actualiza el GeneralLedger
   └────┬────────────┘
        │
   ┌────▼────────────┐
   │ Publish Event    │  ← TransactionPosted, TransactionRejected
   └─────────────────┘
```

---

## Entradas del Accounting Engine

El Accounting Engine acepta **una y solo una** forma de entrada:

```
AccountingEngine.process(transaction: FinancialTransaction): AccountingResult
```

No acepta:
- Invoices directamente
- Payments directamente
- Parámetros ad-hoc
- Llamadas con información parcial
- Lotes heterogéneos sin tipar

La interfaz es intencionalmente estrecha. Si algo no puede expresarse como `FinancialTransaction`, no puede entrar al Accounting Engine.

### Condiciones previas para aceptar una transacción

1. `transaction.businessId` existe y tiene un Chart of Accounts configurado.
2. `transaction.fiscalPeriod` no está bloqueado (el período fiscal está abierto para registro).
3. `transaction.status` es `'pending'` — no se procesan transacciones ya contabilizadas.
4. No existe ya un `JournalEntry` con el mismo `referenceId` y `type` (idempotencia).
5. Existe una Posting Rule para el `(type, jurisdiction)` de la transacción.

Si alguna condición falla, la transacción se marca como `'rejected'` con el motivo específico. No se lanza una excepción que mata el proceso — se registra el error y se genera el evento `TransactionRejected`.

---

## Procesamiento

### Paso 1 — Validación de la transacción

Antes de cualquier contabilización:

```
¿El businessId tiene Chart of Accounts?
  → Si no: rechazar con CHART_OF_ACCOUNTS_NOT_CONFIGURED

¿El fiscal period de transactionDate está abierto?
  → Si no: rechazar con FISCAL_PERIOD_CLOSED

¿Ya existe un JournalEntry para (referenceId, type)?
  → Si sí: devolver el existente (idempotencia) sin error

¿Existe Posting Rule para (type, jurisdiction)?
  → Si no: rechazar con NO_POSTING_RULE_FOUND

¿grossAmount > 0?
  → Si no: rechazar con INVALID_AMOUNT

¿grossAmount = netAmount + taxAmount?
  → Si no: rechazar con AMOUNT_MISMATCH
```

### Paso 2 — Selección de la Posting Rule

El Accounting Engine selecciona la Posting Rule aplicable usando la clave compuesta `(transactionType, jurisdiction)`.

Si existe una regla específica para el Business (override personalizado), se usa esa.
Si no, se usa la regla estándar para esa jurisdicción.
Si no hay regla estándar, se usa la regla global por defecto.

La jerarquía de resolución:

```
Business-specific rule (businessId + type + jurisdiction)
    ↓ no encontrado
Jurisdiction-specific rule (type + jurisdiction)
    ↓ no encontrado
Global default rule (type)
    ↓ no encontrado
→ TransactionRejected: NO_POSTING_RULE_FOUND
```

### Paso 3 — Delegación al Posting Engine

El Accounting Engine no genera el `JournalEntry` — eso es responsabilidad del PostingEngine. El Accounting Engine le pasa la transacción y la regla:

```
PostingEngine.post(transaction: FinancialTransaction, rule: PostingRule): JournalEntry
```

El PostingEngine devuelve un `JournalEntry` completo con todas sus líneas de débito y crédito.

### Paso 4 — Validación del asiento

El Accounting Engine verifica que el JournalEntry producido por el PostingEngine cumple la **invariante fundamental de la contabilidad**:

```
sum(debitLines.amount) === sum(creditLines.amount)
```

Si esta condición no se cumple, el asiento es rechazado con `UNBALANCED_ENTRY`. Este es un error de configuración de Posting Rules — nunca debería llegar a producción.

El Accounting Engine también verifica:
- Todas las cuentas referenciadas existen en el Chart of Accounts del Business.
- Todas las cuentas están activas (no dadas de baja).
- El fiscal period del JournalEntry coincide con el de la transacción.

### Paso 5 — Registro en el General Ledger

Si el JournalEntry es válido, el Accounting Engine lo persiste y actualiza los saldos del General Ledger:

```
Para cada línea del JournalEntry:
  account.balance += line.amount (con signo según debit/credit y tipo de cuenta)
  account.periodBalance += line.amount (para el período fiscal actual)
```

Esta operación es atómica — si cualquier actualización de saldo falla, todo el proceso se revierte.

### Paso 6 — Publicación del resultado

Una vez que el asiento está en el libro, el Accounting Engine publica:

```
TransactionPosted {
    transactionId,
    journalEntryId,
    businessId,
    fiscalPeriod,
    postedAt,
    type: transaction.type,
    grossAmount: transaction.grossAmount
}
```

O en caso de rechazo:

```
TransactionRejected {
    transactionId,
    businessId,
    reason: 'FISCAL_PERIOD_CLOSED' | 'NO_POSTING_RULE_FOUND' | 'UNBALANCED_ENTRY' | ...,
    rejectedAt,
    details: string
}
```

---

## Salidas del Accounting Engine

| Salida | Descripción |
|---|---|
| `JournalEntry` | El asiento contable generado (débitos y créditos) |
| `GeneralLedger` actualizado | Los saldos de las cuentas afectadas |
| `TransactionPosted` event | Para que otros sistemas reaccionen (Reporting, Dashboard) |
| `TransactionRejected` event | Para alertas operativas y resolución manual |
| `AccountingResult` | Objeto de resultado devuelto al llamador (éxito o rechazo con motivo) |

---

## Responsabilidades del Accounting Engine

### Lo que sí hace
- Orquestra el flujo completo desde FinancialTransaction hasta General Ledger
- Valida las precondiciones antes de contabilizar
- Selecciona la Posting Rule correcta
- Valida que el asiento producido está cuadrado
- Garantiza atomicidad en la persistencia
- Garantiza idempotencia (no procesar dos veces la misma transacción)
- Publica eventos del resultado
- Registra el historial de todas las transacciones intentadas (aceptadas y rechazadas)

### Lo que NUNCA hace
- Generar FinancialTransactions — esa es responsabilidad de los módulos operativos
- Conocer qué es una Invoice, un Expense, un Payroll
- Conocer la UI de ningún módulo
- Hacer cálculos de IVA o impuestos propios — eso está en la Posting Rule
- Modificar JournalEntries existentes — son inmutables
- Enviar comunicaciones — eso es responsabilidad del Communication domain
- Conocer WorkEvents, Calendarios, ni ningún concepto operativo

---

## Idempotencia: la propiedad más importante

El Accounting Engine debe ser **idempotente**: procesar la misma FinancialTransaction dos veces produce exactamente el mismo resultado que procesarla una vez.

¿Por qué importa? Los sistemas distribuidos tienen fallas. Un mensaje puede entregarse dos veces. Un job puede reiniciarse. Si el Accounting Engine no es idempotente, una falla de red puede generar asientos duplicados.

La implementación es simple: antes de procesar cualquier transacción, verificar si ya existe un `JournalEntry` con `sourceTransactionId = transaction.transactionId`. Si existe, devolver el resultado existente sin crear nada nuevo.

---

## Reversibilidad: cómo se corrigen los errores

El Accounting Engine nunca modifica ni elimina un `JournalEntry` existente. La contabilidad no tiene borrar. Tiene revertir.

Si una `FinancialTransaction` fue contabilizada incorrectamente (porque la Posting Rule estaba mal, o porque la transacción original tenía un error), el proceso es:

1. Crear una `FinancialTransaction` de tipo complementario (ej. `INVOICE_VOIDED` para revertir un `INVOICE_ISSUED`).
2. El Accounting Engine genera un `JournalEntry` de reversión — exactamente el espejo del original, con débitos y créditos intercambiados.
3. Los saldos del General Ledger quedan en el mismo estado que antes de la transacción original.
4. Si el proceso correcto lo requiere, se crea una nueva transacción correcta.

Este enfoque garantiza que el historial contable es siempre una representación fiel de todo lo que ocurrió — incluyendo los errores y sus correcciones.

---

## Procesamiento asíncrono versus síncrono

El Accounting Engine puede operar de dos formas:

### Síncrono (v1 simple)
El módulo operativo publica el evento. El adaptador crea la `FinancialTransaction`. El `AccountingEngine.process()` se llama inmediatamente. El asiento queda en el libro antes de que retorne la respuesta HTTP.

**Ventaja:** Simplicidad. El estado contable es siempre consistente con el estado operativo.
**Desventaja:** Si el Accounting Engine tiene un problema de configuración (Posting Rule faltante), el proceso operativo también falla.

### Asíncrono (v1+ robusto)
El módulo operativo publica el evento. El adaptador crea la `FinancialTransaction` y la persiste en una cola o tabla de staging. El Accounting Engine la procesa en background.

**Ventaja:** El módulo operativo no se bloquea por errores contables. Un error de Posting Rule genera un `TransactionRejected` que puede resolverse sin afectar la operación.
**Desventaja:** Hay un gap temporal entre la operación y su registro contable.

**Recomendación:** Empezar con procesamiento síncrono. Migrar a asíncrono cuando el volumen de transacciones lo justifique o cuando la resiliencia sea crítica.

---

## Qué NO conoce el Accounting Engine

Esta lista es fundamental para mantener la independencia del motor:

```
Invoice           — solo conoce FinancialTransaction de tipo INVOICE_ISSUED
Payment           — solo conoce FinancialTransaction de tipo PAYMENT_RECEIVED
WorkEvent         — no existe en el vocabulario del Accounting Engine
Customer          — conoce counterpartyType='customer', no la entidad Customer
Business UI       — el Accounting Engine no tiene opinión sobre cómo se muestra la info
CalendarIntegration — completamente invisible
CommunicationLog  — irrelevante
Template          — irrelevante
```

Si algún día alguien propone que el Accounting Engine importe el módulo de Invoices para obtener más contexto, esa propuesta viola la arquitectura. La `FinancialTransaction` debe contener toda la información necesaria sin necesidad de consultar al módulo origen.

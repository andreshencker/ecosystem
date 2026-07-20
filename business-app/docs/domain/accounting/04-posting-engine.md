# 04 — The Posting Engine

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual

---

## Qué es el Posting Engine

El Posting Engine es el **traductor de hechos financieros a lenguaje contable**. Recibe una `FinancialTransaction` y una `PostingRule`, y produce un `JournalEntry` balanceado con todas sus líneas de débito y crédito.

Es el único componente del sistema que conoce los conceptos de débito, crédito, y cuentas contables. Nadie más.

```
FinancialTransaction + PostingRule
              │
              ▼
       PostingEngine
              │
    ┌─────────┴─────────┐
    │ Account Resolution │  ← ¿Qué cuentas afecta esta transacción?
    └─────────┬─────────┘
              │
    ┌─────────▼─────────┐
    │  Tax Resolution   │  ← ¿Cómo se trata el impuesto?
    └─────────┬─────────┘
              │
    ┌─────────▼─────────┐
    │ Line Generation   │  ← Genera las líneas de débito y crédito
    └─────────┬─────────┘
              │
    ┌─────────▼─────────┐
    │ Balance Check     │  ← Verifica sum(debits) = sum(credits)
    └─────────┬─────────┘
              │
              ▼
         JournalEntry
```

---

## Posting Rules: el corazón del Posting Engine

Una `PostingRule` es una plantilla que define cómo transformar un tipo específico de `FinancialTransaction` en líneas contables. Es la representación en datos de las reglas del contador.

### Estructura de una Posting Rule

```
PostingRule {
    ruleId          — identificador único de la regla
    transactionType — tipo de FinancialTransaction que esta regla procesa
    jurisdiction    — 'AU' | 'NZ' | 'CA' | 'GB' | '*' (global)
    businessId      — null si es regla global; businessId si es override específico
    name            — descripción legible (ej. 'Invoice Issued — AU Standard')
    version         — versión de la regla (las reglas evolucionan con los cambios fiscales)
    effectiveFrom   — desde cuándo aplica esta versión de la regla
    effectiveTo     — hasta cuándo aplica (null = vigente)
    lines           — las líneas a generar (ver estructura abajo)
}
```

### Líneas de una Posting Rule

Cada línea define cómo generar una línea del `JournalEntry`:

```
PostingRuleLine {
    lineOrder       — orden de la línea en el asiento
    accountCode     — código de cuenta del Chart of Accounts, o referencia dinámica
    accountType     — 'FIXED' (código literal) | 'DYNAMIC' (se resuelve en runtime)
    entry           — 'DEBIT' | 'CREDIT'
    amountSource    — 'NET_AMOUNT' | 'TAX_AMOUNT' | 'GROSS_AMOUNT' | 'DERIVED'
    description     — plantilla de descripción (ej. 'Invoice {{invoiceNumber}} — {{counterparty}}')
}
```

### Ejemplo de Posting Rule: INVOICE_ISSUED para Australia

```
PostingRule: INVOICE_ISSUED_AU

transactionType: INVOICE_ISSUED
jurisdiction:    AU

Lines:
  1. DEBIT   accountCode: 1100 (Accounts Receivable)       amountSource: GROSS_AMOUNT
  2. CREDIT  accountCode: 4000 (Revenue — Services)        amountSource: NET_AMOUNT
  3. CREDIT  accountCode: 2200 (GST Liability)             amountSource: TAX_AMOUNT
```

**Lectura:** Cuando se emite una factura en Australia:
- Aumenta lo que nos deben (Accounts Receivable) por el total bruto
- Aumenta los ingresos por servicios por el neto
- Aumenta la deuda de GST con el fisco por el impuesto

### Ejemplo de Posting Rule: PAYMENT_RECEIVED para Australia

```
PostingRule: PAYMENT_RECEIVED_AU

transactionType: PAYMENT_RECEIVED
jurisdiction:    AU

Lines:
  1. DEBIT   accountCode: 1000 (Bank/Cash)                 amountSource: GROSS_AMOUNT
  2. CREDIT  accountCode: 1100 (Accounts Receivable)       amountSource: GROSS_AMOUNT
```

**Lectura:** Cuando se recibe un pago:
- Aumenta el dinero en banco
- Disminuye lo que nos debían (cancela la deuda del cliente)

### Ejemplo de Posting Rule: INVOICE_ISSUED para Canadá (HST Ontario)

```
PostingRule: INVOICE_ISSUED_CA_ON

transactionType: INVOICE_ISSUED
jurisdiction:    CA
subJurisdiction: ON  (Ontario — 13% HST)

Lines:
  1. DEBIT   accountCode: 1100 (Accounts Receivable)       amountSource: GROSS_AMOUNT
  2. CREDIT  accountCode: 4000 (Revenue — Services)        amountSource: NET_AMOUNT
  3. CREDIT  accountCode: 2201 (HST Collected)             amountSource: TAX_AMOUNT
```

La misma `FinancialTransaction` de tipo `INVOICE_ISSUED` produce un asiento diferente según la jurisdicción. El módulo de Billing es completamente agnóstico de esto.

---

## Account Resolution: cómo se resuelven las cuentas

Las cuentas en una `PostingRule` pueden ser:

### FIXED — código literal
La cuenta es siempre la misma para todas las empresas que usan esta regla.

```
accountCode: '1100'   → siempre la cuenta 1100 del Chart of Accounts del Business
```

El Posting Engine busca la cuenta `1100` en el Chart of Accounts del Business. Si no existe, la transacción es rechazada con `ACCOUNT_NOT_FOUND`.

### DYNAMIC — cuenta resuelta en runtime
La cuenta exacta depende de atributos de la transacción o del Business. Permite personalización sin modificar la regla.

```
accountCode: '{{revenueAccount}}'
```

El Posting Engine evalúa la expresión contra el contexto de la transacción y el Business. Útil cuando diferentes tipos de ingresos van a diferentes cuentas de revenue.

Ejemplos de resolución dinámica:
- El tipo de gasto determina la cuenta de expense (gastos de viaje vs suministros de oficina)
- El tipo de activo determina la cuenta de assets
- La categoría del Customer puede determinar la cuenta de ingresos

### Overrides por Business
Un Business puede tener una configuración personalizada del Chart of Accounts donde la cuenta `4000` es `Revenue — Consulting` pero otro Business la llama `Service Income`. El código puede ser diferente — el Posting Engine la encuentra por su categoría estándar, no por el número.

---

## Tax Resolution: cómo se maneja el impuesto

El Tax Resolution es la parte más compleja del Posting Engine porque las reglas fiscales varían por país, tipo de bien o servicio, y período.

### Input del Tax Resolution

Del objeto `FinancialTransaction`:
- `taxType`: 'gst' | 'vat' | 'sales_tax' | 'hst' | 'none'
- `taxRate`: la tasa efectiva (0.10 para 10%)
- `taxAmount`: el monto ya calculado
- `jurisdiction`: el país/región

### Proceso de Tax Resolution

```
1. Si taxType === 'none': no generar líneas de impuesto

2. Si taxType === 'gst' y jurisdiction === 'AU':
   → Cuenta de crédito: 'GST Liability' (2200)
   → Tipo de tratamiento: 'tax_collected' o 'tax_claimable'

3. Si taxType === 'gst' y nature === 'expense':
   → El GST de un gasto no va a Liability → va a 'GST Claimable' (activo)
   → Cuenta: 'GST Input Tax Credit' (1200)

4. Si taxType === 'vat' y jurisdiction === 'GB':
   → Cuenta: 'VAT Output Account' (2300)

5. Si taxType === 'hst' y subJurisdiction === 'ON':
   → Cuenta: 'HST Collected' (2201)
```

**Importante:** El monto del impuesto ya viene calculado en la `FinancialTransaction`. El Posting Engine no calcula impuestos — solo los direcciona a las cuentas correctas. El cálculo ocurrió en el módulo operativo al momento de la operación.

### Ejemplo: GST en un gasto (claimable)

Cuando el Business recibe una factura de un proveedor con GST, ese GST no es un gasto — es un crédito fiscal que puede reclamar al fisco:

```
EXPENSE_RECORDED_AU

1. DEBIT   Expense Account (ej. 6100 Office Supplies)   amountSource: NET_AMOUNT
2. DEBIT   GST Input Tax Credit (1200)                  amountSource: TAX_AMOUNT
3. CREDIT  Accounts Payable (2000)                      amountSource: GROSS_AMOUNT
```

Si el Posting Engine no tuviera Tax Resolution, habría que crear una regla diferente para cada variante de gasto con/sin GST.

---

## Generación de líneas: el resultado final

Después de Account Resolution y Tax Resolution, el Posting Engine tiene todos los elementos para generar las líneas del `JournalEntry`:

```
JournalEntry {
    journalEntryId:       UUID generado
    sourceTransactionId:  transaction.transactionId
    referenceId:          transaction.referenceId
    referenceType:        transaction.referenceType
    businessId:           transaction.businessId
    postingRuleId:        rule.ruleId
    entryDate:            transaction.transactionDate
    fiscalPeriod:         transaction.fiscalPeriod
    description:          generada desde plantilla de la regla
    lines: [
        {
            lineId:         UUID
            accountCode:    '1100'
            accountName:    'Accounts Receivable'
            entry:          'DEBIT'
            amount:         Money(110.00, 'AUD')
            description:    'Invoice INV-2026-0042 — J Production'
        },
        {
            lineId:         UUID
            accountCode:    '4000'
            accountName:    'Revenue — Services'
            entry:          'CREDIT'
            amount:         Money(100.00, 'AUD')
            description:    'Invoice INV-2026-0042 — J Production'
        },
        {
            lineId:         UUID
            accountCode:    '2200'
            accountName:    'GST Liability'
            entry:          'CREDIT'
            amount:         Money(10.00, 'AUD')
            description:    'GST on Invoice INV-2026-0042'
        }
    ]
}
```

### La regla de balance

```
sum(DEBIT lines)  = $110.00
sum(CREDIT lines) = $100.00 + $10.00 = $110.00
```

La regla de balance se cumple. El asiento es válido.

---

## Por qué las reglas contables viven aquí y no en Billing

Esta pregunta merece una respuesta directa.

Si las reglas contables vivieran en Billing:

```
// En BillingService (INCORRECTO)
async markInvoiceAsSent(invoiceId: string) {
    const invoice = await this.invoiceRepo.findById(invoiceId);
    
    // Lógica operativa ← correcto
    invoice.status = 'sent';
    invoice.sentAt = new Date();
    
    // Lógica contable ← incorrecto
    await this.ledger.debit('1100', invoice.total);    // Accounts Receivable
    await this.ledger.credit('4000', invoice.netAmount); // Revenue
    await this.ledger.credit('2200', invoice.taxAmount); // GST Liability
    // ¿Y si la jurisdicción es UK? ¿Y si el cliente está exento de IVA?
    // ¿Y si la política contable del Business es diferente?
    // ¿Y si cambia la tasa de GST el próximo año?
}
```

Los problemas inmediatos:
1. Billing importa el módulo de General Ledger
2. Billing conoce los códigos de cuentas (1100, 4000, 2200)
3. Billing tiene lógica condicional para diferentes jurisdicciones
4. Cambiar la tasa de GST requiere modificar Billing
5. Testear Billing requiere un Chart of Accounts configurado
6. Billing falla si el Chart of Accounts no está configurado

Con el Posting Engine:

```
// En BillingService (CORRECTO)
async markInvoiceAsSent(invoiceId: string) {
    const invoice = await this.invoiceRepo.findById(invoiceId);
    
    // Solo lógica operativa
    invoice.status = 'sent';
    invoice.sentAt = new Date();
    
    // Publicar evento — eso es todo
    await this.events.publish(new InvoiceSent(invoice));
}

// En FinancialTransactionFactory (en Financial Engine)
onInvoiceSent(event: InvoiceSent) {
    const tx = new FinancialTransaction({
        type: 'INVOICE_ISSUED',
        grossAmount: event.total,
        // ...
    });
    await this.accountingEngine.process(tx);
}
```

Billing no sabe que existe contabilidad. Los tests de Billing son simples. Cambiar las reglas fiscales no toca Billing.

---

## Casos especiales que el Posting Engine debe manejar

### Pago parcial vs total
Un pago parcial cancela solo parte del saldo en Accounts Receivable. La `FinancialTransaction` de tipo `PAYMENT_RECEIVED` indica el monto exacto recibido. La Posting Rule genera líneas solo por ese monto, sin saber si hay saldo pendiente.

### Diferencias de cambio (FX)
Si el pago se recibe en USD pero la moneda base del Business es AUD, hay una diferencia entre:
- El importe de la factura al tipo de cambio del día de emisión
- El importe recibido al tipo de cambio del día de cobro

Esta diferencia genera una transacción adicional de tipo `EXCHANGE_RATE_GAIN` o `EXCHANGE_RATE_LOSS`.

### Retenciones de impuesto
En algunos países, el cliente retiene un porcentaje del pago para pagarlo directamente al fisco. El `PAYMENT_RECEIVED` tiene `grossAmount` menor al total de la factura. El PostingEngine debe generar una línea adicional para la retención.

### Transacciones dentro del mismo período vs distintos períodos
Si una factura se emitió en junio pero el pago llegó en julio, el Posting Engine debe respetar los períodos fiscales de cada transacción. El `INVOICE_ISSUED` va al período de junio. El `PAYMENT_RECEIVED` va al período de julio.

---

## El Posting Engine y los períodos fiscales

El Posting Engine tiene acceso a la configuración de `FiscalPeriod` del Business:

```
FiscalPeriod {
    periodId
    businessId
    name         — 'Q1 FY2026', 'July 2026', etc.
    startDate
    endDate
    status       — 'open' | 'closed' | 'locked'
}
```

Si `transaction.transactionDate` cae en un período con `status: 'closed'`, la transacción es rechazada. Solo el contador puede reabrir un período cerrado para hacer ajustes retroactivos.

Si cae en un período con `status: 'locked'`, no puede contabilizarse bajo ninguna circunstancia.

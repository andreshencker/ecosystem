# 03 — Aggregate Roots

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

Un Aggregate Root es la entidad principal de un cluster de objetos del dominio. Es el único punto de entrada para modificar el estado del cluster. Garantiza las invariantes del aggregate y protege la coherencia interna.

**Reglas de los Aggregate Roots:**
1. Solo se accede al aggregate a través de su root.
2. Las referencias externas son solo por ID, nunca por objeto directo.
3. El Aggregate Root publica los Domain Events resultantes de sus mutaciones.
4. Una transacción modifica un solo Aggregate Root.

---

## AR-01 — Business

**Dominio:** Business
**Por qué es el root:** Business es la identidad del tenant. FiscalProfile y Settings solo tienen sentido dentro de un Business. No existe un FiscalProfile independiente.

### Lo que contiene
```
Business (root)
├── FiscalProfile (entidad interna 1:1)
└── BusinessSettings (value object de configuración)
```

### Invariantes que protege
- Existe exactamente un `FiscalProfile` por Business.
- El `businessKey` es inmutable después de la creación.
- Solo puede haber un Business con `isPlatformCompany: true` en la plataforma.
- El `businessName` no puede ser vacío.

### Referencias externas (solo por ID)
- `ownerUserId` → User (en Identity)

### Por qué FiscalProfile no es su propio Aggregate Root
FiscalProfile no tiene ciclo de vida independiente. No puede crearse sin Business. No puede transferirse a otro Business. Su existencia depende completamente del Business que lo contiene.

---

## AR-02 — Customer

**Dominio:** Customer
**Por qué es el root:** Customer es la identidad del cliente. Los Contacts solo existen dentro del contexto de un Customer.

### Lo que contiene
```
Customer (root)
└── Contact[] (entidades internas 0..N)
```

### Invariantes que protege
- Un Customer no puede desactivarse si tiene Contracts activos o Invoices no pagadas.
- Si `type: 'company'`, el ABN debe tener formato válido.
- Existe exactamente un Contact con `isPrimary: true` (si hay alguno).

### Referencias externas (solo por ID)
- `businessId` → Business

### Por qué Contact no es su propio Aggregate Root
Un Contact representa a una persona dentro de un Customer. No tiene identidad significativa fuera de ese Customer. La pregunta "¿a qué Customer pertenece este Contact?" siempre tiene una respuesta — y esa respuesta es el Aggregate Root.

---

## AR-03 — Contract

**Dominio:** Work
**Por qué es el root:** Contract define el marco de trabajo. Las Rates son parte de ese marco — no tienen sentido fuera de un Contract.

### Lo que contiene
```
Contract (root)
└── Rate[] (entidades internas 1..N cuando active)
```

### Invariantes que protege
- Un Contract `active` tiene al menos una Rate con `isActive: true`.
- Solo una Rate puede tener `isDefault: true`.
- El `billingCycle` es inmutable cuando hay WorkEvents.
- `endDate >= startDate` si ambas existen.
- Un Contract en `completed` o `cancelled` no acepta nuevos WorkEvents.

### Referencias externas (solo por ID)
- `businessId` → Business
- `customerId` → Customer

### Por qué Rate no es su propio Aggregate Root
Una Rate sin Contract es un número flotante sin contexto. No puedes aplicar una Rate a un WorkEvent sin saber a qué Contract pertenece. El Contract es quien garantiza que las Rates son coherentes entre sí (una sola default, todas consistentes en moneda).

---

## AR-04 — WorkEvent

**Dominio:** Work
**Por qué es el root:** WorkEvent es atómico — representa un período específico de trabajo. No contiene sub-entidades.

### Lo que contiene
```
WorkEvent (root, sin sub-entidades)
```

### Invariantes que protege
- `endTime > startTime` (o lógica de cruce de medianoche).
- `breakMinutes < durationMinutes`.
- El estado es unidireccional: `draft → confirmed → invoiced`.
- `invoiced` es terminal (solo reversible si la Invoice se anula).
- `void` es terminal.
- Si `billable: false`, nunca puede llegar a `invoiced`.

### Referencias externas (solo por ID)
- `businessId` → Business
- `userId` → User (Identity)
- `customerId` → Customer
- `contractId` → Contract (opcional)
- `rateId` → Rate (opcional)
- `calendarIntegrationId` → CalendarIntegration (si fue importado)
- `invoiceItemId` → InvoiceItem (cuando está invoiced)

### Por qué WorkEvent es simple (sin sub-entidades)
Un turno de trabajo es un hecho atómico: empezó, terminó, se calculó. No tiene partes internas que deban gestionarse. La simpleza es intencional — la complejidad de los breaks, overtime, y tarifas la gestiona el `WorkEventCalculationService` antes de crear el WorkEvent.

---

## AR-05 — CalendarIntegration

**Dominio:** Calendar
**Por qué es el root:** Cada CalendarIntegration representa una conexión OAuth2 independiente. No contiene sub-entidades.

### Lo que contiene
```
CalendarIntegration (root, sin sub-entidades)
```

### Invariantes que protege
- No puede haber dos CalendarIntegrations activas para el mismo `(businessId, userId, provider, calendarId)`.
- Las credenciales OAuth2 siempre están encriptadas.

### Referencias externas (solo por ID)
- `businessId` → Business
- `userId` → User (Identity)

---

## AR-06 — Invoice

**Dominio:** Billing
**Por qué es el root:** Invoice es el documento financiero completo. Los InvoiceItems solo tienen sentido dentro de una Invoice. Un InvoiceItem sin Invoice es una línea de factura sin contexto.

### Lo que contiene
```
Invoice (root)
└── InvoiceItem[] (entidades internas 1..N)
```

### Invariantes que protege
- Una Invoice tiene siempre al menos un InvoiceItem.
- `total = subtotal + taxAmount` (siempre recalculado).
- `amountDue = total - amountPaid` (siempre recalculado).
- El `invoiceNumber` es inmutable una vez generado.
- Una Invoice `sent` o posterior no puede modificar sus InvoiceItems.
- Si `amountPaid >= total`, el status pasa a `paid`.
- Un InvoiceItem con `workEventId` no puede duplicar ese WorkEvent.

### Referencias externas (solo por ID)
- `businessId` → Business
- `customerId` → Customer
- `contractId` → Contract (opcional)

### Por qué InvoiceItem no es su propio Aggregate Root
Un InvoiceItem no tiene significado fuera de una Invoice. No puede existir solo. Las invariantes que protegen la integridad de la factura (total = sum de items, mínimo 1 item, etc.) solo se pueden garantizar si Invoice controla directamente sus items.

### Por qué Payment NO está dentro del Aggregate Invoice
Payment es un hecho independiente — alguien pagó dinero. Ese hecho puede anularse, revertirse, o modificarse independientemente de la Invoice. Además, en el futuro un Payment puede aplicarse a múltiples Invoices. Por lo tanto, Payment tiene su propio Aggregate Root.

---

## AR-07 — Payment

**Dominio:** Billing
**Por qué es el root:** Payment representa un hecho financiero independiente. Tiene su propio ciclo de vida y puede evolucionar (cleared → reversed) sin que eso afecte la estructura de la Invoice.

### Lo que contiene
```
Payment (root, sin sub-entidades en v1)
```

### Invariantes que protege
- `amount > 0`.
- `date >= invoice.issueDate`.
- El estado `reversed` es terminal.
- Un Payment solo puede aplicarse a una Invoice activa.

### Referencias externas (solo por ID)
- `businessId` → Business
- `invoiceId` → Invoice

---

## AR-08 — FinancialTransaction

**Dominio:** Financial
**Por qué es el root:** FinancialTransaction es el hecho financiero normalizado. Es inmutable y atómico.

### Lo que contiene
```
FinancialTransaction (root, inmutable)
```

### Invariantes que protege
- `grossAmount = netAmount + taxAmount`.
- `grossAmount > 0`.
- Una FinancialTransaction es inmutable — no se modifica, se revierte con una nueva.
- Solo puede procesarse cuando el FiscalPeriod está abierto.
- Idempotencia: no puede crearse dos veces para el mismo `(referenceId, type)`.

### Referencias externas (solo por ID)
- `businessId` → Business
- `referenceId` → El documento origen (Invoice, Payment, etc.) — por ID, no por objeto

---

## AR-09 — ChartOfAccounts

**Dominio:** Accounting
**Por qué es el root:** El Chart of Accounts es la estructura de toda la contabilidad del Business. Las Accounts son parte de esa estructura.

### Lo que contiene
```
ChartOfAccounts (root)
└── Account[] (entidades internas — la lista de cuentas)
```

### Invariantes que protege
- Solo existe un ChartOfAccounts por Business.
- No puede haber dos Accounts con el mismo `accountCode` en el mismo chart.
- Una Account con `isSystemAccount: true` no puede eliminarse.
- Una Account que tiene JournalLines no puede desactivarse (solo `isActive: false`).

### Referencias externas (solo por ID)
- `businessId` → Business

---

## AR-10 — JournalEntry

**Dominio:** Accounting
**Por qué es el root:** Un JournalEntry es el asiento contable completo y balanceado. Las JournalLines son parte indivisible del asiento.

### Lo que contiene
```
JournalEntry (root)
└── JournalLine[] (entidades internas — mínimo 2: un débito y un crédito)
```

### Invariantes que protege
- `sum(DEBIT lines) === sum(CREDIT lines)`.
- Un JournalEntry `posted` es inmutable — para corregir, crear uno de reversión.
- Todas las Account codes referenciadas existen en el Chart of Accounts del Business.
- El `entryDate` cae en un FiscalPeriod abierto.

### Quién puede crear JournalEntries
**Exclusivamente el Accounting Engine.** Ningún otro componente del sistema.

### Referencias externas (solo por ID)
- `businessId` → Business
- `sourceTransactionId` → FinancialTransaction
- `journalId` → Journal (del mismo dominio)

---

## Resumen

| Aggregate Root | Dominio | Sub-entidades | Inmutable |
|---|---|---|---|
| Business | Business | FiscalProfile | No (evoluciona) |
| Customer | Customer | Contact[] | No |
| Contract | Work | Rate[] | No |
| WorkEvent | Work | — | Parcial (posted state) |
| CalendarIntegration | Calendar | — | No |
| Invoice | Billing | InvoiceItem[] | Parcial (sent → inmutable items) |
| Payment | Billing | — | Parcial (cleared → reversible) |
| FinancialTransaction | Financial | — | **Sí — completamente** |
| ChartOfAccounts | Accounting | Account[] | No |
| JournalEntry | Accounting | JournalLine[] | **Sí — completamente** |

---

## La regla de las referencias cruzadas

Cuando un Aggregate necesita referenciar una entidad de otro Aggregate, **solo guarda el ID**, nunca el objeto completo.

```
CORRECTO:
  WorkEvent { contractId: ObjectId }

INCORRECTO:
  WorkEvent { contract: Contract }  ← acoplamiento directo
```

Si un Aggregate necesita datos de otro para tomar una decisión, hay tres opciones:
1. **Desnormalizar** el dato mínimo necesario en el momento de creación.
2. **Consultar** el otro aggregate en la Application Layer antes de invocar el Domain.
3. **Publicar un evento** y dejar que el otro aggregate reaccione.

Ninguna opción involucra cargar el Aggregate completo del otro dominio en memoria.

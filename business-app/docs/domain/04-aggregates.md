# 04 — Aggregates

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

Un Aggregate es un cluster de objetos del dominio (entidades y value objects) que se tratan como una unidad para las operaciones de cambio de estado. Cada Aggregate tiene un **Aggregate Root** — la única entidad a través de la cual el exterior puede interactuar con el aggregate.

**Regla fundamental:** Solo el Aggregate Root tiene identidad global. Las entidades internas solo tienen identidad dentro del aggregate.

---

## AG-01 — Business

### Aggregate Root
`Business`

### Responsabilidad
Representar y proteger la identidad y configuración del negocio del usuario. Garantiza que el Business siempre tenga un estado válido y que sus datos fiscales sean coherentes.

### Entidades contenidas
- `Business` (root)
- `FiscalProfile` (1:1 — solo existe dentro del Business)

### Invariantes
1. Todo Business debe tener un `businessKey` único e inmutable después de la creación.
2. Todo Business debe tener exactamente un `business_owner` activo.
3. `FiscalProfile` pertenece a un solo Business y no puede transferirse.
4. El `businessName` no puede ser vacío.
5. Si `gstRegistered: true`, la `gstRate` debe ser mayor a cero.
6. Solo puede existir un Business con `isPlatformCompany: true` en toda la plataforma.

### Entidades externas que referencia (por ID)
- `User` (ownerUserId) — no se puede modificar directamente desde Business

### Qué nunca puede modificar directamente
- Datos de Customers, Contracts, WorkEvents, Invoices
- Usuarios (solo los referencia)

### Eventos que produce
- `BusinessRegistered`
- `BusinessSettingsUpdated`
- `FiscalProfileConfigured`
- `FiscalProfileUpdated`

---

## AG-02 — Customer

### Aggregate Root
`Customer`

### Responsabilidad
Representar a un cliente del Business, incluyendo sus datos de contacto de facturación. Garantiza que el Customer siempre tenga la información mínima para emitirle una factura.

### Entidades contenidas
- `Customer` (root)
- `Contact[]` (0..N — las personas de contacto del Customer)

### Invariantes
1. Un Customer debe pertenecer a exactamente un Business (`businessId`).
2. El `name` del Customer no puede ser vacío.
3. Si `type: 'company'`, el ABN (si se provee) debe tener formato válido (11 dígitos).
4. Un Customer desactivado (`isActive: false`) no puede tener nuevos Contracts creados.
5. Eliminar un Customer con Invoices o Contracts activos está prohibido — solo desactivar.

### Entidades externas que referencia
- `Business` (businessId)

### Qué nunca puede modificar directamente
- Contracts (aunque los posee conceptualmente)
- Invoices

### Eventos que produce
- `CustomerCreated`
- `CustomerUpdated`
- `CustomerDeactivated`
- `ContactAdded`
- `ContactUpdated`

---

## AG-03 — Contract

### Aggregate Root
`Contract`

### Responsabilidad
Gestionar el acuerdo de trabajo y todas sus tarifas. Garantiza que las Rates sean coherentes entre sí y que el Contract esté en un estado válido para generar WorkEvents.

### Entidades contenidas
- `Contract` (root)
- `Rate[]` (1..N — al menos una Rate activa cuando el Contract está active)

### Invariantes
1. Un Contract debe tener exactamente un Business y un Customer.
2. Si `status: 'active'`, debe existir al menos una Rate con `isActive: true`.
3. Solo puede haber una Rate con `isDefault: true` por Contract.
4. Un Contract en estado `completed` o `cancelled` no puede agregar nuevas Rates ni WorkEvents.
5. La `endDate`, si existe, no puede ser anterior a `startDate`.
6. La `billingCycle` es inmutable después de que el Contract tiene WorkEvents asociados.

### Entidades externas que referencia
- `Business` (businessId)
- `Customer` (customerId)

### Qué nunca puede modificar directamente
- WorkEvents (los WorkEvents referencian al Contract, no al revés)
- Invoices

### Eventos que produce
- `ContractCreated`
- `ContractActivated`
- `ContractCompleted`
- `ContractCancelled`
- `RateAdded`
- `RateUpdated`
- `RateDeactivated`

---

## AG-04 — WorkEvent

### Aggregate Root
`WorkEvent`

### Responsabilidad
Representar un período de trabajo realizado con precisión. Garantiza que el cálculo de horas y montos sea correcto y que el estado de facturación sea coherente.

### Entidades contenidas
- `WorkEvent` (root — no contiene sub-entidades, es simple)

### Invariantes
1. `endTime` debe ser posterior a `startTime` en el mismo día (o cruzar medianoche con lógica explícita).
2. `breakMinutes` no puede exceder `durationMinutes`.
3. Un WorkEvent en estado `invoiced` no puede volver a `confirmed` — es unidireccional.
4. Un WorkEvent en estado `void` no puede facturarse.
5. Si `billable: false`, no puede pasar a `invoiced` — solo se puede marcar como `void`.
6. `calculatedAmount` = `(durationMinutes / 60) * rate.amount` (para tipo hourly). Nunca se calcula en el cliente.
7. Un WorkEvent no puede cambiar de Contract una vez en estado `confirmed` o `invoiced`.
8. Si viene de un CalendarIntegration (`calendarEventId` presente) y fue editado manualmente, no se sobreescribe en syncs posteriores.

### Entidades externas que referencia
- `Business` (businessId)
- `User` (userId — quién trabajó)
- `Customer` (customerId)
- `Contract` (contractId — opcional)
- `Rate` (rateId — opcional, si hay un Contract)
- `CalendarIntegration` (calendarIntegrationId — si fue importado)
- `InvoiceItem` (invoiceItemId — una vez facturado)

### Qué nunca puede modificar directamente
- La Invoice que lo contiene
- El Rate del contrato (solo puede leerlo)

### Eventos que produce
- `WorkEventCreated`
- `WorkEventImported`
- `WorkEventConfirmed`
- `WorkEventEdited`
- `WorkEventVoided`
- `WorkEventInvoiced`

---

## AG-05 — Invoice

### Aggregate Root
`Invoice`

### Responsabilidad
Gestionar el documento financiero formal y su ciclo de vida completo. Garantiza la integridad del total, que todos los InvoiceItems sean coherentes, y que el estado refleje con precisión el estado de cobro.

### Entidades contenidas
- `Invoice` (root)
- `InvoiceItem[]` (1..N — al menos un item; la Invoice no puede existir vacía)

### Invariantes
1. Una Invoice debe tener siempre al menos un InvoiceItem.
2. `total` = `subtotal + taxAmount`. Nunca se provee externamente — siempre se recalcula.
3. `amountDue` = `total - amountPaid`. Se recalcula en cada Payment registrado.
4. Una Invoice en estado `sent` o posterior no puede modificar sus InvoiceItems.
5. Solo un Draft puede eliminarse — los demás estados solo permiten `void` o `cancelled`.
6. El `invoiceNumber` es inmutable después de la generación — nunca se puede cambiar.
7. Un InvoiceItem vinculado a un WorkEvent (`workEventId` presente) no puede duplicar ese WorkEvent en otra Invoice activa.
8. Si `amountPaid >= total`, el estado pasa automáticamente a `paid`.
9. Si `dueDate < today` y `status` no es `paid`, `void`, ni `cancelled`, el estado es `overdue`.
10. Una Invoice `void` no puede recibir Payments.

### Entidades externas que referencia
- `Business` (businessId)
- `Customer` (customerId)
- `Contract` (contractId — opcional)

### Qué nunca puede modificar directamente
- Payments (los Payments referencian a la Invoice, no al revés)
- WorkEvents (solo los referencia a través de InvoiceItems)

### Eventos que produce
- `InvoiceGenerated`
- `InvoiceSent`
- `InvoiceViewed`
- `InvoiceOverdue`
- `InvoicePaid`
- `InvoicePartialPayment`
- `InvoiceVoided`
- `InvoiceCancelled`

---

## AG-06 — Payment

### Aggregate Root
`Payment`

### Responsabilidad
Representar un pago recibido y garantizar que siempre esté vinculado a una Invoice válida. Gatilla la actualización del estado de cobro en la Invoice.

### Entidades contenidas
- `Payment` (root — no contiene sub-entidades)

### Invariantes
1. Un Payment debe referenciar exactamente una Invoice activa (no `void`, no `cancelled`).
2. El `amount` debe ser mayor a cero.
3. La `date` del Payment no puede ser anterior a la `issueDate` de la Invoice.
4. Un Payment en estado `reversed` no puede volver a `cleared`.
5. El monto total de Payments para una Invoice no puede exceder el total de la Invoice (salvo con lógica explícita de crédito, que es una extensión futura).

### Entidades externas que referencia
- `Business` (businessId)
- `Invoice` (invoiceId)

### Qué nunca puede modificar directamente
- La Invoice directamente — solo notifica via evento para que Billing actualice el estado

### Eventos que produce
- `PaymentRecorded`
- `PaymentReversed`

---

## AG-07 — CalendarIntegration

### Aggregate Root
`CalendarIntegration`

### Responsabilidad
Gestionar la conexión con un proveedor de calendario y el estado del proceso de sincronización.

### Entidades contenidas
- `CalendarIntegration` (root — no contiene sub-entidades)

### Invariantes
1. Un Business + User + Provider solo puede tener una CalendarIntegration activa. No dos conexiones al mismo Google Calendar del mismo usuario.
2. Las credenciales OAuth2 deben estar siempre encriptadas — nunca en texto plano.
3. `lastSyncedAt` solo se actualiza en syncs exitosos.
4. Una CalendarIntegration `isActive: false` no ejecuta syncs.

### Entidades externas que referencia
- `Business` (businessId)
- `User` (userId — propietario de las credenciales)

### Qué nunca puede modificar directamente
- WorkEvents (publica eventos para que Work Management los cree)

### Eventos que produce
- `CalendarIntegrationConnected`
- `CalendarSynced`
- `CalendarEventImported`
- `CalendarSyncFailed`
- `CalendarIntegrationDisconnected`

---

## Resumen

| Aggregate | Root | Sub-entidades | Estado |
|---|---|---|---|
| Business | `Business` | `FiscalProfile` | ⚠️ Parcial |
| Customer | `Customer` | `Contact[]` | ❌ Falta |
| Contract | `Contract` | `Rate[]` | ❌ Falta |
| WorkEvent | `WorkEvent` | — | ❌ Falta |
| Invoice | `Invoice` | `InvoiceItem[]` | ❌ Falta |
| Payment | `Payment` | — | ❌ Falta |
| CalendarIntegration | `CalendarIntegration` | — | ❌ Falta |

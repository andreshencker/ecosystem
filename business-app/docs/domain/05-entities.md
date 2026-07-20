# 05 — Entities

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

Las entidades son objetos del dominio con identidad propia que persiste en el tiempo, independientemente de sus atributos. Una entidad se distingue de otro objeto del mismo tipo por su ID, no por sus valores.

---

## ENT-01 — Business

**Estado en el código:** ⚠️ Existe parcialmente como schema `Company`

**Responsabilidad:** Representar la identidad comercial y la cuenta del usuario dentro de Invoice App. Es el anchor de todas las entidades de negocio.

**Identidad:** `businessId` (ObjectId, inmutable)

### Campos principales

| Campo | Tipo | Notas |
|---|---|---|
| `businessId` | ObjectId | Clave primaria |
| `businessKey` | String | Slug único e inmutable. Actualmente `companyKey` |
| `businessName` | String | Nombre comercial. Actualmente `companyName` |
| `ownerUserId` | ObjectId → User | Propietario. Actualmente String |
| `defaultCurrency` | String | `'AUD'` por defecto |
| `timezone` | String | IANA timezone. Crítico para WorkEvents. **Falta** |
| `phone` | String\|null | **Falta** |
| `logoUrl` | String\|null | **Falta** |
| `address` | Address (VO) | **Falta** |
| `isActive` | Boolean | |
| `isPlatformCompany` | Boolean | Solo la empresa base de Invoice App |
| `createdAt` / `updatedAt` | timestamps | |

### Relaciones
- Tiene exactamente un `FiscalProfile`
- Tiene muchos `User`s (via `user.businessId`)
- Tiene muchas `CalendarIntegration`s
- Tiene muchas `CommunicationConnection`s
- Tiene muchos `Customer`s

### Estados
`active` | `inactive` (soft delete)

### Quién puede modificarla
`business_owner`, `platform_admin`

### Quién la consume
Todos los Bounded Contexts — es el anchor de multi-tenancy

### Problemas actuales en el código
- Nombre técnico: `Company` → debe migrarse a `Business` (ADR-001)
- `ownerUserId` es String, no ObjectId
- Falta `timezone`, `phone`, `logoUrl`, `address`
- `abn` y `depositAccount` están embedidos — deben migrarse a `FiscalProfile`

---

## ENT-02 — User

**Estado en el código:** ✅ Existe — schema `User`

**Responsabilidad:** Representar a una persona con acceso autenticado al Business. Gestiona identidad, credenciales y rol.

**Identidad:** `userId` (ObjectId, inmutable)

### Campos principales

| Campo | Tipo | Notas |
|---|---|---|
| `userId` | ObjectId | `_id` de Mongoose |
| `email` | String | Único, immutable en v1 |
| `passwordHash` | String | Nunca retornado en API |
| `firstName` | String | |
| `lastName` | String | |
| `avatarUrl` | String\|null | |
| `role` | UserRole | `platform_admin \| business_owner \| business_admin \| accountant \| staff \| viewer` |
| `scope` | UserScope | `global \| company` |
| `businessId` | ObjectId → Business | Actualmente `companyId` (String) |
| `businessKey` | String | Denormalizado. Actualmente `companyKey` |
| `isActive` | Boolean | |
| `isEmailVerified` | Boolean | |
| `mustChangePassword` | Boolean | Para usuarios invitados (DEC-014) |

### Relaciones
- Pertenece a exactamente un `Business`
- Puede registrar `WorkEvent`s

### Estados
`active` | `inactive`

### Quién puede modificarla
- El propio usuario (su perfil personal)
- `business_owner`, `business_admin` (gestión de usuarios)
- `platform_admin` (administración global)

### Problemas actuales en el código
- `businessId` se llama `companyId` (String) — pendiente migración (ADR-001)
- `businessKey` se llama `companyKey`

---

## ENT-03 — FiscalProfile

**Estado en el código:** ❌ No existe — datos embedidos en `Company`

**Responsabilidad:** Centralizar todos los datos tributarios y financieros del Business que aparecen en las facturas como emisor.

**Identidad:** `fiscalProfileId` (ObjectId)

### Campos principales

| Campo | Tipo | Notas |
|---|---|---|
| `fiscalProfileId` | ObjectId | |
| `businessId` | ObjectId → Business | 1:1, unique |
| `abn` | TaxNumber (VO)\|null | Australian Business Number |
| `acn` | String\|null | Australian Company Number |
| `gstRegistered` | Boolean | ¿Cobra GST? |
| `gstRate` | Number | Default 10. Activo solo si `gstRegistered: true` |
| `bankAccount` | BankAccount (VO)\|null | Para recibir pagos |
| `billingAddress` | Address (VO)\|null | Dirección legal que aparece en facturas |
| `paymentTermsDays` | Number | Default 14. Días para vencimiento de facturas |
| `invoicePrefix` | String | Ej. `'INV'`, `'JS'`. Default `'INV'` |
| `invoiceNextNumber` | Number | Contador atómico para generar números de factura |

### Relaciones
- Pertenece a exactamente un `Business`

### Quién puede modificarla
`business_owner`, `platform_admin`

### Quién la consume
- Billing context (para generar el número de Invoice y para el encabezado del emisor)

### Datos que debe migrar desde `Company`
- `abn` → `FiscalProfile.abn`
- `depositAccount.bsb` → `FiscalProfile.bankAccount.bsb`
- `depositAccount.accountNumber` → `FiscalProfile.bankAccount.accountNumber`

---

## ENT-04 — Customer

**Estado en el código:** ❌ No existe

**Responsabilidad:** Representar a la empresa o persona a quien el Business factura.

**Identidad:** `customerId` (ObjectId)

### Campos principales

| Campo | Tipo | Notas |
|---|---|---|
| `customerId` | ObjectId | |
| `businessId` | ObjectId → Business | |
| `name` | String | Nombre del cliente (empresa o persona) |
| `type` | String | `'company' \| 'individual'` |
| `abn` | TaxNumber (VO)\|null | ABN del cliente si es empresa australiana |
| `defaultPaymentTermsDays` | Number\|null | Sobreescribe el del FiscalProfile si se especifica |
| `billingAddress` | Address (VO)\|null | |
| `notes` | String\|null | Notas internas |
| `isActive` | Boolean | |

### Relaciones
- Pertenece a un `Business`
- Tiene muchos `Contact`s
- Tiene muchos `Contract`s
- Tiene muchas `Invoice`s

### Estados
`active` | `inactive`

### Quién puede modificarla
`business_owner`, `business_admin`, `accountant`

---

## ENT-05 — Contact

**Estado en el código:** ❌ No existe

**Responsabilidad:** Representar a una persona específica dentro de un Customer. El interlocutor de facturación.

**Identidad:** `contactId` (ObjectId)

### Campos principales

| Campo | Tipo | Notas |
|---|---|---|
| `contactId` | ObjectId | |
| `customerId` | ObjectId → Customer | |
| `businessId` | ObjectId → Business | Para queries multi-tenant |
| `name` | String | |
| `email` | EmailAddress (VO)\|null | |
| `phone` | PhoneNumber (VO)\|null | |
| `jobTitle` | String\|null | |
| `isPrimary` | Boolean | El contact principal para envío de facturas |
| `isActive` | Boolean | |

### Quién puede modificarla
`business_owner`, `business_admin`, `accountant`

---

## ENT-06 — Contract

**Estado en el código:** ❌ No existe

**Responsabilidad:** Representar el acuerdo de trabajo entre Business y Customer.

**Identidad:** `contractId` (ObjectId)

### Campos principales

| Campo | Tipo | Notas |
|---|---|---|
| `contractId` | ObjectId | |
| `businessId` | ObjectId → Business | |
| `customerId` | ObjectId → Customer | |
| `title` | String | |
| `contractNumber` | String\|null | Referencia interna |
| `startDate` | Date | |
| `endDate` | Date\|null | null = indefinido |
| `status` | ContractStatus | `draft \| active \| completed \| cancelled` |
| `billingCycle` | BillingCycle | `weekly \| fortnightly \| monthly \| on_demand` |
| `defaultRateId` | ObjectId → Rate\|null | Rate por defecto cuando no se especifica en WorkEvent |
| `paymentTermsDays` | Number | Sobreescribe el del FiscalProfile para este contrato |
| `description` | String\|null | |
| `notes` | String\|null | |

### Relaciones
- Tiene muchas `Rate`s (1..N cuando active)
- Es referenciado por `WorkEvent`s
- Es referenciado por `Invoice`s

### Estados
`draft` → `active` → `completed` | `cancelled`

### Invariantes de estado
- Solo `active` puede tener nuevos WorkEvents
- `completed` y `cancelled` son terminales

### Quién puede modificarla
`business_owner`, `business_admin`

---

## ENT-07 — Rate

**Estado en el código:** ❌ No existe

**Responsabilidad:** Definir el precio por unidad de trabajo en el marco de un Contract.

**Identidad:** `rateId` (ObjectId)

### Campos principales

| Campo | Tipo | Notas |
|---|---|---|
| `rateId` | ObjectId | |
| `contractId` | ObjectId → Contract | |
| `businessId` | ObjectId → Business | Para queries multi-tenant |
| `name` | String | `'Standard' \| 'Weekend' \| 'Overtime' \| 'Night Shift' \| 'Public Holiday'` |
| `type` | RateType | `hourly \| daily \| weekly \| fixed` |
| `amount` | Money (VO) | Monto + moneda |
| `isDefault` | Boolean | La tarifa por defecto del contrato |
| `isActive` | Boolean | |
| `description` | String\|null | |

### Relaciones
- Pertenece a un `Contract`
- Es referenciada por `WorkEvent`s

### Quién puede modificarla
`business_owner`, `business_admin`

### Nota de modelado
No se elimina físicamente si tiene WorkEvents. Solo `isActive: false`.

---

## ENT-08 — CalendarIntegration

**Estado en el código:** ❌ No existe (existe `IntegrationConnection` para Communications, distinto)

**Responsabilidad:** Gestionar la conexión con un proveedor de calendario externo.

**Identidad:** `calendarIntegrationId` (ObjectId)

### Campos principales

| Campo | Tipo | Notas |
|---|---|---|
| `calendarIntegrationId` | ObjectId | |
| `businessId` | ObjectId → Business | |
| `userId` | ObjectId → User | Propietario de las credenciales |
| `provider` | CalendarProvider | `google \| apple \| outlook \| ical` |
| `encryptedToken` | Object | AES-256-GCM: `{ accessToken, refreshToken }` |
| `calendarId` | String\|null | ID del calendario específico dentro del provider |
| `calendarName` | String\|null | Nombre del calendario (display) |
| `syncDirection` | SyncDirection | `import \| export \| bidirectional` |
| `lastSyncedAt` | Date\|null | |
| `syncStatus` | SyncStatus | `idle \| syncing \| error` |
| `lastSyncError` | String\|null | |
| `isActive` | Boolean | |

### Quién puede modificarla
`business_owner`, `business_admin`, el propio `staff` (para su calendario personal)

---

## ENT-09 — WorkEvent

**Estado en el código:** ❌ No existe

**Responsabilidad:** Registrar un turno o período de trabajo realizado.

**Identidad:** `workEventId` (ObjectId)

### Campos principales

| Campo | Tipo | Notas |
|---|---|---|
| `workEventId` | ObjectId | |
| `businessId` | ObjectId → Business | |
| `userId` | ObjectId → User | Quién trabajó |
| `customerId` | ObjectId → Customer | Para quién |
| `contractId` | ObjectId → Contract\|null | Bajo qué contrato |
| `rateId` | ObjectId → Rate\|null | A qué tarifa |
| `date` | Date | Día del turno |
| `startTime` | String | `HH:mm` en timezone del Business |
| `endTime` | String | `HH:mm` |
| `breakMinutes` | Number | Descanso (se descuenta) |
| `durationMinutes` | Number | Calculado: `(end - start) - breakMinutes` |
| `type` | WorkEventType | `shift \| overtime \| travel \| public_holiday \| manual` |
| `status` | WorkEventStatus | `draft \| confirmed \| invoiced \| void` |
| `billable` | Boolean | Si se incluye en factura |
| `rateOverrideAmount` | Money (VO)\|null | Si se sobreescribe puntualmente |
| `calculatedAmount` | Money (VO) | `durationHours * rate.amount` o `rateOverrideAmount` |
| `description` | String\|null | Nota del turno |
| `calendarEventId` | CalendarReference (VO)\|null | ID externo si vino del calendario |
| `calendarIntegrationId` | ObjectId\|null | Qué integración lo importó |
| `invoiceItemId` | ObjectId\|null | Set cuando se factura |

### Estados
`draft` → `confirmed` → `invoiced` | `void`

### Invariantes de estado
- `draft` → `confirmed`: acción manual del usuario
- `confirmed` → `invoiced`: solo lo puede hacer el proceso de generación de Invoice
- `invoiced` es terminal — no vuelve atrás salvo que la Invoice se void (edge case documentado en open questions)
- `void` es terminal

### Quién puede modificarla
- `draft`: cualquier usuario con permisos de Work Management
- `confirmed`: solo revertir a draft por `business_admin` o superior
- `invoiced` y `void`: inmutable

---

## ENT-10 — Invoice

**Estado en el código:** ❌ No existe

**Responsabilidad:** El documento financiero formal que registra la deuda de un Customer con el Business.

**Identidad:** `invoiceId` (ObjectId)

### Campos principales

| Campo | Tipo | Notas |
|---|---|---|
| `invoiceId` | ObjectId | |
| `businessId` | ObjectId → Business | |
| `customerId` | ObjectId → Customer | |
| `contractId` | ObjectId → Contract\|null | |
| `invoiceNumber` | InvoiceNumber (VO) | Generado. Inmutable. Ej: `INV-2026-0042` |
| `issueDate` | Date | |
| `dueDate` | Date | `issueDate + paymentTermsDays` |
| `status` | InvoiceStatus | `draft \| sent \| viewed \| partial \| paid \| overdue \| cancelled \| void` |
| `subtotal` | Money (VO) | Suma de InvoiceItems antes de impuestos |
| `taxAmount` | Money (VO) | GST calculado |
| `total` | Money (VO) | `subtotal + taxAmount` |
| `amountPaid` | Money (VO) | Suma de Payments recibidos |
| `amountDue` | Money (VO) | `total - amountPaid` |
| `currency` | String | |
| `notes` | String\|null | Visible al Customer |
| `internalNotes` | String\|null | Solo visible internamente |
| `sentAt` | Date\|null | |
| `paidAt` | Date\|null | |

### Estados y transiciones

```
draft → sent → viewed → partial → paid
             → overdue (automático por job)
draft → cancelled
sent/viewed/partial/overdue → void (acción manual)
```

### Quién puede modificarla
- `draft`: `business_owner`, `business_admin`, `accountant`
- `sent` y posteriores: solo `void` o registro de Payment

---

## ENT-11 — InvoiceItem

**Estado en el código:** ❌ No existe

**Responsabilidad:** Una línea de una Invoice. Puede corresponder a un WorkEvent o ser un ítem manual.

**Identidad:** `invoiceItemId` (ObjectId)

### Campos principales

| Campo | Tipo | Notas |
|---|---|---|
| `invoiceItemId` | ObjectId | |
| `invoiceId` | ObjectId → Invoice | |
| `businessId` | ObjectId → Business | Para queries |
| `workEventId` | ObjectId → WorkEvent\|null | null = ítem manual |
| `description` | String | |
| `date` | Date\|null | Fecha del servicio |
| `quantity` | Decimal | Horas, días, unidades |
| `unitPrice` | Money (VO) | Precio por unidad |
| `amount` | Money (VO) | `quantity * unitPrice` |
| `taxable` | Boolean | Si aplica GST |
| `sortOrder` | Number | Orden en el PDF |

### Reglas
- Si tiene `workEventId`, al crear el InvoiceItem ese WorkEvent pasa a `invoiced`
- Si se elimina un InvoiceItem de un Draft, el WorkEvent vuelve a `confirmed`
- `amount` puede ser sobreescrito manualmente para ítems manuales

---

## ENT-12 — Payment

**Estado en el código:** ❌ No existe

**Responsabilidad:** Registrar un pago recibido de un Customer contra una Invoice.

**Identidad:** `paymentId` (ObjectId)

### Campos principales

| Campo | Tipo | Notas |
|---|---|---|
| `paymentId` | ObjectId | |
| `businessId` | ObjectId → Business | |
| `invoiceId` | ObjectId → Invoice | |
| `amount` | Money (VO) | |
| `date` | Date | |
| `method` | PaymentMethod | `bank_transfer \| credit_card \| cash \| cheque \| stripe \| other` |
| `reference` | String\|null | Número de transferencia, etc. |
| `status` | PaymentStatus | `pending \| cleared \| reversed` |
| `notes` | String\|null | |
| `bankTransactionId` | String\|null | Para conciliación futura |

### Estados
`pending` → `cleared` | `reversed`

### Quién puede modificarla
`business_owner`, `business_admin`, `accountant`

---

## ENT-13 — CommunicationLog

**Estado en el código:** ❌ No existe

**Responsabilidad:** Registro inmutable de cada comunicación solicitada a Communications Platform desde Invoice App.

**Identidad:** `communicationLogId` (ObjectId)

### Campos principales

| Campo | Tipo | Notas |
|---|---|---|
| `communicationLogId` | ObjectId | |
| `businessId` | ObjectId → Business | |
| `resourceType` | String | `invoice \| payment \| work_event \| user \| contract` |
| `resourceId` | ObjectId | ID del recurso que disparó el envío |
| `eventKey` | String | Ej. `invoices.invoice_sent` |
| `channel` | String | `email \| sms \| push` |
| `recipientEmail` | String | |
| `requestedAt` | Date | |
| `success` | Boolean | |
| `httpStatus` | Number\|null | |
| `communicationsLogId` | String\|null | ID del ExecutionLog en Communications |
| `errorMessage` | String\|null | |
| `createdAt` | Date | Solo createdAt — inmutable |

### Quién puede modificarla
Nadie — solo se crea, nunca se actualiza

---

## ENT-14 — Invitation *(Identity context)*

**Estado en el código:** ✅ Existe

**Responsabilidad:** Gestionar el proceso de invitación de nuevos usuarios al Business.

**Identidad:** `invitationId` (ObjectId)

### Nota de modelado
Esta entidad está correctamente implementada para su propósito. Los campos `companyId` / `companyKey` deben migrarse a `businessId` / `businessKey` según ADR-001.

---

## ENT-15 — CommunicationConnection *(Communication context)*

**Estado en el código:** ✅ Existe — schema `IntegrationConnection`

**Responsabilidad:** Almacenar de forma segura el token de integración con Communications Platform.

**Identidad:** `connectionId` (ObjectId)

### Nota de modelado
Bien diseñado en su estructura. El campo `companyId` debe migrarse a `businessId`. El nombre `IntegrationConnection` en el código es el nombre técnico interno; en el dominio se llama `CommunicationConnection`. El schema soporta múltiples providers — en el futuro `CalendarIntegration` podría usar el mismo schema o uno separado.

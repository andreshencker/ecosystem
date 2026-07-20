# Invoice App — Domain Model

**Versión:** 1.0
**Fecha:** 2026-07-05
**Estado:** Diseño — sin implementar
**Autor:** Architecture Review Session

---

## 1. Visión general del dominio

Invoice App no es una app de facturas. Es un **sistema operativo de trabajo** para freelancers, contractors y gig workers.

El problema central que resuelve no es "generar un PDF con un número" — es responder:

> *¿Cuánto trabajé, para quién, a qué tarifa, y ya me pagaron?*

El flujo completo es:

```
registro del turno → validación → agrupación → factura → cobro → conciliación
```

Una app de facturas empieza en "generar factura". Invoice App empieza en "anoté que trabajé hoy". La factura es la consecuencia, no el origen.

### Por qué esto importa para el diseño

1. **WorkEvent es el dato primario**, no Invoice. La factura se deriva de los eventos.
2. **El calendario es la fuente de datos más natural** — la mayoría de los shifts ya están ahí.
3. **InvoiceItem es obligatorio** desde el primer día — una factura vacía no existe; siempre tiene al menos un item que apunta a un WorkEvent o es manual.
4. **Business y Customer son entidades separadas** — la empresa del usuario no es lo mismo que la empresa para quien trabaja.

---

## 2. Separación conceptual: Business vs Customer

Esta es la decisión de diseño más importante del dominio. Violarla contamina todas las relaciones.

### Business

> *La cuenta de la persona dentro de Invoice App.*

Business representa la identidad comercial del usuario: su negocio, su marca, su número de impuesto, su cuenta bancaria, sus configuraciones.

**Características:**
- Hay exactamente una Business por cuenta de usuario propietario.
- Es quien emite facturas.
- Tiene su propio perfil fiscal (ABN, GST, cuenta bancaria).
- Tiene integraciones (Communications, Calendar).
- Tiene usuarios internos (empleados, contadores, visualizadores).
- Tiene configuración de portal (moneda, idioma, timezone).

**Ejemplos concretos:**
- "Mi negocio como carpenter contractor"
- "JS Freelance Services Pty Ltd"
- "María García — Makeup Artist"

---

### Customer

> *La empresa o persona para quien se trabaja o a quien se factura.*

Customer es la contraparte comercial. Es quien recibe las facturas y quien firmó el contrato.

**Características:**
- Pertenece a una Business (es su cliente).
- No tiene acceso a la aplicación.
- Puede ser una empresa corporativa, una pyme, o una persona natural.
- Tiene sus propios datos de contacto y condiciones de pago.
- Recibe emails de factura.
- No tiene usuarios propios.

**Ejemplos concretos:**
- J Production (empresa de producción audiovisual)
- Merivale (cadena de hospitality)
- Cine Metro (empresa de entretenimiento)
- Juan Pérez (cliente particular)

---

### Regla de negocio fundamental

```
Business  →  factura a  →  Customer
```

No: Company factura a Company.
No: User factura a Company.
No: Business tiene Customers que son Businesses de otros usuarios.

Si en el código aparece `company.invoiceToCompanyId`, algo está mal.

---

### Por qué NO usar `Company` para representar ambos

El schema actual `Company` representa a la Business del usuario. Si también lo usamos para representar Customers, se producen estos problemas:

| Problema | Descripción |
|---|---|
| **Semántica rota** | Una consulta `findAll({ companyId })` devolvería tanto la empresa del usuario como sus clientes si ambos son "companies" |
| **Contaminación de datos** | Los campos de Business (ABN, isPlatformCompany, ownerUserId) no tienen sentido en un Customer |
| **Multi-tenant corrupto** | `businessId` y `customerId` colisionan en el mismo campo `companyId` |
| **Relaciones ambiguas** | `Invoice.companyId` — ¿es el emisor o el destinatario? |
| **Imposible escalar** | Si un usuario puede ser Business de uno y Customer de otro, no hay forma de distinguirlos |

---

## 3. Flujo Shift Work (v1)

El flujo principal de la primera versión. Pensado para contractors, gig workers y freelancers que trabajan por turno.

```
Business
    │
    └── Customer (para quien trabajo)
            │
            └── Contract (las condiciones)
                    │
                    └── Rate (la tarifa pactada)
                            │
                            └── WorkEvent (el turno trabajado)
                                    │
                                    └── InvoiceItem (línea de factura)
                                            │
                                            └── Invoice (el documento)
                                                    │
                                                    └── Payment (el cobro)
```

**En palabras:** Trabajo para J Production (Customer) bajo un contrato de 3 meses (Contract) a $45/hora (Rate). El jueves trabajé de 8am a 6pm (WorkEvent). Ese turno se convierte en una línea de factura (InvoiceItem). La factura mensual (Invoice) agrupa varios turnos. J Production paga (Payment).

---

## 4. Flujo Service Sale (futuro, documentado no implementado)

Pensado para freelancers que venden proyectos, paquetes o servicios únicos.

```
Business
    │
    └── Customer
            │
            └── Project / Service (futuro — no implementar en v1)
                    │
                    └── Invoice
                            │
                            └── InvoiceItem (item manual o por entregable)
                                    │
                                    └── Payment
```

**Diferencia clave con Shift Work:** No hay WorkEvent. Los InvoiceItems son manuales o se derivan de entregables de proyecto. No hay Rate por hora.

**Extensión mínima requerida para soportarlo:**
- InvoiceItem debe soportar `workEventId: null` y descripción manual desde el inicio.
- Invoice no debe depender de WorkEvents para existir.
- Agregar entidad `Project` / `ServicePackage` en una fase posterior.

No implementar en v1. Diseñar v1 de forma que v2 sea aditivo, no disruptivo.

---

## 5. Entidades principales

---

### `Business`

**Definición:** La cuenta comercial del usuario dentro de Invoice App. Representa su negocio, no a sus clientes.

**Responsabilidad:** Ser el punto de anclaje de todo. Cada entidad de negocio pertenece a una Business.

**Flujos:** Shift Work · Service Sale

**Estado actual:** ⚠️ Existe parcialmente como `Company`. Necesita limpieza semántica.

#### Campos principales

| Campo | Tipo | Notas |
|---|---|---|
| `_id` | ObjectId | |
| `businessKey` | String | Slug único (ej. `js-freelance`). Actualmente `companyKey` |
| `businessName` | String | Nombre comercial. Actualmente `companyName` |
| `ownerUserId` | ObjectId → User | Usuario propietario |
| `defaultCurrency` | String | `'AUD'` por defecto |
| `timezone` | String | Crítico para WorkEvents. Falta actualmente |
| `phone` | String\|null | Falta actualmente |
| `logoUrl` | String\|null | Falta actualmente |
| `address` | Object | `{street, city, state, postcode, country}`. Falta |
| `isActive` | Boolean | |
| `isPlatformCompany` | Boolean | Solo para la empresa base de Invoice App |
| `createdAt` / `updatedAt` | timestamps | |

#### Relaciones

```
Business  ←→  Users              (muchos usuarios por business)
Business   →  FiscalProfile      (1:1, datos tributarios)
Business   →  Customers[]        (1:N, sus clientes)
Business   →  CalendarIntegration[] (1:N, sus calendarios)
Business   →  IntegrationConnection[] (1:N, conexiones externas)
```

#### Reglas de negocio
- Un Business tiene exactamente un FiscalProfile.
- Un Business puede tener múltiples usuarios con distintos roles.
- `businessId` (o `companyId` técnico) debe estar presente en todas las entidades del dominio.
- Todas las queries deben estar filtradas por `businessId`.

#### Decisión pendiente
¿Renombramos el campo técnico de `companyId` a `businessId` en todas las entidades? Ver sección 9.

---

### `User`

**Definición:** Persona que tiene acceso a Invoice App. Puede ser el dueño del Business o un colaborador invitado.

**Responsabilidad:** Representar a quién usa la aplicación. No representa clientes externos.

**Flujos:** Shift Work · Service Sale

**Estado actual:** ✅ Existe. Campos de autenticación completos. Falta campo de perfil personal extendido.

#### Campos principales

| Campo | Tipo | Notas |
|---|---|---|
| `_id` | ObjectId | |
| `email` | String | Único, index |
| `passwordHash` | String | Nunca retornado |
| `firstName` | String | |
| `lastName` | String | |
| `avatarUrl` | String\|null | |
| `role` | UserRole | `platform_admin\|business_owner\|business_admin\|accountant\|staff\|viewer` |
| `scope` | UserScope | `global\|company` |
| `companyId` | String → ObjectId | Referencia a Business. Debe migrarse a ObjectId |
| `companyKey` | String | Denormalizado |
| `isActive` | Boolean | |
| `isEmailVerified` | Boolean | |

#### Relaciones

```
User  →  Business     (pertenece a un Business vía companyId)
User  →  WorkEvent[]  (puede ser el trabajador que registra turnos)
```

#### Reglas de negocio
- Un User pertenece a exactamente un Business (en v1).
- El `business_owner` es creado junto con el Business en el registro.
- El campo `companyId` debe migrarse de String a ObjectId.
- Un User no representa a un Customer.

#### Decisión pendiente
¿Un usuario puede pertenecer a múltiples Businesses en el futuro? Ver sección 9.

---

### `FiscalProfile`

**Definición:** Perfil fiscal y de pagos del Business. Contiene los datos tributarios y bancarios que aparecen en las facturas.

**Responsabilidad:** Centralizar todos los datos legales y financieros del Business en un solo lugar, separados de la identidad comercial.

**Flujos:** Shift Work · Service Sale

**Estado actual:** ❌ No existe. Sus datos están embedidos en `Company` (`abn`, `depositAccount`).

#### Campos principales

| Campo | Tipo | Notas |
|---|---|---|
| `_id` | ObjectId | |
| `businessId` | ObjectId → Business | 1:1 |
| `abn` | String\|null | Australian Business Number (11 dígitos) |
| `acn` | String\|null | Australian Company Number (opcional) |
| `gstRegistered` | Boolean | Si el business cobra GST |
| `gstRate` | Number | Default 10 para Australia |
| `bankAccount.bsb` | String\|null | BSB del banco |
| `bankAccount.accountNumber` | String\|null | |
| `bankAccount.accountName` | String\|null | |
| `billingAddress` | Object | Dirección legal para facturas |
| `paymentTermsDays` | Number | Días de vencimiento por defecto (ej. 14, 30) |
| `invoicePrefix` | String | Prefijo para número de factura (ej. `INV`, `JS`) |
| `invoiceNextNumber` | Number | Contador secuencial por business |
| `createdAt` / `updatedAt` | timestamps | |

#### Relaciones

```
FiscalProfile  →  Business  (1:1, belongsTo)
```

#### Reglas de negocio
- Solo existe uno por Business.
- Los datos de FiscalProfile aparecen en el encabezado de la factura como "emisor".
- `abn` y `depositAccount` deben migrarse desde el schema `Company` actual.
- `invoiceNextNumber` es la base para generar el número de factura secuencial.

---

### `Customer`

**Definición:** La empresa o persona para quien el Business trabaja o a quien factura. La contraparte comercial.

**Responsabilidad:** Representar al destinatario de las facturas y la otra parte en los contratos.

**Flujos:** Shift Work · Service Sale

**Estado actual:** ❌ No existe. Los clientes no tienen entidad propia. No hay forma de representar "J Production" sin confundirlo con un Business.

#### Campos principales

| Campo | Tipo | Notas |
|---|---|---|
| `_id` | ObjectId | |
| `businessId` | ObjectId → Business | A qué business pertenece este cliente |
| `name` | String | Nombre del cliente (empresa o persona) |
| `type` | String | `'company'\|'individual'` |
| `abn` | String\|null | ABN del cliente (si es empresa australiana) |
| `contactName` | String\|null | Persona de contacto |
| `contactEmail` | String\|null | Email para envío de facturas |
| `contactPhone` | String\|null | |
| `billingAddress` | Object | Dirección de facturación |
| `defaultPaymentTermsDays` | Number\|null | Condiciones específicas de este cliente |
| `notes` | String\|null | Notas internas |
| `isActive` | Boolean | default true |
| `createdAt` / `updatedAt` | timestamps | |

#### Relaciones

```
Customer  →  Business     (pertenece a un Business)
Customer  →  Contract[]   (puede tener múltiples contratos)
Customer  →  Invoice[]    (recibe facturas)
```

#### Reglas de negocio
- Un Customer pertenece a un solo Business.
- Un Customer puede tener múltiples Contracts activos o históricos.
- `contactEmail` es el destino del envío de facturas por Communications.
- Un Customer no tiene acceso a la aplicación.
- Los datos del Customer aparecen en la factura como "destinatario".

---

### `Contract`

**Definición:** El acuerdo de trabajo entre un Business y un Customer. Define las condiciones bajo las cuales se realizan los WorkEvents.

**Responsabilidad:** Ser el marco legal y comercial del trabajo. Agrupar las tarifas aplicables.

**Flujos:** Shift Work

**Estado actual:** ❌ No existe.

#### Campos principales

| Campo | Tipo | Notas |
|---|---|---|
| `_id` | ObjectId | |
| `businessId` | ObjectId → Business | |
| `customerId` | ObjectId → Customer | |
| `title` | String | Nombre del contrato |
| `contractNumber` | String\|null | Número de referencia |
| `description` | String\|null | |
| `startDate` | Date | |
| `endDate` | Date\|null | null = indefinido |
| `status` | String | `'draft'\|'active'\|'completed'\|'cancelled'` |
| `billingCycle` | String | `'weekly'\|'fortnightly'\|'monthly'\|'on-demand'` |
| `defaultRateId` | ObjectId → Rate\|null | Tarifa por defecto cuando no se especifica |
| `paymentTermsDays` | Number | Días de vencimiento para facturas de este contrato |
| `notes` | String\|null | |
| `createdAt` / `updatedAt` | timestamps | |

#### Relaciones

```
Contract  →  Business    (pertenece a)
Contract  →  Customer    (con quién)
Contract  →  Rate[]      (sus tarifas)
Contract  →  WorkEvent[] (eventos generados bajo este contrato)
Contract  →  Invoice[]   (facturas emitidas bajo este contrato)
```

#### Reglas de negocio
- Un Contract requiere un Business y un Customer.
- Un Contract puede tener múltiples Rates (ej. standard, weekend, overtime).
- Solo Contracts con `status: 'active'` pueden generar nuevos WorkEvents.
- El cierre de un contrato no borra los WorkEvents ni las Invoices asociadas.

---

### `Rate`

**Definición:** La tarifa aplicada a un trabajo dentro de un contrato. Define el precio por unidad de tiempo o trabajo.

**Responsabilidad:** Determinar el valor monetario de cada WorkEvent.

**Flujos:** Shift Work

**Estado actual:** ❌ No existe.

#### Campos principales

| Campo | Tipo | Notas |
|---|---|---|
| `_id` | ObjectId | |
| `businessId` | ObjectId → Business | |
| `contractId` | ObjectId → Contract | |
| `name` | String | `'Standard'`, `'Weekend'`, `'Overtime'`, `'Night Shift'`, `'Public Holiday'` |
| `type` | String | `'hourly'\|'daily'\|'fixed'\|'weekly'` |
| `amount` | Decimal128 | Monto por unidad |
| `currency` | String | Moneda (ej. `'AUD'`) |
| `isDefault` | Boolean | La tarifa por defecto de este contrato |
| `isActive` | Boolean | |
| `description` | String\|null | |
| `createdAt` / `updatedAt` | timestamps | |

#### Relaciones

```
Rate  →  Business   (pertenece a)
Rate  →  Contract   (pertenece a)
Rate  →  WorkEvent  (aplicada en)
```

#### Reglas de negocio
- Un Contract puede tener múltiples Rates, pero solo una `isDefault: true`.
- Un WorkEvent puede referenciar cualquier Rate de su Contract, o sobreescribir el monto puntualmente.
- Rate no se elimina físicamente si tiene WorkEvents asociados — solo `isActive: false`.
- Tipos de rate que deben contemplarse desde el diseño: standard, overtime, weekend, public holiday, night shift, travel allowance.

---

### `CalendarIntegration`

**Definición:** La conexión entre un Business (o un User dentro de él) y un proveedor de calendario externo.

**Responsabilidad:** Permitir la importación de turnos desde calendarios externos para convertirlos en WorkEvents.

**Flujos:** Shift Work

**Estado actual:** ❌ No existe. `IntegrationConnection` cubre Communications, pero no Calendar.

#### Campos principales

| Campo | Tipo | Notas |
|---|---|---|
| `_id` | ObjectId | |
| `businessId` | ObjectId → Business | |
| `userId` | ObjectId → User | A qué usuario de la business pertenece esta conexión |
| `provider` | String | `'google'\|'apple'\|'outlook'\|'ical'` |
| `encryptedToken` | Object | AES-256-GCM — OAuth2 access + refresh token |
| `calendarId` | String\|null | ID del calendario específico |
| `calendarName` | String\|null | Nombre del calendario (display) |
| `syncDirection` | String | `'import'\|'export'\|'bidirectional'` |
| `lastSyncedAt` | Date\|null | |
| `syncStatus` | String | `'idle'\|'syncing'\|'error'` |
| `lastSyncError` | String\|null | |
| `isActive` | Boolean | |
| `createdAt` / `updatedAt` | timestamps | |

#### Relaciones

```
CalendarIntegration  →  Business
CalendarIntegration  →  User
CalendarIntegration  →  WorkEvent[]  (eventos importados)
```

#### Reglas de negocio
- Una misma credencial de Google puede tener acceso a múltiples calendarios — `calendarId` identifica cuál usar.
- Los eventos importados del calendario se convierten en `WorkEvent` con estado `'draft'` para revisión del usuario.
- Si el usuario edita un WorkEvent importado, no se sobreescribe en el próximo sync.
- `encryptedToken` sigue el patrón de `IntegrationConnection` (AES-256-GCM).

---

### `WorkEvent`

**Definición:** Un turno trabajado, una sesión o un día de trabajo realizado por un usuario del Business para un Customer.

**Responsabilidad:** Ser el dato primario del sistema. La fuente de verdad de cuánto tiempo se trabajó, cuándo y para quién.

**Flujos:** Shift Work

**Estado actual:** ❌ No existe. Es la entidad más importante del v1.

#### Campos principales

| Campo | Tipo | Notas |
|---|---|---|
| `_id` | ObjectId | |
| `businessId` | ObjectId → Business | |
| `userId` | ObjectId → User | Quién trabajó |
| `customerId` | ObjectId → Customer | Para quién |
| `contractId` | ObjectId → Contract\|null | Bajo qué contrato |
| `rateId` | ObjectId → Rate\|null | A qué tarifa |
| `date` | Date | Día del turno (sin hora) |
| `startTime` | String | `HH:mm` en timezone del Business |
| `endTime` | String | `HH:mm` |
| `breakMinutes` | Number | Minutos de descanso (se descuentan del cálculo) |
| `durationMinutes` | Number | Duración real: `(end - start) - breakMinutes` |
| `type` | String | `'shift'\|'overtime'\|'travel'\|'public_holiday'\|'manual'` |
| `status` | String | `'draft'\|'confirmed'\|'invoiced'\|'void'` |
| `billable` | Boolean | Si se incluye en factura |
| `rateOverrideAmount` | Decimal128\|null | Si se sobreescribe la tarifa puntualmente |
| `calculatedAmount` | Decimal128 | `durationHours * rate.amount` (o `rateOverrideAmount`) |
| `description` | String\|null | Nota del turno |
| `calendarEventId` | String\|null | ID externo si vino de calendario |
| `calendarIntegrationId` | ObjectId\|null | Qué integración lo importó |
| `invoiceItemId` | ObjectId\|null | Set cuando fue facturado |
| `createdAt` / `updatedAt` | timestamps | |

#### Relaciones

```
WorkEvent  →  Business
WorkEvent  →  User
WorkEvent  →  Customer
WorkEvent  →  Contract
WorkEvent  →  Rate
WorkEvent  →  InvoiceItem  (cuando se factura)
WorkEvent  →  CalendarIntegration  (si fue importado)
```

#### Reglas de negocio
- `status: 'draft'` → el usuario puede editar; no se incluye en facturas aún.
- `status: 'confirmed'` → listo para facturar; el usuario lo aprobó.
- `status: 'invoiced'` → ya tiene un InvoiceItem asociado; no se puede volver a facturar.
- `status: 'void'` → cancelado; no genera factura.
- `billable: false` → nunca se incluye en factura aunque esté `confirmed`.
- `durationMinutes` se calcula al guardar: `(endTime - startTime) - breakMinutes`.
- Un WorkEvent con `calendarEventId` no se sobreescribe en syncs posteriores si fue editado.
- Un WorkEvent solo puede pertenecer a un InvoiceItem.

---

### `Invoice`

**Definición:** El documento financiero formal emitido por un Business hacia un Customer. Resume el trabajo facturado.

**Responsabilidad:** Ser el contrato de pago. Agrupar InvoiceItems, calcular totales y llevar el estado del cobro.

**Flujos:** Shift Work · Service Sale

**Estado actual:** ❌ No existe.

#### Campos principales

| Campo | Tipo | Notas |
|---|---|---|
| `_id` | ObjectId | |
| `businessId` | ObjectId → Business | |
| `customerId` | ObjectId → Customer | A quién se factura |
| `contractId` | ObjectId → Contract\|null | Bajo qué contrato (nullable para facturas ad-hoc) |
| `invoiceNumber` | String | Generado: `{prefix}-{year}-{seq}`. Ej: `INV-2026-0042` |
| `issueDate` | Date | Fecha de emisión |
| `dueDate` | Date | Fecha de vencimiento |
| `status` | String | `'draft'\|'sent'\|'viewed'\|'paid'\|'partial'\|'overdue'\|'cancelled'\|'void'` |
| `subtotal` | Decimal128 | Suma de InvoiceItems antes de impuestos |
| `taxAmount` | Decimal128 | GST u otro impuesto |
| `total` | Decimal128 | `subtotal + taxAmount` |
| `amountPaid` | Decimal128 | Suma de Payments recibidos |
| `amountDue` | Decimal128 | `total - amountPaid` |
| `currency` | String | |
| `notes` | String\|null | Nota para el cliente |
| `internalNotes` | String\|null | Nota interna, no aparece en PDF |
| `sentAt` | Date\|null | Cuándo se envió al cliente |
| `paidAt` | Date\|null | Cuándo quedó completamente pagado |
| `createdAt` / `updatedAt` | timestamps | |

#### Relaciones

```
Invoice  →  Business
Invoice  →  Customer
Invoice  →  Contract  (opcional)
Invoice  →  InvoiceItem[]  (sus líneas)
Invoice  →  Payment[]       (sus pagos)
```

#### Reglas de negocio
- `invoiceNumber` es único por Business. Se genera desde `FiscalProfile.invoiceNextNumber`.
- Un Draft puede editarse libremente (agregar/quitar InvoiceItems).
- Una vez `sent`, los InvoiceItems no se pueden modificar sin crear una nota de crédito o void.
- `amountDue = total - amountPaid` se recalcula en cada Payment.
- `status: 'partial'` → recibió pagos pero no cubre el total.
- `status: 'paid'` → `amountDue === 0`.
- `status: 'overdue'` → `dueDate < hoy` y `status !== 'paid'` (puede ser un campo calculado o actualizado por job).
- Una Invoice puede existir sin WorkEvents (para el flujo Service Sale futuro).

---

### `InvoiceItem`

**Definición:** Una línea dentro de una factura. Puede corresponder a un WorkEvent o ser un ítem manual.

**Responsabilidad:** Representar cada concepto facturado. Permite que una factura tenga múltiples orígenes (turnos, ítems manuales, expenses).

**Flujos:** Shift Work · Service Sale

**Estado actual:** ❌ No existe. Es crítica para soportar múltiples WorkEvents por factura.

#### Campos principales

| Campo | Tipo | Notas |
|---|---|---|
| `_id` | ObjectId | |
| `invoiceId` | ObjectId → Invoice | |
| `businessId` | ObjectId → Business | Para queries multi-tenant |
| `workEventId` | ObjectId → WorkEvent\|null | null = ítem manual |
| `description` | String | Descripción de la línea |
| `date` | Date\|null | Fecha del servicio (para shift items) |
| `quantity` | Decimal128 | Horas, días, unidades |
| `unitPrice` | Decimal128 | Precio por unidad |
| `amount` | Decimal128 | `quantity * unitPrice` |
| `taxable` | Boolean | Si aplica GST a esta línea |
| `sortOrder` | Number | Orden de aparición en la factura |
| `createdAt` / `updatedAt` | timestamps | |

#### Relaciones

```
InvoiceItem  →  Invoice
InvoiceItem  →  Business
InvoiceItem  →  WorkEvent  (opcional)
```

#### Reglas de negocio
- `workEventId: null` es válido — permite ítems manuales (ej. expense reimbursement, fixed fee).
- Si `workEventId` está seteado, el WorkEvent pasa a `status: 'invoiced'`.
- Eliminar un InvoiceItem (en un draft) revierte el WorkEvent a `status: 'confirmed'`.
- `amount` no se calcula automáticamente siempre — el usuario puede overridear el precio.
- El orden de `sortOrder` define cómo aparecen en el PDF.

---

### `Payment`

**Definición:** Un pago recibido del Customer contra una Invoice.

**Responsabilidad:** Registrar cada cobro para calcular el saldo pendiente. Preparado para conciliación bancaria futura.

**Flujos:** Shift Work · Service Sale

**Estado actual:** ❌ No existe.

#### Campos principales

| Campo | Tipo | Notas |
|---|---|---|
| `_id` | ObjectId | |
| `businessId` | ObjectId → Business | |
| `invoiceId` | ObjectId → Invoice | |
| `amount` | Decimal128 | Monto del pago |
| `currency` | String | |
| `date` | Date | Fecha de recepción |
| `method` | String | `'bank_transfer'\|'credit_card'\|'cash'\|'cheque'\|'stripe'\|'other'` |
| `reference` | String\|null | Nro. de transferencia, código de transacción |
| `status` | String | `'pending'\|'cleared'\|'reversed'` |
| `notes` | String\|null | |
| `bankTransactionId` | String\|null | ID de transacción bancaria (para conciliación futura) |
| `createdAt` / `updatedAt` | timestamps | |

#### Relaciones

```
Payment  →  Business
Payment  →  Invoice
```

#### Reglas de negocio
- Un Payment siempre debe referenciar una Invoice.
- Un Payment parcial es válido — la Invoice pasa a `status: 'partial'`.
- Al registrar un Payment, se recalcula `Invoice.amountPaid` y `Invoice.amountDue`.
- Si `Invoice.amountDue === 0` tras el Payment, `Invoice.status` pasa a `'paid'` automáticamente.
- `status: 'reversed'` → el pago se anuló (ej. chequera rechazada), `Invoice.amountPaid` decrece.
- `bankTransactionId` es null en v1 — se popula en una fase futura de conciliación bancaria.

#### Decisión pendiente
¿Un Payment puede cubrir múltiples Invoices del mismo Customer? Ver sección 9.

---

### `CommunicationLog`

**Definición:** Registro local en Business App de cada comunicación solicitada a Communications Platform.

**Responsabilidad:** Dar trazabilidad en el lado de Business App de qué comunicaciones se enviaron, cuándo y con qué resultado, sin depender de Communications para auditoría.

**Flujos:** Shift Work · Service Sale

**Estado actual:** ❌ No existe. Communications tiene su propio `ExecutionLog`, pero Business App no tiene visibilidad local.

#### Campos principales

| Campo | Tipo | Notas |
|---|---|---|
| `_id` | ObjectId | |
| `businessId` | ObjectId → Business | |
| `resourceType` | String | `'invoice'\|'payment'\|'work_event'\|'user'\|'contract'` |
| `resourceId` | ObjectId | ID del recurso que disparó el envío |
| `eventKey` | String | Ej. `invoices.invoice_sent`, `payments.payment_reminder` |
| `channel` | String | `'email'\|'sms'\|'push'` |
| `recipientEmail` | String | |
| `requestedAt` | Date | Cuándo Business App hizo la solicitud |
| `success` | Boolean | Resultado reportado por Communications |
| `httpStatus` | Number\|null | Status HTTP de la respuesta |
| `communicationsLogId` | String\|null | `ExecutionLog._id` de Communications, si se devuelve |
| `errorMessage` | String\|null | Mensaje de error si `success: false` |
| `createdAt` | timestamp | Solo createdAt — es un log inmutable |

#### Relaciones

```
CommunicationLog  →  Business
CommunicationLog  →  (Invoice | Payment | WorkEvent | User)  vía resourceId
```

#### Reglas de negocio
- Solo se escribe, nunca se actualiza (inmutable).
- Si Communications falla, igual se escribe el log con `success: false`.
- No reemplaza el `ExecutionLog` de Communications — es el view desde Business App.
- `communicationsLogId` permite hacer cross-reference para debugging.

---

## 6. Reglas no negociables

```
✓  Business factura a Customer.
   La relación Invoice → Customer es el contrato de pago, no Invoice → Company.

✓  Customer no es un Business.
   Un Customer no tiene usuarios, no tiene FiscalProfile, no tiene integraciones.
   Guardar un Customer en la colección companies es incorrecto.

✓  Todas las entidades de negocio tienen businessId.
   No existe una entidad de dominio sin businessId.
   Todas las queries de negocio incluyen businessId en el filtro.

✓  WorkEvent es el dato primario del flujo Shift Work.
   La factura se genera desde los WorkEvents, no al revés.

✓  InvoiceItem es obligatorio.
   No existe Invoice sin al menos un InvoiceItem.
   Esto permite múltiples WorkEvents en una misma factura.

✓  InvoiceItem puede existir sin WorkEvent.
   Los ítems manuales son válidos desde el inicio.
   Esto es lo que permite soportar Service Sale en el futuro sin rediseñar.

✓  Payment siempre referencia una Invoice.
   No existe Payment huérfano.

✓  WorkEvent facturado no se puede volver a facturar.
   status: 'invoiced' bloquea el WorkEvent.

✓  El número de factura es secuencial e irrepetible por Business.
   Se genera desde FiscalProfile.invoiceNextNumber con atomicidad.

✓  Communications envía; Invoice App decide qué evento solicitar.
   Business App construye el payload y llama a Communications.
   Communications no sabe qué es una Invoice o un WorkEvent.

✓  Datos fiscales del Business no se mezclan con datos del Customer.
   El ABN en FiscalProfile es del emisor.
   El ABN en Customer es del destinatario.
```

---

## 7. Diagrama del dominio

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              BUSINESS                                   │
│                                                                         │
│  ┌──────────┐  ┌───────────────┐  ┌──────────────────┐                 │
│  │  Users   │  │ FiscalProfile │  │  IntegrationConn │                 │
│  │          │  │               │  │  (Communications) │                 │
│  │ business │  │ abn           │  └──────────────────┘                 │
│  │ _owner   │  │ bank account  │  ┌──────────────────┐                 │
│  │ business │  │ payment terms │  │ CalendarIntegr.  │                 │
│  │ _admin   │  │ invoice prefix│  │ (Google/iCal/...) │                │
│  │ accountant│  └───────────────┘  └──────────────────┘                │
│  │ staff    │                                                           │
│  │ viewer   │                                                           │
│  └──────────┘                                                           │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  CUSTOMERS                                                        │  │
│  │                                                                   │  │
│  │  ┌──────────────────────────────────────────────────────────┐    │  │
│  │  │  CONTRACTS                                               │    │  │
│  │  │                                                          │    │  │
│  │  │  ┌──────────────────────────────────────────────────┐   │    │  │
│  │  │  │  RATES                                           │   │    │  │
│  │  │  │  (Standard · Weekend · Overtime · Night Shift)   │   │    │  │
│  │  │  │                                                  │   │    │  │
│  │  │  │  ┌────────────────────────────────────────────┐  │   │    │  │
│  │  │  │  │  WORK EVENTS                               │  │   │    │  │
│  │  │  │  │  (draft → confirmed → invoiced)            │  │   │    │  │
│  │  │  │  │                                            │  │   │    │  │
│  │  │  │  │  ┌──────────────────────────────────────┐  │  │   │    │  │
│  │  │  │  │  │  INVOICE ITEMS                       │  │  │   │    │  │
│  │  │  │  │  │  (WorkEvent ref · o manual)          │  │  │   │    │  │
│  │  │  │  │  │                                      │  │  │   │    │  │
│  │  │  │  │  │  ┌────────────────────────────────┐  │  │  │   │    │  │
│  │  │  │  │  │  │  INVOICE                       │  │  │  │   │    │  │
│  │  │  │  │  │  │  (draft → sent → paid)         │  │  │  │   │    │  │
│  │  │  │  │  │  │                                │  │  │  │   │    │  │
│  │  │  │  │  │  │  ┌──────────────────────────┐  │  │  │  │   │    │  │
│  │  │  │  │  │  │  │  PAYMENTS                │  │  │  │  │   │    │  │
│  │  │  │  │  │  │  │  (partial → cleared)     │  │  │  │  │   │    │  │
│  │  │  │  │  │  │  └──────────────────────────┘  │  │  │  │   │    │  │
│  │  │  │  │  │  └────────────────────────────────┘  │  │  │   │    │  │
│  │  │  │  │  └──────────────────────────────────────┘  │  │   │    │  │
│  │  │  │  └────────────────────────────────────────────┘  │   │    │  │
│  │  │  └──────────────────────────────────────────────────┘   │    │  │
│  │  └──────────────────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘

                         ↕ comunica con
                  ┌──────────────────────┐
                  │  COMMUNICATION LOG   │
                  │  (local en BA)       │
                  └──────────┬───────────┘
                             │
                  ┌──────────▼───────────┐
                  │  COMMUNICATIONS      │
                  │  PLATFORM            │
                  │  (ExecutionLog,      │
                  │   Email/SMS/Push)    │
                  └──────────────────────┘
```

---

## 8. Roadmap de modelado

### Fase 1 — Limpieza semántica y base fiscal *(sin nuevas entidades de negocio)*

**Objetivo:** El modelo base queda semánticamente correcto antes de agregar dominio.

```
├── Migrar User.companyId de String → ObjectId
├── Migrar Company.ownerUserId de String → ObjectId
├── Crear schema FiscalProfile
├── Migrar abn y depositAccount de Company → FiscalProfile
├── Agregar campos faltantes a Company/Business:
│     timezone, address, phone, logoUrl
├── Resolver organizationId → companyId en AuthContext de Business App
│     (ya hecho en Communications, pendiente en Business App)
└── Verificar que documentos MongoDB tienen roles nuevos (business_owner, etc.)
```

**Decisión de nomenclatura que debe tomarse en esta fase:**
¿El campo técnico sigue siendo `companyId` o pasa a ser `businessId` en las nuevas entidades? (ver sección 9).

---

### Fase 2 — Customer y contratación

```
├── Crear schema Customer
├── Crear schema Contract
├── Crear schema Rate
├── Módulos: CustomersModule, ContractsModule, RatesModule
└── CRUD básico con validaciones de ownership por businessId
```

**Resultado:** El usuario puede registrar para quién trabaja y bajo qué condiciones.

---

### Fase 3 — Eventos de trabajo

```
├── Crear schema CalendarIntegration
│     (reutiliza patrón de IntegrationConnection)
├── Crear schema WorkEvent
├── Módulos: CalendarModule, WorkEventsModule
└── Lógica de cálculo de horas y monto por Rate
```

**Resultado:** El usuario puede registrar turnos manuales o importarlos del calendario.

---

### Fase 4 — Facturación

```
├── Crear schema Invoice
├── Crear schema InvoiceItem
├── Generador de número de factura (secuencial por business)
├── Flujo: seleccionar WorkEvents confirmados → generar Invoice
├── Módulos: InvoicesModule
└── Integrar Communications type='company' para invoices.invoice_sent
```

**Resultado:** El usuario puede generar y enviar facturas a sus clientes.

---

### Fase 5 — Cobros y comunicaciones de negocio

```
├── Crear schema Payment
├── Crear schema CommunicationLog
├── Lógica de recálculo de amountDue en Invoice tras cada Payment
├── Módulos: PaymentsModule
├── Events de Communications: payments.payment_received, payments.payment_reminder
└── Estadísticas básicas: facturas pendientes, saldo a cobrar
```

**Resultado:** El usuario puede registrar cobros y tiene visibilidad de qué se le debe.

---

### Fase 6 — Service Sale *(extensión futura, no planificar aún)*

```
└── Agregar schema Project / ServicePackage
    └── InvoiceItem.workEventId ya es nullable → sin cambios en InvoiceItem ni Invoice
```

**Resultado:** El modelo de Fase 4 ya soporta Service Sale sin rediseño. Solo agregar el origen del ítem.

---

## 9. Preguntas abiertas

Estas decisiones deben tomarse antes o durante la Fase correspondiente. No asumir ningún valor por defecto.

---

**P1 — ¿Renombramos `Company` a `Business` o mantenemos `companyId` como nombre técnico?**

*Fase que lo requiere:* Fase 1

Opciones:
- **A) Mantener `companyId` técnicamente, documentar que semánticamente es Business.** Sin migración de datos. Más seguro. Menos expresivo.
- **B) Renombrar la colección a `businesses` y el campo a `businessId` en todas las nuevas entidades.** Los schemas existentes (`users.companyId`) se migran en un paso. Más expresivo pero requiere migración.
- **C) Híbrido:** Mantener `companies`/`companyId` en entidades existentes, usar `businessId` en entidades nuevas. Riesgo de inconsistencia.

*Recomendación: Decidir en Fase 1 antes de crear cualquier entidad nueva.*

---

**P2 — ¿Customer puede ser persona natural y empresa?**

*Fase que lo requiere:* Fase 2

El campo `type: 'company' | 'individual'` está en el diseño. ¿Se requiere validación diferente por tipo (ABN opcional para individuals)?

---

**P3 — ¿Un User puede pertenecer a múltiples Businesses?**

*Fase que lo requiere:* Fase 1

En v1 diseñamos 1:1. Si en el futuro un contador gestiona múltiples clientes (cada uno es un Business), ¿cómo cambia el modelo? ¿User.companyId pasa a ser un array?

*Impacto:* Afecta JWT payload, AuthContext, y todas las queries con `companyId`.

---

**P4 — ¿Un WorkEvent puede tener múltiples Rates aplicadas?**

*Fase que lo requiere:* Fase 3

Por ejemplo: 8 horas de turno, las primeras 6 a tarifa standard y las últimas 2 a overtime. ¿Un WorkEvent tiene un solo `rateId` o puede splittearse en sub-segments?

*Opciones:* Un WorkEvent con `rateOverrideAmount` (simple), o múltiples WorkEvents para el mismo día (más flexible, más complejo).

---

**P5 — ¿Cómo se manejan breaks, overtime y public holidays en WorkEvent?**

*Fase que lo requiere:* Fase 3

- `breakMinutes` ya está en el diseño (se descuenta del cálculo).
- ¿El overtime es un WorkEvent separado o un flag en el mismo WorkEvent?
- ¿Los public holidays se detectan automáticamente por calendar o el usuario los marca?

---

**P6 — ¿Un Payment puede cubrir múltiples Invoices del mismo Customer?**

*Fase que lo requiere:* Fase 5

Por ejemplo: el cliente paga una transferencia que cubre 3 facturas juntas. ¿`Payment.invoiceId` pasa a ser `invoiceIds[]`?

*Impacto:* Afecta conciliación bancaria. Posiblemente un `Payment` genérico + una tabla `PaymentAllocation` que mapea pago a facturas.

---

**P7 — ¿Cuándo se genera una Invoice automáticamente vs manualmente?**

*Fase que lo requiere:* Fase 4

Opciones:
- Solo manual: el usuario selecciona WorkEvents y crea la factura.
- Auto por ciclo: al final de cada `billingCycle` del contrato, se genera un draft automáticamente.
- Mixto: auto-draft + el usuario aprueba antes de enviar.

---

**P8 — ¿CalendarIntegration es por User o por Business?**

*Fase que lo requiere:* Fase 3

El diseño actual propone `userId` en CalendarIntegration (cada empleado conecta su propio Google Calendar). ¿O hay un calendario centralizado de la Business?

---

**P9 — ¿`CompanySmtp` queda obsoleto con Communications Platform?**

*Fase que lo requiere:* Fase 1 / Fase 5

Actualmente `company_smtp` almacena credenciales SMTP directas en Business App. Con Communications Platform activo, Business App no debería enviar emails directamente. ¿Cuándo y cómo se depreca?

---

## 10. Resumen de decisiones

### Decisiones tomadas en este documento

| # | Decisión | Rationale |
|---|---|---|
| D1 | **Business y Customer son entidades separadas** | Usar Company para ambas rompe multi-tenancy, semántica y relaciones |
| D2 | **Business factura a Customer** | Regla fundamental del dominio; no hay excepción |
| D3 | **InvoiceItem es obligatorio y puede existir sin WorkEvent** | Permite múltiples orígenes y soporta Service Sale sin rediseño |
| D4 | **WorkEvent es el dato primario en Shift Work** | La factura se deriva de los eventos, no al revés |
| D5 | **Payment siempre referencia una Invoice** | No hay pagos huérfanos; la conciliación parte de facturas |
| D6 | **Rate es una entidad separada, no un campo en Contract** | Un contrato puede tener múltiples tarifas; necesita normalización |
| D7 | **FiscalProfile extrae datos fiscales de Company/Business** | Separación entre identidad comercial y datos tributarios |
| D8 | **CommunicationLog es un log inmutable en Business App** | Da trazabilidad local sin depender de Communications para auditoría |
| D9 | **Service Sale es extensión futura, no v1** | InvoiceItem nullable workEventId es suficiente para prepararlo sin implementarlo |
| D10 | **CalendarIntegration reutiliza el patrón de IntegrationConnection** | Mismo problema (OAuth + encrypted token + estado de sync) |

---

### Entidades nuevas requeridas

| Entidad | Colección sugerida | Fase |
|---|---|---|
| `FiscalProfile` | `fiscal_profiles` | 1 |
| `Customer` | `customers` | 2 |
| `Contract` | `contracts` | 2 |
| `Rate` | `rates` | 2 |
| `CalendarIntegration` | `calendar_integrations` | 3 |
| `WorkEvent` | `work_events` | 3 |
| `Invoice` | `invoices` | 4 |
| `InvoiceItem` | `invoice_items` | 4 |
| `Payment` | `payments` | 5 |
| `CommunicationLog` | `communication_logs` | 5 |

---

### Entidades existentes que cambian de semántica

| Entidad actual | Cambio | Impacto |
|---|---|---|
| `Company` | Pasa a representar exclusivamente **Business**. No es un cliente. | Ningún cambio en el schema inmediatamente; solo semántica. Decisión de renombre en P1. |
| `Company.abn` | Migrar a `FiscalProfile.abn` | Script de migración en Fase 1 |
| `Company.depositAccount` | Migrar a `FiscalProfile.bankAccount` | Script de migración en Fase 1 |
| `User.companyId` | Migrar de String a ObjectId | Requiere migration script + cambio en guard |
| `Company.ownerUserId` | Migrar de String a ObjectId | Ídem |

---

### Riesgo principal: seguir usando `Company` como Customer

Si en el futuro se guarda un Customer usando el schema de `Company`:

| Consecuencia | Descripción |
|---|---|
| **Queries contaminadas** | `db.companies.find({ businessId })` devuelve mezcla de Business y Customers |
| **isPlatformCompany inválido** | Un Customer nunca tiene `isPlatformCompany: true`; el campo no tiene sentido ahí |
| **ownerUserId inválido** | Los Customers no tienen un User propietario en Business App |
| **Multi-tenancy roto** | ¿A qué business pertenece un Customer si está en la misma colección que los Businesses? |
| **Identidad de factura ambigua** | `Invoice.companyId` — ¿es el emisor o el destinatario? |
| **Imposible escalar** | Si se quiere que una persona sea Business y Customer de otro usuario, no hay separación |

**Recomendación:** No mezclar. Crear `Customer` como entidad propia desde Fase 2.

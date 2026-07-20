# 10 — Domain Rules

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

Este documento es el **registro canónico de todas las reglas de negocio** de Invoice App. Cada regla tiene un identificador único, una descripción, quién la hace cumplir, y referencias a las entidades afectadas.

Una regla de negocio que no está aquí documentada puede implementarse de formas distintas por distintos desarrolladores, generando inconsistencias. Si una regla cambia, este documento se actualiza primero.

---

## Reglas de dominio fundamental

### R-001 — Business es el emisor de toda factura

**Descripción:** Toda Invoice es emitida por un Business. Un Customer nunca emite facturas dentro del sistema.

**Entidades:** Invoice, Business, Customer

**Enforced by:** `Invoice.businessId` (requerido, no nullable), `Invoice.customerId` (requerido, no nullable)

**Violación:** Invoice sin Business o con Customer en el rol de emisor.

---

### R-002 — Customer no es un Business

**Descripción:** Un Customer y un Business son entidades distintas en colecciones distintas. No puede crearse un Customer usando el schema de Business ni viceversa.

**Entidades:** Business, Customer

**Enforced by:** Colecciones separadas (`businesses` vs `customers`), ausencia de `isPlatformCompany` en Customer.

**Violación:** Usar `companyId` para referirse al Customer de una Invoice.

---

### R-003 — businessId en todas las entidades de negocio

**Descripción:** Toda entidad de negocio (Customer, Contract, Rate, WorkEvent, Invoice, InvoiceItem, Payment, CalendarIntegration, CommunicationLog) debe tener un `businessId` no nullable que identifica su Business propietario.

**Entidades:** Todas las entidades del dominio excepto User y RefreshToken.

**Enforced by:** Campo requerido en todos los schemas; índice en `businessId` en todas las colecciones.

**Violación:** Entidad sin `businessId`.

---

### R-004 — Toda query de negocio incluye businessId

**Descripción:** Ninguna consulta de base de datos para entidades de negocio puede omitir `businessId` en el filtro. Un `findAll()` sin `businessId` es una violación de multi-tenancy.

**Entidades:** Todas.

**Enforced by:** Revisión de código; convención arquitectónica.

**Violación:** `db.invoices.find({ status: 'sent' })` sin `businessId`.

---

## Reglas de User y Roles

### R-010 — Un Business tiene exactamente un business_owner activo

**Descripción:** No puede existir un Business sin un `business_owner` activo. Tampoco puede tener dos `business_owner`s activos simultáneamente.

**Entidades:** User, Business

**Enforced by:** `UsersController.deactivateUser()` verifica el count de owners antes de desactivar; `CountActiveOwners()` domain service.

**Violación:** Desactivar al único `business_owner` sin transferir el rol.

---

### R-011 — business_owner se crea solo por registro

**Descripción:** El rol `business_owner` no puede asignarse por invitación. Solo se crea mediante `POST /auth/register`. La invitación puede crear roles `business_admin`, `accountant`, `staff`, `viewer`.

**Entidades:** User, Invitation

**Enforced by:** `INVITE_HIERARCHY` en `UserInvitationsController` — filtra el rol `business_owner` de las invitaciones válidas.

**Violación:** Invitación con `role: 'business_owner'`.

---

### R-012 — platform_admin no modifica datos de negocio sin permiso explícito

**Descripción:** Un Platform Admin puede ver y gestionar la plataforma pero no puede operar dentro del Business de un usuario (crear contratos, emitir facturas) a menos que sea explícitamente delegado como usuario del Business.

**Entidades:** User

**Enforced by:** Guards de rol + scope en los controllers de negocio.

---

## Reglas de FiscalProfile

### R-020 — FiscalProfile tiene relación 1:1 con Business

**Descripción:** Cada Business tiene exactamente un FiscalProfile. No puede tener cero ni más de uno.

**Enforced by:** Índice `unique` en `fiscal_profiles.businessId`.

---

### R-021 — gstRate requiere gstRegistered

**Descripción:** Si `gstRegistered: false`, el campo `gstRate` no tiene efecto sobre los cálculos de Invoice. Si `gstRegistered: true`, `gstRate` debe ser mayor a cero.

**Entidades:** FiscalProfile, Invoice

**Enforced by:** `InvoiceCalculationService` — solo aplica GST si `gstRegistered: true`.

---

### R-022 — invoiceNextNumber solo crece

**Descripción:** El contador `invoiceNextNumber` en FiscalProfile se incrementa atómicamente y nunca se decrementa. Los números de Invoice generados no pueden reutilizarse aunque la Invoice sea `void`.

**Entidades:** FiscalProfile, Invoice

**Enforced by:** `InvoiceNumberGenerationService` usa `$inc` atómico. No hay operación de decremento.

---

## Reglas de Customer

### R-030 — Customer desactivado no acepta nuevos Contracts

**Descripción:** Si `Customer.isActive === false`, no puede crearse un nuevo Contract con ese Customer.

**Entidades:** Customer, Contract

**Enforced by:** `ContractsService.create()` verifica `customer.isActive` antes de crear.

---

### R-031 — Customer con Invoices o Contracts activos no puede eliminarse

**Descripción:** Un Customer con Invoices en estado `sent`, `partial`, `overdue`, o con Contracts en estado `active` no puede eliminarse del sistema. Solo puede desactivarse.

**Entidades:** Customer, Contract, Invoice

**Enforced by:** `CustomersService.delete()` verifica dependencies antes de permitir eliminación física.

---

## Reglas de Contract

### R-040 — Contract requiere Business y Customer

**Descripción:** No puede existir un Contract sin `businessId` y `customerId`.

**Enforced by:** Campos requeridos en el schema.

---

### R-041 — Contract active tiene al menos una Rate activa

**Descripción:** Si `Contract.status === 'active'`, debe existir al menos una `Rate` con `isActive: true` asociada.

**Enforced by:** `ContractsService.activate()` verifica la existencia de Rates activas antes de activar.

---

### R-042 — Solo una Rate isDefault por Contract

**Descripción:** Dentro de un Contract, como máximo una Rate puede tener `isDefault: true`.

**Enforced by:** `RatesService.setDefault()` — al marcar una Rate como default, desmarca las demás.

---

### R-043 — Contract completado o cancelado no acepta nuevos WorkEvents

**Descripción:** Los estados `completed` y `cancelled` son terminales para la creación de WorkEvents bajo ese Contract.

**Enforced by:** `WorkEventsService.create()` verifica `contract.status === 'active'`.

---

### R-044 — billingCycle es inmutable si hay WorkEvents

**Descripción:** Una vez que un Contract tiene WorkEvents asociados, el `billingCycle` no puede cambiarse para no invalidar los cálculos existentes.

**Enforced by:** `ContractsService.update()` verifica `workEventCount > 0` antes de permitir cambio de `billingCycle`.

---

## Reglas de WorkEvent

### R-050 — endTime posterior a startTime

**Descripción:** Un WorkEvent no puede tener `endTime` igual o anterior a `startTime` el mismo día. Para turnos nocturnos que cruzan medianoche, se requiere declaración explícita.

**Enforced by:** `WorkEventsService.create()` y `WorkEventCalculationService`.

---

### R-051 — breakMinutes no puede exceder la duración total

**Descripción:** `breakMinutes` no puede ser mayor o igual a la duración del turno (`endTime - startTime`). Un turno no puede consistir solo en descanso.

**Enforced by:** `WorkEventCalculationService.calculate()`.

---

### R-052 — WorkEvent invoiced no puede reinvoicarse

**Descripción:** Un WorkEvent en estado `invoiced` no puede incluirse en otra Invoice. Un WorkEvent solo puede pertenecer a un InvoiceItem activo.

**Entidades:** WorkEvent, InvoiceItem

**Enforced by:** `InvoiceGenerationService` filtra WorkEvents que ya tienen `invoiceItemId` no null. `InvoiceItemsService` verifica ausencia de InvoiceItem activo antes de crear.

---

### R-053 — WorkEvent void no puede facturarse

**Descripción:** Un WorkEvent en estado `void` no puede incluirse en ninguna Invoice.

**Enforced by:** `InvoiceGenerationService` filtra WorkEvents con `status: 'void'`.

---

### R-054 — WorkEvent no billable nunca aparece en Invoice

**Descripción:** Si `WorkEvent.billable === false`, no puede incluirse en una Invoice independientemente de su estado.

**Enforced by:** `InvoiceGenerationService` filtra `billable: false`.

---

### R-055 — WorkEvent de calendario no se sobreescribe si fue editado

**Descripción:** Un WorkEvent que provino de un CalendarIntegration y fue modificado manualmente por el usuario no se sobreescribe en syncs posteriores.

**Entidades:** WorkEvent, CalendarIntegration

**Enforced by:** `CalendarSyncService` — al sincronizar, si el WorkEvent tiene `lastEditedManually: true`, lo omite.

---

### R-056 — Estado de WorkEvent es unidireccional

**Descripción:** Un WorkEvent no puede retroceder de `invoiced` a `confirmed` directamente. Solo puede retroceder si la Invoice que lo contiene es `void`.

```
draft → confirmed → invoiced (terminal en condiciones normales)
     → void      → (terminal)
confirmed → draft (permitido por admin)
```

**Enforced by:** Máquina de estados en `WorkEventsService.updateStatus()`.

---

## Reglas de Invoice

### R-060 — Invoice sin InvoiceItems es inválida

**Descripción:** No puede persistirse una Invoice sin al menos un InvoiceItem.

**Enforced by:** `InvoiceGenerationService` valida que `items.length > 0` antes de persistir.

---

### R-061 — invoiceNumber es inmutable

**Descripción:** Una vez generado el `invoiceNumber`, no puede cambiarse nunca. Ni al editar el Draft, ni al hacer void.

**Enforced by:** `InvoicesService.update()` no permite cambiar `invoiceNumber`.

---

### R-062 — Invoice enviada bloquea sus InvoiceItems

**Descripción:** Una vez que una Invoice pasa de `draft` a `sent`, sus InvoiceItems no pueden modificarse ni eliminarse. Para corregir, debe hacerse `void` y crear una nueva Invoice.

**Enforced by:** `InvoiceItemsService` verifica `invoice.status === 'draft'` antes de cualquier mutación.

---

### R-063 — total se recalcula siempre

**Descripción:** `total`, `subtotal` y `taxAmount` de una Invoice siempre se calculan a partir de sus InvoiceItems y el FiscalProfile. No se aceptan externamente como input.

**Enforced by:** `InvoiceCalculationService` — llamado en cada persistencia de Invoice.

---

### R-064 — amountDue nunca es negativo

**Descripción:** `amountDue = total - amountPaid`. Si por error se registra un Payment mayor al total, `amountDue` se queda en 0 (no negativo).

**Enforced by:** `PaymentAllocationService` — `max(0, total - amountPaid)`.

---

### R-065 — Invoice void puede tener sus WorkEvents revertidos

**Descripción:** Si una Invoice pasa a estado `void`, los WorkEvents asociados a sus InvoiceItems pueden volver a estado `confirmed` para ser incluidos en una nueva Invoice.

**Enforced by:** `InvoicesService.void()` publica `InvoiceVoided`; `WorkEventsService` consume el evento y revierte estado.

---

### R-066 — Invoice paid no acepta más Payments

**Descripción:** Una Invoice en estado `paid` no puede recibir nuevos Payments.

**Enforced by:** `PaymentsService.record()` verifica `invoice.status !== 'paid'`.

---

## Reglas de Payment

### R-070 — Payment siempre referencia una Invoice activa

**Descripción:** No existe Payment sin Invoice. La Invoice referenciada no puede estar en estado `void` o `cancelled`.

**Enforced by:** `PaymentsService.record()` valida el estado de la Invoice antes de crear el Payment.

---

### R-071 — amount mayor a cero

**Descripción:** El monto de un Payment debe ser mayor a cero. No se permiten Payments de $0.

**Enforced by:** Validación en DTO y en la capa de dominio.

---

### R-072 — date no anterior a issueDate de la Invoice

**Descripción:** La fecha de un Payment no puede ser anterior a la fecha de emisión de la Invoice.

**Enforced by:** `PaymentsService.record()` verifica `payment.date >= invoice.issueDate`.

---

### R-073 — Payment reversed no puede revertirse de nuevo

**Descripción:** El estado `reversed` es terminal para un Payment.

**Enforced by:** Máquina de estados en `PaymentsService.reverse()`.

---

## Reglas de CalendarIntegration

### R-080 — Una CalendarIntegration por user/provider/calendar

**Descripción:** No pueden existir dos CalendarIntegrations activas para el mismo `(businessId, userId, provider, calendarId)`.

**Enforced by:** Índice unique en `calendar_integrations(businessId, userId, provider, calendarId)`.

---

### R-081 — credenciales siempre encriptadas

**Descripción:** Los tokens OAuth2 de CalendarIntegration nunca se almacenan en texto plano.

**Enforced by:** `CalendarIntegrationService.connect()` encripta antes de persistir.

---

## Reglas de CommunicationLog

### R-090 — CommunicationLog es inmutable

**Descripción:** Una vez creado, un CommunicationLog no puede modificarse. Es un registro histórico.

**Enforced by:** No existe operación `update` en `CommunicationLogsService`.

---

### R-091 — CommunicationLog se crea aunque la entrega falle

**Descripción:** Si Communications Platform devuelve error, se crea igualmente el CommunicationLog con `success: false`.

**Enforced by:** `CommunicationDispatchService.dispatch()` — el log se crea en el bloque finally.

---

## Resumen por categoría

| Categoría | Reglas | Implementadas |
|---|---|---|
| Dominio fundamental | R-001 a R-004 | ⚠️ Parcial (multi-tenancy básico) |
| Users y Roles | R-010 a R-012 | ✅ Implementadas |
| FiscalProfile | R-020 a R-022 | ❌ No implementadas |
| Customer | R-030 a R-031 | ❌ No implementadas |
| Contract | R-040 a R-044 | ❌ No implementadas |
| WorkEvent | R-050 a R-056 | ❌ No implementadas |
| Invoice | R-060 a R-066 | ❌ No implementadas |
| Payment | R-070 a R-073 | ❌ No implementadas |
| CalendarIntegration | R-080 a R-081 | ❌ No implementadas |
| CommunicationLog | R-090 a R-091 | ⚠️ Parcial |

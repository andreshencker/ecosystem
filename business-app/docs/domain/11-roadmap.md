# 11 — Implementation Roadmap

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

Este roadmap organiza la implementación **por dominio, no por CRUD**. El orden respeta las dependencias entre Bounded Contexts — no se puede construir Billing sin Work Management, y no se puede construir Work Management sin Contracts.

---

## Principio de ordenamiento

```
Cada fase habilita la siguiente.
No adelantar implementaciones de fases futuras.
Cada fase debe ser desplegable y funcional de forma independiente.
```

---

## Estado actual (pre-Fase 0)

```
✅ Identity     — Auth, Users, Invitations (completo)
⚠️ Business     — Company schema existe, falta FiscalProfile, naming incorrecto
⚠️ Communication — CommunicationConnection existe, falta CommunicationLog
❌ Customer Management — no existe
❌ Contract Management — no existe
❌ Calendar Integration — no existe
❌ Work Management — no existe
❌ Billing — no existe
❌ Payments — no existe
❌ Analytics/BI — no existe
```

---

## Fase 0 — Corrección de base (prerequisito de todo)

**Objetivo:** El modelo de datos existente queda semánticamente correcto antes de agregar dominio nuevo.

**Por qué primero:** Si no se corrige ahora, todas las entidades nuevas heredan la inconsistencia. Un `invoice.businessId` que convive con `user.companyId` es deuda que crece con cada nueva entidad.

### Tareas

```
0.1 — Decidir y ejecutar ADR-001:
      Company → Business (schema, colección, campos)
      companyId → businessId en todas las entidades existentes

0.2 — Migrar AuthContext de Business App:
      organizationId → companyId → businessId
      (mismo patrón que ya se aplicó en Communications)

0.3 — Agregar campos faltantes a Business:
      timezone (String, IANA)
      phone (String|null)
      logoUrl (String|null)
      address (Address VO embedded)

0.4 — Verificar roles en documentos MongoDB:
      company_owner → business_owner (ya migrado en schema, verificar en docs)

0.5 — Crear FiscalProfile schema y módulo:
      Migrar abn y depositAccount desde Business
      Crear FiscalProfileModule con CRUD básico
```

**Entidades al final de Fase 0:**
- `Business` (correctamente nombrada)
- `FiscalProfile` (nueva)
- `User` (businessId, businessKey correctos)

**Duración estimada:** 1–2 sprints

---

## Fase 1 — Customer Management

**Objetivo:** El Business puede registrar los clientes a quienes factura.

**Por qué después de Fase 0:** Customer requiere `businessId` correcto. Sin la corrección de naming, se crea una entidad nueva con el campo incorrecto.

**Habilita:** Contract Management (un Contract requiere un Customer).

### Tareas

```
1.1 — Customer schema + módulo (CRUD básico)
      businessId, name, type, abn, billingAddress, isActive

1.2 — Contact schema + sub-módulo
      customerId, name, email, phone, isPrimary

1.3 — Validación de ABN (TaxNumber VO)
      Algoritmo de verificación de 11 dígitos

1.4 — Reglas R-030 y R-031 (Customer desactivado, Customer con deps)

1.5 — Publicar CustomerCreated domain event
```

**Entidades al final de Fase 1:**
- `Customer`
- `Contact`

**Endpoints nuevos:**
- `POST /customers` · `GET /customers` · `GET /customers/:id`
- `PATCH /customers/:id` · `DELETE /customers/:id` (soft delete)
- `POST /customers/:id/contacts` · `GET /customers/:id/contacts`

**Duración estimada:** 1 sprint

---

## Fase 2 — Contract Management y Rate Engine

**Objetivo:** El Business puede definir los términos de trabajo con cada Customer, incluyendo las tarifas aplicables.

**Por qué después de Fase 1:** Un Contract requiere un Customer. No se puede crear un Contract sin Customer.

**Habilita:** Work Management (un WorkEvent puede referenciarse a un Contract y una Rate).

### Tareas

```
2.1 — Contract schema + módulo
      businessId, customerId, title, status, billingCycle, paymentTermsDays
      startDate, endDate

2.2 — Máquina de estados de Contract:
      draft → active → completed | cancelled
      Publicar ContractActivated, ContractCompleted, ContractCancelled

2.3 — Rate schema + módulo
      contractId, name, type, amount (Money VO), isDefault, isActive

2.4 — RateResolutionService:
      Lógica de selección de Rate por día de semana y tipo de WorkEvent

2.5 — Reglas R-040 a R-044

2.6 — WorkEventCalculationService (puede implementarse aquí aunque WorkEvent es Fase 3)
```

**Entidades al final de Fase 2:**
- `Contract`
- `Rate`

**Endpoints nuevos:**
- `POST /contracts` · `GET /contracts` · `GET /contracts/:id`
- `PATCH /contracts/:id/activate` · `PATCH /contracts/:id/complete`
- `POST /contracts/:id/rates` · `GET /contracts/:id/rates`
- `PATCH /contracts/:id/rates/:rateId`

**Duración estimada:** 1–2 sprints

---

## Fase 3 — Calendar Integration y Work Management

**Objetivo:** El Business puede registrar el tiempo trabajado, ya sea manualmente o importando desde su calendario.

**Por qué después de Fase 2:** Un WorkEvent puede referenciar un Contract y una Rate. Sin ellos, el WorkEvent existe pero no tiene contexto de precio.

**Habilita:** Billing (necesita WorkEvents confirmados para generar InvoiceItems).

### Tareas

```
3.1 — CalendarIntegration schema + módulo
      OAuth2 flow con Google Calendar (primer proveedor)
      encryptedToken con AES-256-GCM (mismo patrón que CommunicationConnection)

3.2 — CalendarSyncService:
      Fetch de eventos del proveedor externo
      Deduplicación por calendarEventId
      Creación de WorkEvents en draft

3.3 — WorkEvent schema + módulo
      businessId, userId, customerId, contractId, rateId, date
      startTime, endTime, breakMinutes, durationMinutes
      type, status, billable, calculatedAmount

3.4 — WorkEventCalculationService:
      Cálculo de durationMinutes
      Cálculo de calculatedAmount por tipo de Rate

3.5 — Máquina de estados de WorkEvent:
      draft → confirmed → invoiced | void
      Publicar WorkEventConfirmed, WorkEventVoided

3.6 — Reglas R-050 a R-056

3.7 — Job periódico de Calendar Sync (usando QueueModule existente)
```

**Entidades al final de Fase 3:**
- `CalendarIntegration`
- `WorkEvent`

**Endpoints nuevos:**
- `POST /calendar-integrations/connect` · `GET /calendar-integrations`
- `POST /calendar-integrations/:id/sync`
- `POST /work-events` · `GET /work-events` · `GET /work-events/:id`
- `PATCH /work-events/:id/confirm` · `PATCH /work-events/:id/void`
- `GET /work-events?status=confirmed&customerId=X` (para selección en Invoice)

**Duración estimada:** 2–3 sprints

---

## Fase 4 — Billing (Invoice e InvoiceItem)

**Objetivo:** El Business puede generar facturas a partir de WorkEvents confirmados y enviarlas al Customer.

**Por qué después de Fase 3:** Sin WorkEvents confirmados no hay contenido para las InvoiceItems. Sin FiscalProfile no hay número de Invoice ni datos del emisor.

**Habilita:** Payments (necesita Invoices para registrar cobros).

### Tareas

```
4.1 — InvoiceNumberGenerationService:
      Incremento atómico sobre FiscalProfile.invoiceNextNumber
      Formato configurable: {prefix}-{year}-{sequence}

4.2 — Invoice schema + módulo
      businessId, customerId, contractId, invoiceNumber
      issueDate, dueDate, status, subtotal, taxAmount, total
      amountPaid, amountDue, sentAt, paidAt

4.3 — InvoiceItem schema
      invoiceId, workEventId (nullable), description, quantity, unitPrice, amount

4.4 — InvoiceCalculationService:
      Cálculo de subtotal, taxAmount, total desde InvoiceItems

4.5 — InvoiceGenerationService (orquestador):
      Selección de WorkEvents confirmados → InvoiceItems
      Generación de número
      Cálculo de totales
      Persistencia atómica
      WorkEvents → status: 'invoiced'

4.6 — Máquina de estados de Invoice:
      draft → sent → viewed → partial → paid
      draft → cancelled
      sent|viewed|partial|overdue → void (+ revert WorkEvents a confirmed)

4.7 — OverdueInvoiceDetectionService + job diario

4.8 — Integración con Communications:
      InvoiceSent → CommunicationDispatchService('invoices.invoice_sent')
      InvoiceOverdue → CommunicationDispatchService('invoices.invoice_overdue')

4.9 — Reglas R-060 a R-066

4.10 — Generación de PDF básico (opcional en esta fase)
```

**Entidades al final de Fase 4:**
- `Invoice`
- `InvoiceItem`

**Endpoints nuevos:**
- `POST /invoices/generate` (desde WorkEvents) · `GET /invoices` · `GET /invoices/:id`
- `POST /invoices/:id/send` · `PATCH /invoices/:id/void`
- `GET /invoices/:id/items`
- `POST /invoices/:id/items` (ítems manuales)

**Duración estimada:** 2–3 sprints

---

## Fase 5 — Payments y Communication Log

**Objetivo:** El Business puede registrar los cobros recibidos y tiene visibilidad del historial de comunicaciones.

**Por qué después de Fase 4:** Los Payments requieren Invoices. El CommunicationLog requiere que haya comunicaciones enviadas (desde Fase 4).

**Habilita:** Analytics/BI (necesita Payments para calcular revenue).

### Tareas

```
5.1 — Payment schema + módulo
      businessId, invoiceId, amount, date, method, reference, status

5.2 — PaymentAllocationService:
      Recalcula amountPaid, amountDue
      Actualiza status de Invoice (partial → paid)

5.3 — Máquina de estados de Payment:
      pending → cleared → reversed

5.4 — Reglas R-070 a R-073

5.5 — CommunicationLog schema + módulo
      Crear log en cada dispatch de Communication
      businessId, resourceType, resourceId, eventKey, success

5.6 — Eventos de Payments en Communications:
      PaymentRecorded → 'payments.payment_received' (futuro — registrar en backlog)

5.7 — Recordatorio de pago manual:
      business_owner/admin puede disparar manualmente un recordatorio
```

**Entidades al final de Fase 5:**
- `Payment`
- `CommunicationLog`

**Endpoints nuevos:**
- `POST /invoices/:id/payments` · `GET /invoices/:id/payments`
- `PATCH /invoices/:id/payments/:paymentId/reverse`
- `GET /communication-logs` · `GET /communication-logs?resourceType=invoice&resourceId=X`

**Duración estimada:** 1–2 sprints

---

## Fase 6 — Analytics / Business Intelligence *(futuro)*

**Objetivo:** El Business tiene visibilidad de sus métricas de negocio.

**Por qué después de Fase 5:** Requiere datos de todas las fases anteriores.

### Módulos sugeridos

```
6.1 — Dashboard de revenue: facturado vs cobrado vs pendiente
6.2 — Horas trabajadas por período y por Customer
6.3 — Tasa de cobro efectiva (tiempo promedio de pago)
6.4 — Proyección de ingresos basada en WorkEvents confirmados
6.5 — Conciliación bancaria (importar transacciones y matchear con Payments)
```

**Entidades:** Solo read models — ninguna entidad nueva de escritura.

---

## Fase 7 — Service Sale *(futuro)*

**Objetivo:** Soportar el flujo de venta de servicios/proyectos sin WorkEvents.

**Por qué después de todo:** Requiere que Billing esté estable. La extensión es mínima gracias al diseño de InvoiceItem con `workEventId: null`.

```
7.1 — Project/ServicePackage schema (entidad nueva)
7.2 — InvoiceGenerationService.generateFromProject()
      Los InvoiceItems son creados manualmente o desde entregables
      workEventId = null en todos los ítems
```

---

## Resumen por fase

| Fase | Qué construye | Habilita | Duración |
|---|---|---|---|
| **0** | Business cleanup · FiscalProfile | Todo lo demás | 1–2 sprints |
| **1** | Customer · Contact | Contracts | 1 sprint |
| **2** | Contract · Rate | WorkEvents | 1–2 sprints |
| **3** | CalendarIntegration · WorkEvent | Billing | 2–3 sprints |
| **4** | Invoice · InvoiceItem | Payments | 2–3 sprints |
| **5** | Payment · CommunicationLog | Analytics | 1–2 sprints |
| **6** | Analytics/BI | — | Futuro |
| **7** | Service Sale | — | Futuro |

**Total estimado v1 (Fases 0–5):** 8–13 sprints

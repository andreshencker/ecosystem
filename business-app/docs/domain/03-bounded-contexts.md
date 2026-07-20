# 03 — Bounded Contexts

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

Un Bounded Context es una frontera explícita dentro del dominio donde un modelo específico aplica con coherencia. Fuera de esa frontera, el mismo término puede tener un significado diferente.

---

## Mapa de Bounded Contexts

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Invoice App                                  │
│                                                                      │
│  ┌──────────────┐    ┌──────────────────┐    ┌───────────────────┐  │
│  │   Identity   │    │    Business      │    │    Customer       │  │
│  │              │    │    Management    │    │    Management     │  │
│  │ Auth         │    │                  │    │                   │  │
│  │ Users        │    │ Business         │    │ Customer          │  │
│  │ Invitations  │    │ FiscalProfile    │    │ Contact           │  │
│  └──────┬───────┘    └────────┬─────────┘    └────────┬──────────┘  │
│         │                    │                        │             │
│  ┌──────▼───────────────────────────────────────────────────────┐  │
│  │                     Contract Management                       │  │
│  │                   Contract · Rate                             │  │
│  └──────────────────────────────┬───────────────────────────────┘  │
│                                 │                                   │
│  ┌──────────────┐    ┌──────────▼─────────┐                        │
│  │   Calendar   │    │  Work Management   │                        │
│  │ Integration  ├───►│                    │                        │
│  │              │    │  WorkEvent         │                        │
│  └──────────────┘    └──────────┬─────────┘                        │
│                                 │                                   │
│                      ┌──────────▼─────────┐                        │
│                      │      Billing       │                        │
│                      │                    │                        │
│                      │ Invoice            │                        │
│                      │ InvoiceItem        │                        │
│                      └──────────┬─────────┘                        │
│                                 │                                   │
│  ┌──────────────┐    ┌──────────▼─────────┐    ┌───────────────┐  │
│  │Communication │    │     Payments       │    │  Analytics/   │  │
│  │              │◄───┤                    │    │    BI         │  │
│  │ CommunicConn │    │ Payment            │    │  (futuro)     │  │
│  │ CommLog      │    └────────────────────┘    └───────────────┘  │
│  └──────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## BC-01 — Identity

### Responsabilidad
Autenticación, autorización y gestión del ciclo de vida de usuarios. Es la frontera que decide quién puede acceder y con qué permisos.

### Entidades que pertenecen
- `User` — la persona autenticada
- `RefreshToken` — token de sesión (infraestructura)
- `Invitation` — invitación a usuarios nuevos

### Qué publica
- `UserRegistered` — nuevo Business Owner registrado
- `UserInvited` — invitación enviada
- `UserActivated` — usuario completó primer login
- `EmailVerified` — email confirmado

### Qué consume
- Ningún evento interno — es el punto de entrada del sistema

### Dependencias
- Communications Platform: para enviar emails de verificación, recuperación de contraseña e invitaciones (vía `CommunicationConnection` de la Platform Company)

### Qué nunca debe conocer
- La lógica de facturación
- WorkEvents o Contracts
- Cómo se generan las Invoices

### Estado actual
✅ Implementado — `AuthModule`, `UsersModule`, `UserInvitationsModule`

---

## BC-02 — Business Management

### Responsabilidad
Todo lo relacionado con la configuración y el estado del Business del usuario. Es el núcleo de identidad del negocio.

### Entidades que pertenecen
- `Business` (actualmente `Company` en el código)
- `FiscalProfile` (falta — datos embedidos en Company)
- `BusinessSettings` (configuración de portal, moneda, timezone — parte del Business actual)
- `CompanySmtp` (legacy — en proceso de deprecación)

### Qué publica
- `BusinessRegistered`
- `FiscalProfileConfigured`
- `BusinessSettingsUpdated`

### Qué consume
- `UserRegistered` (de Identity): para asociar el primer user al Business recién creado

### Dependencias
- Identity: necesita que el User exista antes de crear el Business

### Qué nunca debe conocer
- Customers, Contracts, WorkEvents, Invoices
- La lógica de facturación o pagos

### Estado actual
⚠️ Parcialmente implementado — `CompanyPortalModule`. Falta `FiscalProfile`.

---

## BC-03 — Customer Management

### Responsabilidad
Gestionar a los clientes del Business: sus datos de contacto, condiciones específicas de pago y el estado de la relación comercial.

### Entidades que pertenecen
- `Customer`
- `Contact` (persona de contacto dentro del Customer)

### Qué publica
- `CustomerCreated`
- `CustomerDeactivated`
- `ContactUpdated`

### Qué consume
- Ningún evento interno — se crea por acción directa del usuario

### Dependencias
- Business Management: el Customer pertenece a un Business

### Qué nunca debe conocer
- WorkEvents
- Cómo se calculan las Invoices
- Pagos

### Estado actual
❌ No implementado

---

## BC-04 — Contract Management

### Responsabilidad
Gestionar los acuerdos de trabajo entre el Business y sus Customers, incluyendo las tarifas aplicables.

### Entidades que pertenecen
- `Contract`
- `Rate`

### Qué publica
- `ContractCreated`
- `ContractActivated`
- `ContractCompleted`
- `ContractCancelled`
- `RateAdded`
- `RateUpdated`

### Qué consume
- `CustomerCreated` (de Customer Management): para poder crear contratos con ese Customer

### Dependencias
- Customer Management: un Contract requiere un Customer
- Business Management: un Contract requiere un Business

### Qué nunca debe conocer
- Cómo se calculan las horas en un WorkEvent
- La lógica de facturación
- Pagos

### Estado actual
❌ No implementado

---

## BC-05 — Calendar Integration

### Responsabilidad
Gestionar las conexiones con proveedores de calendario externos y sincronizar eventos hacia el Work Management context.

### Entidades que pertenecen
- `CalendarIntegration`

### Qué publica
- `CalendarSynced`
- `CalendarEventImported` (uno por cada evento nuevo encontrado)
- `CalendarSyncFailed`

### Qué consume
- Ningún evento interno — es disparado por job periódico o por acción del usuario

### Dependencias
- Business Management: la CalendarIntegration pertenece a un Business
- Work Management: los eventos importados se convierten en WorkEvents

### Qué nunca debe conocer
- Invoices, Payments, Rates
- Lógica de facturación

### Estado actual
❌ No implementado

---

## BC-06 — Work Management

### Responsabilidad
Registrar, validar y gestionar el trabajo realizado. Es el corazón del flujo Shift Work.

### Entidades que pertenecen
- `WorkEvent`

### Qué publica
- `WorkEventCreated`
- `WorkEventImported` (cuando viene del calendario)
- `WorkEventConfirmed`
- `WorkEventVoided`
- `WorkEventInvoiced` (cuando se incluye en una Invoice)

### Qué consume
- `CalendarEventImported` (de Calendar Integration): para crear WorkEvents desde el calendario
- `ContractActivated` (de Contract Management): para saber qué Contracts están disponibles para asignar

### Dependencias
- Business Management, Customer Management, Contract Management: un WorkEvent necesita Business, Customer, y opcionalmente Contract + Rate

### Qué nunca debe conocer
- Cómo se genera una Invoice
- Pagos
- Comunicaciones

### Estado actual
❌ No implementado

---

## BC-07 — Billing

### Responsabilidad
Generar, gestionar y enviar las Invoices. Agrupa WorkEvents confirmados en documentos financieros formales.

### Entidades que pertenecen
- `Invoice`
- `InvoiceItem`

### Qué publica
- `InvoiceGenerated`
- `InvoiceSent`
- `InvoiceViewed`
- `InvoiceOverdue`
- `InvoicePaid` (cuando todos los Payments cubren el total)
- `InvoiceVoided`
- `InvoiceCancelled`

### Qué consume
- `WorkEventConfirmed` (de Work Management): WorkEvents listos para facturar
- `PaymentRecorded` (de Payments): para actualizar `amountPaid` y el estado de la Invoice
- `PaymentReversed` (de Payments): para reabrir una Invoice pagada

### Dependencias
- Business Management, Customer Management, Work Management, Payments

### Qué nunca debe conocer
- Cómo se procesa un pago bancario
- Cómo se entrega el email al Customer (eso es Communication)

### Estado actual
❌ No implementado

---

## BC-08 — Payments

### Responsabilidad
Registrar los pagos recibidos contra Invoices y mantener el estado de cobro de cada factura.

### Entidades que pertenecen
- `Payment`

### Qué publica
- `PaymentRecorded`
- `PaymentReversed`

### Qué consume
- `InvoiceSent` (de Billing): para saber qué Invoices están pendientes de cobro
- `InvoiceOverdue` (de Billing): para registrar el contexto de pagos tardíos

### Dependencias
- Billing: un Payment siempre referencia una Invoice

### Qué nunca debe conocer
- Cómo se generó la Invoice
- WorkEvents o Contracts

### Estado actual
❌ No implementado

---

## BC-09 — Communication

### Responsabilidad
Gestionar la configuración de la conexión con la Communications Platform y registrar el historial de comunicaciones enviadas.

### Entidades que pertenecen
- `CommunicationConnection` (actualmente `IntegrationConnection` con provider='communications')
- `CommunicationLog`

### Qué publica
- `CommunicationRequested`
- `CommunicationDelivered`
- `CommunicationFailed`

### Qué consume
- `InvoiceSent` (de Billing): para disparar el envío del email de factura
- `InvoiceOverdue` (de Billing): para enviar recordatorios
- `PaymentRecorded` (de Payments): para enviar confirmación de pago (futuro)

### Dependencias
- Communications Platform (externa): el servicio externo que entrega emails y SMS
- Todos los Bounded Contexts que generan comunicaciones

### Qué nunca debe conocer
- Cómo renderizar un template — eso lo decide Communications Platform
- La lógica de negocio de facturación

### Estado actual
⚠️ Parcialmente implementado — `CommunicationConnectionModule`, `CommunicationClientService`. Falta `CommunicationLog`.

---

## BC-10 — Analytics / Business Intelligence *(futuro)*

### Responsabilidad
Agregación y presentación de métricas de negocio — ingresos, horas trabajadas, tasa de cobro, proyecciones.

### Entidades que pertenecen
- Read models / projections (no entidades de escritura)

### Qué publica
- Ningún evento — solo lee

### Qué consume
- `WorkEventConfirmed`, `InvoicePaid`, `PaymentRecorded`, `InvoiceOverdue` y todos los eventos del dominio

### Estado actual
❌ No implementado — no planificar hasta Fase 5

---

## Relaciones entre contextos

```
Identity
    │ UserRegistered
    ▼
Business Management
    │ BusinessRegistered
    ▼
Customer Management ←──────────────── (Business actúa como scope)
    │ CustomerCreated
    ▼
Contract Management
    │ ContractActivated
    ▼
Calendar Integration ──► Work Management
                              │ WorkEventConfirmed
                              ▼
                          Billing
                              │ InvoiceGenerated · InvoiceSent · InvoiceOverdue
                              ▼
                          Payments ──────────────────► Communication
                          PaymentRecorded              CommunicationLog
```

---

## Nota sobre la Communications Platform

La Communications Platform de Invoice App es un **sistema externo** desde el punto de vista del Bounded Context de Communication dentro de Business App. Business App solo sabe que existe un endpoint al que enviar eventos — no sabe cómo renderiza templates, qué proveedores usa, ni cómo entrega los mensajes. Esa opacidad es intencional y está documentada en ADR-007 de Communications.

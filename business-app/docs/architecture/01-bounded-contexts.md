# 01 — Bounded Contexts

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

Un Bounded Context es una frontera explícita dentro del sistema donde un modelo específico aplica sin ambigüedad. Dentro del contexto, los términos tienen un significado preciso. En otro contexto, el mismo término puede significar algo diferente o no existir.

**Regla fundamental:** Los contextos no comparten bases de datos. Los contextos no llaman directamente a servicios internos de otros contextos. Los contextos se comunican únicamente a través de Domain Events o contratos publicados.

---

## BC-01 — Identity

### Por qué existe
Centralizar todo lo relacionado con quién puede acceder al sistema y bajo qué condiciones. Ningún otro dominio debería implementar autenticación o gestión de sesiones.

### Qué problema resuelve
Sin Identity, cada dominio implementaría su propia autenticación. Tendríamos múltiples sistemas de tokens, múltiples tablas de usuarios, múltiples reglas de seguridad. Identity es la puerta de entrada única al sistema.

### Información que posee
- Credenciales de usuario (email, hash de contraseña)
- Sesiones y tokens (JWT access tokens, refresh tokens)
- Estado de verificación de email
- Proceso de recuperación de contraseña
- Invitaciones pendientes
- Roles y scopes de autorización

### Información que NUNCA debe poseer
- Datos financieros de ningún tipo
- Contratos, facturas, pagos
- Configuraciones del Business
- Información de Customers

### Qué otros dominios puede consultar
- Business: para obtener el `businessId` del usuario autenticado (solo lectura, a través de un contrato publicado)

### Qué dominios NUNCA debe modificar
- Ninguno. Identity es un productor de eventos, no un modificador de otros dominios.

### Domain Events que publica
`UserRegistered` · `EmailVerified` · `UserInvited` · `UserActivated` · `UserDeactivated` · `PasswordResetRequested` · `PasswordChanged`

### Qué consume
Ningún evento interno — es el punto de entrada del sistema.

```
┌─────────────────────────────────────┐
│           IDENTITY                  │
│                                     │
│  User ──── Role ──── Scope          │
│   │                                 │
│  RefreshToken                       │
│   │                                 │
│  Invitation                         │
│                                     │
│  Publica:  UserRegistered           │
│            UserInvited              │
│            EmailVerified            │
└─────────────────────────────────────┘
```

---

## BC-02 — Business

### Por qué existe
Representar la cuenta del propietario dentro del ERP. Todo dato de negocio pertenece a un Business. Es el anchor de multi-tenancy.

### Qué problema resuelve
Sin un dominio de Business claro, el concepto de "a quién pertenecen estos datos" queda ambiguo. Business es la raíz que hace posible que múltiples empresas coexistan en la misma plataforma con aislamiento completo.

### Información que posee
- Perfil del negocio (nombre, timezone, moneda, dirección, logo)
- Perfil fiscal (ABN, GST, cuenta bancaria, condiciones de pago)
- Configuraciones del portal
- Políticas contables básicas
- El flag `isPlatformCompany` para el operador SaaS

### Información que NUNCA debe poseer
- Información de Customers (quiénes son los clientes)
- Contratos, tarifas, WorkEvents
- Facturas, pagos, registros contables
- Credenciales de autenticación

### Qué otros dominios puede consultar
- Identity: para saber qué usuario es el propietario

### Qué dominios NUNCA debe modificar
- Ninguno. Business define el contexto; los demás operan dentro de él.

### Domain Events que publica
`BusinessCreated` · `BusinessProfileUpdated` · `FiscalProfileConfigured` · `FiscalProfileUpdated`

### Qué consume
`UserRegistered` (de Identity): para crear el Business y asociar al primer usuario.

```
┌─────────────────────────────────────┐
│            BUSINESS                 │
│                                     │
│  Business ──── FiscalProfile        │
│      │                              │
│      └── Settings (currency,        │
│              timezone, logo)        │
│                                     │
│  Publica:  BusinessCreated          │
│            FiscalProfileConfigured  │
│  Consume:  UserRegistered           │
└─────────────────────────────────────┘
```

---

## BC-03 — Customer

### Por qué existe
Representar a las empresas y personas a quienes el Business factura. Es una entidad separada de Business porque sus atributos, reglas y ciclo de vida son completamente distintos.

### Qué problema resuelve
Sin Customer como dominio propio, la relación comercial entre el Business y sus clientes no tiene un lugar. Los contratos, las condiciones de pago específicas, los contactos de facturación — todos necesitan un ancla que es el Customer.

### Información que posee
- Nombre, tipo (empresa/individuo), ABN del cliente
- Contactos de facturación (personas dentro del Customer)
- Dirección de facturación
- Condiciones de pago específicas del cliente
- Notas internas
- Estado activo/inactivo

### Información que NUNCA debe poseer
- Contratos (eso es Work)
- Facturas (eso es Billing)
- Información financiera interna del Business

### Qué otros dominios puede consultar
- Business: para verificar el `businessId` de ownership

### Qué dominios NUNCA debe modificar
- Business, Billing, Accounting

### Domain Events que publica
`CustomerCreated` · `CustomerUpdated` · `CustomerDeactivated` · `ContactAdded` · `ContactUpdated`

### Qué consume
Ningún evento interno.

```
┌─────────────────────────────────────┐
│            CUSTOMER                 │
│                                     │
│  Customer ──── Contact[]            │
│                                     │
│  ← businessId (scope)               │
│                                     │
│  Publica:  CustomerCreated          │
│            CustomerDeactivated      │
└─────────────────────────────────────┘
```

---

## BC-04 — Work

### Por qué existe
Gestionar todo lo relacionado con el trabajo realizado: los acuerdos (Contracts), las tarifas (Rates), y los registros de tiempo (WorkEvents). Es el dominio que transforma "tiempo" en "valor facturable".

### Qué problema resuelve
El tiempo trabajado es la materia prima del negocio. Sin un dominio que lo gestione con precisión — cuándo, para quién, a qué tarifa — no hay base para facturar correctamente.

### Información que posee
- Contratos entre Business y Customer
- Tarifas por tipo (estándar, overtime, feriados, nocturno)
- WorkEvents: fecha, hora inicio/fin, descanso, monto calculado
- Estado de cada WorkEvent (draft, confirmed, invoiced, void)
- Referencia al evento de calendario que originó el WorkEvent

### Información que NUNCA debe poseer
- Facturas o líneas de factura (eso es Billing)
- Registros contables (eso es Accounting)
- Credenciales de Calendar (eso es Calendar)

### Qué otros dominios puede consultar
- Business: scope del businessId
- Customer: para crear Contracts
- Calendar: solo lee el resultado del sync (WorkEvents importados)

### Qué dominios NUNCA debe modificar
- Billing, Accounting, Financial

### Domain Events que publica
`ContractCreated` · `ContractActivated` · `ContractCompleted` · `RateAdded` · `WorkEventCreated` · `WorkEventImported` · `WorkEventConfirmed` · `WorkEventVoided` · `WorkEventInvoiced`

### Qué consume
`CalendarEventImported` (de Calendar): para crear WorkEvents desde el calendario.
`InvoiceVoided` (de Billing): para revertir WorkEvents a estado confirmed.

```
┌─────────────────────────────────────┐
│              WORK                   │
│                                     │
│  Contract ──── Rate[]               │
│      │                              │
│  WorkEvent (la entidad central)     │
│      │                              │
│  status: draft → confirmed          │
│          → invoiced → void          │
│                                     │
│  Publica:  WorkEventConfirmed       │
│            WorkEventInvoiced        │
│  Consume:  CalendarEventImported    │
│            InvoiceVoided            │
└─────────────────────────────────────┘
```

---

## BC-05 — Calendar

### Por qué existe
Gestionar las conexiones con proveedores de calendario externos y sincronizar los eventos de esos calendarios como WorkEvents draft en el dominio Work. Es el único puente entre el mundo del calendario y el mundo del ERP.

### Qué problema resuelve
Los trabajadores por turno ya registran su tiempo en Google Calendar, iCal, o Outlook. Pedirles que lo dupliquen manualmente en el ERP es fricción innecesaria. Calendar elimina esa fricción.

### Información que posee
- Configuración de la conexión (provider, token OAuth2 encriptado)
- Calendario específico sincronizado
- Estado del último sync
- Mapeo entre eventos externos y WorkEvents creados

### Información que NUNCA debe poseer
- Contratos o tarifas
- Facturas o pagos
- Información financiera de ningún tipo

### Qué otros dominios puede consultar
- Business: scope
- Work: para verificar que el WorkEvent creado no es duplicado

### Qué dominios NUNCA debe modificar
- Billing, Accounting, Financial

### Domain Events que publica
`CalendarIntegrationConnected` · `CalendarSynced` · `CalendarEventImported` · `CalendarSyncFailed`

### Qué consume
Ningún evento interno — se dispara por job periódico o acción del usuario.

---

## BC-06 — Billing

### Por qué existe
Generar, gestionar y rastrear las facturas emitidas por el Business a sus Customers. Es el dominio que formaliza el valor del trabajo en un documento financiero exigible.

### Qué problema resuelve
Los WorkEvents confirmados son "trabajo realizado". Para cobrar, ese trabajo debe formalizarse en una factura con número, monto, fecha de vencimiento y estado de cobro. Billing es quien transforma el trabajo en deuda del cliente.

### Información que posee
- Invoices con número, estado, totales
- InvoiceItems (líneas de factura)
- Payments recibidos contra las facturas
- Estado de cobro (parcial, total, vencido)

### Información que NUNCA debe poseer
- Chart of Accounts
- Journal Entries, asientos contables
- Posting Rules
- Información operativa del calendario

### Qué otros dominios puede consultar
- Business: FiscalProfile (para generar el número de factura y datos del emisor)
- Customer: datos de facturación del destinatario
- Work: WorkEvents confirmados (para crear InvoiceItems)

### Qué dominios NUNCA debe modificar
- Accounting, Financial, Work (solo notifica vía eventos)

### Domain Events que publica
`InvoiceGenerated` · `InvoiceSent` · `InvoiceViewed` · `InvoiceOverdue` · `InvoicePaid` · `InvoiceVoided` · `InvoiceCancelled` · `PaymentRecorded` · `PaymentReversed`

### Qué consume
`WorkEventConfirmed` (de Work): WorkEvents disponibles para facturar.
`PaymentRecorded` (de sí mismo): para actualizar amountDue en Invoice.

```
┌─────────────────────────────────────┐
│             BILLING                 │
│                                     │
│  Invoice ──── InvoiceItem[]         │
│      │             │                │
│      │         workEventId (ref)    │
│      │                              │
│  Payment[]                          │
│                                     │
│  Publica:  InvoiceSent              │
│            InvoiceOverdue           │
│            PaymentRecorded          │
│  Consume:  WorkEventConfirmed       │
└─────────────────────────────────────┘
```

---

## BC-07 — Financial

### Por qué existe
Ser la capa de normalización entre los módulos operativos y la contabilidad. Es quien traduce hechos de negocio (factura emitida, pago recibido) al lenguaje financiero neutro (FinancialTransaction).

### Qué problema resuelve
Sin esta capa, cada módulo operativo necesitaría conocer contabilidad. Y si las reglas contables cambian, habría que modificar Billing, Payments, Expenses, y todos los demás. Financial centraliza esa responsabilidad.

### Información que posee
- FinancialTransactions normalizadas de todos los módulos
- Posting Rules (cómo transformar cada tipo de transacción en asientos)
- Estado de procesamiento de cada transacción (pending, posted, rejected)

### Información que NUNCA debe poseer
- Invoices, WorkEvents, Customers (conoce solo su reflejo en FinancialTransaction)
- Información de UI de ningún módulo

### Qué otros dominios puede consultar
- Business: para el Chart of Accounts del Business
- Ningún módulo operativo directamente (solo los escucha)

### Qué dominios NUNCA debe modificar
- Billing, Work, Customer — solo los escucha

### Domain Events que publica
`FinancialTransactionCreated` · `TransactionPosted` · `TransactionRejected`

### Qué consume
`InvoiceSent` · `InvoiceVoided` · `PaymentRecorded` · `PaymentReversed` · y todos los eventos operativos con consecuencia financiera.

---

## BC-08 — Accounting

### Por qué existe
Mantener el registro contable formal (Journal, General Ledger) y producir los estados financieros. Es la fuente de verdad de la posición financiera del Business.

### Qué problema resuelve
Los módulos operativos saben lo que pasó (se emitió una factura). Accounting sabe lo que eso significa financieramente (aumentó el activo, aumentó el ingreso). Sin Accounting, no hay P&L, no hay Balance Sheet, no hay BAS.

### Información que posee
- Chart of Accounts de cada Business
- Journal Entries (asientos contables)
- General Ledger (saldos por cuenta)
- Trial Balances
- Fiscal Periods
- Accounting Policies

### Información que NUNCA debe poseer
- Invoices, WorkEvents, Customers, Contracts
- Ningún concepto operativo

### Qué otros dominios puede consultar
- Financial: recibe FinancialTransactions (único input)

### Qué dominios NUNCA debe modificar
- Ninguno. Accounting es un consumidor terminal: recibe, registra, no modifica.

### Domain Events que publica
`JournalEntryPosted` · `FiscalPeriodClosed` · `FiscalPeriodLocked` · `TrialBalanceGenerated`

### Qué consume
`FinancialTransactionCreated` (de Financial): su único input.

```
┌─────────────────────────────────────┐
│           ACCOUNTING                │
│                                     │
│  ChartOfAccounts ──── Account[]     │
│                                     │
│  Journal ──── JournalEntry[]        │
│                   │                 │
│               JournalLine[]         │
│                                     │
│  GeneralLedger (LedgerAccount[])    │
│                                     │
│  FiscalPeriod                       │
│                                     │
│  Publica:  JournalEntryPosted       │
│  Consume:  FinancialTransactionCreated│
└─────────────────────────────────────┘
```

---

## BC-09 — Communication

### Por qué existe
Ser el único canal de salida de comunicaciones hacia el exterior (Customers, usuarios). Ningún otro dominio envía emails o mensajes directamente.

### Qué problema resuelve
Sin un dominio de Communication centralizado, cada módulo implementaría su propio sistema de envío. Habría múltiples configuraciones SMTP, múltiples sistemas de templates, múltiples logs de envíos.

### Información que posee
- CommunicationConnection (configuración de la integración con Communications Platform)
- CommunicationLog (historial de solicitudes de comunicación desde Business App)

### Información que NUNCA debe poseer
- Contenido de los templates (eso está en Communications Platform)
- Reglas de qué enviar y cuándo (eso lo decide el módulo que publica el evento)
- Datos contables

### Qué otros dominios puede consultar
- Business: para resolver la CommunicationConnection correcta (platform vs company)

### Qué dominios NUNCA debe modificar
- Ninguno. Communication es un side-effect, no un modificador de estado.

### Domain Events que publica
`CommunicationRequested` · `CommunicationDelivered` · `CommunicationFailed`

### Qué consume
`InvoiceSent` · `InvoiceOverdue` · `UserInvited` · `UserActivated` · y cualquier evento que requiera comunicación externa.

---

## BC-10 — Analytics (Operativo)

> **Separación crítica:** Este bounded context es el Analytics **operativo**, ubicado en `business-app/backend/src/analytics/`. Usa NestJS + MongoDB. Es distinto del servicio Business Intelligence — ver BC-13.

### Por qué existe
Proporcionar read models rápidos y pre-calculados del rendimiento operativo del negocio. Alimenta el dashboard operacional del Business Owner sin acoplar los dominios operativos entre sí.

### Qué problema resuelve
El dashboard del Business Owner necesita información de múltiples dominios (cuánto se facturó, cuánto se cobró, cuántas horas trabajadas). Si el dashboard consultara directamente cada dominio, crearía acoplamiento fuerte y queries lentas.

### Información que posee
- Read models proyectados desde Domain Events (MongoDB)
- Aggregaciones pre-calculadas: revenue por período, horas por customer
- Snapshots operativos para respuesta < 100ms

### Información que NUNCA debe poseer
- Datos de escritura (facturas mutables, WorkEvents operativos)
- Información de autenticación o sesiones de usuario
- Tablas dim_ o fact_ tipo Data Warehouse (eso es BC-13 BI)
- KPIs estratégicos o forecasting (eso es BC-13 BI)

### Qué otros dominios puede consultar
- Ninguno directamente. Solo consume Domain Events y construye proyecciones.

### Qué dominios NUNCA debe modificar
- Absolutamente ninguno. Analytics es consumidor puro de solo lectura.

### Domain Events que publica
Ninguno — es un consumidor puro.

### Qué consume
Prácticamente todos los eventos del sistema.

### Límite tecnológico
- Stack: NestJS + MongoDB
- Latencia: < 100ms (datos pre-calculados)
- Scope: siempre un `businessId` a la vez
- Acceso: solo vía `business-app/backend` — el Frontend nunca llama a Analytics directamente

---

## BC-13 — Business Intelligence

> **No confundir con BC-10 Analytics.** BI es un microservicio Python separado en `business-intelligence/`. Analytics es operativo (MongoDB). BI es estratégico (PostgreSQL Neon).

### Por qué existe
Proveer análisis estratégico y dimensional sobre datos históricos del ERP. Responde preguntas que requieren historia larga, cruce de dimensiones, y SQL analítico complejo — cosas que MongoDB no puede servir en < 100ms.

### Qué problema resuelve
Analytics operativo responde: "¿cuánto facturé este mes?". BI responde: "¿qué clientes tienen riesgo de pago tardío en los próximos 30 días, basado en 18 meses de comportamiento histórico?". Son preguntas de diferente naturaleza, tecnología diferente.

### Información que posee
- Data Warehouse dimensional en PostgreSQL Neon (Alembic-managed)
- Dimensiones: `dim_business`, `dim_customer`, `dim_time`, `dim_user`
- Facts: `fact_invoice`, `fact_payment`, `fact_work_event`, `fact_customer_activity`
- KPIs estratégicos calculados sobre el modelo dimensional
- Datasets para análisis avanzado y exportación

### Información que NUNCA debe poseer
- Datos de escritura operativos (facturas mutables, estado de WorkEvents)
- Credenciales de usuarios o JWT
- Colecciones MongoDB (no usa MongoDB — usa PostgreSQL Neon exclusivamente)
- Lógica de negocio del ERP (reglas de negocio, validaciones)

### Qué otros dominios puede consultar
- Ninguno directamente. Recibe datos vía ingesta desde eventos o via llamadas HTTP internas de `business-app/backend`.

### Qué dominios NUNCA debe modificar
- Absolutamente ninguno. BI es consumidor de datos — nunca upstream de nada.

### Domain Events que publica
Ninguno.

### Qué consume
Payloads de ingesta enviados por `business-app/backend` via HTTP interno (x-internal-service-token). Nunca consume Domain Events directamente (eso es responsabilidad de `business-app/backend` como gateway).

### Límite tecnológico y de seguridad
- Stack: Python + FastAPI + SQLAlchemy + asyncpg + PostgreSQL Neon
- Migrations: Alembic (async, sin psycopg2)
- Acceso: **solo** desde `business-app/backend` con `x-internal-service-token`
- El Frontend **nunca** llama a BI directamente
- `businessId` siempre viene resuelto desde `business-app/backend` (del JWT validado) — BI no valida JWT de usuarios
- Ubicación: `business-app/business-intelligence/` (separado del backend NestJS)

---

## BC-11 — Integration

### Por qué existe
Gestionar los adaptadores hacia sistemas externos — calendarios, bancos, webhooks, integraciones de terceros. Centralizar la complejidad de la integración externa.

### Qué problema resuelve
Cada sistema externo tiene su propio protocolo, autenticación y formato. Sin un dominio de Integration, esa complejidad se filtraría hacia los dominios operativos. Calendar, por ejemplo, no debería saber cómo hacer OAuth2 con Google.

### Información que posee
- Configuraciones de integración con sistemas externos
- Estado de cada integración (activa, error, última sync)
- Tokens encriptados de acceso

### Qué dominios NUNCA debe modificar
- Ninguno directamente — publica eventos que otros consumen.

---

## BC-12 — Platform

### Por qué existe
Gestionar el ERP como producto SaaS. Provee las capacidades de administración multi-tenant que el operador de la plataforma necesita.

### Qué problema resuelve
Alguien debe poder configurar la plataforma, gestionar los Businesses, definir las Posting Rules globales, y monitorear la salud del sistema. Platform es ese alguien.

### Información que posee
- Configuración global de la plataforma
- Posting Rules estándar por jurisdicción
- Chart of Accounts templates por país
- Configuración de la Platform Company (la empresa del operador SaaS)

### Qué dominios NUNCA debe modificar
- Datos de Businesses usuarios (nunca modifica facturas, pagos, o datos operativos de tenants)

---

## Mapa de dependencias entre Bounded Contexts

```
Identity
    │ UserRegistered
    ▼
Business ←──────────── (scope de todos los demás)
    │ BusinessCreated
    ▼
Customer
    │ CustomerCreated
    ▼
Work ←── Calendar (CalendarEventImported)
    │ WorkEventConfirmed
    ▼
Billing
    │ InvoiceSent · InvoiceOverdue · PaymentRecorded
    ├──────────────────────────────┐
    ▼                             ▼
Financial                    Communication
    │ FinancialTransactionCreated
    ▼
Accounting
    │ JournalEntryPosted
    ▼
Analytics BC-10 (consume todos) ← MongoDB, operativo, read models rápidos

            │ HTTP interno + x-internal-service-token
            │ (Business App backend actúa como gateway)
            ▼
Business Intelligence BC-13 ← PostgreSQL Neon, Python, dimensional warehouse
```

**Regla de dependencia:** Las flechas solo van hacia abajo y hacia los lados. Ningún dominio en la parte superior consume eventos de un dominio inferior. Billing no consume eventos de Accounting. Identity no consume eventos de Work.

**Regla de gateway BI:** `business-app/backend` es el único gateway hacia Business Intelligence. El Frontend nunca llama a BI directamente. BI no conoce JWT de usuarios — recibe `businessId` ya resuelto desde el backend.

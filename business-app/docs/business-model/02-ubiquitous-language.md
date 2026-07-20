# 02 — Ubiquitous Language

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial — Obligatorio en toda documentación y código

El Lenguaje Ubicuo es el vocabulario compartido y no ambiguo que todo el equipo usa — desarrolladores, diseñadores, contadores, y usuarios del negocio. Cuando una conversación usa el lenguaje incorrecto, la comunicación se rompe. Cuando el código usa el lenguaje incorrecto, el modelo se rompe.

Este documento es la ley del lenguaje del ERP. Los términos prohibidos no deben aparecer en ningún documento, nombre de variable, endpoint, mensaje de UI, ni conversación de diseño.

---

## Convenciones de este documento

**TÉRMINO OFICIAL** — el único término permitido
*Términos prohibidos* — sinónimos que generan ambigüedad

---

## CONCEPTOS CENTRALES DEL ERP

---

### BUSINESS

El negocio del usuario del ERP. La entidad que factura, trabaja, y lleva su contabilidad.

**Prohibidos:**
- *Company* — ambiguo (¿es el negocio del usuario o una empresa cliente?)
- *Organization* — demasiado genérico; no tiene semántica de negocio
- *Tenant* — es un término técnico de infraestructura, no de dominio
- *Account* — confunde con cuenta bancaria o cuenta de usuario
- *Firm* — anglicismo informal
- *Enterprise* — denota tamaño; una persona física también puede tener un Business
- *Client* — confunde con Customer
- *Empresa* — español; el lenguaje del sistema es inglés en el código

**Correcto:**
```
✅ "Este Invoice pertenece a un Business"
✅ "Cada Business tiene exactamente un FiscalProfile"
✅ "El businessId es el discriminador de tenant"

❌ "Esta factura pertenece a una Company"
❌ "Cada Organization tiene un perfil fiscal"
❌ "El tenantId identifica al usuario"
```

---

### CUSTOMER

La empresa o persona a quien el Business factura.

**Prohibidos:**
- *Client* — en inglés legal tiene connotaciones específicas; Customer es más preciso para este contexto
- *Buyer* — implica transacción spot; un Customer puede tener contratos recurrentes
- *Consumer* — denota consumidor final (B2C); el ERP es B2B/B2B2C
- *End Customer* — redundante
- *Recipient* — parcial (solo aplica al email; el Customer es más que eso)
- *Payer* — parcial (el Customer a veces no paga)
- *Contact* — un Contact es una persona dentro del Customer

**Correcto:**
```
✅ "El Customer recibe la Invoice"
✅ "Un Customer puede tener múltiples Contacts"
✅ "La Invoice siempre tiene un Customer"

❌ "El Client recibirá el email"
❌ "Registrar el Buyer"
❌ "El Payer no ha abonado"
```

---

### SUPPLIER

La empresa o persona de quien el Business compra bienes o servicios.

**Prohibidos:**
- *Vendor* — anglicismo; Supplier es el término contable estándar
- *Provider* — confunde con Integration Provider
- *Partner* — demasiado vago

---

### USER

Una persona con acceso al portal del ERP de un Business.

**Prohibidos:**
- *Member* — sugiere membresía, no rol operativo
- *Employee* — no todos los Users son empleados (el Accountant puede ser externo)
- *Staff* — es un Role específico, no el concepto general
- *Admin* — es un Role específico
- *Operator* — term técnico, no de negocio
- *Person* — demasiado genérico

**Nota sobre Roles:** Los Roles de Usuario sí tienen nombres específicos:
- `business_owner` — el propietario del Business
- `business_admin` — administrador operativo
- `accountant` — contador
- `staff` — personal operativo
- `viewer` — solo lectura
- `platform_admin` — administrador de la plataforma SaaS

**Correcto:**
```
✅ "El User con role business_owner puede anular Invoices"
✅ "Cada User pertenece a un Business"

❌ "El Admin puede anular Invoices"
❌ "El Member accede al portal"
```

---

### WORK EVENT

El registro de un período de trabajo realizado.

**Prohibidos:**
- *Shift* — denota trabajo por turnos; los freelancers no tienen "shifts"
- *Job* — ambiguo (¿es trabajo o una tarea técnica?)
- *Session* — denota reunión o consulta puntual
- *Task* — una tarea es algo pendiente; un WorkEvent es algo ya realizado
- *Entry* — demasiado genérico (una Entry puede ser cualquier cosa)
- *Timesheet Entry* — demasiado específico de un formato de registro
- *Log* — confunde con log técnico de sistema
- *Hour* — demasiado granular; un WorkEvent puede ser de varios días

**Correcto:**
```
✅ "El WorkEvent tiene duración de 8 horas"
✅ "El WorkEvent fue importado desde Google Calendar"
✅ "El WorkEvent está en estado confirmed"

❌ "El Shift fue registrado"
❌ "La Timesheet Entry corresponde a ese día"
❌ "El Job fue completado"
```

---

### INVOICE

El documento financiero formal por el cual el Business solicita el pago.

**Prohibidos:**
- *Bill* — en la contabilidad anglosajona, Bill es una factura de proveedor (lo que recibes, no lo que emites)
- *Statement* — un Statement es un resumen de cuenta; una Invoice es un documento de cobro específico
- *Quote* — una Quote es una cotización futura; una Invoice es por trabajo realizado
- *Receipt* — el Receipt confirma el pago; la Invoice solicita el pago
- *Factura* — español; el lenguaje del código es inglés

**Correcto:**
```
✅ "La Invoice fue enviada al Customer"
✅ "La Invoice tiene un total de $110 AUD"

❌ "El Bill fue generado"
❌ "El Statement fue enviado"
```

---

### PAYMENT

El registro de dinero recibido de un Customer.

**Prohibidos:**
- *Receipt* — el Receipt es el documento generado; el Payment es el hecho económico
- *Transfer* — es el mecanismo (cómo llegó el dinero); el Payment es el registro de que llegó
- *Collection* — denota un proceso o actividad; Payment es el hecho puntual
- *Remittance* — término específico del mundo bancario; no es el concepto del dominio
- *Transaction* — demasiado ambiguo (¿es un Payment, un bank transfer, un FinancialTransaction?)

**Correcto:**
```
✅ "El Payment fue registrado por $1,100"
✅ "El Payment cancela el saldo de la Invoice"

❌ "El Receipt fue procesado"
❌ "La Collection fue aplicada"
```

---

### RATE

El precio unitario acordado para el trabajo.

**Prohibidos:**
- *Price* — genérico; no implica que es por unidad de trabajo
- *Tariff* — connotación fiscal o de impuestos
- *Fee* — correcto en algunos contextos pero demasiado informal
- *Billing Rate* — redundante (el Rate siempre es de billing en este contexto)
- *Charge* — es el acto de cobrar, no el precio

**Correcto:**
```
✅ "La Rate estándar es $85/hora"
✅ "El Contract tiene tres Rates: estándar, overtime, y feriados"

❌ "El Price de la consulta es $85"
❌ "El Billing Rate es $85"
```

---

### CONTRACT

El acuerdo entre Business y Customer.

**Prohibidos:**
- *Agreement* — demasiado informal
- *Deal* — demasiado informal
- *Engagement* — término de consultoría; ambiguo
- *Project* — el Proyecto puede no tener contrato formal; el Contract es el documento del acuerdo
- *Retainer* — es un tipo de contrato (billing cycle), no el concepto general

**Correcto:**
```
✅ "El Contract define las Rates y el billing cycle"
✅ "El WorkEvent pertenece a un Contract"

❌ "El Project fue cerrado"
❌ "El Engagement con Acme Corp"
```

---

### FISCAL PROFILE

La identidad fiscal del Business (ABN, GST, banco).

**Prohibidos:**
- *Tax Profile* — demasiado estrecho (el FiscalProfile incluye más que impuestos)
- *Tax Info* — informal
- *Business Tax* — confuso con "impuesto al negocio"
- *ABN Details* — demasiado específico de Australia

---

### FISCAL PERIOD

El intervalo temporal de contabilidad.

**Prohibidos:**
- *Accounting Period* — correcto pero más largo; Fiscal Period es el término canónico
- *Tax Period* — demasiado estrecho (solo denota impuestos)
- *Quarter* — es un tipo de Fiscal Period, no el concepto general
- *Month* — ídem

---

### FINANCIAL TRANSACTION

El hecho económico normalizado que fluye al motor contable.

**Prohibidos:**
- *Transaction* — extremadamente ambiguo (¿base de datos? ¿pago? ¿transferencia?)
- *Entry* — confunde con JournalEntry
- *Record* — genérico
- *Event* — confunde con Domain Event o WorkEvent

**Correcto:**
```
✅ "InvoiceSent genera una FinancialTransaction de tipo INVOICE_ISSUED"
✅ "La FinancialTransaction es inmutable"

❌ "La Transaction fue creada"
❌ "El Financial Entry fue registrado"
```

---

### JOURNAL ENTRY

El asiento contable en el libro mayor.

**Prohibidos:**
- *Entry* — ambiguo (una "Entry" puede ser cualquier registro en cualquier tabla)
- *Ledger Entry* — redundante (un JournalEntry vive en el Journal que a su vez alimenta el Ledger)
- *Posting* — es la acción (to post = contabilizar); JournalEntry es el resultado
- *Booking* — anglicismo europeo; no es el término estándar australiano/americano

**Correcto:**
```
✅ "El JournalEntry tiene dos líneas: un débito y un crédito"
✅ "El JournalEntry es inmutable una vez posted"

❌ "El Posting fue creado"
❌ "El Ledger Entry refleja el pago"
```

---

### WORKFLOW EXECUTION

La instancia en ejecución de un Workflow automatizado.

**Prohibidos:**
- *Job* — confunde con trabajo de background técnico
- *Run* — demasiado técnico
- *Process* — ambiguo (¿proceso de negocio? ¿proceso del sistema operativo?)
- *Task* — confunde con tarea de usuario

**Correcto:**
```
✅ "La WorkflowExecution fue iniciada por InvoiceOverdue"
✅ "La WorkflowExecution está en estado waiting"

❌ "El Job fue lanzado"
❌ "El Process está corriendo"
```

---

### CALENDAR INTEGRATION

La conexión activa con un proveedor de calendario.

**Prohibidos:**
- *Calendar Sync* — es la acción; CalendarIntegration es la configuración
- *Google Sync* — demasiado específico de un proveedor
- *Calendar Connection* — CommunicationConnection ya usa "Connection" para otra cosa; usar Integration para diferenciarlo

---

### COMMUNICATION CONNECTION

La integración del Business con Communications Platform.

**Prohibidos:**
- *Email Config* — demasiado estrecho (también puede incluir SMS)
- *Notification Setup* — demasiado genérico
- *SMTP Config* — tecnológico, no conceptual

---

## TÉRMINOS DE ANALYTICS

| Oficial | Prohibidos |
|---|---|
| KPI | Metric, Indicator, Stat, Number |
| Analytics Dataset | Report Data, Query Result, Data Dump |
| Forecast | Prediction (aceptable como sinónimo informal), Projection |
| Read Model | View, Projection, Cache |
| Snapshot | Summary, Aggregate, Total |

---

## TÉRMINOS DE INTEGRACIÓN

| Oficial | Prohibidos |
|---|---|
| Integration Hub | Integration Layer, API Gateway, Connector Hub |
| IntegrationConnection | Integration Config, API Key Setup, OAuth Connection |
| SyncJob | Sync Run, Import Job, Batch Import |
| WebhookEndpoint | Webhook URL, Inbound Hook |

---

## TÉRMINOS DE ESTADOS

Los estados siempre se escriben en inglés y en minúsculas con snake_case en el código:

| Concepto | Estados oficiales |
|---|---|
| Invoice | `draft`, `sent`, `viewed`, `partial`, `paid`, `overdue`, `voided`, `cancelled` |
| WorkEvent | `draft`, `confirmed`, `invoiced`, `void` |
| Payment | `recorded`, `cleared`, `reversed` |
| Contract | `draft`, `active`, `completed`, `cancelled` |
| FiscalPeriod | `open`, `closed`, `locked` |
| IntegrationConnection | `active`, `needs_reauth`, `suspended`, `revoked` |
| FinancialTransaction | `pending`, `posted`, `rejected`, `reversed` |

---

## La regla de aplicación

**Documentación:** Todos los documentos de `docs/` usan los términos oficiales.

**Código:** Todos los nombres de variables, funciones, clases, colecciones, y endpoints usan los términos oficiales. Si un framework impone un nombre diferente (ej. un endpoint de Stripe usa `customer_id`), el código interno del ERP sigue usando `customerId` y hace la traducción en el Integration Hub.

**UI:** Todos los textos de interfaz de usuario — labels, mensajes, tooltips, errores — usan los términos oficiales en el idioma de la UI (inglés para la primera versión).

**Conversaciones:** Cuando alguien usa un término prohibido en una reunión, la corrección educada es inmediata. La consistencia del lenguaje se mantiene en todas las conversaciones, no solo en el código.

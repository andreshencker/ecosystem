# 02 — Ubiquitous Language

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

Este es el **diccionario oficial del dominio** de Invoice App. Todos los documentos, conversaciones, nombres de clases, campos de base de datos, endpoints de API y mensajes del sistema deben usar exactamente estos términos.

Cuando un término de este glosario aparece en el código con otro nombre, hay una deuda técnica activa.

---

## Términos del dominio

---

### Business

**Definición:** La empresa, negocio o cuenta propietaria dentro de Invoice App. Representa la identidad comercial del usuario — el ente que trabaja, cobra y emite facturas.

**Qué significa:**
- La cuenta principal creada en el registro.
- El propietario de todas las entidades de negocio (Customers, Contracts, WorkEvents, Invoices).
- El emisor de todas las facturas.
- La entidad con perfil fiscal, usuarios internos e integraciones.

**Qué NO significa:**
- No es un cliente. El Business no recibe facturas — las emite.
- No es un usuario. El Business tiene usuarios, pero no es un usuario.
- No es una empresa genérica. Es específicamente la empresa del propietario de la cuenta.

**Sinónimos prohibidos:** `Company` (en el dominio de negocio), `Organization`, `Tenant`, `Account` (en contexto de negocio), `Merchant`.

**Uso correcto:**
- "El Business de María García emite facturas a J Production."
- "El campo `businessId` identifica a qué Business pertenece esta entidad."

---

### User

**Definición:** Persona que tiene acceso autenticado a la aplicación. Pertenece a exactamente un Business.

**Qué significa:**
- Un humano con credenciales (email + contraseña).
- Tiene un rol que define sus permisos dentro del Business.
- Puede ser el propietario (Business Owner) o un colaborador invitado.

**Qué NO significa:**
- No representa a un Customer. Los Customers no tienen acceso a la aplicación.
- No es sinónimo de Business Owner — todos los Business Owners son Users, pero no todos los Users son Business Owners.

**Sinónimos prohibidos:** `Employee` (los usuarios no son necesariamente empleados), `Member`, `Account` (en este contexto).

---

### Business Owner

**Definición:** El User propietario del Business. Tiene acceso completo a todas las funciones, incluyendo configuración, gestión de usuarios y operaciones destructivas.

**Qué significa:**
- Creado en el momento del registro del Business.
- Solo puede existir un Business Owner activo por Business.
- No puede ser invitado — solo se crea mediante registro directo.

**Qué NO significa:**
- No es un administrador de la plataforma. El administrador de la plataforma es el Platform Admin.

**Sinónimos prohibidos:** `Admin`, `Owner` (ambiguo), `company_owner` (nombre técnico legado).

---

### Customer

**Definición:** La empresa o persona a quien el Business factura. La contraparte comercial. El destinatario de las facturas.

**Qué significa:**
- Puede ser una empresa (ej. J Production, Merivale) o una persona natural.
- Tiene datos de contacto de facturación.
- No tiene acceso a la aplicación.
- Puede tener múltiples Contracts con el Business.
- Recibe Invoices y las paga.

**Qué NO significa:**
- No es un Business de otro usuario en Invoice App.
- No es un User de la plataforma.
- No es un cliente de la plataforma Invoice App (eso es el Business Owner).

**Sinónimos prohibidos:** `Client` (preferir Customer; Client puede usarse en UI por cercanía al usuario, pero no en el dominio técnico), `Company` (un Customer no es una Company del sistema), `Employer` (un Customer no necesariamente emplea al Business Owner).

**Nota de diseño:** Usar `Client` en la interfaz de usuario está permitido donde sea más natural para el usuario. En el dominio técnico, código y documentación: siempre `Customer`.

---

### Contact

**Definición:** Una persona específica dentro de un Customer. El interlocutor de facturación.

**Qué significa:**
- Nombre, email, teléfono de la persona que recibe las facturas.
- Un Customer puede tener múltiples Contacts.
- El Contact principal es a quien se envían las comunicaciones.

**Qué NO significa:**
- No es un User del sistema.
- No es sinónimo de Customer — un Customer puede no tener Contact configurado.

**Sinónimos prohibidos:** `Recipient` (muy genérico), `BillingContact` (redundante).

---

### FiscalProfile

**Definición:** El perfil fiscal y financiero del Business. Centraliza los datos tributarios y bancarios que aparecen en las facturas.

**Qué significa:**
- ABN (Australian Business Number) del Business.
- Datos bancarios para recibir pagos (BSB + cuenta + nombre).
- Configuración de GST (si está registrado, qué tasa aplica).
- Prefijo del número de factura y contador secuencial.
- Condiciones de pago por defecto.
- Dirección legal de facturación.

**Qué NO significa:**
- No es el perfil del Customer — ese es parte del Customer directamente.
- No es configuración de cuenta de usuario — eso está en User.

**Sinónimos prohibidos:** `TaxProfile`, `BillingProfile`, `AccountingProfile`.

---

### Contract

**Definición:** El acuerdo de trabajo entre un Business y un Customer. Define el marco legal y comercial bajo el cual se generan WorkEvents y se emiten Invoices.

**Qué significa:**
- Tiene fecha de inicio y fecha de fin (puede ser abierto).
- Tiene un estado: draft, active, completed, cancelled.
- Contiene las Rates aplicables.
- Define el ciclo de facturación (semanal, quincenal, mensual, bajo demanda).
- Define las condiciones de pago (días para vencer la factura).

**Qué NO significa:**
- No es un documento legal PDF — es el registro del acuerdo en el sistema.
- No es una Invoice — el Contract es el marco; la Invoice es la factura puntual.

**Sinónimos prohibidos:** `Agreement`, `Project` (en v1; Project es una extensión futura), `Job`.

---

### Rate

**Definición:** La tarifa acordada en un Contract. Define el precio por unidad de trabajo (hora, día, semana, trabajo fijo).

**Qué significa:**
- Pertenece a un Contract.
- Un Contract puede tener múltiples Rates (estándar, fin de semana, horas extra, feriado, turno nocturno).
- Tiene un tipo: hourly, daily, weekly, fixed.
- Tiene un monto y una moneda.
- Una Rate puede ser la predeterminada del Contract.

**Qué NO significa:**
- No es el precio de una Invoice — la Invoice calcula su total a partir de las Rates aplicadas en los WorkEvents.
- No es una tarifa global del Business — cada Rate pertenece a un Contract específico.

**Sinónimos prohibidos:** `Price`, `Fee`, `Tariff` (aunque son correctos en español, usar Rate en el código), `HourlyRate` (Rate ya incluye el tipo).

---

### CalendarIntegration

**Definición:** La conexión entre el Business (o uno de sus Users) y un proveedor de calendario externo. Permite importar WorkEvents desde calendarios existentes.

**Qué significa:**
- Proveedor: Google Calendar, Apple Calendar, Outlook, iCal.
- Almacena credenciales OAuth2 de forma encriptada.
- Define dirección de sync (importar eventos al sistema).
- Registra el estado del último sync.

**Qué NO significa:**
- No es la integración con Communications — esa es CommunicationConnection.
- No sincronizan automáticamente sin intervención del sistema — el sync es disparado por el sistema.

**Sinónimos prohibidos:** `GoogleCalendarSync`, `CalendarSync` (muy genérico), `CalendarConnection` (preferir CalendarIntegration para diferenciarlo de CommunicationConnection).

---

### WorkEvent

**Definición:** Un turno trabajado, una sesión o un período de trabajo realizado. Es el **dato primario** del sistema en el flujo Shift Work.

**Qué significa:**
- Tiene fecha, hora de inicio y hora de fin.
- Tiene un descanso (break) que se descuenta de la duración.
- Está asociado a un Business, un User, un Customer, un Contract y opcionalmente una Rate.
- Tiene un estado: draft, confirmed, invoiced, void.
- Puede provenir de un calendar sync (tiene un `calendarEventId`) o ser creado manualmente.
- Solo puede pertenecer a un InvoiceItem (no se puede facturar dos veces).

**Qué NO significa:**
- No es un evento del sistema (eso es un Domain Event).
- No es solo "una tarea" — representa tiempo efectivamente trabajado con fecha y hora reales.
- No desaparece al facturarse — queda como registro histórico en estado `invoiced`.

**Sinónimos prohibidos:** `Shift` (puede usarse en UI, no en el dominio técnico), `TimeEntry`, `Session`, `Job` (ambiguo), `Event` (sin el prefijo Work es demasiado genérico).

---

### Invoice

**Definición:** El documento financiero formal emitido por un Business hacia un Customer. Resume el trabajo facturado o los servicios prestados y establece la deuda a cobrar.

**Qué significa:**
- Pertenece a un Business.
- Tiene un Customer destinatario.
- Tiene un número único por Business (generado secuencialmente).
- Tiene fecha de emisión y fecha de vencimiento.
- Tiene un estado: draft, sent, viewed, partial, paid, overdue, cancelled, void.
- Contiene uno o más InvoiceItems.
- Puede recibir uno o más Payments parciales.

**Qué NO significa:**
- No es sinónimo de InvoiceItem — la Invoice es el documento; los InvoiceItems son sus líneas.
- No es un contrato — el Contract es el acuerdo; la Invoice es el cobro puntual.

**Sinónimos prohibidos:** `Bill`, `Factura` (en el código técnico — en la UI sí puede usarse en español).

---

### InvoiceItem

**Definición:** Una línea dentro de una Invoice. Representa un concepto facturado — puede corresponder a un WorkEvent o ser un ítem manual.

**Qué significa:**
- Tiene descripción, cantidad, precio unitario y monto.
- Puede referenciar un WorkEvent (en el flujo Shift Work).
- Puede ser un ítem manual sin WorkEvent (para el flujo Service Sale o expenses).
- Pertenece a exactamente una Invoice.
- Al crearse y estar vinculado a un WorkEvent, ese WorkEvent pasa a estado `invoiced`.

**Qué NO significa:**
- No es sinónimo de Invoice.
- No puede existir sin Invoice.

**Sinónimos prohibidos:** `LineItem`, `InvoiceLine` (usar InvoiceItem para consistencia con el dominio).

---

### Payment

**Definición:** El registro de un pago recibido del Customer contra una Invoice. No procesa el pago — lo registra.

**Qué significa:**
- Está vinculado a una Invoice.
- Tiene monto, fecha, método de pago y referencia opcional.
- Un Payment puede ser parcial (menor al total de la Invoice).
- Cuando el total de Payments iguala el total de la Invoice, la Invoice pasa a `paid`.
- Tiene estado: pending, cleared, reversed.

**Qué NO significa:**
- No es un procesador de pagos (no integra con Stripe, etc. en v1).
- No es un depósito — es el registro del cobro recibido.
- No puede existir sin Invoice.

**Sinónimos prohibidos:** `Transaction`, `Receipt`, `Deposit`.

---

### CommunicationConnection

**Definición:** La configuración de la conexión entre un Business y la Communications Platform de Invoice App. Permite al Business enviar emails (facturas, recordatorios) usando sus propias credenciales de Communications.

**Qué significa:**
- Almacena el integration token de Communications de forma encriptada.
- Permite a Invoice App enviar comunicaciones en nombre del Business.
- Una empresa nueva no puede enviar comunicaciones propias hasta configurar esta conexión.
- Los eventos de plataforma (verificación de email, invitaciones) usan la conexión de la empresa base, no la del Business.

**Qué NO significa:**
- No es el historial de comunicaciones enviadas — eso es CommunicationLog.
- No es la configuración de SMTP directa — la comunicación va a través de la Communications Platform.

**Sinónimos prohibidos:** `EmailConfig`, `SMTPConnection`, `IntegrationConnection` (nombre técnico interno — en el dominio, usar CommunicationConnection).

---

### CommunicationLog

**Definición:** El registro local en Invoice App de cada comunicación solicitada a la Communications Platform. Representa el historial de emails y mensajes enviados desde el Business.

**Qué significa:**
- Un log inmutable creado cada vez que se solicita un envío a Communications.
- Registra: qué evento, a quién, cuándo, con qué resultado.
- Permite trazabilidad en el lado de Invoice App sin depender de Communications para auditoría.
- Complementa el ExecutionLog de la Communications Platform.

**Qué NO significa:**
- No es la Communications Platform — es el historial local.
- No es mutable — los logs no se actualizan, se crean.

**Sinónimos prohibidos:** `EmailLog`, `NotificationLog`, `AuditLog` (en este contexto).

---

### Platform Admin

**Definición:** El administrador de la plataforma Invoice App. Opera el sistema como SaaS, no como un Business usuario.

**Qué significa:**
- Tiene acceso global a todos los Businesses.
- Gestiona la empresa base (isPlatformCompany: true).
- Puede invitar otros Platform Admins.
- Accede al panel dual: Business App y administración de plataforma.

**Qué NO significa:**
- No es un Business Owner — no opera un negocio propio en la plataforma.
- No puede gestionar el negocio de un Business Owner sin permiso explícito.

**Sinónimos prohibidos:** `SuperAdmin`, `SystemAdmin`, `PlatformOperator`.

---

### Platform Company

**Definición:** La empresa base de Invoice App como producto SaaS. Es la entidad en el sistema que representa al operador de la plataforma (Grapifly o quien opere la instancia).

**Qué significa:**
- Marcada con `isPlatformCompany: true` — solo puede existir una.
- Tiene su propio perfil en Communications para enviar emails de plataforma.
- Sus credenciales se usan para verificación de email, recuperación de contraseña e invitaciones cuando el Business aún no tiene su propia CommunicationConnection.

**Qué NO significa:**
- No es un Business usuario — es el operador del sistema.
- No factura a Customers dentro de la app.

**Sinónimos prohibidos:** `BaseCompany`, `SaaSCompany`, `SystemCompany`.

---

## Reglas de uso del lenguaje

1. **En código:** usar siempre el término en inglés del glosario.
2. **En la UI:** se puede adaptar al español o usar sinónimos más amigables donde ayude al usuario (ej. "Cliente" para Customer en la interfaz).
3. **En documentación técnica:** usar el término exacto de este glosario.
4. **En conversaciones:** si se usa un sinónimo, aclarar el término oficial la primera vez.
5. **Cuando un término cambia:** actualizar este documento primero, luego el código.

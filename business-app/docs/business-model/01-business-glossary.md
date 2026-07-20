# 01 — Business Glossary

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

El glosario es el diccionario canónico del ERP. Cada término tiene una sola definición, un solo dueño, y un conjunto claro de reglas. Si un concepto no está aquí, no existe oficialmente en el sistema.

---

## BUSINESS

**Qué es:**
Un Business es la cuenta principal de un usuario del ERP. Representa a la empresa, contractor, o profesional independiente que emite facturas, gestiona trabajo, y lleva su contabilidad dentro del sistema. Es la unidad de tenancy — cada Business tiene sus propios datos completamente aislados de otros Businesses.

**Por qué existe:**
Sin Business, no habría forma de saber a quién pertenece una factura, un WorkEvent, o un asiento contable. Business es el anchor de toda la operación — la respuesta a la pregunta "¿de quién es este dato?".

**Qué NO es:**
- No es un Customer (el Business factura; el Customer es facturado)
- No es un User (el User es una persona; el Business es la entidad legal o comercial)
- No es un Tenant genérico — es específicamente el negocio que factura

**Dueño:** Business domain
**Puede consultar:** Todos los dominios (para verificar el businessId del dato)
**Nunca modifica:** Ningún otro dominio modifica el Business

### Business como Tenant Root

Business es el **Tenant Root** del ERP: el nodo raíz del árbol de ownership de todos los recursos del sistema. Sin un `businessId`, ningún recurso operativo puede existir.

```
Business (Tenant Root)
│
├── Identity Resources
│   ├── Users (con Roles)
│   └── Invitations
│
├── Customer Resources
│   ├── Customers
│   └── Contacts
│
├── Work Resources
│   ├── Contracts
│   ├── Rates
│   └── WorkEvents
│
├── Billing Resources
│   ├── Invoices
│   ├── InvoiceItems
│   └── Payments
│
├── Financial Resources
│   └── FinancialTransactions
│
├── Accounting Resources
│   ├── ChartOfAccounts
│   ├── JournalEntries
│   └── FiscalPeriods
│
├── Analytics Resources
│   ├── Workspace
│   ├── ReadModels
│   └── KPIs
│
├── Document Resources
│   └── StorageNamespace
│
├── Communication Resources
│   ├── Theme
│   ├── LayoutTemplates
│   ├── Domains
│   └── Events
│
└── Integration Resources
    └── IntegrationConnections
```

El `businessId` es el **discriminador universal** del ERP: el valor que separa los datos de un tenant de los de otro en toda query, toda validación de seguridad, y todo Domain Event de negocio.

**La garantía del Tenant Root se aplica en tres capas:**
1. El JWT del User autenticado siempre incluye `businessId`
2. Toda query sobre datos de negocio incluye `businessId` como filtro primario (BR-TEN-001)
3. Todo Domain Event de negocio incluye `businessId` en su payload

**Por qué "Business" y no "Organization", "Account", o "Tenant":**
"Business" comunica semántica de dominio: es la empresa o persona que factura, trabaja, y lleva sus cuentas. "Organization" y "Account" son términos técnicos sin esa semántica. "Tenant" es infraestructura, no dominio. Ver ADR-006 para la justificación completa de esta decisión.

---

## USER

**Qué es:**
Un User es una persona que tiene acceso al portal del ERP de un Business. Tiene un email, una contraseña, y un Role que determina qué puede hacer dentro del Business.

**Por qué existe:**
Permite que múltiples personas trabajen en el mismo Business con distintos niveles de acceso. Un Business Owner puede invitar a su contador como Accountant o a su empleado como Staff.

**Qué NO es:**
- No es el Business (el Business es la entidad; el User es la persona)
- No es un Customer (el Customer es externo; el User es interno)
- No es un Contact (el Contact pertenece a un Customer; el User pertenece al Business)

**Dueño:** Identity domain
**Puede consultar:** Business (para resolver el businessId), Work (para asignar WorkEvents)
**Nunca modifica:** Billing, Accounting, Financial, Work, Customer

---

## CUSTOMER

**Qué es:**
Un Customer es la empresa o persona a quien el Business factura. Es una entidad externa — no tiene acceso al portal del ERP. Tiene datos de identificación (nombre, dirección, ABN) y datos de contacto para facturación.

**Por qué existe:**
El Business necesita saber a quién emitir cada factura. El Customer es ese "a quién". Sin Customer, una factura sería un documento sin destinatario.

**Qué NO es:**
- No es un Business (el Business es quien factura; el Customer es quien recibe la factura)
- No es un User (el Customer no tiene acceso al sistema)
- No es un Supplier (el Supplier es de quien el Business compra; el Customer es a quien el Business vende)
- No es un Contact (el Contact es una persona dentro del Customer)

**Dueño:** Customer domain
**Puede consultar:** Work (para crear Contracts), Billing (para datos del destinatario)
**Nunca modifica:** Identity, Business, Billing, Accounting

---

## SUPPLIER

**Qué es:**
Un Supplier es una empresa o persona de quien el Business compra bienes o servicios. Genera Expenses o Supplier Bills que el Business debe pagar. Es el opuesto del Customer en la cadena comercial.

**Por qué existe:**
Para registrar las compras y gastos del Business — el lado de Accounts Payable. Sin Supplier, los gastos serían registros sin origen identificable.

**Qué NO es:**
- No es un Customer (el Customer debe dinero al Business; el Business le debe al Supplier)
- No es un User (el Supplier no tiene acceso al sistema)

**Disponible desde:** Fase 6 (Expenses + Accounts Payable)
**Dueño:** Accounts Payable domain (futuro)

---

## CONTRACT

**Qué es:**
Un Contract es el acuerdo entre el Business y un Customer que establece los términos bajo los cuales el Business realizará trabajo. Define el tipo de trabajo, las tarifas aplicables, el ciclo de facturación, y las fechas de vigencia.

**Por qué existe:**
Sin Contract, cada WorkEvent sería trabajo sin contexto comercial — sin tarifa, sin cliente asociado, sin ciclo de facturación. El Contract es quien transforma el tiempo trabajado en trabajo billable con reglas claras.

**Qué NO es:**
- No es un Document (el Contract puede tener un Document adjunto, pero el concepto de Contract es el acuerdo, no el PDF)
- No es una Invoice (el Contract es el marco; la Invoice es la facturación concreta)
- No es una Rate (el Contract contiene Rates; no es en sí mismo un precio)

**Dueño:** Work domain
**Puede consultar:** Billing (para asociar Invoices), Analytics
**Nunca modifica:** Billing, Accounting, Calendar

---

## RATE

**Qué es:**
Una Rate es el precio unitario acordado dentro de un Contract. Define cuánto cobra el Business por cada unidad de trabajo (hora, día, proyecto, milestone). Un Contract puede tener múltiples Rates para distintos tipos de trabajo (estándar, overtime, feriados).

**Por qué existe:**
Sin Rate, no se puede calcular el valor monetario de un WorkEvent. La Rate es el puente entre "tiempo trabajado" y "dinero a cobrar".

**Qué NO es:**
- No es un precio de lista global — pertenece a un Contract específico
- No es un impuesto — define el precio base sin GST/IVA
- No es una condición de pago (eso es PaymentTerms)

**Dueño:** Work domain (dentro del Contract)
**Puede consultar:** Billing (para calcular el InvoiceItem amount)
**Nunca modifica:** Billing, Accounting

---

## WORKEVENT

**Qué es:**
Un WorkEvent es el registro de un período específico de trabajo realizado por el Business para un Customer. Tiene una fecha, hora de inicio y fin, duración, tipo de trabajo, y un monto calculado basado en la Rate aplicable. Es la materia prima del ciclo de facturación.

**Por qué existe:**
Para transformar el tiempo trabajado en un hecho económico medible y facturable. Sin WorkEvent, no hay base para generar una Invoice con respaldo en trabajo real.

**Qué NO es:**
- No es una tarea (una tarea es algo pendiente; un WorkEvent es algo ya realizado)
- No es un calendario (un CalendarEvent puede originar un WorkEvent, pero no son lo mismo)
- No es un InvoiceItem (el InvoiceItem es la representación del WorkEvent en la factura)

**Dueño:** Work domain
**Puede consultar:** Billing (para crear InvoiceItems), Analytics
**Nunca modifica:** Billing, Accounting

---

## FISCAL PROFILE

**Qué es:**
El FiscalProfile es la identidad fiscal del Business. Contiene el número de identificación tributaria (ABN en Australia, NIF en España, BN en Canadá), la configuración de GST/IVA, la cuenta bancaria receptora de pagos, y las condiciones de pago por defecto. Es la información que aparece en el encabezado de cada factura.

**Por qué existe:**
Para separar la identidad comercial del Business (nombre, logo) de su identidad fiscal (ABN, GST). Esta separación permite que el perfil fiscal evolucione sin afectar la identidad del Business, y que los documentos fiscales (facturas, BAS) tengan siempre los datos correctos.

**Qué NO es:**
- No es el Business (el Business puede existir sin FiscalProfile configurado; las facturas no)
- No es una configuración de impuestos global (eso es MDM.TaxRate)
- No es una cuenta bancaria — referencia una cuenta, pero no es la cuenta en sí

**Dueño:** Business domain
**Puede consultar:** Billing (para datos del emisor de la factura), Accounting (política contable)
**Nunca modifica:** Billing, Work, Accounting

---

## INVOICE

**Qué es:**
Una Invoice es el documento financiero formal por el cual el Business solicita el pago de bienes o servicios al Customer. Tiene un número único, un emisor (Business), un destinatario (Customer), una fecha de emisión, una fecha de vencimiento, y un conjunto de líneas (InvoiceItems) que detallan qué se está cobrando.

**Por qué existe:**
Para formalizar jurídicamente la obligación de pago del Customer hacia el Business. Sin Invoice, el trabajo realizado no se convierte en deuda exigible. La Invoice es el hecho que da origen a la cadena financiera: Accounts Receivable → FinancialTransaction → JournalEntry.

**Qué NO es:**
- No es un contrato (el Contract establece el acuerdo; la Invoice formaliza lo que ya se realizó)
- No es un presupuesto (la Invoice es por trabajo ya realizado o formalizado, no por trabajo futuro)
- No es un JournalEntry (la Invoice genera asientos, pero no es un asiento)
- No es un recibo de pago (el recibo confirma que se pagó; la Invoice es la solicitud de pago)

**Dueño:** Billing domain
**Puede consultar:** Financial (para crear FinancialTransaction), Communication (para enviar al Customer), Analytics
**Nunca modifica:** Financial, Accounting, Work

---

## INVOICE ITEM

**Qué es:**
Un InvoiceItem es una línea dentro de una Invoice. Describe qué se cobró, en qué cantidad, a qué precio, y si aplica impuesto. Puede corresponder a un WorkEvent (trabajo realizado) o ser un ítem libre (honorario, material, servicio específico).

**Por qué existe:**
Para dar transparencia al Customer sobre qué compone el total de la factura. También es el mecanismo que conecta el trabajo realizado (WorkEvent) con el documento financiero (Invoice).

**Qué NO es:**
- No es un WorkEvent (el InvoiceItem referencia al WorkEvent, pero no es el registro del trabajo)
- No puede existir sin una Invoice

**Dueño:** Billing domain (dentro de Invoice)
**Puede consultar:** Financial (suma de items para FinancialTransaction)
**Nunca modifica:** Work, Accounting

---

## PAYMENT

**Qué es:**
Un Payment es el registro de dinero recibido por el Business de un Customer en contra de una Invoice. Tiene un monto, una fecha, un método de pago, y referencia a la Invoice que cancela (total o parcialmente).

**Por qué existe:**
Para cerrar el ciclo de cobranza: la Invoice establece la deuda, el Payment la cancela. Sin Payment, no sabríamos qué facturas están pagadas, cuánto se adeuda, ni cuál es el flujo de efectivo real del Business.

**Qué NO es:**
- No es la confirmación bancaria de una transferencia — es el registro en el sistema de que el dinero llegó
- No es un recibo de pago (aunque puede generar uno)
- No es un asiento contable — genera asientos a través de FinancialTransaction, pero no es en sí mismo un asiento

**Dueño:** Billing domain
**Puede consultar:** Financial (para crear FinancialTransaction de PAYMENT_RECEIVED), Analytics
**Nunca modifica:** Financial, Accounting

---

## EXPENSE

**Qué es:**
Un Expense es el registro de un gasto operativo del Business — un desembolso de dinero por bienes o servicios adquiridos. Tiene un monto, una categoría, un comprobante (Document adjunto), y puede requerir aprobación.

**Por qué existe:**
Para registrar el lado del gasto del Business — no solo lo que ingresa (Invoices, Payments) sino lo que egresa. Sin Expenses, el P&L sería incompleto y la visión financiera del negocio, parcial.

**Disponible desde:** Fase 6
**Dueño:** Expenses domain (futuro)

---

## FINANCIAL TRANSACTION

**Qué es:**
Una FinancialTransaction es la representación normalizada y financieramente significativa de cualquier hecho económico del negocio. Es el formato canónico que todos los módulos operativos usan para comunicar hechos financieros al Accounting Engine. Es inmutable desde el momento de su creación.

**Por qué existe:**
Para desacoplar los módulos operativos (que hablan en lenguaje de negocio: "se emitió una factura") del motor contable (que habla en lenguaje financiero: "hay un ingreso de $100 con $10 de GST"). La FinancialTransaction es el traductor universal.

**Qué NO es:**
- No es una Invoice (la Invoice es el documento; la FinancialTransaction es el hecho económico)
- No es un JournalEntry (el JournalEntry es el asiento contable; la FinancialTransaction es el input)
- No es un Payment (el Payment es el acto de pagar; la FinancialTransaction es la consecuencia financiera)

**Dueño:** Financial domain
**Puede consultar:** Accounting (para generar JournalEntries), Analytics
**Nunca modifica:** Billing, Work, Calendar, Identity, Business

---

## JOURNAL ENTRY

**Qué es:**
Un JournalEntry es el asiento contable formal que registra un hecho económico en el libro mayor. Tiene al menos dos líneas (un débito y un crédito), y la suma de los débitos siempre es igual a la suma de los créditos. Una vez registrado (posted), es absolutamente inmutable.

**Por qué existe:**
Para mantener el registro contable formal del negocio siguiendo el principio de partida doble. Es la fuente de verdad de la posición financiera del Business — lo que da origen al P&L, el Balance Sheet, y el BAS.

**Qué NO es:**
- No puede ser creado por ningún módulo excepto el Accounting Engine
- No puede modificarse una vez registrado
- No puede eliminarse

**Dueño:** Accounting domain (exclusivamente)
**Puede consultar:** Analytics (para proyecciones financieras), Reporting
**Nunca modifica:** Ningún dominio excepto el Accounting Engine propio

---

## CHART OF ACCOUNTS

**Qué es:**
El Chart of Accounts (Plan de Cuentas) es la estructura jerárquica de todas las cuentas contables del Business. Define qué cuentas existen (Activos, Pasivos, Patrimonio, Ingresos, Gastos) y bajo qué código se registra cada tipo de transacción. Existe exactamente uno por Business.

**Por qué existe:**
Para organizar el sistema de partida doble del Business. Sin Chart of Accounts, el Accounting Engine no sabría en qué cuenta registrar cada FinancialTransaction.

**Qué NO es:**
- No es una lista de precios
- No es un catálogo de productos o servicios
- No es específico de ninguna Invoice o pago en particular

**Dueño:** Accounting domain
**Puede consultar:** Financial (PostingEngine — para resolver códigos de cuenta), Analytics
**Nunca modifica:** Billing, Work, Business

---

## FISCAL PERIOD

**Qué es:**
Un FiscalPeriod es un intervalo de tiempo definido para propósitos contables y fiscales. Puede ser mensual, trimestral, o anual. Una vez cerrado, no admite nuevas transacciones. Una vez bloqueado (locked), ni siquiera puede reabrirse para consulta modificable.

**Por qué existe:**
Para dar coherencia temporal al libro mayor. Sin períodos fiscales, el General Ledger sería una corriente continua sin puntos de corte que permitan generar estados financieros, preparar declaraciones fiscales, o comparar períodos.

**Dueño:** Accounting domain
**Puede consultar:** Financial (para verificar que el período está abierto antes de registrar)
**Nunca modifica:** Billing, Work, Financial

---

## POSTING RULE

**Qué es:**
Una PostingRule es la definición de cómo transformar un tipo específico de FinancialTransaction en líneas de débito y crédito. Es una regla en forma de datos — no de código — que el Accounting Engine aplica en tiempo de ejecución.

**Por qué existe:**
Para que las reglas contables puedan cambiar (por ejemplo, cuando cambia la tasa de GST, o cuando se agrega soporte para una nueva jurisdicción) sin modificar el código del Accounting Engine.

**Qué NO es:**
- No es un algoritmo — es una configuración
- No es específica de un Business — es estándar por jurisdicción (con posibilidad de overrides)
- No es un asiento contable — es la plantilla para generarlos

**Dueño:** Platform (reglas estándar), Financial domain (overrides por Business)
**Puede consultar:** Financial (PostingEngine)
**Nunca modifica:** Billing, Work, Analytics

---

## DOCUMENT

**Qué es:**
Un Document es cualquier artefacto binario con significado de negocio que el sistema genera o recibe: un PDF de factura, un reporte financiero, un contrato, una imagen de recibo, una exportación de datos. No es el archivo en sí — es el registro que lo describe, lo versiona, y lo hace accesible de forma controlada.

**Por qué existe:**
Para centralizar el almacenamiento, el versionado, y el ciclo de vida de todos los archivos del ERP en un solo lugar. Sin Document Management, cada módulo almacenaría sus archivos de forma independiente, creando caos operativo y de auditoría.

**Qué NO es:**
- No es el archivo físico (el archivo vive en un StorageProvider; el Document es su registro)
- No es un JournalEntry ni un Invoice — puede representar su versión PDF, pero no es el concepto contable o financiero

**Dueño:** Document Management domain
**Puede consultar:** Communications (para adjuntar), Business Owner (para descargar)
**Nunca modifica:** Ningún dominio puede modificar el contenido de un Document — solo se crean versiones nuevas

---

## INTEGRATION CONNECTION

**Qué es:**
Una IntegrationConnection es el registro activo de que un Business tiene autorización para intercambiar datos con un sistema externo específico. Almacena las credenciales cifradas, el estado de la conexión, y el historial de sincronizaciones. Representa la "llave" que le permite al ERP hablar con Google Calendar, Stripe, Xero, o cualquier otro sistema externo.

**Por qué existe:**
Para que el Integration Hub pueda actuar en nombre del Business cuando se comunica con sistemas externos, sin que los módulos operativos necesiten conocer los detalles técnicos de esa comunicación.

**Dueño:** Integration Hub domain
**Puede consultar:** Calendar, Automation (para saber si una integración está disponible)
**Nunca modifica:** Billing, Accounting, Work

---

## WORKFLOW

**Qué es:**
Un Workflow es la definición de una secuencia automatizada de acciones que se ejecuta en respuesta a un Trigger. No es el proceso de negocio en sí — es la orquestación de llamadas a los dominios que implementan ese proceso.

**Por qué existe:**
Para separar la lógica de "cuándo y en qué orden hacer algo" de la lógica de "cómo hacerlo". Sin Automation, cada dominio tendría que hardcodear las secuencias de acciones que le corresponden, creando acoplamiento entre módulos.

**Qué NO es:**
- No es un proceso de negocio (el proceso de negocio es conceptual; el Workflow es la automatización)
- No es un Event Handler (el Handler reacciona a un evento; el Workflow orquesta múltiples acciones en el tiempo)
- No puede implementar lógica de negocio — solo puede invocar acciones en los dominios correspondientes

**Dueño:** Automation domain
**Puede consultar:** Todos los dominios (para ejecutar sus Actions)
**Nunca modifica:** Accounting, Financial (directamente)

---

## KPI

**Qué es:**
Un KPI (Key Performance Indicator) es un valor escalar que resume una dimensión del desempeño del Business en un período dado. Es el resultado de un cálculo sobre datos históricos — un número con contexto (período, moneda, businessId). Ejemplos: Gross Revenue del mes, Collections Rate del trimestre, Effective Hourly Rate del año.

**Por qué existe:**
Para que el Business Owner pueda evaluar el desempeño de su negocio sin procesar datos crudos. Un KPI responde "¿cómo estoy?" con un solo número.

**Qué NO es:**
- No es un Dataset (un Dataset tiene múltiples filas; un KPI es un solo valor)
- No es un objetivo (el KPI mide la realidad; el objetivo es una aspiración)
- No es un gráfico (el KPI es el número; el gráfico es la representación visual)

**Dueño:** Analytics domain
**Puede consultar:** Business App (para mostrar en el dashboard)
**Nunca modifica:** Ningún dominio operativo

---

## ANALYTICS DATASET

**Qué es:**
Un Analytics Dataset es una colección estructurada de datos — filas y columnas — que Analytics produce en respuesta a una consulta. Es la respuesta a preguntas como "Revenue por mes" o "Horas por cliente". El Frontend decide cómo visualizarlo (tabla, gráfico, exportar).

**Por qué existe:**
Para proveer datos estructurados que el Business Owner y su equipo pueden analizar. A diferencia de un KPI (un número), un Dataset permite explorar la composición del desempeño.

**Qué NO es:**
- No es un gráfico ni un componente visual
- No es datos en tiempo real de las colecciones operativas
- No es un reporte en PDF (un Dataset puede ser la fuente de un reporte, pero no es el reporte)

**Dueño:** Analytics domain (produce los Datasets), Business App (decide cuáles consultar y cómo usarlos)
**Puede consultar:** Frontend (a través de Business App)
**Nunca modifica:** Ningún dominio operativo

---

## FORECAST

**Qué es:**
Un Forecast es una proyección probabilística de una métrica futura basada en el análisis de datos históricos. Responde preguntas como "¿Cuánto debería facturar el próximo trimestre?" con un valor esperado y un rango de confianza.

**Por qué existe:**
Para que el Business Owner pueda planificar con base en tendencias objetivas — no solo intuición. Un Forecast permite anticipar problemas de flujo de caja, planificar inversiones, o ajustar la carga de trabajo.

**Qué NO es:**
- No es un compromiso ni una garantía
- No es un objetivo definido por el Business — es una proyección del sistema basada en datos
- No es un presupuesto (el presupuesto es intencional; el Forecast es predictivo)

**Disponible desde:** Analytics Fase 3
**Dueño:** Analytics domain

---

## CALENDAR INTEGRATION

**Qué es:**
Una CalendarIntegration es la conexión activa entre el Business (o un User específico) y un proveedor de calendario externo (Google Calendar, Outlook, Apple). Permite que los eventos del calendario se importen automáticamente como WorkEvents draft.

**Por qué existe:**
Para eliminar la fricción de registrar el tiempo doblemente — primero en el calendario y luego en el ERP. Los freelancers y contractors ya viven en sus calendarios; la integración lleva ese tiempo al ERP sin duplicación de esfuerzo.

**Qué NO es:**
- No es el calendario en sí (Google Calendar es el servicio externo; CalendarIntegration es la conexión que el ERP mantiene)
- No es un WorkEvent (el CalendarEvent puede originar un WorkEvent, pero no son lo mismo)

**Dueño:** Calendar domain
**Puede consultar:** Work (para crear WorkEvents desde los eventos importados)
**Nunca modifica:** Billing, Accounting, Financial

---

## COMMUNICATION CONNECTION

**Qué es:**
Una CommunicationConnection es la integración que un Business tiene configurada con la Communications Platform. Le permite al Business enviar emails, SMS, y otras notificaciones a sus Customers y a sus propios Usuarios a través de proveedores de comunicación configurados.

**Por qué existe:**
Para que el Business pueda enviar sus propias comunicaciones (facturas, recordatorios, bienvenidas) con su propio proveedor de email — no el de la plataforma. Es la personalización del canal de salida del Business.

**Dueño:** Communication domain (Business App side)

---

## BUSINESS PERSONALITY

**Qué es:**
La Business Personality es la capa de configuración operativa que define cómo se comporta un Business en el ERP — independiente de su identidad fiscal (FiscalProfile) y de su identidad de seguridad (Identity).

La Personality incluye todo lo que hace que un Business sea único en su operación diaria: zona horaria, semana laboral, moneda de operación, feriados, formato de numeración de facturas, preferencias de comunicación, y ajustes de analytics.

**Por qué existe:**
Sin esta separación, el FiscalProfile acumularía responsabilidades heterogéneas: ABN (dato fiscal) junto con timezone (dato operativo), cuenta bancaria (dato fiscal) junto con idioma (dato cultural). La Business Personality es la capa que toma todo lo que NO es fiscal, legal, ni de seguridad.

**Qué incluye:**

| Categoría | Atributos |
|---|---|
| Localización | timezone, locale, currency, date format, number format |
| Semana laboral | días hábiles, horario laboral, reglas de overtime |
| Feriados | calendario de feriados públicos por jurisdicción + feriados propios del Business |
| Branding | logo URL, color principal, texto legal en el pie de factura |
| Facturación | invoice number prefix, días de vencimiento por defecto, preferencia de GST incluido/excluido |
| Comunicaciones | reply-to email, idioma de notificaciones, URL de unsubscribe |
| Analytics | KPIs del dashboard principal, moneda de reporting |
| Feature flags | módulos habilitados según el plan de suscripción |

**Qué NO es:**
- No es el FiscalProfile (ABN, GST, cuenta bancaria — identidad fiscal y legal)
- No es Identity (credenciales, tokens, roles — identidad de seguridad)
- No es configuración de la plataforma SaaS (eso es Platform Admin territory)

**Dueño:** Business domain
**Puede consultar:** Todos los dominios (para personalizar comportamiento según la Personality del Business)
**Nunca modifica:** Ningún otro dominio modifica la Business Personality

---

## COMPANY EVENT CATALOG

**Qué es:**
Un Company Event Catalog es el catálogo de eventos de negocio que un Business posee y puede configurar. Define qué eventos de negocio existen para ese Business (`invoice.sent`, `payment.received`, `contract.created`), qué templates están asociados a cada evento, y qué notificaciones o automatizaciones se disparan cuando ocurren.

Cada Business tiene su propio Company Event Catalog, creado automáticamente durante el Business Provisioning con un conjunto de dominios y eventos por defecto (ver DEC-017). El Business puede extender su catálogo agregando nuevos dominios de negocio a medida que los módulos se habilitan.

**Distinción crítica respecto a Platform Events:**
Los Platform Events (`system.*`, `security.*`) pertenecen a la plataforma. Los Company Events pertenecen al Business. Un Business puede tener un evento `security.company_user_invitation` en su catálogo — pero ese es un Company Event de ese Business, no el Platform Event del sistema global. Ver DEC-017 §6 para la separación completa.

**Por qué existe:**
Para garantizar que la configuración de comunicaciones y automatizaciones de un Business sea completamente aislada de la de otros Businesses, y para separar los eventos del sistema de los eventos de negocio configurables por el Business Owner.

**Qué NO es:**
- No es el Domain Event Bus técnico (el Event Bus es infraestructura; el Company Event Catalog es configuración de negocio)
- No es global — cada Business tiene su propio catálogo independiente

**Dueño:** Communications Platform (provisiona el catálogo base), Business (extiende y configura su catálogo)
**Puede consultar:** Automation (para triggear Workflows), Communications (para enviar notificaciones)
**Nunca modifica:** Accounting, Financial, Work, Billing

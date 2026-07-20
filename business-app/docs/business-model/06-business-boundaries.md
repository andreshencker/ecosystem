# 06 — Business Boundaries

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

Las Business Boundaries definen lo que cada parte del sistema NO puede hacer. Son las fronteras explícitas de responsabilidad de cada dominio — las reglas de "no cruzar esta línea bajo ninguna circunstancia".

Si el documento 05 responde "¿qué puede hacer el ERP?", este documento responde "¿qué no puede hacer cada parte?".

Las fronteras no son restricciones de implementación ni de rendimiento. Son restricciones de diseño de negocio. Cada frontera existe porque cruzarla genera acoplamiento incorrecto, viola la responsabilidad de un dominio, o introduce ambigüedad semántica que se convierte en bugs y deuda de modelo.

---

## Principios de las Boundaries

**Principio 1 — Cada frontera tiene una razón de negocio:**
No hay fronteras arbitrarias. Cada "no puede" documenta por qué existe la restricción.

**Principio 2 — Las fronteras son más permanentes que el código:**
El código puede refactorizarse en días. Una frontera cruzada deja deuda de modelo que puede tardar años en revertirse, si es que puede revertirse.

**Principio 3 — Cruzar una frontera requiere un canal explícito:**
Si el dominio A necesita datos del dominio B, la solución correcta es comunicación a través de Domain Events o contratos publicados — nunca acceso directo a colecciones o servicios internos de B.

**Principio 4 — Las fronteras aplican al lenguaje, no solo al código:**
No basta con que el código no cruce la frontera. Si en un documento, en una reunión, o en un nombre de variable se dice "el Accounting modifica el Billing", hay un problema de modelo que precede al código.

---

## Mapa de fronteras

```
┌──────────────────────────────────────────────────────────────────┐
│  DATOS DE NEGOCIO — todo dato tiene un businessId               │
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ IDENTITY │    │ BUSINESS │    │ CUSTOMER │    │   WORK   │  │
│  │          │    │          │    │          │    │          │  │
│  │ no posee │    │ no posee │    │ no crea  │    │ no emite │  │
│  │ datos de │    │ Customers│    │ Invoices │    │ asientos │  │
│  │ negocio  │    │ ni Work  │    │ ni Work  │    │contables │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ BILLING  │    │ FINANCIAL│    │ACCOUNTING│    │ANALYTICS │  │
│  │          │    │          │    │          │    │          │  │
│  │ no escribe│   │ no conoce│    │ no conoce│    │ nunca    │  │
│  │ Journal  │    │ Invoices │    │ Invoices │    │ escribe  │  │
│  │ ni Ledger│    │ ni Work  │    │ ni Work  │    │ nada     │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## BND-01 — Identity

### Lo que Identity nunca puede hacer

| Prohibición | Razón |
|---|---|
| Leer o escribir datos financieros (Invoices, Payments, JournalEntries) | Identity gestiona acceso — no contenido de negocio |
| Conocer la estructura de Customers de un Business | Los Customers pertenecen al dominio Customer, no a Identity |
| Tomar decisiones de autorización basadas en el estado de una Invoice | La autorización se basa en Role — nunca en estado del negocio |
| Almacenar información personal de Customers | Los datos personales de Customers pertenecen al Customer domain |
| Modificar datos de ningún otro dominio | Identity publica eventos — no escribe en otros dominios |
| Resolver el businessId a partir del estado de un Invoice o Contract | El businessId se deriva del User autenticado — no de los datos del negocio |

### Por qué esta frontera existe
Identity es la puerta de entrada al sistema. Si Identity sabe "demasiado" sobre el negocio (sus Customers, sus Invoices, su posición financiera), se convierte en un punto de acoplamiento que impide que los dominios evolucionen de forma independiente.

---

## BND-02 — Business

### Lo que Business nunca puede hacer

| Prohibición | Razón |
|---|---|
| Poseer o gestionar Customers, Contacts, o Suppliers | Los Customers pertenecen al dominio Customer |
| Poseer Contracts, Rates, o WorkEvents | El Work domain posee estos conceptos |
| Poseer Invoices, InvoiceItems, o Payments | El Billing domain posee estos conceptos |
| Crear JournalEntries | Solo el Accounting Engine puede crearlos |
| Conocer el saldo del General Ledger | Business gestiona configuración — no posición financiera |
| Modificar su `businessKey` después de la creación | El businessKey es inmutable una vez asignado (BR-BUS-002) |
| Ser eliminado permanentemente sin período de gracia | Solo puede archivarse — los datos tienen retención (BR-BUS-003) |
| Haber más de un `isPlatformCompany: true` en toda la plataforma | Solo existe un Business operador de la plataforma SaaS (BR-BUS-004) |

### Por qué esta frontera existe
Business es el anchor de tenancy — su responsabilidad es ser el root de ownership de todos los datos, no gestionar esos datos directamente. Si Business gestionara Customers o Invoices, se convertiría en un mega-dominio que concentra responsabilidades y se vuelve imposible de mantener.

---

## BND-03 — Customer

### Lo que Customer nunca puede hacer

| Prohibición | Razón |
|---|---|
| Acceder al portal del ERP | Los Customers son externos — no tienen credenciales de acceso |
| Crear, modificar, o anular Invoices | Las Invoices son del Business, no del Customer |
| Iniciar o cerrar Contracts | Los Contracts son acuerdos del Business — el Customer no los gestiona en el ERP |
| Ver datos de otros Customers del mismo Business | Aislamiento de datos interno del Business |
| Ser compartido entre Businesses | Un Customer pertenece a exactamente un Business — permanentemente (BR-CUS-001) |
| Modificar sus propios datos en el sistema | No tiene acceso; sus datos son gestionados exclusivamente por el Business |

### Por qué esta frontera existe
El Customer es un concepto de negocio externo al ERP. La confusión de tratar al Customer como si fuera un User del sistema es uno de los errores de diseño más frecuentes en sistemas de facturación y genera problemas graves de privacidad, seguridad, y modelo.

---

## BND-04 — Work

### Lo que Work nunca puede hacer

| Prohibición | Razón |
|---|---|
| Crear Invoices | Billing crea Invoices — Work solo provee WorkEvents billables |
| Registrar Payments | Los Payments pertenecen a Billing |
| Crear JournalEntries | Solo el Accounting Engine puede crearlos |
| Acceder al General Ledger | Work no necesita conocer la posición financiera del Business |
| Modificar InvoiceItems de una Invoice ya enviada | Una vez en estado `sent`, la Invoice es un compromiso con el Customer |
| Calcular impuestos (GST) sobre WorkEvents | Los impuestos son responsabilidad de Billing con configuración de FiscalProfile |
| Conocer si un Payment fue recibido por una Invoice | Work no necesita saber si se cobró — solo si el WorkEvent fue incluido en una Invoice |
| Retroalimentar el monto calculado de un WorkEvent histórico | Los hechos del pasado son inmutables (BR-RAT-003) |

### Por qué esta frontera existe
Work es el dominio del tiempo y del trabajo — no del dinero. Mezclar la lógica del trabajo con la lógica financiera crearía un dominio imposible de probar, mantener, y extender de forma independiente cuando lleguen Expenses, Payroll, e Inventory.

---

## BND-05 — Calendar

### Lo que Calendar nunca puede hacer

| Prohibición | Razón |
|---|---|
| Confirmar WorkEvents automáticamente | La confirmación es una decisión humana — el Calendar solo propone WorkEvents `draft` |
| Crear Invoices | Calendar no conoce el contexto de billing ni las condiciones de pago |
| Escribir en el proveedor de calendario externo | La integración es unidireccional: el ERP importa, no publica en Google Calendar |
| Acceder a datos de Billing, Accounting, o Financial | Calendar solo conoce Work — y solo para crear WorkEvents |
| Deduplicar basado en monto o valor financiero | La deduplicación de Calendar usa `externalEventId` — no contenido económico |
| Marcar un WorkEvent como billable | La decisión de si un evento es billable pertenece al Work domain y al User |

---

## BND-06 — Billing

### Lo que Billing nunca puede hacer

| Prohibición | Razón |
|---|---|
| Escribir directamente en el Journal o el General Ledger | Toda consecuencia contable pasa por FinancialTransaction → Accounting Engine (BR-INV-007) |
| Eliminar una Invoice | Las Invoices nunca se eliminan — solo se anulan o cancelan (BR-INV-008) |
| Modificar InvoiceItems después del estado `sent` | La Invoice enviada es un compromiso formal con el Customer (BR-INV-006) |
| Aplicar un Payment a una Invoice `voided` o `cancelled` | Una Invoice anulada no puede recibir pagos (BR-PAY-005) |
| Modificar WorkEvents, Contracts, o Rates | Billing consume Work — no lo modifica |
| Calcular el saldo financiero general del Business | Billing conoce el `amountDue` de sus Invoices — no la posición financiera global |
| Conocer el Plan de Cuentas del Business | Billing no sabe a qué cuenta contable mapea cada transacción |
| Generar un invoiceNumber duplicado dentro del mismo Business | El invoiceNumber es único e inmutable (BR-INV-005) |

### Por qué esta frontera existe
Billing y Accounting son dominios distintos por una razón que existe en toda empresa real: el departamento de facturación y el de contabilidad son funciones separadas. El primero emite documentos comerciales; el segundo hace los asientos. Esta separación debe reflejarse en el modelo del sistema.

---

## BND-07 — Financial

### Lo que Financial nunca puede hacer

| Prohibición | Razón |
|---|---|
| Conocer o consultar Invoices, Payments, WorkEvents, o Contracts | Financial recibe FinancialTransactions normalizadas — es deliberadamente ciego a los detalles del negocio |
| Crear JournalEntries directamente | Solo el Accounting Engine los crea |
| Modificar datos de cualquier dominio operativo | Financial es un canal de comunicación — no un modificador de estado |
| Consolidar FinancialTransactions de múltiples Businesses | Cada FinancialTransaction tiene su propio `businessId` |
| Procesar una FinancialTransaction con FiscalPeriod cerrado | El período fiscal controla qué transacciones pueden registrarse (BR-FIN-004) |
| Crear dos FinancialTransactions para el mismo `(referenceId, type)` | La idempotencia es garantizada (BR-FIN-005) |

### Por qué esta frontera existe
Financial es el traductor universal entre el lenguaje del negocio (Invoices, Payments) y el lenguaje contable (FinancialTransactions). Si Financial supiera demasiado del negocio, perdería su generalidad como traductor universal que en el futuro debe recibir Expenses, Payroll, Assets — conceptos que hoy no existen.

---

## BND-08 — Accounting

### Lo que Accounting nunca puede hacer

| Prohibición | Razón |
|---|---|
| Consultar Invoices, Payments, WorkEvents, ni ningún dato de Billing o Work | Accounting trabaja con FinancialTransactions — no con documentos de negocio (BR-ACC-005) |
| Modificar datos de ningún otro dominio | Accounting es la fuente de verdad contable — escribe solo en sus propias colecciones (BR-ACC-006) |
| Modificar un JournalEntry ya `posted` | La inmutabilidad contable es absoluta (BR-ACC-003) |
| Reabrir un FiscalPeriod `locked` | El bloqueo definitivo no tiene vuelta atrás (BR-ACC-007) |
| Crear FinancialTransactions | Solo los dominios operativos crean FinancialTransactions |
| Tomar decisiones de negocio | Accounting ejecuta PostingRules — no interpreta el significado de negocio de las transacciones |
| Generar documentos externos (PDFs, emails) | Accounting produce asientos — Document Management genera los documentos |

### Por qué esta frontera existe
El principio de partida doble es inviolable en contabilidad. Un Accounting Engine que modificara datos de Billing podría crear inconsistencias entre el libro contable y los documentos comerciales — una situación que ninguna auditoría toleraría y que es extremadamente difícil de detectar y corregir.

---

## BND-09 — Analytics

### Lo que Analytics nunca puede hacer

| Prohibición | Razón |
|---|---|
| Modificar datos de cualquier dominio operativo | Analytics es estrictamente de lectura — sin excepción (BR-ANA-001) |
| Consultar directamente las colecciones de escritura de otros dominios | Trabaja sobre su propio Analytics Store separado (BR-ANA-002) |
| Ser la fuente de verdad de ningún dato | Analytics produce derivados — la fuente de verdad siempre es el dominio origen |
| Producir visualizaciones o componentes de UI | Analytics produce datasets — el Frontend decide cómo visualizarlos (BR-ANA-004) |
| Bloquear operaciones de negocio esperando resultados de ML | Los modelos de ML son opcionales y asíncronos (BR-ANA-005) |
| Escribir en el General Ledger | Analytics puede leer el estado del Ledger vía eventos — nunca escribir en él |

### Por qué esta frontera existe
Un sistema de Analytics que puede modificar datos operativos es una fuente de bugs difícil de detectar. Analytics debe poder fallar, tener datos desactualizados, o estar completamente offline sin que ninguna operación del negocio se vea afectada.

---

## BND-10 — Document Management

### Lo que Document Management nunca puede hacer

| Prohibición | Razón |
|---|---|
| Modificar el contenido de un DocumentVersion una vez creado | Las versiones son inmutables — los cambios crean nuevas versiones (BR-DOC-002) |
| Eliminar documentos financieros antes del período de retención | Obligación legal de retención de 7 años (BR-DOC-003) |
| Exponer la URL física del StorageProvider | Solo expone un `documentId` — la URL se genera como token temporal seguro (BR-DOC-001) |
| Almacenar secrets, contraseñas, o credenciales de integración | Document Management es para documentos de negocio — no para infraestructura de seguridad |
| Conocer el significado contable o financiero de un documento | Document Management almacena archivos — no interpreta su contenido |

---

## BND-11 — Automation

### Lo que Automation nunca puede hacer

| Prohibición | Razón |
|---|---|
| Implementar lógica de negocio directamente | Un Workflow solo invoca Actions en los dominios responsables — no las ejecuta él mismo (BR-AUT-001) |
| Modificar datos de Accounting o Financial directamente | Automation no puede bypassar el canal FinancialTransaction → Accounting Engine (BR-AUT-003) |
| Garantizar exactamente una ejecución en caso de falla del sistema | Automation garantiza at-least-once; la idempotencia es responsabilidad de las Actions |
| Conocer el resultado de negocio de las Actions que invoca | Automation sabe si una Action "completó técnicamente" — no si el resultado de negocio es correcto |
| Generar el mismo WorkflowExecution dos veces para el mismo Domain Event | La idempotencia está garantizada por ExecutionKey (BR-AUT-002) |

---

## BND-12 — Integration Hub

### Lo que Integration Hub nunca puede hacer

| Prohibición | Razón |
|---|---|
| Almacenar credenciales de integraciones en texto plano | Siempre cifradas con AES-256-GCM (BR-INT-001) |
| Implementar lógica de negocio del ERP | Solo normaliza y traduce formatos externos (BR-INT-002) |
| Procesar el mismo evento externo más de una vez | Idempotencia por deduplication key (BR-INT-003) |
| Escribir directamente en Accounting, Financial, o Billing con datos externos | Todo dato externo entra por los canales de dominio correctos |
| Decidir si un dato externo es válido para el negocio | El Integration Hub traduce — la validación de negocio pertenece al dominio receptor |

---

## BND-13 — Multi-tenancy (frontera transversal)

### Fronteras que aplican a todos los dominios sin excepción

| Prohibición | Regla | Razón |
|---|---|---|
| Query sin `businessId` como filtro primario | BR-TEN-001 | Violación de seguridad de multi-tenancy |
| `businessId` tomado del body en lugar del JWT | BR-TEN-002 | El businessId siempre proviene del token de seguridad autenticado |
| Transferir un dato de un `businessId` a otro | BR-TEN-003 | El ownership de datos es permanente e irrevocable |
| Platform Admin operando como Business Owner | BR-TEN-004 | Todo acceso de Platform Admin a datos de tenants queda auditado |

---

## Cómo responder cuando hay tensión en una frontera

Cuando surge la necesidad de que el dominio A acceda a datos del dominio B, la pregunta correcta no es "¿cómo le damos acceso?". La pregunta correcta es:

```
¿Por qué A necesita datos de B?
  │
  ├── Necesita reaccionar a un evento de B
  │     → Solución: Domain Event publicado por B, consumido por A
  │
  ├── Necesita datos de referencia de B (read-only)
  │     → Solución: Read Model o contrato publicado por B
  │
  └── Necesita modificar datos de B
        → Esto indica un error de diseño: revisar quién es el dueño del dato
        → Si el dato debería estar en A, moverlo
        → Si legítimamente pertenece a B, A no debe modificarlo — B lo hace a través de un comando
```

**Regla adicional:** El dominio A nunca debe depender de la estructura interna de B. A tiene su propia representación del dato que necesita (anti-corruption layer). Si la estructura interna de B cambia, A no debe verse afectado.

---

## Fronteras que se anticipan para fases futuras

A medida que el ERP crece, nuevos dominios crearán nuevas fronteras. Las más importantes anticipadas:

| Fase | Dominio futuro | Fronteras clave anticipadas |
|---|---|---|
| 6 | Expenses | No puede modificar WorkEvents, Contracts, ni datos de Work |
| 6 | Accounts Payable | No accede al ChartOfAccounts directamente — usa FinancialTransaction |
| 7 | Banking | No crea JournalEntries — solo provee BankTransactions para reconciliar |
| 7 | Reconciliation | No modifica Payments ni SupplierPayments — la reconciliación es un match, no una corrección |
| 9 | Payroll | No modifica el ChartOfAccounts — solo usa las cuentas existentes |
| 10 | Inventory | Solo extiende InvoiceItem para referenciar Products — no modifica la lógica de Billing |

---

## Consecuencias de cruzar una frontera

Un cruce de frontera no documentado ni autorizado tiene consecuencias predecibles:

```
Corto plazo:
  El feature funciona técnicamente.

Mediano plazo:
  El dominio A comienza a acumular conocimiento sobre B.
  Los cambios en B requieren cambios coordinados en A.
  Los tests de A empiezan a necesitar datos de B para pasar.

Largo plazo:
  A y B no pueden probarse de forma independiente.
  A y B no pueden desplegarse de forma independiente.
  El equipo teme cambiar B porque "rompe A".
  El sistema tiene un "mega-dominio" oculto que nadie sabe dónde termina.
```

Cuando esto ocurre, la solución no es "trabajar con cuidado". La solución es volver al CBM, identificar cuál dominio es el dueño correcto del dato, y hacer la separación correcta antes de que el acoplamiento sea más profundo.

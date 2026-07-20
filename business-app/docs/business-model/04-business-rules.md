# 04 — Business Rules

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial — Reglas absolutas e invariantes

Las Business Rules son las verdades fundamentales del negocio. Son las reglas que no tienen excepciones, que no cambian con las versiones del software, y que son válidas independientemente de la jurisdicción, el tipo de Business, o el plan de suscripción.

Estas reglas no son "buenas prácticas". Son invariantes — si una regla está siendo violada, hay un bug o un diseño incorrecto.

**Clasificación:**
- `[DOMINIO]` — regla del dominio de negocio
- `[CONTABLE]` — regla contable universal
- `[SEGURIDAD]` — regla de seguridad y privacidad
- `[ARQUITECTURA]` — regla arquitectónica del sistema

---

## IDENTIDAD

**BR-ID-001** `[DOMINIO]`
Un User pertenece a exactamente un Business en v1. No puede pertenecer a múltiples Businesses simultáneamente.

**BR-ID-002** `[DOMINIO]`
Un User tiene exactamente un Role dentro de un Business. El Role determina sus permisos.

**BR-ID-003** `[SEGURIDAD]`
Las contraseñas nunca se almacenan en texto plano. Solo se almacena el hash bcrypt.

**BR-ID-004** `[DOMINIO]`
Un User no puede cambiar su propio Role. Solo un `business_owner` puede cambiar los roles de otros Users.

**BR-ID-005** `[DOMINIO]`
El último `business_owner` activo de un Business no puede ser desactivado ni eliminado. Primero debe transferir el role a otro User.

**BR-ID-006** `[SEGURIDAD]`
Un User con cuenta desactivada no puede iniciar sesión, aunque tenga un token de sesión activo. Los tokens de sesión de Users desactivados son invalidados inmediatamente.

---

## BUSINESS

**BR-BUS-001** `[DOMINIO]`
Un Business tiene exactamente un FiscalProfile. No puede tener cero ni más de uno.

**BR-BUS-002** `[DOMINIO]`
El `businessKey` de un Business es inmutable después de la creación. Es el identificador semántico permanente del Business.

**BR-BUS-003** `[DOMINIO]`
Un Business no puede ser eliminado permanentemente de inmediato — solo puede ser archivado. Los datos se retienen por un período de gracia antes de la eliminación definitiva.

**BR-BUS-004** `[DOMINIO]`
Exactamente un Business en toda la plataforma tiene `isPlatformCompany: true`. Este Business no puede ser archivado ni eliminado.

**BR-BUS-005** `[ARQUITECTURA]`
Todo dato de negocio está asociado a exactamente un `businessId`. No existen datos de negocio sin ownership de tenant.

---

## CUSTOMER

**BR-CUS-001** `[DOMINIO]`
Un Customer pertenece a exactamente un Business. No puede ser compartido entre Businesses.

**BR-CUS-002** `[DOMINIO]`
Un Customer no puede ser archivado si tiene Contracts en estado `active` o Invoices en estado `sent`, `viewed`, `partial`, u `overdue`.

**BR-CUS-003** `[DOMINIO]`
Un Customer de tipo `company` puede tener múltiples Contacts. Un Customer de tipo `individual` puede no tener ningún Contact formal (el Customer mismo es el contacto).

---

## CONTRACT

**BR-CON-001** `[DOMINIO]`
Un Contract `active` siempre tiene al menos una Rate con `isActive: true`.

**BR-CON-002** `[DOMINIO]`
Un Contract no puede activarse sin al menos una Rate.

**BR-CON-003** `[DOMINIO]`
Un WorkEvent ya `invoiced` no puede cambiar su Contract. El Contract es inmutable en ese estado.

**BR-CON-004** `[DOMINIO]`
Un Contract `completed` o `cancelled` no puede recibir nuevos WorkEvents.

**BR-CON-005** `[DOMINIO]`
El `billingCycle` de un Contract no puede modificarse si el Contract ya tiene WorkEvents `confirmed` o `invoiced`.

---

## RATE

**BR-RAT-001** `[DOMINIO]`
Solo una Rate por Contract puede tener `isDefault: true` al mismo tiempo.

**BR-RAT-002** `[DOMINIO]`
Una Rate `superseded` no puede reactivarse. Si se necesita la misma tarifa, se crea una Rate nueva.

**BR-RAT-003** `[DOMINIO]`
El monto calculado de un WorkEvent histórico nunca cambia, aunque la Rate que lo originó sea modificada o superseded. Los hechos del pasado son inmutables.

---

## WORK EVENT

**BR-WRK-001** `[DOMINIO]`
El `endTime` de un WorkEvent debe ser mayor al `startTime` (con lógica especial para cruce de medianoche).

**BR-WRK-002** `[DOMINIO]`
El `breakMinutes` de un WorkEvent no puede ser mayor o igual a la duración total del WorkEvent.

**BR-WRK-003** `[DOMINIO]`
Un WorkEvent solo puede avanzar en su ciclo de vida: `draft → confirmed → invoiced`. La única excepción es la transición `invoiced → confirmed` cuando la Invoice que lo contenía es anulada.

**BR-WRK-004** `[DOMINIO]`
Un WorkEvent con `billable: false` nunca puede alcanzar el estado `invoiced`.

**BR-WRK-005** `[DOMINIO]`
Un WorkEvent en estado `void` es terminal. No puede reactivarse.

**BR-WRK-006** `[DOMINIO]`
El mismo WorkEvent no puede aparecer en más de una Invoice activa simultáneamente.

---

## INVOICE

**BR-INV-001** `[DOMINIO]`
Una Invoice pertenece a exactamente un Business.

**BR-INV-002** `[DOMINIO]`
Una Invoice tiene exactamente un Customer.

**BR-INV-003** `[DOMINIO]`
Una Invoice tiene al menos un InvoiceItem.

**BR-INV-004** `[DOMINIO]`
El `total` de una Invoice = `sum(InvoiceItems)` + `taxAmount`. Esta fórmula es inviolable.

**BR-INV-005** `[DOMINIO]`
El `invoiceNumber` de una Invoice es único dentro del Business y es inmutable desde su generación.

**BR-INV-006** `[DOMINIO]`
Los InvoiceItems de una Invoice no pueden modificarse después de que la Invoice alcanza el estado `sent`.

**BR-INV-007** `[CONTABLE]`
Billing nunca escribe directamente en el Journal ni en el General Ledger.

**BR-INV-008** `[DOMINIO]`
Una Invoice no puede eliminarse. Solo puede ser anulada (`voided`) o cancelada (`cancelled`). El registro permanece.

**BR-INV-009** `[DOMINIO]`
El `amountDue` de una Invoice = `total - amountPaid`. Se recalcula con cada Payment registrado.

---

## PAYMENT

**BR-PAY-001** `[DOMINIO]`
Un Payment siempre referencia una Invoice.

**BR-PAY-002** `[DOMINIO]`
El monto de un Payment es siempre mayor a cero.

**BR-PAY-003** `[DOMINIO]`
La fecha de un Payment no puede ser anterior a la fecha de emisión de la Invoice que cancela.

**BR-PAY-004** `[DOMINIO]`
Un Payment revertido genera un nuevo registro de reversión — no se modifica el Payment original.

**BR-PAY-005** `[DOMINIO]`
Un Payment no puede aplicarse a una Invoice `voided` o `cancelled`.

---

## FINANCIAL ENGINE

**BR-FIN-001** `[CONTABLE]` `[ARQUITECTURA]`
Toda operación con consecuencias financieras — en cualquier módulo — pasa por una FinancialTransaction antes de llegar al Accounting Engine. No existe ninguna excepción.

**BR-FIN-002** `[CONTABLE]`
Una FinancialTransaction es inmutable desde su creación. No se modifica; se revierte con una nueva FinancialTransaction.

**BR-FIN-003** `[CONTABLE]`
`grossAmount = netAmount + taxAmount`. Esta invariante es verificada en la creación de cada FinancialTransaction.

**BR-FIN-004** `[CONTABLE]`
Una FinancialTransaction solo puede procesarse si el FiscalPeriod correspondiente a su fecha está `open`.

**BR-FIN-005** `[CONTABLE]`
No pueden existir dos FinancialTransactions con el mismo `(referenceId, type)` — garantía de idempotencia.

---

## ACCOUNTING ENGINE

**BR-ACC-001** `[CONTABLE]`
Solo el Accounting Engine puede crear JournalEntries. Ningún otro componente del sistema.

**BR-ACC-002** `[CONTABLE]`
Todo JournalEntry cumple: `sum(DEBIT lines) = sum(CREDIT lines)`. Un asiento que no balancea es rechazado.

**BR-ACC-003** `[CONTABLE]`
Un JournalEntry en estado `posted` es absolutamente inmutable. Para corregir un error, se crea un JournalEntry de reversión.

**BR-ACC-004** `[CONTABLE]`
Las Account codes referenciadas en un JournalEntry deben existir en el Chart of Accounts del Business.

**BR-ACC-005** `[CONTABLE]`
El Accounting Engine no conoce ni puede consultar Invoices, Payments, WorkEvents, ni ninguna entidad de Billing u Work. Solo conoce FinancialTransactions.

**BR-ACC-006** `[CONTABLE]`
Accounting nunca modifica datos de ningún otro dominio.

**BR-ACC-007** `[CONTABLE]`
Un FiscalPeriod `locked` no puede ser reabierto bajo ninguna circunstancia. La corrección se hace en el período actual mediante asientos de ajuste.

---

## ANALYTICS

**BR-ANA-001** `[ARQUITECTURA]`
Analytics nunca modifica datos de ningún dominio operativo.

**BR-ANA-002** `[ARQUITECTURA]`
Analytics trabaja sobre su propio Analytics Store — nunca consulta directamente las colecciones de escritura de los dominios operativos.

**BR-ANA-003** `[ARQUITECTURA]`
El Frontend nunca consulta Analytics directamente. Siempre a través de Business App.

**BR-ANA-004** `[ARQUITECTURA]`
Analytics nunca produce visualizaciones — solo datasets estructurados.

**BR-ANA-005** `[ARQUITECTURA]`
Los modelos de Machine Learning son siempre opcionales y nunca bloquean ninguna operación del negocio.

---

## DOCUMENT MANAGEMENT

**BR-DOC-001** `[ARQUITECTURA]`
Una DocumentReference nunca contiene una URL física de almacenamiento ni una ruta de archivo. Solo contiene un `documentId`.

**BR-DOC-002** `[ARQUITECTURA]`
El contenido de una DocumentVersion es inmutable una vez creado. Para actualizar un documento, se crea una nueva versión.

**BR-DOC-003** `[DOMINIO]`
Los documentos financieros (Invoices, BAS Reports, JournalEntry PDFs) tienen una retención mínima obligatoria de 7 años.

**BR-DOC-004** `[DOMINIO]`
Un Document solo puede ser eliminado definitivamente por el Business Owner después del período de retención mínima, o por el Platform Admin en cumplimiento de la legislación de privacidad.

---

## MASTER DATA

**BR-MDM-001** `[ARQUITECTURA]`
Los valores históricos de MDM nunca se sobrescriben. Los cambios crean nuevos registros con `effectiveFrom`.

**BR-MDM-002** `[ARQUITECTURA]`
Solo el Platform Admin puede modificar datos de MDM. Ningún módulo operativo escribe en MDM.

**BR-MDM-003** `[DOMINIO]`
Un valor de referencia (ej. un InvoiceStatus) nunca se elimina de MDM aunque se deprece. Los registros históricos que lo referencian siguen siendo válidos.

---

## AUTOMATION

**BR-AUT-001** `[ARQUITECTURA]`
Un Workflow nunca implementa lógica de negocio directamente. Solo invoca Actions en los dominios responsables.

**BR-AUT-002** `[ARQUITECTURA]`
El mismo Domain Event no puede generar más de una WorkflowExecution para el mismo Workflow (idempotencia garantizada por ExecutionKey).

**BR-AUT-003** `[ARQUITECTURA]`
Un Workflow no puede modificar datos de Accounting ni de Financial directamente.

---

## INTEGRATION HUB

**BR-INT-001** `[SEGURIDAD]`
Las credenciales de integraciones externas nunca se almacenan en texto plano. Siempre cifradas con AES-256-GCM.

**BR-INT-002** `[ARQUITECTURA]`
El Integration Hub no implementa lógica de negocio. Solo normaliza y traduce formatos externos.

**BR-INT-003** `[ARQUITECTURA]`
El mismo evento externo no puede ser procesado más de una vez (idempotencia por deduplication key).

---

## MULTI-TENANCY

**BR-TEN-001** `[SEGURIDAD]`
Toda query sobre datos de negocio incluye `businessId` como filtro primario. Una query sin `businessId` en datos de negocio es una violación de seguridad.

**BR-TEN-002** `[SEGURIDAD]`
El `businessId` en todas las operaciones proviene exclusivamente del JWT autenticado — nunca del body de la solicitud.

**BR-TEN-003** `[DOMINIO]`
Un dato asociado a un `businessId` nunca puede transferirse a otro `businessId`. El ownership es permanente.

**BR-TEN-004** `[DOMINIO]`
Un Platform Admin puede ver datos de todos los Businesses para soporte, pero no puede operarlos como si fuera el Business Owner. Todo acceso de Platform Admin a datos de tenants queda en el audit log.

---

## REGLA UNIVERSAL DE INMUTABILIDAD

Los siguientes hechos son absolutamente inmutables una vez ocurridos. No pueden modificarse, solo revertirse con nuevos hechos:

| Hecho | Por qué es inmutable |
|---|---|
| FinancialTransaction POSTED | Es el registro financiero formal del hecho económico |
| JournalEntry POSTED | Es el asiento contable formal en el libro mayor |
| FiscalPeriod LOCKED | Garantiza la integridad del cierre contable |
| Invoice SENT (sus InvoiceItems) | El documento enviado al Customer es un compromiso |
| Payment CLEARED | El dinero llegó; el hecho económico ocurrió |
| DocumentVersion (su contenido) | El documento es evidencia de negocio |
| Rate (monto calculado en WorkEvent histórico) | El cálculo del pasado no puede cambiar retroactivamente |

---

## PROVISIONING

**BR-PRV-001** `[ARQUITECTURA]`
Todo paso del Business Provisioning es idempotente. Si un paso se ejecuta dos veces, el resultado es idéntico al de ejecutarlo una vez.

**Correcto:** Crear el `security` domain verifica primero si existe por `(businessId, domainKey)`. Si existe, lo omite.
**Incorrecto:** Crear el `security` domain sin verificar existencia previa — duplica el dominio en cada reintento.

**BR-PRV-002** `[DOMINIO]`
Un Business no está operativo hasta que se publica el evento `system.business_provisioned`. Entre la creación del Business y ese evento, el Business está en provisioning y no puede emitir Invoices, registrar WorkEvents, ni generar FinancialTransactions.

**BR-PRV-003** `[ARQUITECTURA]`
El provisioning es eventual y asíncrono. Cada paso de la Fase 2 es un Domain Event que un servicio consume de forma independiente. No existe un coordinador central síncrono para todos los pasos.

**BR-PRV-004** `[ARQUITECTURA]`
Un paso de provisioning que falla nunca bloquea el Business indefinidamente. Cada paso tiene retry con backoff exponencial y Dead Letter Queue para intervención manual si se agotan los reintentos.

**BR-PRV-005** `[DOMINIO]`
El resultado final del provisioning es un Business completamente operativo: puede emitir facturas, enviar comunicaciones, generar FinancialTransactions, y consumir Analytics sin ninguna configuración manual adicional sobre los recursos por defecto.

**BR-PRV-006** `[ARQUITECTURA]`
El provisioning es también el mecanismo de reparación. Si un activo por defecto (ChartOfAccounts, security domain, default Theme) no existe para un Business, volver a ejecutar el provisioning lo crea. La semántica es: crear si falta, omitir si está presente.

---

## PLATFORM EVENTS

**BR-PLT-001** `[ARQUITECTURA]`
Los Platform Events (`security.*`, `system.*`) son publicados exclusivamente por servicios de la plataforma. No incluyen `businessId` de un tenant de usuario como identificador primario en su payload.

**Ejemplo Platform Event:** `system.business_created`, `security.platform_admin_invitation`
**Ejemplo Company Event:** `invoice.sent` (tiene `businessId` del Business que emitió la factura)

**BR-PLT-002** `[ARQUITECTURA]`
Los Company Events siempre incluyen `businessId` en su payload. Un Company Event publicado sin `businessId` es inválido y debe ser rechazado.

**BR-PLT-003** `[SEGURIDAD]`
Un Business de usuario no puede publicar Platform Events. Los Platform Events son exclusivos de los servicios de la plataforma.

**Anti-ejemplo:** Un Business que intenta publicar `system.subscription_changed` — viola la frontera de Platform Events.

**BR-PLT-004** `[SEGURIDAD]`
Los servicios de Platform nunca consumen Company Events directamente. Si la plataforma necesita reaccionar a un evento de negocio de un Business, lo hace a través de contratos publicados — no escuchando el Event Bus de un Business específico.

**BR-PLT-005** `[ARQUITECTURA]`
Los Company Events de distintos Businesses son completamente aislados entre sí. Un Business no puede suscribirse ni recibir los Company Events de otro Business.

**Ejemplo:** `invoice.sent` de Business A nunca llega a Business B — aunque ambos tengan ese evento en su catálogo.

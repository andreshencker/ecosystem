# 07 — Boundaries del Ciclo de Ingreso

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

Este documento formaliza las fronteras de responsabilidad de cada dominio del ciclo de ingreso. Cada boundary establece lo que un dominio no puede hacer, por qué esa restricción existe, y qué consecuencia tendría cruzarla.

---

## Principio de las fronteras

Las fronteras no son restricciones de rendimiento ni de conveniencia técnica. Son la expresión arquitectónica de la **responsabilidad de negocio** de cada dominio. Cuando un dominio cruza una frontera, el sistema comienza a acumular deuda de modelo que es mucho más costosa de revertir que la conveniencia inicial que motivó el cruce.

> Una frontera cruzada una vez es un acoplamiento. Un acoplamiento repetido es arquitectura.

---

## Work nunca crea Invoices

**Frontera:** El Work domain no tiene acceso a conceptos de Billing (Invoice, InvoiceItem, Payment) y no puede crearlos directamente.

**Por qué existe:**
Work es el dominio del tiempo y del valor del trabajo. Sabe cuánto vale un turno según el acuerdo con el Customer. No sabe cómo se estructura un documento legal de facturación, qué número de secuencia corresponde, cuáles son las condiciones de pago aplicables, ni cómo se aplica el impuesto para emitir el documento fiscal correcto.

**Qué ocurre si se cruza:**
Work comienza a conocer la estructura de Invoice. Cualquier cambio en el formato de facturación (nuevo campo fiscal, cambio en el cálculo de GST, soporte para multi-currency) requiere cambiar Work. Los tests de Work necesitan datos de Billing. Work no puede desplegarse de forma independiente.

**El canal correcto:**
Work publica `WorkEventConfirmed`. Revenue acumula el RateResult. Revenue publica `BillingPeriodClosed`. Billing crea la Invoice. Work nunca sabe que existe una Invoice.

---

## Billing nunca calcula tarifas

**Frontera:** El Billing domain no tiene acceso al Rate Engine, RatePlans, RateRules, ni RateCalculations. Billing recibe InvoiceItems ya calculados — no los calcula.

**Por qué existe:**
Billing es el dominio del documento financiero. Su responsabilidad es tomar líneas de ingreso ya calculadas y convertirlas en una factura legal: con número de secuencia, fecha de vencimiento, formato fiscal correcto, y GST aplicado. No es su responsabilidad saber si la tarifa de un viernes nocturno es $45/h o $50/h.

**Qué ocurre si se cruza:**
Billing necesita conocer Contracts, RatePlans, y RateRules. Cualquier cambio en el esquema de tarifas (nuevo RuleType, nueva lógica de overtime) requiere cambiar Billing. Los tests de Billing necesitan datos del Rate Engine. Billing no puede operar con futuros tipos de ingreso (Expenses, Fees) que no tienen RatePlan.

**El canal correcto:**
Revenue entrega a Billing un RevenueDraft con RevenueLines que ya tienen los lineItems calculados: `description`, `durationMinutes`, `unitRate`, `amount`. Billing los convierte en InvoiceItems sin hacer ningún cálculo adicional.

---

## Revenue nunca envía comunicaciones

**Frontera:** El Revenue domain no tiene acceso al Communications domain ni puede enviar emails, notificaciones, ni mensajes al Customer o al Business Owner.

**Por qué existe:**
Revenue gestiona el estado del ingreso. Las decisiones de comunicación (cuándo notificar al Business Owner que un período cerró, cuándo enviar la Invoice al Customer, cuándo recordar un pago pendiente) pertenecen a los dominios de Billing y Automation, con el canal implementado por Communications.

**Qué ocurre si se cruza:**
Revenue conoce las configuraciones de email del Business. Cambios en los templates de notificación requieren cambiar Revenue. Revenue no puede operar sin Communications. Las comunicaciones se "duplicarían" si tanto Revenue como Billing intentaran notificar el mismo evento.

**El canal correcto:**
Revenue publica `BillingPeriodClosed`. Billing recibe el evento y toma la decisión de crear el Invoice Draft. Billing (o Automation) decide si notificar al Business Owner. Communications ejecuta la notificación.

---

## Accounting nunca modifica Revenue

**Frontera:** El Accounting domain no puede escribir en los conceptos del Revenue domain (RevenueDraft, RevenueLine, BillingPeriod) ni puede cambiar su estado.

**Por qué existe:**
El Revenue domain gestiona el ciclo comercial del ingreso. El Accounting domain gestiona el registro formal en el libro mayor. Son perspectivas distintas del mismo hecho económico: Revenue lo ve como "trabajo realizado + valor pendiente de cobrar"; Accounting lo ve como "deuda del Customer registrada en el General Ledger".

**Qué ocurre si se cruza:**
Un ajuste contable podría inconsistentemente modificar el estado comercial del ingreso. Un JournalEntry de corrección podría "cerrar" un RevenueDraft que Billing todavía no procesó. Las dos perspectivas del mismo hecho se vuelven inconsistentes.

**El canal correcto:**
El Accounting Engine procesa FinancialTransactions que le llegan del Financial domain. No conoce ni accede a RevenueDrafts ni BillingPeriods. Si hay una corrección contable, se hace mediante un nuevo JournalEntry de ajuste — no modificando el estado comercial.

---

## Analytics nunca modifica estados

**Frontera:** El Analytics domain solo puede leer. No puede modificar el estado de ningún concepto en ningún dominio operativo.

**Por qué existe:**
Analytics produce derivados de los datos operativos: KPIs, Read Models, proyecciones. Si Analytics pudiera modificar estados operativos, un error en un modelo analítico podría corromper los datos de negocio. Analytics debe poder fallar, estar desactualizado, o ser reconstruido desde cero sin afectar la operación.

**Qué ocurre si se cruza:**
Un bug en el cálculo de un KPI podría marcar RevenueDrafts incorrectamente. Analytics no podría ser reconstructible desde los eventos históricos (porque habrá modificado datos que ya no pueden "des-modificarse"). Los tests de Analytics necesitarían datos reales de producción para no romperse.

**El canal correcto:**
Analytics consume Domain Events de todos los dominios. Actualiza su propio Analytics Store (Read Models separados de las colecciones operativas — BR-ANA-002). Nunca escribe en colecciones de Work, Revenue, Billing, ni Accounting.

---

## FinancialTransaction nunca conoce WorkEvent

**Frontera:** El Financial domain (FinancialTransaction, PostingRules) no tiene acceso a conceptos del Work domain (WorkEvent, RateCalculation) ni del Revenue domain (RevenueDraft).

**Por qué existe:**
La FinancialTransaction es el traductor universal entre el lenguaje del negocio y el lenguaje contable. Su valor arquitectónico está en ser genérico: puede representar el hecho económico de una Invoice, de un Expense, de un Payroll, de una cuota de activo — todos con el mismo formato. Si la FinancialTransaction supiera qué es un WorkEvent, ya no sería genérica.

**Qué ocurre si se cruza:**
El Financial Engine necesita lógica separada para cada tipo de origen de ingreso. Agregar Expenses o Payroll requiere modificar la FinancialTransaction. Los tests del Financial Engine necesitan datos de Work. El desacoplamiento entre dominios se rompe.

**El canal correcto:**
El Billing domain recibe el evento `InvoiceSent`. Billing construye la FinancialTransaction con los campos normalizados (`grossAmount`, `netAmount`, `taxAmount`, `type: INVOICE_ISSUED`, `referenceId: invoiceId`). El Financial Engine procesa la FinancialTransaction sin saber que detrás hay WorkEvents y RatePlans.

---

## Billing nunca escribe en el Journal directamente

**Frontera:** Billing no puede crear JournalEntries ni escribir en el General Ledger (BR-INV-007).

**Por qué existe:**
El Accounting Engine es el único guardián del libro mayor. Si Billing pudiera escribir directamente en el Journal, se rompería el principio de partida doble y la coherencia contable quedaría sin garantías. Billing no sabe (ni debe saber) en qué cuentas del Chart of Accounts corresponde registrar cada transacción.

**Qué ocurre si se cruza:**
Billing necesita conocer el Chart of Accounts. Cambios en las cuentas contables requieren cambios en Billing. El libro mayor puede quedar en estado inconsistente si Billing hace un asiento sin que el Accounting Engine lo valide. La auditoría del libro mayor se vuelve imposible.

**El canal correcto:**
Billing publica `InvoiceSent`. Financial Engine crea la FinancialTransaction. El Accounting Engine la procesa aplicando las PostingRules y crea el JournalEntry. Billing nunca sabe qué JournalEntry se creó.

---

## Mapa de fronteras

```
┌──────────┐     solo RateResult     ┌──────────┐   solo RevenueLines   ┌──────────┐
│  WORK    │ ──────────────────────► │ REVENUE  │ ──────────────────────► │ BILLING  │
│          │   WorkEventConfirmed    │          │   BillingPeriodClosed  │          │
└──────────┘                         └──────────┘                        └──────────┘
     │                                                                        │
     │ ❌ nunca                       ❌ nunca                   ❌ nunca      │
     │ crea Invoice                  envía emails              calcula tarifas │
     │                               modifica Accounting        escribe Journal│
     ▼                                    ▼                          ▼
                              Todos publican eventos         InvoiceSent
                              que Analytics consume           ─────────►
                              (solo lectura)              FinancialEngine
                                                              ─────────►
                                                          AccountingEngine
                                                          (solo él escribe
                                                           en el Journal)
```

---

## Tabla resumen de fronteras

| Dominio | No puede | Razón en una línea |
|---|---|---|
| Work | Crear Invoices | Work es tiempo y valor — no documento fiscal |
| Billing | Calcular tarifas | Billing recibe valores calculados — no los produce |
| Revenue | Enviar comunicaciones | Revenue gestiona estado de ingreso — no canales de salida |
| Accounting | Modificar Revenue o Billing | Accounting registra hechos — no los produce ni los modifica |
| Analytics | Modificar cualquier estado | Analytics lee — nunca escribe en datos operativos |
| Financial | Conocer WorkEvents o RevenueDrafts | FinancialTransaction es genérica — no tiene semántica de negocio específica |
| Billing | Escribir en el Journal | Solo el Accounting Engine escribe en el libro mayor |
| Work | Conocer si un Payment fue recibido | Work solo sabe si el WorkEvent fue incluido en una Invoice |

# 01 — Revenue Domain

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

El Revenue Domain es el custodio del ciclo completo de ingreso del Business. Existe entre el trabajo realizado (Work domain) y el documento financiero emitido (Billing domain). Su responsabilidad es transformar hechos de tiempo y valor calculado en ingreso acumulado, estructurado, y listo para facturar.

---

## Qué es

El Revenue Domain es el bounded context que responde preguntas que ni Work ni Billing pueden responder solos:

- ¿Cuánto ingreso ha generado este Business hoy, esta semana, este mes?
- ¿Qué WorkEvents están listos para facturar?
- ¿Cuáles todavía pueden modificarse sin afectar el proceso de billing?
- ¿Cuándo se creará la próxima factura para este Customer?
- ¿Cuál es el ingreso pendiente de cobro para este Contract?

Ninguna de estas preguntas pertenece al Work domain (que sabe de tiempo y tarifas) ni al Billing domain (que sabe de documentos financieros). Son preguntas del ciclo de ingreso — y ese es el territorio del Revenue domain.

---

## Responsabilidades

### Lo que Revenue HACE

**1. Captura el ingreso generado:**
Cada vez que Work confirma un WorkEvent y produce un RateResult, Revenue lo captura y lo acumula en un RevenueDraft. Es el receptor de todos los hechos económicos del lado del trabajo.

**2. Organiza el ingreso en períodos de facturación:**
Revenue crea y gestiona BillingPeriods para cada Contract. Un BillingPeriod agrupa los WorkEvents de un período dado según el billing cycle del Contract (semanal, quincenal, mensual, por proyecto).

**3. Mantiene el estado del ingreso pendiente:**
El RevenueDraft es la vista en tiempo real del ingreso que se ha generado pero no se ha facturado todavía. Es la respuesta a "¿cuánto dinero tiene el Business ganado pero no cobrado?".

**4. Controla cuándo puede modificarse el ingreso:**
Mientras el BillingPeriod está abierto, las líneas del RevenueDraft pueden cambiar (WorkEvents se agregan, se corrigen). Una vez cerrado, el ingreso del período es inmutable.

**5. Desencadena la creación de facturas:**
Cuando un BillingPeriod se cierra, Revenue publica el evento `BillingPeriodClosed` con el RevenueDraft completo. Billing consume este evento y crea el Invoice Draft. Revenue no sabe qué es una Invoice — solo sabe que entregó su RevenueDraft.

**6. Actúa como Anti-Corruption Layer:**
Revenue traduce el lenguaje del Work domain (WorkEvents, RateResults, segmentos de tarifa) al lenguaje del Revenue domain (líneas de ingreso, períodos, totales). Billing nunca necesita hablar Work.

---

### Lo que Revenue NO HACE

| Prohibición | Pertenece a |
|---|---|
| Calcular tarifas o segmentar tiempo | Work domain (Rate Engine) |
| Crear, formatear, o numerar Invoices | Billing domain |
| Registrar Payments | Billing domain |
| Generar JournalEntries | Accounting domain |
| Crear FinancialTransactions | Financial domain (como consecuencia de eventos de Billing) |
| Enviar emails o comunicaciones | Communications domain |
| Actualizar directamente KPIs | Analytics domain (consume los eventos de Revenue) |
| Gestionar el estado de Accounts Receivable | Billing domain |
| Conocer detalles de impuestos | Billing domain (con configuración de FiscalProfile) |

---

## Los conceptos propios del Revenue Domain

### Revenue Draft

El estado vivo del ingreso pendiente de facturar para un período. Es la acumulación de todos los RateResults de WorkEvents confirmados durante un BillingPeriod. Un RevenueDraft existe por combinación única de `(Business, Customer, Contract, BillingPeriod)`.

### Billing Period

El intervalo de tiempo que define qué WorkEvents se agrupan en una misma factura. Su duración y reglas de cierre se derivan del billing cycle del Contract.

### Revenue Line

Una línea individual dentro del RevenueDraft — la representación de un WorkEvent como ingreso. Contiene el RateResult del WorkEvent: las líneas de segmentos con sus montos. Una RevenueLine se convierte en uno o más InvoiceItems cuando el período se cierra.

### Revenue Summary

La vista agregada del estado del ingreso de un Business: cuánto hay pendiente de facturar, cuánto está en facturas enviadas sin cobrar, cuánto fue cobrado en el período. Es el insumo principal del dashboard de Analytics.

---

## Posición en la arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    WORK DOMAIN                          │
│  WorkEvent · RateCalculation · RateResult               │
│  "tiempo y valor calculado"                             │
└───────────────────────────┬─────────────────────────────┘
                            │ WorkEventConfirmed
                            │ (payload: RateResult)
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   REVENUE DOMAIN                        │
│  RevenueDraft · BillingPeriod · RevenueLine             │
│  "ingreso acumulado, organizado, y listo para facturar" │
└───────────────────────────┬─────────────────────────────┘
                            │ BillingPeriodClosed
                            │ (payload: RevenueDraft con líneas)
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   BILLING DOMAIN                        │
│  Invoice · InvoiceItem · Payment                        │
│  "documento financiero y cobro"                         │
└─────────────────────────────────────────────────────────┘
```

Revenue es deliberadamente estrecho: lo que entra son RateResults; lo que sale son RevenueDrafts estructurados por período. Toda la complejidad del Rate Engine queda del lado izquierdo. Toda la complejidad de la factura queda del lado derecho.

---

## Relación con cada dominio

### Work
**Tipo:** Revenue consume eventos de Work
**Qué consume:** `WorkEventConfirmed` (con el RateResult adjunto)
**Qué recibe:** Una lista de segmentos con monto, descripción, y metadatos del WorkEvent
**Lo que Revenue nunca pide a Work:** Detalles del Rate Plan, RateRules, DayPatterns, cálculos crudos

### Billing
**Tipo:** Billing consume eventos de Revenue
**Qué produce Revenue:** `BillingPeriodClosed` con el RevenueDraft completo como payload
**Qué hace Billing:** Crea un Invoice Draft con un InvoiceItem por cada línea del RevenueDraft
**Lo que Billing nunca pide a Revenue:** WorkEvent IDs para lookup directo, cálculo de impuestos, formatting

### Financial
**Tipo:** Revenue no interactúa directamente con Financial
**Por qué:** Los hechos financieros formales (FinancialTransactions) los genera Billing cuando envía la Invoice — no Revenue. Revenue solo gestiona el estado de ingreso pendiente.

### Accounting
**Tipo:** Revenue no interactúa con Accounting
**Por qué:** El libro contable solo se actualiza cuando existen documentos formales (Invoices sent). El ingreso pendiente de facturar no genera asientos contables en el sistema (ver decisión de Revenue Recognition en `05-financial-impact.md`).

### Analytics
**Tipo:** Analytics consume eventos de Revenue (solo lectura)
**Qué consume Analytics:** `RevenueDraftUpdated`, `BillingPeriodClosed`, `RevenueDraftTransferred`
**Para qué:** Actualizar KPIs de ingreso pendiente, velocidad de facturación, aging de revenue

### Communications
**Tipo:** Ninguna — Revenue no interactúa con Communications
**Por qué:** Las comunicaciones con el Customer (envío de Invoice, recordatorios) son responsabilidad de Billing. Revenue no sabe si hay una dirección de email configurada.

---

## Ownership

| Concepto | Dueño | Acceso de otros dominios |
|---|---|---|
| RevenueDraft | Revenue | Analytics (lectura vía eventos) |
| BillingPeriod | Revenue | Work (para saber a qué período asignar un WorkEvent) |
| RevenueLine | Revenue | Billing (vía payload de BillingPeriodClosed) |
| RevenueSummary | Revenue (lo produce) | Analytics (lo consume) |

El `businessId` es el discriminador universal de todos los conceptos del Revenue domain. Ningún dato de Revenue existe sin `businessId`.

---

## Invariantes del dominio

**INV-REV-001:** Un RevenueDraft existe para exactamente una combinación `(businessId, customerId, contractId, billingPeriodId)`. No puede haber dos RevenueDrafts para el mismo período y contrato.

**INV-REV-002:** Un RevenueDraft en estado `FROZEN` o `TRANSFERRED` no puede recibir nuevas RevenueLines. El período está cerrado.

**INV-REV-003:** Una RevenueLine referencia exactamente un WorkEvent. Un WorkEvent puede aparecer como RevenueLine en exactamente un RevenueDraft activo al mismo tiempo.

**INV-REV-004:** El `totalAmount` de un RevenueDraft es siempre igual a la suma de los amounts de sus RevenueLines. Esta invariante se verifica en cada actualización.

**INV-REV-005:** Un BillingPeriod pertenece a exactamente un Contract. No puede existir un BillingPeriod sin un Contract asociado.

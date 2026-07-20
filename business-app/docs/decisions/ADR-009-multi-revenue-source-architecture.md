# ADR-009: Multi-Revenue-Source Architecture — Auditoría y Decisiones de Alineación

**Fecha:** 2026-07-06
**Estado:** Aceptado
**Autor:** Architecture Alignment Audit

---

## Contexto

A medida que la arquitectura del ERP se documentó (Business Model, Revenue, Billing, Accounts Receivable, Document Platform, Communications, Analytics, Financial Impact), se fue consolidando una premisa implícita que nunca fue declarada explícitamente:

> El ERP fue diseñado para facturar turnos de trabajo.

Esta premisa, aunque válida para el primer Revenue Source implementado (Shift Work), no refleja la intención de la plataforma. El ERP fue concebido como una **plataforma financiera** que puede soportar múltiples orígenes de ingreso: Services, Products, Subscriptions, Projects, Rentals, Memberships, y otros futuros.

Esta auditoría identifica todos los documentos donde esta premisa implícita se convirtió en una contradicción arquitectónica, y establece las correcciones necesarias.

---

## La decisión principal

**El ERP es una plataforma financiera que soporta múltiples Revenue Sources.**

Shift Work es el primer Revenue Source implementado. No es el único posible. La arquitectura debe reflejarlo.

**Corolario:** El núcleo financiero (Revenue Domain, Billing Domain, Financial Engine, Accounting Engine, Analytics) es agnóstico al Revenue Source. Solo el upstream (el dominio que origina el ingreso) cambia entre Revenue Sources.

---

## Auditoría de alineación — Hallazgos y correcciones

### HALLAZGO 1 — CRÍTICO: Calendar definido exclusivamente como importador de WorkEvents

**Documento:** `architecture/01-bounded-contexts.md`, BC-05 — Calendar
**Sección:** "Por qué existe", "Qué problema resuelve"

**Texto actual (incorrecto):**
> "Gestionar las conexiones con proveedores de calendario externos y sincronizar los eventos de esos calendarios como WorkEvents draft en el dominio Work. Es el único puente entre el mundo del calendario y el mundo del ERP."

**Por qué contradice:** Calendar no crea WorkEvents. Crea CalendarEvents neutros. Shift Work convierte CalendarEvents en WorkEvents. La definición actual ata Calendar al flujo Shift Work y lo hace inútil para Services, Projects, Subscriptions, Tax deadlines, y cualquier otro uso de tiempo en el ERP.

**Cómo debe quedar:**
> "Calendar es un dominio transversal que gestiona las conexiones con proveedores externos de calendario, produce CalendarEvents neutros que cualquier Revenue Source puede consumir, y gestiona los ScheduledEvents internos del ERP (due dates, deadlines fiscales, fechas de renovación, períodos de nómina). Calendar nunca conoce la lógica de sus consumidores."

**Documentos adicionales a corregir:**
- `architecture/11-context-map.md` — R-04 debe reflejar que Calendar es upstream de múltiples dominios, no solo de Work
- `business-model/05-business-capabilities.md` — CAP-05 debe eliminar la dependencia con CAP-04 (Work Management)
- `domain/TRANSVERSAL-DOMAINS.md` — Calendar debe moverse de "dominios operativos" a "dominios transversales"

---

### HALLAZGO 2 — CRÍTICO: Revenue Domain como dominio exclusivo de Shift Work

**Documento:** `domain/revenue/01-revenue-domain.md`
**Sección:** Todas las secciones — especialmente "Responsabilidades", "Invariantes del dominio"

**Texto actual (incorrecto):**
> "Cada vez que Work confirma un WorkEvent y produce un RateResult, Revenue lo captura..."
> "INV-REV-003: Una RevenueLine referencia exactamente un WorkEvent."
> "INV-REV-005: Un BillingPeriod pertenece a exactamente un Contract."

**Por qué contradice:** El Revenue Domain es descrito como el receptor de WorkEvents y RateResults. Estas son entidades del flujo Shift Work. Revenue debería ser agnóstico al origen del ingreso — solo debería conocer RevenueLines con montos calculados.

**Cómo debe quedar:**
- INV-REV-003 debe cambiar a: "Una RevenueLine referencia exactamente una Billable Unit. La naturaleza de la Billable Unit depende del Revenue Source (WorkEvent para Shift Work, ServiceDelivery para Services, OrderItem para Products)."
- INV-REV-005 debe cambiar a: "Un BillingPeriod pertenece a exactamente una Revenue Source Configuration. En Shift Work, esto es un Contract. En Services, puede ser un ServicePackage. En Subscriptions, puede ser un SubscriptionPlan."

**Impacto:** Los invariantes INV-REV-003 e INV-REV-005 son los más críticos. Todos los demás invariantes del Revenue Domain son suficientemente genéricos.

---

### HALLAZGO 3 — CRÍTICO: BillingPeriod definido como exclusivo de Contracts

**Documento:** `domain/revenue/03-billing-period.md`
**Sección completa**

**Texto actual (incorrecto):**
> "Un Billing Period es el intervalo de tiempo que determina qué WorkEvents se agrupan en una misma Invoice."
> "Un BillingPeriod es único para la combinación (businessId, contractId, periodStart, periodEnd)."

**Por qué contradice:** BillingPeriod usa "WorkEvents" y "contractId" como conceptos propios. Esto lo ata a Shift Work. Para Services, un BillingPeriod agruparía ServiceDeliveries, no WorkEvents. Para Products, agruparía OrderItems.

**Cómo debe quedar:** La definición debe usar el concepto genérico "billable units" y "revenue source configuration" en lugar de WorkEvents y Contract. Los ejemplos específicos de WorkEvents deben marcarse como "aplicable al flujo Shift Work."

---

### HALLAZGO 4 — MAYOR: Principio rector del Domain Overview es Shift Work específico

**Documento:** `domain/01-domain-overview.md`
**Sección:** "Principio rector"

**Texto actual (incorrecto):**
> "El trabajo ocurre primero. La factura lo documenta. El pago lo cierra."

**Por qué contradice:** "El trabajo ocurre primero" es correcto para Shift Work pero no para Products (donde hay venta, no trabajo) ni para Subscriptions (donde la factura precede al servicio).

**Cómo debe quedar:**
> "El valor es generado primero. La factura lo documenta. El pago lo cierra."
O con mayor precisión:
> "La plataforma financiera registra el valor, lo documenta, y gestiona su cobro — independientemente de cómo fue generado ese valor."

---

### HALLAZGO 5 — MAYOR: System Pipeline 1 nombrado "Shift to Cash" como flujo principal

**Documento:** `architecture/05-system-pipelines.md`
**Sección:** Pipeline 1

**Texto actual (incorrecto):**
> "Pipeline 1 — Shift to Cash (El flujo principal)"
> "El flujo de mayor valor del ERP. Desde el turno trabajado hasta el dinero en el banco."

**Por qué contradice:** Describe un flujo Shift Work como "El flujo principal" del ERP. Esto implica que es el único o el más importante. Cuando Services sea implementado, ¿será "el flujo secundario"?

**Cómo debe quedar:**
- Renombrar a "Pipeline 1 — Shift Work to Cash (Primera implementación del ciclo Revenue Source → Cash)"
- Agregar un Pipeline 0 o una nota introductoria que describa el patrón genérico "Revenue Source to Cash"
- El Pipeline 1 debe presentarse como "el primer Revenue Source implementado", no "el flujo principal"

---

### HALLAZGO 6 — MAYOR: Context Map muestra Calendar solo conectado a Work

**Documento:** `architecture/11-context-map.md`
**Sección:** Diagrama y R-04

**Texto actual (incorrecto):**
> R-04: Calendar (upstream) → Work (downstream)
> "CalendarEventImported: es traducido a WorkEvent(draft)"

**Por qué contradice:** Calendar aparece como un satélite de Work en el diagrama. No hay ninguna indicación de que Calendar puede servir a Services, Projects, Billing, Tax, u otros dominios.

**Cómo debe quedar:** Calendar debe aparecer como un dominio transversal en el Context Map, con flechas hacia múltiples dominios consumidores. R-04 debe generalizarse a "Calendar → [Multiple Consumers]" con CalendarEventImported como PL.

---

### HALLAZGO 7 — MAYOR: Business Capabilities hace Calendar dependiente de Work

**Documento:** `business-model/05-business-capabilities.md`
**Sección:** CAP-05 — Calendar Integration

**Texto actual (incorrecto):**
> "Dependencias: CAP-04 (Work Management — para tener Contracts activos a los cuales asignar los WorkEvents importados)"
> "Los eventos del calendario se importan como WorkEvents draft en segundo plano"

**Por qué contradice:** La dependencia dice que Calendar requiere Work. Debería ser al revés: Work puede usar Calendar, pero Calendar no depende de Work. Además, la descripción fija Calendar como importador de WorkEvents.

**Cómo debe quedar:**
- Eliminar la dependencia de CAP-05 en CAP-04
- Cambiar la descripción de "importa como WorkEvents" a "importa como CalendarEvents neutros"
- Agregar que Work (CAP-04) puede opcionalmente configurar qué CalendarSource mapear a qué Contract

---

### HALLAZGO 8 — MAYOR: Revenue Lifecycle inicia con WorkEvent

**Documento:** `domain/revenue/02-revenue-lifecycle.md`
**Sección:** "El ciclo completo"

**Texto actual (incorrecto):**
> "TRABAJO REALIZADO — WorkEvent CONFIRMED"

**Por qué contradice:** El ciclo de vida del Revenue Domain se describe como comenzando con un WorkEvent. Para Services, comenzaría con un ServiceDelivery. Para Products, con un OrderFulfilled.

**Cómo debe quedar:** El ciclo completo debe comenzar con "BILLABLE UNIT CONFIRMED — [WorkEvent para Shift Work, ServiceDelivery para Services, OrderItem para Products]". La sección específica de WorkEvent debe marcarse como "aplicable al flujo Shift Work."

---

### HALLAZGO 9 — MODERADO: Business Rules mezcla Flow Rules con Financial Rules

**Documento:** `business-model/04-business-rules.md`
**Secciones:** CONTRACT, RATE, WORK EVENT

**Por qué contradice:** Las reglas de CONTRACT, RATE, y WORK EVENT son reglas del flujo Shift Work, no reglas universales del ERP. Al estar en el mismo documento junto con reglas verdaderamente universales (INVOICE, PAYMENT, FINANCIAL ENGINE), se crea la impresión de que son reglas de todo el ERP.

**Cómo debe quedar:** Las secciones CONTRACT, RATE, y WORK EVENT deben tener un encabezado claro:
```
## SHIFT WORK FLOW RULES (aplican únicamente al flujo Shift Work)
```
Y las secciones universales deben tener:
```
## FINANCIAL RULES (aplican a todos los Revenue Sources)
```

---

### HALLAZGO 10 — MODERADO: TRANSVERSAL-DOMAINS.md posiciona Calendar en el flujo operativo

**Documento:** `domain/TRANSVERSAL-DOMAINS.md`
**Sección:** El diagrama principal

**Por qué contradice:** En el diagrama del documento, Calendar aparece dentro del flujo operativo con una flecha directa a Work:
```
CALENDAR ──────────► WORK (Contracts, Rates, WorkEvents)
```
Calendar no está listado entre los "Dominios Transversales" — está en el flujo operativo entre Customer y Work.

**Cómo debe quedar:** Calendar debe moverse a la sección de "Dominios Transversales" junto con MDM, Document Management, Automation, e Integration Hub. El diagrama debe mostrar Calendar conectado a múltiples dominios.

---

### HALLAZGO 11 — MODERADO: Business Capabilities excluye Quotes permanentemente

**Documento:** `business-model/05-business-capabilities.md`
**Sección:** "Lo que el ERP nunca entregará como capability"

**Texto actual (incorrecto):**
> "Cotizaciones y presupuestos (Quotes) — El ERP registra trabajo realizado — no trabajo futuro ni propuestas"

**Por qué contradice:** Esta exclusión asume que el ERP siempre registra trabajo realizado. Cuando Services y Projects sean implementados, las quotes son una parte estándar del flujo (Customer solicita quote → aprueba → se genera la Invoice).

**Cómo debe quedar:** Cambiar a: "Cotizaciones y presupuestos (Quotes) — Excluidas del alcance de las Fases 1-5 (flujo Shift Work). Podrán implementarse cuando se agreguen los Revenue Sources de Services y Projects."

---

### HALLAZGO 12 — MENOR: CAP-06 Billing describe generación solo desde WorkEvents

**Documento:** `business-model/05-business-capabilities.md`
**Sección:** CAP-06-01

**Texto actual (parcialmente incorrecto):**
> "CAP-06-01: Generación de Invoice desde WorkEvents"
> "Dependencies: CAP-04 (WorkEvents confirmados como base de InvoiceItems — excepto en facturas libres)"

**Por qué contradice:** La dependencia principal de Billing no debería ser el Work Management. Billing recibe InvoiceItems desde el Revenue Domain, independientemente de si el origen fue un WorkEvent, una ServiceDelivery, o un OrderItem.

**Cómo debe quedar:**
- CAP-06-01 renombrar a "Generación de Invoice" (sin "desde WorkEvents")
- La dependencia de CAP-04 es solo para el flujo Shift Work. Para el flujo general, Billing depende de que haya un RevenueDraft listo del Revenue Domain.

---

## Resumen de correcciones pendientes

| Prioridad | Documento | Sección | Tipo de corrección |
|---|---|---|---|
| 🔴 Crítico | `architecture/01-bounded-contexts.md` | BC-05 Calendar | Redefinir Calendar como transversal |
| 🔴 Crítico | `domain/revenue/01-revenue-domain.md` | INV-REV-003, INV-REV-005 | Generalizar a Billable Unit y Revenue Source Config |
| 🔴 Crítico | `domain/revenue/03-billing-period.md` | Sección completa | Generalizar a Revenue Source agnóstico |
| 🟠 Mayor | `domain/01-domain-overview.md` | "Principio rector" | Ampliar más allá de Shift Work |
| 🟠 Mayor | `architecture/05-system-pipelines.md` | Pipeline 1 | Renombrar; agregar Pipeline genérico |
| 🟠 Mayor | `architecture/11-context-map.md` | R-04, Diagrama | Calendar como transversal |
| 🟠 Mayor | `business-model/05-business-capabilities.md` | CAP-05, CAP-06 | Eliminar dependencia Calendar→Work |
| 🟠 Mayor | `domain/revenue/02-revenue-lifecycle.md` | Ciclo completo | Iniciar con Billable Unit genérico |
| 🟡 Moderado | `business-model/04-business-rules.md` | CONTRACT, RATE, WORK EVENT | Separar en "Shift Work Flow Rules" |
| 🟡 Moderado | `domain/TRANSVERSAL-DOMAINS.md` | Diagrama | Mover Calendar a transversales |
| 🟡 Moderado | `business-model/05-business-capabilities.md` | "Nunca entregará" | Quotes son futuras, no excluidas para siempre |
| 🟢 Menor | `business-model/05-business-capabilities.md` | CAP-06-01 | Generalizar nombre y dependencia |

---

## Documentos nuevos creados por esta auditoría

| Documento | Propósito |
|---|---|
| `domain/revenue-sources/01-revenue-sources.md` | Concepto oficial de Revenue Sources — fundamento de la plataforma |
| `domain/revenue-sources/02-shift-work-flow-policies.md` | Políticas exclusivas del flujo Shift Work |
| `domain/financial-policies/01-financial-policies.md` | Políticas financieras universales (todos los Revenue Sources) |
| `domain/calendar/01-calendar-domain.md` | Calendar como dominio transversal — redefinición oficial |
| `architecture/00-erp-platform-overview.md` | Diagrama general + matrices de responsabilidad |
| `decisions/ADR-009-multi-revenue-source-architecture.md` | Este documento — auditoría y decisiones |

---

## Reglas arquitectónicas establecidas por este ADR

**ADR-009-R001 — El ERP es una plataforma de Revenue Sources:**
Toda nueva funcionalidad debe ser diseñada considerando que puede aplicar a múltiples Revenue Sources. Ningún concepto del núcleo financiero (Revenue Domain, Billing, Financial Engine, Accounting) puede asumir que el ingreso proviene exclusivamente de WorkEvents.

**ADR-009-R002 — Calendar es transversal:**
Calendar no pertenece al flujo Shift Work. Calendar es un dominio transversal que provee tiempo y eventos a cualquier dominio que los necesite. Calendar no crea WorkEvents — crea CalendarEvents neutros.

**ADR-009-R003 — Separación de Flow Policies y Financial Policies:**
Las reglas de cómo y cuándo cerrar un período de facturación, asignar billable units, y generar Invoice Drafts son Flow Policies — propias de cada Revenue Source. Las reglas de Payment Terms, Due Date, Reminders, Overdue, y Collection son Financial Policies — compartidas por todos los Revenue Sources.

**ADR-009-R004 — El núcleo financiero no cambia al agregar Revenue Sources:**
Agregar un nuevo Revenue Source (Services, Products, Subscriptions) no requiere modificar el Revenue Domain, el Billing Domain, el Financial Engine, ni el Accounting Engine. Solo requiere construir el dominio upstream y publicar el evento `BillableUnitReady` (o equivalente).

**ADR-009-R005 — Shift Work es la implementación actual, no el modelo permanente:**
Los documentos que usan "Shift Work" como referencia para describir el ERP completo deben ser corregidos para usar lenguaje neutral (Revenue Source, Billable Unit, Revenue Source Configuration) con ejemplos específicos de Shift Work marcados como tales.

---

## Consecuencias de esta decisión

### Positivas

- La arquitectura refleja correctamente la intención de la plataforma
- Calendar puede evolucionar para servir a Services, Projects, y Subscriptions sin reestructurar
- Los dominios del núcleo financiero no necesitan cambios cuando se implementen nuevos Revenue Sources
- Las Flow Policies de Shift Work están claramente delimitadas — no contaminarán otros flujos
- Los documentos nuevos sirven como guía clara para la implementación de futuros Revenue Sources

### Negativas / Trade-offs

- Algunos invariantes del Revenue Domain (INV-REV-003, INV-REV-005) requieren redacción para no romper la implementación actual de Shift Work mientras se generalizan
- La corrección de los documentos existentes es trabajo de documentación que no cambia código — pero es deuda de documentación activa hasta completarse
- El concepto de "Billable Unit" es nuevo y debe ser introducido gradualmente en el vocabulario del equipo

### Prioridad de correcciones

Las correcciones marcadas como 🔴 Crítico deben completarse antes de comenzar la implementación de cualquier dominio adicional al flujo Shift Work. Las correcciones 🟠 Mayor deben completarse antes de diseñar cualquier Revenue Source futuro. Las correcciones 🟡 Moderado y 🟢 Menor pueden completarse en paralelo con la implementación.

---

## Documentos relacionados

- `docs/domain/revenue-sources/01-revenue-sources.md` — Diseño de Revenue Sources
- `docs/domain/revenue-sources/02-shift-work-flow-policies.md` — Flow Policies de Shift Work
- `docs/domain/financial-policies/01-financial-policies.md` — Financial Policies universales
- `docs/domain/calendar/01-calendar-domain.md` — Calendar Domain transversal
- `docs/architecture/00-erp-platform-overview.md` — Visión general del ERP
- `ADR-002-event-driven-integration.md` — Patrón de integración (sin cambios)
- `ADR-003-financial-transaction-bridge.md` — FinancialTransaction como puente (sin cambios)

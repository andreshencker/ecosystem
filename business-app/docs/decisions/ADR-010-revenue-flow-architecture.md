# ADR-010: Revenue Flow — Concepto Arquitectónico de Primera Clase

**Fecha:** 2026-07-06
**Estado:** Aceptado
**Autor:** Architecture Review Session — Pre-implementación

---

## Contexto

ADR-009 estableció que el ERP soporta múltiples Revenue Sources y que Calendar es un dominio transversal. Introdujo los conceptos de Revenue Source, Flow Policies, y Financial Policies.

Sin embargo, ADR-009 dejó implícita una distinción crítica: la diferencia entre el **tipo de actividad económica** (Revenue Source) y la **secuencia de pasos que transforma esa actividad en ingreso** (Revenue Flow).

Esta distinción es necesaria porque:

1. Un Revenue Source puede tener múltiples variantes de billing (ej: Services puede facturar por hora, por precio fijo, o por retainer — tres pipelines distintos dentro del mismo Revenue Source)
2. Revenue Source responde "¿qué tipo de ingreso?" — Revenue Flow responde "¿cómo llega ese ingreso al Revenue Domain?"
3. Sin Revenue Flow como concepto formal, agregar una variante de billing a un Revenue Source existente requeriría crear un nuevo Revenue Source, mezclando tipo con pipeline

---

## La distinción fundamental

| | Revenue Source | Revenue Flow |
|---|---|---|
| **Naturaleza** | Declarativo — tipo de actividad | Procedimental — pipeline de pasos |
| **Pregunta** | ¿De dónde viene el ingreso? | ¿Por qué pasos pasa para llegar a Revenue? |
| **Relación** | Contiene flows | Implementa el contrato de Revenue Domain |
| **Cardinalidad** | N en la plataforma | ≥1 por Revenue Source |
| **Ejemplo** | "Services" | "HourlyServicesFlow", "FixedPriceFlow" |

---

## Decisiones

### D-01: Revenue Flow es un concepto de primera clase

Revenue Flow es la capa procedimental que existe entre un Revenue Source y el Revenue Domain. Cada Revenue Flow tiene:
- Un nombre único (ej. `shift_work_flow`, `hourly_services_flow`)
- Un Entry Point (calendar event, manual entry, sales order, renewal trigger)
- Una secuencia de pasos domain-specific
- Flow Policies configurables por Business
- Un Billable Unit que produce
- Implementa el Revenue Flow Contract

### D-02: Revenue Flow Contract es inmutable

Todo Revenue Flow, sin excepción, debe entregar al Revenue Domain una RevenueLine que cumple:

```
RevenueLine {
  description:        string     — legible por el Business Owner y el Customer
  quantity:           decimal    — > 0
  amount:             Money      — > 0
  billableSourceRef: {
    type:  string    — 'work_event' | 'service_delivery' | 'order_item' | ...
    id:    ObjectId  — referencia al Billable Unit en el Flow domain
  }
}

Invariantes que el Revenue Flow garantiza antes de publicar BillableUnitReady:
  1. La entidad referenciada en billableSourceRef existe
  2. Está en estado 'confirmed' o 'approved' — nunca 'draft'
  3. No existe una RevenueLine previa para este mismo billableSourceRef.id (idempotencia)
```

El Revenue Domain rechaza cualquier RevenueLine que no cumpla este contrato.

### D-03: Revenue Flow NO es un nuevo Bounded Context

Revenue Flow vive dentro de cada Revenue Source domain. El Shift Work domain implementa el Shift Work Revenue Flow. El future Services domain implementará sus Revenue Flows. No existe un "Revenue Flow Service" centralizado.

Lo que SÍ es centralizado (en MDM):
- RevenueFlowRegistry: catálogo de todos los Revenue Flows disponibles
- RevenueFlowType: enum de tipos (MDM data)

### D-04: Revenue Flow Contract es el único punto de integración con Revenue Domain

El Revenue Domain no conoce nada de los Revenue Flows específicos. Su única interfaz con el mundo upstream es el evento `BillableUnitReady` con su payload conformando el Revenue Flow Contract.

Si en el futuro se agrega un nuevo Revenue Source con su Revenue Flow, el Revenue Domain no cambia. Solo empieza a recibir `BillableUnitReady` de una nueva fuente.

### D-05: Un Revenue Source puede tener múltiples Revenue Flows

```
Services (Revenue Source)
  ├── HourlyServicesFlow    — time-based billing, similar to Shift Work
  ├── FixedPriceFlow        — milestone-based, fixed amount per delivery
  └── RetainerFlow          — recurring, subscription-like

Products (Revenue Source)
  ├── DirectSaleFlow        — standard fulfillment pipeline
  └── DropshipFlow          — supplier ships directly, platform charges commission
```

Un Business activa los Revenue Flows específicos que necesita, no el Revenue Source completo. La activación incluye configurar las Flow Policies para ese Flow.

### D-06: RevenueFlowExecution es opcional para v1

Para flujos simples (Shift Work), el tracking de ejecución se hace a través de las entidades propias del Flow domain (WorkEvent tiene status). No es necesario un RevenueFlowExecution separado.

Para flujos complejos de múltiples pasos distribuidos (Manufacturing, Projects), RevenueFlowExecution puede agregarse cuando sea necesario. No es un prerequisito para v1.

### D-07: La jerarquía de configuración queda establecida

```
Platform Level:
  RevenueFlowRegistry    → catálogo de flows disponibles (MDM)
  RevenueFlowDefinition  → blueprint del pipeline
  RevenueFlowContract    → interfaz con Revenue Domain

Business Level:
  BusinessRevenueFlowConfig → qué flows usa este Business + sus Flow Policies

Runtime:
  Domain entities (WorkEvent, ServiceDelivery, OrderItem) son el tracking del flow
  BillableUnitReady es el handoff al Revenue Domain
```

---

## Reglas que establece este ADR

**RF-001 — Revenue Flow implementa el Revenue Flow Contract:**
Todo Revenue Flow debe garantizar que el Billable Unit que entrega cumple exactamente el Revenue Flow Contract antes de publicar `BillableUnitReady`. El Revenue Domain rechaza sin negociación cualquier RevenueLine no conforme.

**RF-002 — Revenue Domain es agnóstico al Revenue Flow:**
El Revenue Domain nunca pregunta "¿de qué Revenue Flow viene esta RevenueLine?". Solo verifica que cumple el Revenue Flow Contract. La naturaleza del Billable Unit (WorkEvent, ServiceDelivery, OrderItem) es opaca para Revenue Domain.

**RF-003 — Flow Policies pertenecen al Revenue Flow, no al Revenue Source:**
Las políticas (BillingPeriod, CutOff, RecognitionPoint, etc.) se configuran a nivel de Revenue Flow — no a nivel de Revenue Source. Si un Business usa HourlyServicesFlow y FixedPriceFlow, cada uno tiene su propio conjunto de Flow Policies configurado independientemente.

**RF-004 — Calendar es siempre transversal:**
Ningún Revenue Flow "posee" Calendar. Los Revenue Flows consumen eventos de Calendar a través de sus propias handlers. Calendar nunca es la razón por la que se crea un WorkEvent, un Appointment, o cualquier entidad del Revenue Flow — la razón es la lógica del Revenue Flow que interpreta el CalendarEvent.

**RF-005 — Agregar un Revenue Flow no modifica el núcleo financiero:**
Al agregar un nuevo Revenue Flow (ej. RentalFlow), los siguientes dominios NO cambian: Revenue Domain, Billing Domain, Financial Engine, Accounting Engine, Analytics. Los únicos cambios son en el Revenue Source domain que implementa el nuevo Flow y en el MDM Registry que lo registra.

**RF-006 — Financial Policies vs Flow Policies — frontera absoluta:**
La frontera es el momento en que RevenueDraft → TRANSFERRED (cuando Billing Domain recibe el control). Todo lo que ocurre antes (cómo se acumula el ingreso, qué reglas aplican al Billable Unit) es Flow Policy. Todo lo que ocurre después (Payment Terms, Reminders, Overdue) es Financial Policy.

---

## La promesa de la arquitectura

> "Para agregar un nuevo Revenue Flow al ERP, crea el dominio upstream, define su Billable Unit, implementa el Revenue Flow Contract, registra el Flow en MDM. El resto del sistema funciona sin cambios."

Esta promesa debe mantenerse sin excepción. Si agregar un nuevo Revenue Flow requiere modificar el Revenue Domain, Billing, Financial Engine, o Accounting Engine, hay una violación de diseño.

---

## Relación con ADR anteriores

| ADR | Relación |
|---|---|
| ADR-002 (Event-Driven Integration) | Revenue Flow usa events como único mecanismo de integración con Revenue Domain |
| ADR-003 (Financial Transaction Bridge) | Revenue Flow no interactúa con Financial Engine — ese es territorio de Billing |
| ADR-005 (Posting Rules as Configuration) | Mismo patrón: Revenue Flow Contract es el "posting rule" del ingreso upstream |
| ADR-009 (Multi-Revenue-Source Architecture) | Revenue Flow formaliza lo que ADR-009 llamaba "pipeline" de forma implícita |

---

## Documentos relacionados

- `docs/domain/revenue-sources/03-revenue-flow.md` — Concepto completo, análisis de los 5 flows, diagrama, y matriz de responsabilidades
- `docs/domain/revenue-sources/01-revenue-sources.md` — Revenue Sources (actualizar para referenciar Revenue Flow)
- `docs/domain/revenue-sources/02-shift-work-flow-policies.md` — Flow Policies del Shift Work Revenue Flow
- `docs/architecture/00-erp-platform-overview.md` — Diagrama general (actualizar para incluir Revenue Flow)
- `docs/decisions/ADR-009-multi-revenue-source-architecture.md` — Auditoría de alineación (Revenue Flow amplía su alcance)

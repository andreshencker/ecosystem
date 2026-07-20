# Revenue Domain

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial
**Posición en el ERP:** Entre Work y Billing — el ciclo completo del ingreso

---

## El problema que resuelve

Sin el dominio Revenue, el ERP tendría un acoplamiento estructural incorrecto:

```
DISEÑO INCORRECTO:

Work ──────────────────────────────────────► Billing
  WorkEvent               Invoice knows about WorkEvents
  RateCalculation         Billing knows Rate rules
  RateResult              Work generates InvoiceItems
```

Este diseño viola las fronteras de dominio:
- Billing necesitaría saber qué es un WorkEvent y cómo se calcula
- Work necesitaría saber cuándo y cómo generar una factura
- No hay respuesta clara a "¿cuánto se ha generado pero no facturado todavía?"
- No hay un concepto de período de facturación con reglas propias

El dominio Revenue resuelve este problema siendo el puente semántico y el buffer económico entre el trabajo realizado y el documento financiero emitido.

---

## El principio fundamental

> El ERP no administra facturas. El ERP administra el ciclo completo del ingreso.
>
> La factura es solo un paso del proceso — el momento en que el ingreso acumulado se formaliza como obligación de pago.

El ciclo de ingreso comienza cuando se confirma el primer WorkEvent y termina cuando el último peso cobrado entra al libro mayor. El dominio Revenue es el custodio de ese ciclo.

---

## Por qué Billing no debe conocer Work directamente

Billing es responsable de documentos financieros: su lenguaje son Invoices, InvoiceItems, Payments, términos de pago, numeración fiscal. No es su responsabilidad entender qué es una Rate, cómo se segmenta un turno nocturno, o qué contratos tiene un Customer.

Si Billing conociera Work:
- Un cambio en el modelo de Rate Engine requeriría cambios en Billing
- Los tests de Billing necesitarían datos de WorkEvents
- La lógica de "¿cuándo crear la factura?" estaría mezclada con la lógica de "cómo crear la factura"
- Billing no podría procesar otros tipos de ingresos (Expenses recuperables, cargos fijos) sin conocer también sus dominios origen

---

## Cómo Revenue desacopla Work y Billing

Revenue actúa como Anti-Corruption Layer y como dominio de valor propio:

```
DISEÑO CORRECTO:

Work                     Revenue                    Billing
  │                        │                          │
  │  WorkEventConfirmed     │                          │
  │ ──────────────────────► │                          │
  │                         │ RevenueDraft.Updated     │
  │                         │ (acumula el RateResult)  │
  │                         │                          │
  │                         │  [BillingPeriod cierra]  │
  │                         │                          │
  │                         │  BillingPeriodClosed     │
  │                         │ ──────────────────────── ►│
  │                         │                          │ InvoiceDraftCreated
  │                         │                          │ (InvoiceItem por línea)
  │                         │                          │
  │                         │  RevenueDraftTransferred │
  │                         │ ◄────────────────────────│
```

Revenue nunca conoce el formato de la Invoice. Billing nunca conoce los detalles de los WorkEvents.

---

## El flujo completo

```
Calendar
    │ [evento importado]
    ▼
WorkEvent DRAFT
    │ [usuario confirma]
    ▼
WorkEvent CONFIRMED ──── Rate Engine ────► RateCalculation CONFIRMED
    │                                           │ RateResult
    │ WorkEventConfirmed                        │
    ▼                                           ▼
Revenue ◄─────────────────────────────────────
    │
    ├── BillingPeriod OPEN (agrupa WorkEvents por período del Contract)
    │
    ├── RevenueDraft ACCUMULATING (suma running de RateResults)
    │       │  [fecha de cierre del período alcanzada]
    │       ▼
    │   RevenueDraft FROZEN
    │       │  [Revenue publica BillingPeriodClosed]
    │       ▼
    │   RevenueDraft TRANSFERRED
    │
    ▼
Billing (recibe líneas de revenue)
    │
    ├── Invoice DRAFT creado (InvoiceItems desde Revenue lines)
    │
    ├── Invoice APPROVED
    │
    ├── Invoice SENT ────────────────────────────► FinancialTransaction INVOICE_ISSUED
    │                                                      │
    ├── Accounts Receivable OPEN                           ▼
    │                                               Accounting Engine
    ├── Payment RECEIVED ────────────────────────► FinancialTransaction PAYMENT_RECEIVED
    │
    └── Invoice PAID → Accounts Receivable CLOSED
                │
                ▼
           Analytics (ciclo cerrado — todos los KPIs actualizados)
```

---

## Índice de documentos

| Documento | Qué responde |
|---|---|
| [01-revenue-domain.md](./01-revenue-domain.md) | ¿Qué es el dominio Revenue y cuáles son sus límites? |
| [02-revenue-lifecycle.md](./02-revenue-lifecycle.md) | ¿Por qué estados pasa el ciclo de ingreso completo? |
| [03-billing-period.md](./03-billing-period.md) | ¿Qué es un Billing Period y cómo agrupa el trabajo? |
| [04-revenue-draft.md](./04-revenue-draft.md) | ¿Qué es un Revenue Draft y cómo acumula valor? |
| [05-financial-impact.md](./05-financial-impact.md) | ¿Qué eventos generan hechos económicos? La matriz completa |
| [06-domain-events.md](./06-domain-events.md) | Catálogo completo de Domain Events — taxonomía de 5 categorías |
| [07-boundaries.md](./07-boundaries.md) | ¿Qué no puede hacer cada dominio del ciclo? |
| [08-roadmap.md](./08-roadmap.md) | ¿Cómo este diseño soporta los módulos futuros? |
| [09-recognition-policy.md](./09-recognition-policy.md) | ¿Cuándo se crea la FinancialTransaction? Las 3 políticas contables |
| [10-document-request.md](./10-document-request.md) | ¿Cómo se genera el PDF antes del envío? El flujo completo |
| [11-revenue-timeline.md](./11-revenue-timeline.md) | El timeline oficial del ciclo — 27 eventos clasificados |

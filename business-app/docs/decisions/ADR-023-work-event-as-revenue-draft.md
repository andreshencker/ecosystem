---
id: ADR-023
title: WorkEvent como Revenue Draft — no existe InvoiceDraft
status: Accepted
date: 2026-07-08
tags: [architecture, work-event, invoice, revenue, billing, erp-flow]
---

# ADR-023 — WorkEvent como Revenue Draft

## Status

Accepted — 2026-07-08

---

## Context

El flujo canónico del ERP es:

```
Contract → WorkEvent → Invoice → Accounts Receivable → Income
```

Existía ambigüedad sobre si debería haber un concepto intermedio `InvoiceDraft` o `RevenueDraft` entre el WorkEvent y la Invoice oficial. Varios documentos de dominio referenciaban un "draft de revenue" o "invoice draft" como estado previo a la factura.

---

## Decision

**No existe `InvoiceDraft`.** El WorkEvent ES el borrador vivo.

### WorkEvent como borrador vivo

El WorkEvent representa el hecho de negocio en estado editable antes de convertirse en un documento oficial. Es el único estado de borrador del ciclo de revenue.

```
WorkEvent {
  status: 'draft' | 'confirmed' | 'invoiced' | 'void'
  
  — Creado manualmente por el Business Admin
  — O creado automáticamente desde un CalendarEventImported (Shift Work flow)
  
  — El Business Admin revisa el WorkEvent
  — Selecciona el Contract que aplica
  — El Contract resuelve: Customer, Rates, Billing Rules
  — BI calcula duración, montos, impuestos
  
  — WorkEvent.status → 'invoiced'
  — Se genera la Invoice (snapshot)
}
```

### Invoice como snapshot oficial

La Invoice es un documento inmutable una vez generado. Representa el hecho financiero en un punto en el tiempo.

```
Invoice {
  status: 'draft' | 'approved' | 'sent' | 'paid' | 'cancelled'
  
  — 'draft': generada, no enviada (puede editarse líneas manuales)
  — 'approved': aprobada internamente (ready to send)
  — 'sent': enviada al Customer — NO SE MODIFICA
  — 'paid': marcada como cobrada
  — 'cancelled': anulada, con trazabilidad
}
```

**Una Invoice enviada (status='sent') no se modifica jamás.**

Si hay un error después del envío:
1. La Invoice se cancela (`status: 'cancelled'`).
2. Se crea una nueva Invoice con los datos correctos.
3. Trazabilidad: `cancelledInvoiceId` referencia la Invoice anulada.

### Líneas de Invoice

Las líneas de una Invoice pueden provenir de dos fuentes:

| Fuente | Descripción |
|---|---|
| WorkEvent | Líneas calculadas desde el WorkEvent (duración, tarifa, etc.) |
| Manual Lines | Líneas manuales del Business Admin (transporte, parking, alojamiento, etc.) |

Ambos tipos de líneas conviven en la misma Invoice.

### Flujo completo

```
Calendario (Communications)
  │ CalendarEventImported
  ▼
WorkEvent { status: 'draft', calendarEventId }
  │
  │  — O bien: WorkEvent creado manualmente
  │
  ▼
Business Admin revisa WorkEvent
  │  Selecciona Contract
  ▼
Contract resuelve:
  — Customer
  — Rates
  — Billing Rules (periodicidad, impuestos, etc.)
  │
  ▼
BI calcula:
  — Duración efectiva (horas)
  — Monto base (horas × rate)
  — Impuestos aplicables
  — Invoice Data Contract (estructura de la factura)
  │
  ▼
WorkEvent.status → 'confirmed'
Business Admin revisa resumen
  │
  ▼
Business Admin aprueba → genera Invoice
  │
  ▼
Invoice { status: 'draft', lines: [workEventLines + manualLines] }
  │
  ▼
Invoice { status: 'approved' }  — revisión interna
  │
  ▼
Invoice { status: 'sent' }  — enviada al Customer (via Communications)
  │
  ▼
Invoice { status: 'paid' }  — cobrada
```

### Flujo alternativo (error post-envío)

```
Invoice { status: 'sent' }
  │ Se detecta error
  ▼
Invoice { status: 'cancelled', cancellationReason: '...', cancelledAt }
  │
  ▼
Nueva Invoice { status: 'draft', sourceInvoiceId: <id cancelada> }
  │
  ▼
... continúa flujo normal ...
```

---

## BI en el flujo (no implementar todavía)

El BI calculará las métricas del WorkEvent. La arquitectura debe permitir:

```
WorkEvent
  → Measures (BI)
  → KPIs
  → Invoice Data Contract
  → Communications Files
  → PDF de Invoice
```

**Regla:** La arquitectura actual debe dejar espacio para este flujo sin necesidad de reestructurar. No se implementa en los sprints actuales.

---

## Impact on existing documentation

| Documento | Cambio requerido |
|---|---|
| `docs/domain/revenue/04-revenue-draft.md` | Actualizar: WorkEvent ES el draft, no existe RevenueDraft separado |
| `docs/domain/revenue/02-revenue-lifecycle.md` | Actualizar: Invoice status lifecycle |
| `docs/domain/revenue/01-revenue-domain.md` | Actualizar: Invoice como snapshot, WorkEvent como borrador |
| Cualquier doc que mencione `InvoiceDraft` | Reemplazar con WorkEvent |

---

## Consequences

### Positive
- Un solo concepto de borrador (WorkEvent) — sin proliferación de entidades draft.
- La Invoice siempre representa un hecho financiero validado.
- La trazabilidad de cancelaciones es explícita y auditable.
- El BI puede calcular sobre WorkEvents antes de generar la Invoice.

### Negative
- El WorkEvent lleva información que algunos sistemas llamarían "revenue pre-billing" — puede ser confuso para usuarios que esperan un concepto explícito de "draft de factura".
- La etapa `Invoice.status = 'draft'` existe pero es breve — principalmente para añadir líneas manuales antes de aprobar.

### Neutral
- No cambia la estructura de la base de datos existente — este ADR documenta el diseño objetivo para cuando se implementen los módulos Billing y Shift Work.

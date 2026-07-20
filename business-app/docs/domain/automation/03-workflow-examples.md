# 03 — Workflow Examples

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual oficial

Cinco workflows reales del ERP documentados con todos sus pasos, condiciones, y bifurcaciones.

---

## Workflow 1 — Invoice Overdue Reminder Sequence

**Propósito:** Enviar recordatorios progresivos cuando una factura vence sin pago.

**Trigger:** `InvoiceOverdue` event

```
START
  │
  │ Context: invoice, customer, business
  ▼
STEP 1 — ACTION: send_email
  ├── event: 'invoices.invoice_overdue_day_0'
  ├── payload: { customerName, invoiceNumber, amountDue, daysOverdue, paymentLink }
  └── onSuccess → STEP 2

STEP 2 — DELAY: 7 días (skip weekends: no, skip holidays: sí)

STEP 3 — CONDITION: ¿invoice.status != 'paid' AND invoice.status != 'voided'?
  ├── TRUE → STEP 4
  └── FALSE → END (pagada durante el período de espera)

STEP 4 — ACTION: send_email
  ├── event: 'invoices.invoice_overdue_day_7'
  ├── payload: { ...mismos campos, urgencia: 'high' }
  └── onSuccess → STEP 5

STEP 5 — DELAY: 7 días

STEP 6 — CONDITION: ¿invoice.status != 'paid' AND invoice.status != 'voided'?
  ├── TRUE → STEP 7
  └── FALSE → END

STEP 7 — ACTION: send_email (formato final notice)
  ├── event: 'invoices.invoice_overdue_final_notice'
  └── onSuccess → STEP 8

STEP 8 — ACTION: create_task
  ├── title: 'Follow up: {{ invoice.invoiceNumber }} - {{ customer.name }}'
  ├── assignedTo: 'business_owner'
  ├── dueDate: today + 3 days
  └── onSuccess → STEP 9

STEP 9 — ACTION: send_internal_notification
  ├── to: [business_owner, accountant]
  ├── message: 'Invoice {{ invoice.invoiceNumber }} is {{ invoice.daysOverdue }} days overdue. Final notice sent.'
  └── onSuccess → END

END — resultado: 'overdue_sequence_completed'
```

**Diagrama visual:**
```
InvoiceOverdue
    │
    ├─[Day 0]─► Email Reminder 1
    │               │
    │           Wait 7 days
    │               │
    │           [Paid?]──YES──► END
    │               │NO
    ├─[Day 7]─► Email Reminder 2
    │               │
    │           Wait 7 days
    │               │
    │           [Paid?]──YES──► END
    │               │NO
    └─[Day 14]─► Final Notice Email
                    │
                 Create Task
                    │
                 Notify Owner & Accountant
                    │
                   END
```

---

## Workflow 2 — Calendar Event to WorkEvent Processing

**Propósito:** Cuando se importa un evento de calendario, procesarlo e intentar asociarlo inteligentemente a un Contract.

**Trigger:** `CalendarEventImported` event

```
START
  │
  │ Context: calendarEvent, calendarIntegration, business, user
  ▼
STEP 1 — ACTION: (Work domain) create_work_event_draft
  ├── date:        calendarEvent.date
  ├── startTime:   calendarEvent.startTime
  ├── endTime:     calendarEvent.endTime
  ├── title:       calendarEvent.title
  ├── userId:      calendarIntegration.userId
  ├── source:      'calendar'
  └── onSuccess → STEP 2

STEP 2 — ACTION: apply_ml_model ('calendar_event_contract_matcher')
  ├── input: { eventTitle, eventDescription, userId, existingContracts }
  └── onSuccess → STEP 3

STEP 3 — CONDITION: ml_result.confidence > 0.85
  ├── TRUE (alta confianza) → STEP 4 (asociar automáticamente)
  └── FALSE (baja confianza) → STEP 6 (notificar para revisión manual)

STEP 4 — ACTION: (Work domain) associate_work_event_to_contract
  ├── workEventId: step1.result.workEventId
  ├── contractId:  ml_result.suggestedContractId
  └── onSuccess → STEP 5

STEP 5 — ACTION: send_internal_notification
  ├── to: [userId]
  ├── message: 'WorkEvent created and automatically associated to contract {{ contract.title }}'
  └── onSuccess → END (result: 'auto_associated')

STEP 6 — ACTION: send_internal_notification
  ├── to: [userId]
  ├── message: 'New WorkEvent requires review. Possible match: {{ ml_result.suggestedContractTitle }} (confidence: {{ ml_result.confidence }}%)'
  └── onSuccess → END (result: 'manual_review_required')

END
```

---

## Workflow 3 — Payment Received Full Pipeline

**Propósito:** Orquestar todo lo que debe ocurrir cuando se registra un pago.

**Trigger:** `PaymentRecorded` event

```
START
  │ Context: payment, invoice, customer, business
  ▼
STEP 1 — CONDITION: ¿payment.amount >= invoice.amountDue?
  ├── TRUE (pago completo o excesivo) → STEP 2
  └── FALSE (pago parcial) → STEP 5

-- RAMA PAGO COMPLETO --

STEP 2 — ACTION: (Billing domain) mark_invoice_paid
  └── onSuccess → STEP 3

STEP 3 — ACTION: send_email
  ├── event: 'payments.payment_received_full'
  ├── payload: { customerName, invoiceNumber, amountPaid, pdfUrl }
  └── onSuccess → STEP 4

STEP 4 — ACTION: send_internal_notification
  ├── to: [business_owner, accountant]
  ├── message: 'Full payment received for invoice {{ invoice.invoiceNumber }}'
  └── onSuccess → END (result: 'fully_paid_processed')

-- RAMA PAGO PARCIAL --

STEP 5 — ACTION: send_email
  ├── event: 'payments.payment_received_partial'
  ├── payload: { amountPaid, amountDue: invoice.amountDue - payment.amount, invoiceNumber }
  └── onSuccess → STEP 6

STEP 6 — ACTION: send_internal_notification
  ├── to: [business_owner]
  ├── message: 'Partial payment of {{ payment.amount }} received. Remaining: {{ invoice.amountDue - payment.amount }}'
  └── onSuccess → END (result: 'partial_payment_processed')

END
```

---

## Workflow 4 — Billing Cycle Auto-Draft Invoice

**Propósito:** Al cierre de un período de facturación, crear borradores automáticamente para contratos con `billingCycle: 'monthly'`.

**Trigger:** `ScheduledTrigger` — primer día de cada mes a las 8am (timezone del Business)

```
START
  │ Context: business, activeMonthlyCycles
  ▼
STEP 1 — ACTION: (Billing domain) get_billable_contracts_for_period
  ├── period: previousMonth
  ├── billingCycle: 'monthly'
  └── onSuccess → STEP 2

STEP 2 — CONDITION: ¿result.contracts.length > 0?
  ├── FALSE → END (sin contratos a facturar este mes)
  └── TRUE → STEP 3

STEP 3 — FOR EACH contract in result.contracts:

  STEP 3a — ACTION: (Billing domain) generate_invoice_draft
    ├── contractId:   contract.id
    ├── period:       previousMonth
    ├── workEventIds: contract.confirmedWorkEvents
    └── onSuccess → STEP 3b

  STEP 3b — ACTION: send_internal_notification
    ├── to: [business_owner]
    ├── message: 'Draft invoice created for {{ contract.title }} — {{ contract.customer.name }}. Review and send when ready.'
    └── continue to next contract

STEP 4 — ACTION: send_internal_notification (summary)
  ├── to: [business_owner]
  ├── message: '{{ result.contracts.length }} draft invoices created for {{ previousMonth }}. Review them in Billing.'
  └── onSuccess → END

END
```

---

## Workflow 5 — Fiscal Period Closing Preparation

**Propósito:** Antes de cerrar un período fiscal, verificar que todo está en orden y notificar al contador.

**Trigger:** `ScheduledTrigger` — último día hábil del mes a las 5pm (timezone del Business)

```
START
  │ Context: business, currentFiscalPeriod
  ▼
STEP 1 — ACTION: (Accounting domain) get_period_readiness_check
  └── onSuccess → STEP 2

STEP 2 — CONDITION: readiness.hasUnreconciledBankTransactions
  ├── TRUE → STEP 3 (alertar sobre conciliación pendiente)
  └── FALSE → STEP 4

STEP 3 — ACTION: send_internal_notification
  ├── to: [business_owner, accountant]
  ├── message: 'Warning: {{ readiness.unreconciledCount }} unreconciled bank transactions before period close.'
  └── continue to STEP 4

STEP 4 — CONDITION: readiness.hasDraftInvoices
  ├── TRUE → STEP 5 (alertar sobre borradores sin enviar)
  └── FALSE → STEP 6

STEP 5 — ACTION: send_internal_notification
  ├── to: [business_owner]
  ├── message: '{{ readiness.draftInvoiceCount }} draft invoices not yet sent. Send or cancel before period close.'
  └── continue to STEP 6

STEP 6 — ACTION: send_internal_notification (summary preparatoria)
  ├── to: [accountant]
  ├── message: 'Period {{ fiscalPeriod }} closes tomorrow. Review checklist: {{ readiness summary }}'
  └── onSuccess → STEP 7

STEP 7 — DELAY: 24 horas

STEP 8 — ACTION: send_internal_notification (recordatorio final)
  ├── to: [business_owner, accountant]
  ├── message: 'Final reminder: period {{ fiscalPeriod }} can now be closed. Action required in Accounting.'
  └── onSuccess → END

END
```

---

## El patrón común de todos los workflows

Observando los 5 ejemplos, emerge un patrón:

```
1. TRIGGER activa el workflow
2. CONTEXT se inicializa con los datos del evento
3. ACTIONS se ejecutan en dominios específicos (Billing, Work, Communication)
4. CONDITIONS bifurcan el flujo según el estado actual del negocio
5. DELAYS pausan la ejecución sin bloquear recursos
6. NOTIFICATIONS informan a los actores relevantes
7. END con un resultado que queda en el historial
```

**Lo que los dominios no saben:**
- Billing no sabe que hay un workflow ejecutándose cuando se marca una factura como vencida
- Work no sabe que hay un workflow esperando para asociar un contrato
- Communications no sabe que el reminder viene de un workflow automatizado

Esto es lo que hace a Automation verdaderamente transversal: los dominios son completamente ajenos a los workflows que los orquestan.

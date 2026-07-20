# 01 — Automation Domain

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual oficial

---

## Los conceptos fundamentales

### Workflow

Un `Workflow` es la definición de un proceso automatizado. Es la "receta" que describe qué hacer, bajo qué condiciones, y en qué orden. Un Workflow es una entidad de configuración — no es una ejecución.

```
Workflow {
    workflowId:        UUID
    name:              string          — 'Invoice Overdue Reminder Sequence'
    description:       string
    isActive:          boolean
    version:           integer         — para evolucionar sin romper ejecuciones en curso
    businessId:        ObjectId?       — null = global (disponible para todos los tenants)
    trigger:           Trigger
    steps:             WorkflowStep[]
    retryPolicy:       RetryPolicy
    timeoutPolicy:     TimeoutPolicy
    createdAt:         DateTime
    updatedAt:         DateTime
}
```

---

### Trigger

Un `Trigger` es la condición que inicia la ejecución de un Workflow. Existen tres tipos:

**Tipo 1 — EventTrigger**: Se dispara cuando ocurre un Domain Event específico.

```
EventTrigger {
    type:           'event'
    eventType:      string          — 'InvoiceOverdue' | 'PaymentRecorded' | etc.
    filters:        object?         — condiciones sobre el payload del evento
                                      ej: { 'payload.amount': { '>': 1000 } }
}
```

**Tipo 2 — ScheduledTrigger**: Se dispara en un horario definido.

```
ScheduledTrigger {
    type:           'scheduled'
    cronExpression: string          — '0 9 * * 1' (lunes a las 9am)
    timezone:       string          — timezone del Business
    startDate:      Date?
    endDate:        Date?
}
```

**Tipo 3 — ManualTrigger**: El Business Owner o un sistema externo lo dispara explícitamente.

```
ManualTrigger {
    type:           'manual'
    requiredInput:  object?         — qué datos debe proveer el caller
}
```

---

### WorkflowStep (los componentes de un Workflow)

Un WorkflowStep es la unidad de trabajo dentro de un Workflow. Hay cuatro tipos:

**Step tipo Action**: Ejecuta una operación en un dominio.

```
ActionStep {
    type:           'action'
    actionType:     string          — qué hacer (ver catálogo de acciones)
    domain:         string          — qué dominio ejecuta la acción
    parameters:     object          — parámetros de la acción (pueden ser template variables)
    onSuccess:      nextStepId?
    onFailure:      failureStepId?
}
```

**Step tipo Delay**: Espera un período antes de continuar.

```
DelayStep {
    type:           'delay'
    duration:       string          — '7d' | '2h' | '30m'
    until:          string?         — expresión temporal: 'next_business_day_9am'
    skipHolidays:   boolean         — respetar HolidayCalendar
    timezone:       string
}
```

**Step tipo Condition**: Evalúa una condición y bifurca el flujo.

```
ConditionStep {
    type:           'condition'
    expression:     string          — expresión evaluable contra el contexto
                                      ej: 'invoice.status !== paid'
    onTrue:         nextStepId
    onFalse:        alternateStepId
}
```

**Step tipo End**: Finaliza la ejecución del workflow.

```
EndStep {
    type:           'end'
    result:         'completed' | 'cancelled' | 'terminated'
    reason:         string?
}
```

---

### Catálogo de ActionTypes

Las acciones que Automation puede ejecutar. Automation nunca implementa la lógica — siempre la delega al dominio responsable.

```
COMMUNICATION ACTIONS:
  send_email              — Disparar evento en Communications Platform
  send_sms                — ídem por SMS
  send_push_notification  — ídem por push
  send_internal_notification — notificación en la UI del portal

BILLING ACTIONS:
  generate_invoice_draft  — Crear borrador de Invoice (auto-draft por billing cycle)
  send_invoice_reminder   — Marcar Invoice para re-envío de recordatorio
  flag_invoice_disputed   — Marcar Invoice como en disputa

WORK ACTIONS:
  associate_contract      — Asociar un WorkEvent a un Contract
  confirm_work_event      — Confirmar automáticamente WorkEvents bajo ciertos criterios

TASK ACTIONS:
  create_task             — Crear una tarea de seguimiento
  assign_task             — Asignar tarea a un usuario
  close_task              — Cerrar una tarea

SYSTEM ACTIONS:
  wait_for_event          — Pausar hasta que ocurra un evento específico
  invoke_webhook          — Llamar a un webhook externo
  log_execution           — Registrar información en el execution log
  notify_platform_admin   — Alerta al Platform Admin

FUTURE ACTIONS:
  create_payroll_run      — Iniciar proceso de nómina
  sync_to_xero            — Enviar datos a Xero
  export_to_csv           — Generar CSV y enviarlo por email
  apply_ml_model          — Ejecutar un modelo de ML y almacenar el resultado
```

---

### WorkflowContext (las variables del workflow)

Cuando un Workflow se ejecuta, tiene acceso a un contexto que incluye los datos del evento disparador y el estado acumulado de los pasos anteriores.

```
WorkflowContext {
    triggerEvent:    object      — payload del evento que disparó el workflow
    businessId:      ObjectId    — tenant del contexto
    executionId:     UUID        — ID único de esta ejecución

    // Variables resueltas al inicio
    invoice?:        object      — Invoice referenciada por el evento
    customer?:       object      — Customer de la Invoice
    contract?:       object

    // Variables acumuladas durante la ejecución
    stepResults:     { stepId: result }
    variables:       object      — variables personalizadas definidas en el workflow
}
```

Las parameters de cada step pueden usar templates de variables del contexto:

```
ActionStep.parameters = {
    event: 'invoices.payment_overdue',
    payload: {
        customerName:  '{{ context.customer.name }}',
        invoiceNumber: '{{ context.invoice.invoiceNumber }}',
        amountDue:     '{{ context.invoice.amountDue }}',
        daysOverdue:   '{{ context.invoice.daysOverdue }}'
    }
}
```

---

### RetryPolicy

```
RetryPolicy {
    maxAttempts:    integer     — máximo de reintentos (ej: 3)
    backoffType:    string      — 'exponential' | 'fixed' | 'linear'
    initialDelay:   string      — '1m' (primer reintento después de 1 min)
    maxDelay:       string      — '1h' (máximo entre reintentos)
    retryableErrors: string[]   — qué errores disparan reintento ('timeout', 'network', 'service_unavailable')
    nonRetryableErrors: string[] — qué errores terminan inmediatamente ('invalid_data', 'not_found')
}
```

---

### DeadLetter

Cuando un step agota todos los reintentos sin éxito:

```
DeadLetterEntry {
    executionId:    UUID
    workflowId:     UUID
    stepId:         string
    businessId:     ObjectId
    failedAt:       DateTime
    attempts:       integer
    lastError:      string
    context:        WorkflowContext
    payload:        object
    resolvedAt:     DateTime?  — cuándo fue resuelto manualmente
    resolution:     string?    — qué hizo el operador
}
```

Las entradas en Dead Letter Queue son visibles en el portal de Platform Admin. El operador puede:
1. Reintentar manualmente
2. Cancelar la ejecución
3. Resolver con acción manual fuera del sistema

---

## Responsabilidades de Automation

### Lo que Automation DEBE hacer

| Responsabilidad | Descripción |
|---|---|
| **Escuchar Domain Events** | Suscribirse al event bus para detectar triggers |
| **Instanciar Workflows** | Crear Executions cuando se activa un Trigger |
| **Orquestar los pasos** | Ejecutar Actions, evaluar Conditions, gestionar Delays |
| **Garantizar idempotencia** | No ejecutar el mismo workflow dos veces para el mismo evento |
| **Reintentar con backoff** | Manejar fallos transitorios en las Actions |
| **Registrar el historial** | Toda ejecución debe ser auditable |
| **Gestionar Dead Letter** | Alertar cuando una ejecución no puede completarse |

### Lo que Automation NUNCA debe hacer

| Prohibición | Razón |
|---|---|
| **Implementar lógica de negocio** | Si un step calcula el GST, esa lógica pertenece a Financial |
| **Modificar datos directamente** | Automation invoca Actions en los dominios; los dominios modifican sus propios datos |
| **Conocer los internos de los dominios** | Solo conoce las interfaces públicas de cada dominio |
| **Crear Domain Events como si fuera un dominio** | Solo puede invocar Actions que los dominios ejecutan |
| **Tomar decisiones de negocio irreversibles sin confirmación** | Marcar una factura como incobrable requiere aprobación humana |

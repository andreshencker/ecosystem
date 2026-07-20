# 02 — Workflow Model

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual oficial

---

## Ejecución de un Workflow

Cuando un Trigger se activa, Automation crea una `WorkflowExecution` — la instancia de un Workflow para ese evento específico.

```
WorkflowExecution {
    executionId:     UUID
    workflowId:      UUID
    workflowVersion: integer         — versión del workflow al inicio de la ejecución
    businessId:      ObjectId
    triggeredBy:     TriggerSource   — qué disparó la ejecución
    status:          ExecutionStatus
    context:         WorkflowContext
    currentStepId:   string
    startedAt:       DateTime
    completedAt:     DateTime?
    error:           string?
}

ExecutionStatus:
  'pending'     — creada, aún no iniciada
  'running'     — en ejecución
  'waiting'     — en un Delay o esperando un evento
  'completed'   — todos los pasos completados
  'failed'      — un step falló y agotó los reintentos
  'cancelled'   — cancelada manualmente
  'timed_out'   — superó el TimeoutPolicy
```

---

## Ciclo de ejecución

```
Trigger activado (Domain Event llega)
        │
        ▼
¿Ya existe una Execution para este (workflowId, triggerEventId)?
        ├── SÍ → descartar (idempotencia)
        └── NO → crear WorkflowExecution
        │
        ▼
Inicializar WorkflowContext
  ├── Extraer datos del evento (invoice, customer, etc.)
  └── Resolver variables del workflow
        │
        ▼
Ejecutar Step actual (según currentStepId)
        │
    ActionStep → invocar dominio → esperar resultado
    DelayStep  → programar reanudación en T tiempo
    ConditionStep → evaluar expresión → elegir rama
    EndStep    → marcar execution como completed
        │
        ▼
¿El step falló?
        ├── SÍ → aplicar RetryPolicy
        │         ├── Reintentos disponibles → reintento con backoff
        │         └── Sin reintentos → Dead Letter Queue
        └── NO → avanzar al siguiente step
        │
        ▼
¿Es un DelayStep?
        ├── SÍ → Scheduler registra reanudación en T tiempo
        │         → Execution queda en status 'waiting'
        └── NO → continuar inmediatamente al siguiente step
```

---

## Idempotencia de ejecuciones

**El riesgo:** Un Domain Event puede entregarse más de una vez (at-least-once delivery). Si Automation crea una Execution por cada entrega del evento, se enviarían múltiples recordatorios.

**La solución:** Execution Key

```
ExecutionKey = hash(workflowId + triggerEventId)

Antes de crear una Execution:
  ¿Existe ya una Execution con este ExecutionKey?
    SÍ → ignorar el evento (ya fue procesado)
    NO → crear la Execution
```

El `triggerEventId` es el `eventId` del Domain Event que activó el trigger. Dado que cada Domain Event tiene un `eventId` UUID único, la misma entrega del mismo evento siempre produce el mismo `ExecutionKey`.

---

## Delays y el Scheduler

Cuando un Workflow tiene un `DelayStep`, la ejecución se suspende y el Scheduler la reanuda en el momento correcto.

```
DelayStep ejecutado:
  1. Automation calcula el timestamp de reanudación:
     resumeAt = now() + duration (respetando timezone y holidays si corresponde)
  2. Automation persiste el estado actual de la Execution
  3. Automation registra el resumeAt en el Scheduler
  4. Execution.status → 'waiting'
  5. El thread se libera

Scheduler al llegar al resumeAt:
  1. Recupera la Execution del storage
  2. Verifica que las precondiciones siguen siendo válidas
     (ej: ¿la invoice todavía está sin pagar?)
  3. Reanuda la Execution desde el siguiente step
```

**El estado de la Execution es persistido entre steps.** Si el servidor se reinicia durante un Delay de 7 días, la Execution se recupera del storage y el Scheduler la reanuda correctamente.

---

## Versionado de Workflows

Los Workflows evolucionan con el tiempo. Cuando se modifica un Workflow, las Executions en curso siguen usando la versión con la que comenzaron.

```
Workflow versión 1: InvoiceOverdue → email → wait 14d → email → end
Workflow versión 2: InvoiceOverdue → email → wait 14d → email → wait 7d → SMS → end

Executions iniciadas con v1 → siguen con v1 hasta completar
Executions nuevas desde hoy → usan v2
```

Esto garantiza que una ejecución comenzada con cierta lógica no cambia a mitad de camino.

---

## Templates de Workflows predefinidos

El sistema incluye templates de workflows que el Business Owner puede activar y personalizar:

| Template | Trigger | Descripción |
|---|---|---|
| `invoice_overdue_reminder` | InvoiceOverdue | Secuencia de recordatorios de pago |
| `invoice_sent_followup` | InvoiceSent | Verificación de recepción 3 días después |
| `payment_received_confirmation` | PaymentRecorded | Confirmación de pago al cliente |
| `calendar_sync_processing` | CalendarEventImported | Procesamiento de evento importado |
| `new_customer_onboarding` | CustomerCreated | Bienvenida y onboarding del cliente |
| `billing_cycle_draft` | ScheduledTrigger | Auto-draft al cierre del ciclo de facturación |
| `fiscal_period_closing` | ScheduledTrigger | Preparación para cierre de período |

El Business Owner puede:
- Activar/desactivar templates
- Personalizar los delays y el texto de los mensajes (via Communication Platform)
- Crear workflows completamente personalizados (Fase 4+ de Analytics)

---

## Execution History (audit trail)

Cada paso de cada ejecución queda registrado:

```
ExecutionHistoryEntry {
    executionId:   UUID
    stepId:        string
    stepType:      string
    startedAt:     DateTime
    completedAt:   DateTime?
    status:        'success' | 'failed' | 'skipped' | 'retrying'
    attempts:      integer
    input:         object?    — parámetros del step
    output:        object?    — resultado del step
    error:         string?
}
```

**Por qué es crítico:**
Si un Business Owner llama al soporte porque "recibí 3 recordatorios en vez de 1", el historial de ejecución muestra exactamente qué pasó, cuándo, y por qué. No es necesario revisar logs de múltiples sistemas — todo está en un solo lugar.

---

## Governance de Workflows

### ¿Quién puede crear Workflows?

| Actor | Puede hacer |
|---|---|
| Platform Admin | Crear templates globales, activar para todos los tenants |
| Business Owner | Activar/desactivar templates, personalizar parámetros |
| Business Admin | Personalizar parámetros de workflows ya activos |
| Staff | Solo puede ver el estado de ejecuciones que le afectan |

### Límites de seguridad

- Un Workflow de un Business A no puede afectar entidades de Business B
- Los Actions siempre reciben el `businessId` del contexto — nunca del payload del caller
- Los Workflows no pueden invocar Actions que modifiquen datos de otros tenants

# 04 — Execution Model

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual oficial

---

## Garantías del motor de ejecución

El motor de ejecución de Automation garantiza las siguientes propiedades para toda ejecución:

| Garantía | Descripción |
|---|---|
| **At-least-once delivery** | Cada step se intenta al menos una vez |
| **Idempotencia de executions** | Un evento no genera más de una Execution para el mismo Workflow |
| **Durabilidad** | El estado de la ejecución sobrevive reinicios del servidor |
| **Observabilidad** | Cada step deja un registro en el Execution History |
| **Aislamiento de tenants** | Una Execution nunca accede a datos de otro Business |
| **Límite de tiempo** | Toda ejecución tiene un timeout máximo (configurable, default: 30 días) |

---

## Durabilidad del estado

El estado de cada Execution se persiste después de cada step completado. Esto garantiza que si el servidor se reinicia durante un Delay de 7 días, la ejecución se recupera correctamente.

```
Proceso de ejecución durable:

Step N completado
    │
    ▼
Persistir estado:
  execution.currentStepId = step_N+1
  execution.stepResults[step_N] = result
  execution.context = updated_context
    │
    ▼
Ejecutar Step N+1
    │
Si servidor se reinicia aquí:
    │
    ▼
Al reiniciar, el motor recupera todas las Executions en status 'running' o 'waiting'
y las reanuda desde su currentStepId
```

---

## Scheduler de Delays

Los Delays son el componente más crítico del modelo de ejecución. Un Delay de 14 días significa que el servidor necesita "recordar" que debe reanudar esa ejecución en 14 días — incluso si se reinicia múltiples veces.

### Estructura del Scheduler

```
ScheduledResumption {
    executionId:    UUID
    workflowId:     UUID
    businessId:     ObjectId
    resumeAt:       DateTime     — cuando debe reanudarse
    stepId:         string       — qué step continuar
    status:         'pending' | 'processed' | 'cancelled'
    createdAt:      DateTime
}
```

### Precisión del Scheduler

- El Scheduler corre con una frecuencia de 1 minuto
- La precisión real del delay es ±1 minuto (aceptable para delays de horas o días)
- Para casos críticos (ej. "enviar exactamente a las 9am del lunes"), el timestamp de resume se calcula con precisión al segundo

### Delays con reglas de calendario

```
DelayStep {
    duration:       '7d'
    skipHolidays:   true
    until:          'next_business_day_9am'
    timezone:       business.timezone
}

Resolución:
  today = Thursday 2026-07-02
  + 7 days = Thursday 2026-07-09
  is it a public holiday? → No
  is it a business day? → Yes
  final resumeAt = 2026-07-09 09:00:00 AEST
```

---

## Retry Policy en detalle

### Backoff exponencial

```
Intento 1: falla → esperar 1 minuto → reintento 2
Intento 2: falla → esperar 2 minutos → reintento 3
Intento 3: falla → esperar 4 minutos → reintento 4
...
Intento N: falla → esperar min(2^N, maxDelay) → reintento N+1

Si N > maxAttempts → Dead Letter Queue
```

### Errores retryable vs no-retryable

```
RETRYABLE (transitorio — puede recuperarse):
  'service_unavailable'    — el servicio está caído momentáneamente
  'timeout'                — la llamada tardó demasiado
  'network_error'          — error de red
  'rate_limited'           — el servicio externo limita la tasa de llamadas
  'conflict'               — condición de carrera que puede resolverse sola

NON-RETRYABLE (permanente — reintentar no ayudaría):
  'not_found'              — la entidad no existe (fue eliminada)
  'invalid_data'           — los datos del context son inválidos
  'authorization_denied'   — sin permisos (no cambiará con reintento)
  'workflow_cancelled'     — la ejecución fue cancelada manualmente
  'domain_rule_violation'  — la acción viola una invariante del dominio
```

---

## Dead Letter Queue

Cuando una Execution agota todos sus reintentos, la entrada va a Dead Letter Queue (DLQ).

### Acciones disponibles desde DLQ

| Acción | Descripción | Disponible para |
|---|---|---|
| **Retry manually** | Reintentar el step fallido | Platform Admin, Business Owner |
| **Skip step** | Marcar el step como skipped y continuar | Platform Admin |
| **Cancel execution** | Terminar la ejecución sin completarla | Business Owner, Platform Admin |
| **Modify context & retry** | Corregir los datos del context antes de reintentar | Platform Admin |

### Alertas de DLQ

Cuando una entrada llega al DLQ:
1. Platform Admin recibe alerta inmediata (para errores de plataforma)
2. Business Owner recibe notificación (para errores de negocio)
3. La entrada aparece en el portal de administración con toda la información de diagnóstico

---

## Execution History como herramienta de debugging

El Execution History es la herramienta principal para entender qué pasó en un workflow.

```
Execution History para InvoiceOverdue workflow:

[09:00:01] Execution CREATED
  Trigger: InvoiceOverdue { invoiceId: INV-042, customerId: ACME }
  Status: pending

[09:00:01] Step 1 STARTED (send_email)
  Input: { event: 'invoices.invoice_overdue_day_0', payload: {...} }
  Status: running

[09:00:02] Step 1 COMPLETED
  Output: { messageId: 'msg_abc123', delivered: true }
  Duration: 980ms
  Status: success

[09:00:02] Step 2 STARTED (delay: 7 days)
  ResumeAt: 2026-07-12 09:00:02
  Status: waiting

-- 7 días después --

[2026-07-12 09:00:08] Step 2 COMPLETED (delay expired)
  Status: success

[2026-07-12 09:00:08] Step 3 STARTED (condition)
  Expression: invoice.status !== 'paid'
  Evaluated: 'overdue' !== 'paid' → true
  Status: success → following TRUE branch

[2026-07-12 09:00:08] Step 4 STARTED (send_email)
  ...

[2026-07-12 09:00:09] EXECUTION COMPLETED
  Result: overdue_sequence_completed
  Duration: 7 days, 0 hours, 8 seconds
```

---

## Métricas del motor de Automation

Para Analytics (y para que Platform Admin monitoree la salud del sistema):

| Métrica | Descripción |
|---|---|
| `executions.started_per_hour` | Tasa de inicio de ejecuciones |
| `executions.completed_ratio` | % de ejecuciones que completan vs fallan |
| `executions.avg_duration` | Duración promedio por workflow template |
| `executions.in_delay` | Cuántas ejecuciones están actualmente en un Delay |
| `dlq.size` | Entradas actuales en Dead Letter Queue |
| `dlq.resolution_time` | Tiempo promedio para resolver un DLQ entry |
| `scheduler.lag` | Retraso del scheduler respecto a los resumeAt planeados |

---

## Evolución del motor a 10 años

### Fase 1 — Motor básico (con el ERP)
- Event-driven triggers
- Action, Delay, Condition steps
- RetryPolicy básico
- Dead Letter Queue

### Fase 2 — Scheduler avanzado
- Calendar-aware delays
- Timezone-accurate scheduling
- Business hours detection

### Fase 3 — Workflows configurables por Business Owner
- UI visual para crear workflows (drag & drop)
- Templates de workflows por industria
- A/B testing de secuencias de recordatorio

### Fase 4 — ML-enhanced Automation
- Conditions evaluadas por modelos de ML (ej: "si el score de riesgo > 70")
- Optimización automática de timing (¿cuándo responde mejor este cliente?)
- Detección de loops y workflows ineficientes

### Fase 5 — Multi-step Sagas distribuidas
- Coordinación transaccional entre servicios externos
- Compensación automática (si un pago falla, revertir pasos anteriores)
- Integración con sistemas de accounting externos (Xero, MYOB)

# 02 — Data Ingestion

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual oficial

La capa de ingesta es la única puerta de entrada de datos al Analytics Domain. Todo lo que Analytics sabe sobre el negocio llegó a través de esta capa.

---

## Principio rector

> **Analytics nunca consulta las bases de datos operativas de forma directa. Todo dato entra por eventos o por procesos de sincronización controlados.**

```
PROHIBIDO:
  AnalyticsService.buildRevenue() {
    const invoices = await db.collection('invoices').find({ businessId }); // ← VIOLACIÓN
  }

CORRECTO:
  AnalyticsIngestion.onInvoiceSent(event) {
    await analyticsStore.upsertInvoiceFact({ ... }); // construido desde el evento
  }
```

Esta regla no es solo de diseño — es de seguridad. Si Analytics pudiera leer la colección de `invoices` directamente, cualquier cambio en el schema de Billing rompería Analytics. Con ingesta por eventos, solo el handler necesita actualizarse.

---

## Mecanismos de ingesta

### Mecanismo 1 — Event-Driven (principal)

El mecanismo primario. Analytics suscribe al Event Bus y reacciona a cada Domain Event relevante.

```
Domain Event ocurre
        │
        ▼
Event Bus (publicado por el dominio origen)
        │
        ▼
Analytics Event Handler (suscriptor)
        │
        ├── Valida el evento
        ├── Verifica idempotencia (¿ya fue procesado?)
        ├── Transforma al formato del Analytics Model
        ├── Actualiza Facts, Dimensions, Snapshots afectados
        └── Registra el procesamiento en el event log interno
```

**Características:**
- Latencia: < 1 segundo desde que el evento ocurre hasta que el Analytics Store refleja el cambio
- Granularidad: un evento = un hecho analítico
- Orden: los eventos se procesan en orden de `occurredAt`

**Cuándo usar:**
- Para todos los hechos de negocio en tiempo real
- Revenue, Payments, WorkEvents, Journal Entries, Communication logs

---

### Mecanismo 2 — Batch Aggregation (jobs periódicos)

Algunos datos analíticos requieren agregaciones que es más eficiente calcular en batch que en tiempo real.

```
Job periódico (cada hora, cada día)
        │
        ▼
Analytics Aggregation Job
        │
        ├── Consulta el Analytics Store (no el dominio operativo)
        ├── Calcula agregaciones: ARSnapshot, RevenueSnapshot, etc.
        ├── Actualiza las tablas de snapshots
        └── Registra la ejecución
```

**Características:**
- Latencia: hasta 1 hora (aceptable para snapshots de período)
- Granularidad: agrega múltiples hechos en un solo resultado
- Eficiencia: más económico que recalcular snapshots en cada evento

**Cuándo usar:**
- `RevenueByMonthSnapshot` — calculado al cierre del día
- `ARAgingSnapshot` — calculado cada hora
- `GSTPositionSnapshot` — calculado al cierre de cada semana
- `WorkloadSummarySnapshot` — calculado al cierre del día

---

### Mecanismo 3 — ETL / Historical Backfill

Cuando se despliega Analytics por primera vez (o cuando se agrega un nuevo tipo de proyección), el store analítico no tiene datos históricos. El backfill reproduce el historial de eventos.

```
Backfill Job ejecutado
        │
        ├── Lee el event log desde fecha X hasta fecha Y
        ├── Para cada evento en orden cronológico:
        │       ├── Aplica el handler correspondiente
        │       └── Actualiza el Analytics Store
        └── Al finalizar, el Analytics Store tiene datos históricos completos
```

**Características:**
- Proceso offline (no afecta la operación normal)
- Determinista: el mismo event log produce el mismo resultado siempre
- Puede ejecutarse múltiples veces (idempotente si los handlers son idempotentes)

**Cuándo usar:**
- Al desplegar Analytics por primera vez
- Al agregar un nuevo tipo de KPI o Dataset
- Al corregir un bug en un Event Handler (rebuild selectivo)
- Al migrar el Analytics Schema

---

### Mecanismo 4 — Streaming (futuro Fase 4+)

Para volúmenes de datos donde el event-driven simple no es suficiente.

```
Alta frecuencia de eventos
        │
        ▼
Event Stream (Kafka / Kinesis)
        │
        ▼
Stream Processor (Flink / Spark Streaming)
        │
        ├── Windowing: agrupación por ventanas de tiempo
        ├── Deduplication: eliminación de duplicados
        ├── Late events: manejo de eventos desordenados
        └── Analytics Store updates en micro-batches
```

**Cuándo es necesario:**
- Cuando el Business App tiene > 100 eventos/segundo por tenant
- Para cálculos de tiempo real muy complejos (ML scoring en tiempo real)
- Para integración con data warehouses externos

En las primeras fases del ERP, el event-driven simple es suficiente. El streaming se considera una optimización de escala, no un requerimiento inicial.

---

## Catálogo de eventos que Analytics ingiere

### IDENTITY Domain

| Evento | Qué actualiza en Analytics |
|---|---|
| `UserRegistered` | `BusinessDimension.totalUsers++` |
| `UserActivated` | `BusinessDimension.activeUsers` |
| `UserDeactivated` | `BusinessDimension.activeUsers--` |

### BUSINESS Domain

| Evento | Qué actualiza en Analytics |
|---|---|
| `BusinessCreated` | Inicializa `BusinessDimension` |
| `BusinessProfileUpdated` | Actualiza `BusinessDimension.name`, etc. |
| `FiscalProfileConfigured` | `BusinessDimension.hasCompleteFiscalProfile = true` |

### CUSTOMER Domain

| Evento | Qué actualiza en Analytics |
|---|---|
| `CustomerCreated` | Crea `CustomerDimension` |
| `CustomerUpdated` | Actualiza `CustomerDimension` (SCD Type 1 — sobrescribe) |
| `CustomerDeactivated` | `CustomerDimension.isActive = false` |

### WORK Domain

| Evento | Qué actualiza en Analytics |
|---|---|
| `WorkEventConfirmed` | Crea `WorkEventFact`, actualiza `WorkloadSnapshot` |
| `WorkEventVoided` | Actualiza `WorkEventFact.isVoided = true`, ajusta snapshot |
| `WorkEventInvoiced` | `WorkEventFact.invoicedAt` |
| `ContractActivated` | Crea/actualiza `ContractDimension` |
| `ContractCompleted` | `ContractDimension.status = 'completed'` |

### BILLING Domain

| Evento | Qué actualiza en Analytics |
|---|---|
| `InvoiceGenerated` | Crea `InvoiceFact` (status: draft) |
| `InvoiceSent` | `InvoiceFact.status = 'sent'`, `InvoiceFact.sentAt`, actualiza `RevenueSnapshot` |
| `InvoiceOverdue` | `InvoiceFact.status = 'overdue'`, actualiza `ARSnapshot` |
| `InvoicePaid` | `InvoiceFact.status = 'paid'`, `InvoiceFact.paidAt`, ajusta `ARSnapshot` |
| `InvoiceVoided` | `InvoiceFact.isVoided = true`, revierte `RevenueSnapshot` |
| `PaymentRecorded` | Crea `PaymentFact`, ajusta `ARSnapshot`, actualiza `CashSnapshot` |
| `PaymentReversed` | `PaymentFact.isReversed = true`, revierte ajustes |

### FINANCIAL Domain

| Evento | Qué actualiza en Analytics |
|---|---|
| `FinancialTransactionCreated` | Crea `FinancialTransactionFact` |
| `TransactionPosted` | `FinancialTransactionFact.status = 'posted'` |

### ACCOUNTING Domain

| Evento | Qué actualiza en Analytics |
|---|---|
| `JournalEntryPosted` | Crea `JournalFact`, actualiza `LedgerSnapshot` por cuenta |
| `FiscalPeriodClosed` | Crea `PeriodSnapshot` (balance de cierre) |
| `FiscalPeriodLocked` | `PeriodSnapshot.isLocked = true` |

### COMMUNICATION Domain

| Evento | Qué actualiza en Analytics |
|---|---|
| `CommunicationDelivered` | Crea `CommunicationFact`, actualiza métricas de entrega |
| `CommunicationFailed` | `CommunicationFact.failed = true`, actualiza tasa de error |

---

## Idempotencia en la ingesta

Un evento puede entregarse más de una vez (at-least-once delivery en la mayoría de event buses). Los handlers deben ser idempotentes: procesar el mismo evento dos veces debe producir el mismo resultado que procesarlo una sola vez.

### Estrategia de idempotencia

```
Analytics Event Handler
  ├── Recibe evento { eventId: UUID, eventType, occurredAt, ... }
  ├── Busca en ProcessedEvents: ¿existe una entrada con este eventId?
  │       ├── SÍ → descartar silenciosamente (ya fue procesado)
  │       └── NO → procesar
  ├── Procesa el evento (actualiza Facts, Dimensions, Snapshots)
  └── Registra en ProcessedEvents { eventId, processedAt, handlerVersion }
```

**Tabla ProcessedEvents:**

```
ProcessedEvents {
    eventId:        UUID        — ID único del evento (garantizado por el publicador)
    eventType:      string
    processedAt:    DateTime
    handlerVersion: string      — versión del handler (para detectar replays post-fix)
    businessId:     ObjectId    — para limpieza por tenant
}
```

---

## Manejo de eventos fuera de orden (Out-of-Order Events)

Los eventos pueden llegar en un orden diferente al que ocurrieron (especialmente en sistemas distribuidos).

### El problema

```
Evento A: InvoiceSent         (ocurrió a las 10:00)
Evento B: PaymentRecorded     (ocurrió a las 10:05)

Si llegan en orden: A → B → correcto
Si llegan fuera de orden: B → A → ¿el snapshot de AR está correcto?
```

### La solución

Los handlers deben aplicar los eventos usando el `transactionDate`/`occurredAt` del evento, no el timestamp de procesamiento. Los snapshots se calculan por período basándose en las fechas de los hechos, no en cuándo fueron procesados.

```
Para snapshots temporales:
  RevenueSnapshot(period='2026-07') incluye todos los InvoiceFacts donde
  invoiceFact.sentDate >= '2026-07-01' AND invoiceFact.sentDate < '2026-08-01'

Independientemente de cuándo llegó el evento al Analytics.
```

---

## Reprocesamiento (Rebuild)

Si se detecta un bug en un handler, o se agrega un nuevo tipo de proyección, se puede reconstruir selectivamente:

```
Rebuild(projection: 'RevenueSnapshot', businessId: X, from: '2026-01-01')

1. DELETE RevenueSnapshot WHERE businessId = X AND period >= '2026-01'
2. DELETE ProcessedEvents WHERE businessId = X AND eventType IN ('InvoiceSent', 'InvoiceVoided', 'PaymentRecorded')
3. REPLAY all events for businessId X from '2026-01-01' in chronological order
4. Handlers rebuild the projection from scratch
```

Este proceso es seguro porque:
- Los eventos originales son inmutables (no se borraron)
- Los handlers son deterministas (el mismo input produce el mismo output)
- El reprocesamiento es idempotente (se puede interrumpir y reanudar)

---

## Sincronización con datos históricos (Bootstrap)

Cuando Analytics se despliega en un sistema que ya tiene datos:

```
Bootstrap Process:

Fase 1 — Inventario
  → Contar todos los eventos en el event log
  → Estimar tiempo de procesamiento
  → Marcar Analytics como "en construcción"

Fase 2 — Replay histórico (offline)
  → Procesar todos los eventos desde el inicio
  → Construir Facts, Dimensions, Snapshots
  → Progreso visible para el operador

Fase 3 — Catch-up
  → Los nuevos eventos llegaron mientras se hacía el replay
  → Procesar los eventos pendientes del period catch-up

Fase 4 — Live
  → Analytics está al día
  → Modo event-driven normal activado
  → Marcar Analytics como "activo"
```

---

## Contrato del Event Handler

Todo Event Handler en Analytics implementa la misma interfaz conceptual:

```
EventHandler<T extends DomainEvent> {
    handle(event: T): void

    // Condiciones:
    // - DEBE ser idempotente
    // - DEBE usar event.occurredAt para fechas, no el timestamp de ejecución
    // - DEBE solo escribir en el Analytics Store
    // - NO DEBE llamar a APIs de otros dominios
    // - NO DEBE tener efectos secundarios fuera del Analytics Store
    // - DEBE completarse en < 500ms (si no, dividir en pasos async)
}
```

---

## Esquema de prioridades de procesamiento

No todos los eventos tienen la misma urgencia para Analytics:

| Prioridad | Eventos | Lag aceptable |
|---|---|---|
| Alta | InvoiceSent, PaymentRecorded, WorkEventConfirmed | < 2 segundos |
| Media | JournalEntryPosted, FiscalPeriodClosed | < 10 segundos |
| Baja | CommunicationDelivered, CalendarSynced | < 60 segundos |
| Batch | Snapshots periódicos, Aggregations | Hasta 1 hora |
| Background | ML training data updates | Horas |

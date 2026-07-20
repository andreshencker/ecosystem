# ADR-004: CQRS y Read Models para la capa de Analytics y Reporting

**Fecha:** 2026-07-05
**Estado:** Aceptado
**Autor:** Architecture Review Session

---

## Contexto

### El problema de la lectura en un sistema multi-dominio

El ERP tiene 12 Bounded Contexts, cada uno con sus propias entidades. El dashboard del Business Owner necesita mostrar:

- Ingresos del mes (de Billing)
- Horas trabajadas (de Work)
- Facturas vencidas (de Billing)
- Saldo bancario (de Banking, cuando esté implementado)
- Posición de GST (de Accounting)
- Tasa de cobro (de Billing + Payments combinados)

Este tipo de consulta cruza múltiples dominios. ¿Cómo se implementa sin crear acoplamiento?

### Opciones de diseño

**Opción A — Cross-domain queries en runtime**

```
DashboardService.getDashboardData(businessId) {
  const invoices = await billingService.getMonthlyInvoices(businessId);
  const workEvents = await workService.getMonthlyHours(businessId);
  const payments = await paymentService.getMonthlyPayments(businessId);
  const ledger = await accountingService.getGSTPosition(businessId);
  // combinar y calcular...
}
```

Consecuencias:
- (+) Simple de implementar
- (-) DashboardService acoplado a 4+ servicios de dominio
- (-) Cada query toca colecciones de escritura (alta carga en producción)
- (-) Si cambia el schema de Invoice, el DashboardService falla
- (-) Performance: múltiples queries en serie o paralelo para cada carga de dashboard
- (-) Imposible de escalar el dashboard independientemente de los dominios operativos
- (-) Violación de la separación de dominios: el dashboard "conoce" cómo funciona Billing internamente

**Opción B — Vistas materializadas a nivel de base de datos**

```
MongoDB view o índice secundario que combina invoices + work_events + payments
    → DashboardService lee la vista materializada
```

Consecuencias:
- (+) Sin código adicional
- (-) Las vistas de MongoDB tienen limitaciones (no pueden combinar lógica de negocio compleja)
- (-) Acoplamiento a nivel de base de datos: la vista conoce el schema de invoices
- (-) No funciona cuando los datos vienen de múltiples servicios o múltiples bases de datos
- (-) Dificulta la migración del schema de cualquier colección origen

**Opción C — CQRS con Read Models proyectados desde Domain Events**

```
// Al momento de ocurrir el evento (escritura):
InvoiceSent event → Analytics handler → actualiza RevenueByPeriodView
WorkEventConfirmed event → Analytics handler → actualiza WorkloadView
PaymentRecorded event → Analytics handler → actualiza AccountsReceivableView

// Al momento de la consulta (lectura):
DashboardService.getDashboardData(businessId)
    → BusinessDashboardView.find({ businessId })  ← query sobre un solo documento
    → retorna inmediatamente
```

Consecuencias:
- (+) Dashboard consulta un solo documento pre-calculado (query instantáneo)
- (+) DashboardService no conoce Billing, Work, ni Accounting
- (+) Read Models son independientemente escalables
- (+) Cambiar el schema de Invoice solo requiere actualizar el handler de Analytics
- (+) Los Read Models pueden reconstruirse reproduciendo el historial de eventos
- (-) Consistencia eventual: el dashboard puede mostrar datos con lag de < 1 segundo
- (-) Almacenamiento adicional (los Read Models duplican algunos datos)
- (-) Los event handlers deben ser idempotentes

**Opción D — GraphQL Federation (lectura distribuida)**

```
// Cada dominio expone su subgraph
// El API Gateway federa y combina en una sola query
query { business(id: X) { invoices { total } workEvents { hours } } }
```

Consecuencias:
- (+) Flexible para queries ad-hoc
- (-) Requiere que cada dominio exponga un GraphQL schema
- (-) N+1 problem a escala
- (-) Complejidad de federación innecesaria para un sistema con dominios claros
- (-) El dominio de Billing aún necesita exponer su schema → acoplamiento

---

## Decisión

**Se adopta CQRS con Read Models proyectados desde Domain Events (Opción C).**

El lado de escritura usa los Aggregate Roots con modelos de escritura. El lado de lectura usa Read Models construidos en el Analytics domain desde Domain Events.

```
WRITE SIDE (Command):
  User action → Application Layer → Aggregate Root → Domain Event
  Datos de negocio almacenados en colecciones de escritura (invoices, work_events, etc.)

READ SIDE (Query):
  Domain Events → Event Handlers → Read Models (proyecciones pre-calculadas)
  Datos de analytics almacenados en colecciones de lectura (dashboard_views, revenue_views, etc.)
```

---

## Justificación

### 1. Los dominios de escritura no deben ser contaminados por requisitos de lectura

Un Invoice aggregate tiene reglas: estado, invariantes, cálculos. Si se agrega un campo `lastViewedByAdmin` para el dashboard, se está contaminando el dominio con un requisito de reporting. Con Read Models, los requisitos de visualización se manejan fuera del Aggregate.

### 2. La performance de lectura es predecible

El dashboard del Business Owner se carga decenas de veces al día. Si cada carga implica agregar facturas, sumar horas, y calcular posición de GST en tiempo real, la performance degrada con el volumen de datos. Un Read Model pre-calculado tiene performance constante independientemente del número de transacciones históricas.

```
Sin Read Models:
  10 invoices  → carga en 50ms
  100 invoices → carga en 200ms
  1000 invoices → carga en 2000ms

Con Read Models:
  10 invoices  → carga en 5ms (siempre)
  100 invoices → carga en 5ms (siempre)
  1000 invoices → carga en 5ms (siempre)
```

### 3. La evolución de los dominios no afecta los Read Models

Cuando se migra de `companyId` a `businessId` (ADR-001), los Read Models se reconstruyen desde los eventos con el nuevo campo. No hay dependencia del schema de las colecciones de escritura.

### 4. Reconstrucción desde cero es posible

Si se descubre un bug en un handler de Analytics que produjo datos incorrectos, la corrección es:

```
1. Corregir el bug en el event handler
2. Borrar el Read Model corrupto del businessId afectado
3. Reproducir todos los Domain Events del businessId en orden cronológico
4. El Read Model queda correcto automáticamente
```

Esto es posible porque los Domain Events son inmutables y están ordenados cronológicamente.

---

## Qué NOT es CQRS en este contexto

### No es event sourcing completo

Los Aggregate Roots no se hidratan desde el event log. El estado actual de una Invoice se lee directamente desde la colección `invoices`. Solo el lado de Analytics usa proyecciones desde eventos.

### No es segregación de bases de datos

No hay una base de datos separada para escritura y otra para lectura. Es la misma base de datos MongoDB, con diferentes colecciones para escritura y lectura.

### No es CQRS en todos los dominios

Solo Analytics usa el patrón de Read Models proyectados. Los dominios operativos (Billing, Work, etc.) exponen sus datos directamente para queries operacionales. CQRS aplica donde hay diferencia significativa entre los requisitos de escritura y lectura.

---

## Reglas de implementación

### Regla 1 — Los Read Models son propiedad de Analytics

Ningún módulo operativo escribe en los Read Models. Solo los event handlers de Analytics pueden actualizar los Read Models.

```
// CORRECTO — Analytics actualiza su propio Read Model
AnalyticsHandler.onInvoiceSent(event) {
  await revenueView.upsert({ businessId: event.businessId, ... });
}

// INCORRECTO — Billing actualizando Read Models directamente
BillingService.sendInvoice() {
  // ...
  await revenueView.upsert({ ... }); // ← VIOLACIÓN
}
```

### Regla 2 — Los Read Models nunca se usan para validaciones de escritura

```
// CORRECTO — Invoice number se verifica en el Aggregate (write side)
InvoiceNumberService.generateUnique(businessId) {
  const lastNumber = await invoiceRepo.findLastNumber(businessId); // ← colección de escritura
}

// INCORRECTO — verificar con un Read Model
InvoiceNumberService.generateUnique(businessId) {
  const view = await dashboardView.find({ businessId }); // ← Read Model, eventualmente consistente
  // ← PELIGROSO: puede retornar datos desactualizados
}
```

### Regla 3 — Los handlers son idempotentes

```
AnalyticsHandler.onPaymentRecorded(event) {
  // Verificar si ya fue procesado
  const exists = await analyticsLog.find({ eventId: event.eventId });
  if (exists) return; // descartar duplicado
  // actualizar Read Models
}
```

### Regla 4 — La reconstrucción siempre debe ser posible

```
RecreateReadModel(modelType, businessId) {
  await readModelRepo.deleteAll({ businessId, modelType });
  const events = await eventLog.findAll({ businessId, order: 'asc' });
  for (const event of events) {
    await analyticsHandlers[event.type](event);
  }
}
```

---

## Catálogo de Read Models

| Read Model | Construido desde | Sirve a |
|---|---|---|
| BusinessDashboardView | Todos los eventos principales | Dashboard principal |
| RevenueByPeriodView | InvoiceSent, PaymentRecorded | P&L, Revenue chart |
| AccountsReceivableView | InvoiceSent, InvoicePaid, PaymentRecorded | AR Aging report |
| CashFlowView | PaymentRecorded, BankTransaction* | Cash flow statement |
| GSTPositionView | InvoiceSent, PaymentRecorded, TaxPayment* | BAS preparation |
| WorkloadAnalysisView | WorkEventConfirmed, WorkEventVoided | Hours analysis |
| RevenueByCustomerView | InvoiceSent, PaymentRecorded | Customer profitability |
| GeneralLedgerSummaryView | JournalEntryPosted, FiscalPeriodClosed | Trial Balance UI |
| ContractStatusView | ContractCreated, ContractActivated, WorkEventConfirmed | Contract management |
| CustomerSummaryView | CustomerCreated, InvoiceSent, PaymentRecorded | Customer list |

*Fases futuras

---

## Consistencia eventual — comunicación al usuario

La inconsistencia eventual es normalmente imperceptible (< 1 segundo). Sin embargo, hay casos donde el usuario necesita ver el estado actualizado inmediatamente:

| Caso | Consistencia necesaria | Solución |
|---|---|---|
| Número de factura generado | Inmediata | Usar colección de escritura directamente |
| Status de Invoice después de enviar | Inmediata | Retornar el Aggregate actualizado al cliente |
| Revenue dashboard después de enviar Invoice | Eventual (aceptable) | El dashboard se refresca solo o con un delay explícito |
| Trial Balance después de cerrar período | Eventual (aceptable) | Mostrar "actualizando..." mientras el Read Model se reconstruye |

La regla es: **para confirmaciones de operaciones del usuario, usar el Aggregate**. Para dashboards y reportes, usar los Read Models.

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Read Model desactualizado (handler fallido) | Media | Bajo | Retry automático. Reconstrucción manual disponible. |
| Read Model con datos incorrectos (bug en handler) | Baja | Medio | Reconstrucción desde eventos. |
| Crecimiento de almacenamiento de Read Models | Baja | Bajo | Compresión y archivado de períodos históricos. |
| Latencia en reconstrucción de Read Models para tenant con muchos eventos | Baja | Medio | Background rebuild sin bloquear UI. |

---

## Documentos relacionados

- `docs/architecture/07-read-models.md` — Catálogo completo de Read Models con sus schemas
- `docs/architecture/04-domain-events.md` — Los eventos fuente de todas las proyecciones
- `ADR-002-event-driven-integration.md` — Por qué se usan eventos como mecanismo de comunicación

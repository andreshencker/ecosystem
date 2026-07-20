# ADR-002: Event-Driven Integration como patrón canónico de comunicación entre Bounded Contexts

**Fecha:** 2026-07-05
**Estado:** Aceptado
**Autor:** Architecture Review Session

---

## Contexto

### El problema de integración entre dominios

Un ERP modular tiene múltiples Bounded Contexts que necesitan coordinarse. Cuando se emite una factura, al menos cuatro cosas deben ocurrir:

1. El Financial Engine debe crear una FinancialTransaction
2. Communications debe enviar un email al Customer
3. Analytics debe actualizar las métricas de ingresos
4. Work debe registrar que los WorkEvents incluidos ya están facturados

### Las opciones de integración

**Opción A — Llamadas directas (RPC/in-process)**

```
BillingService.sendInvoice() {
  await financialService.createTransaction(invoice);    // llamada directa
  await communicationService.sendInvoiceEmail(invoice); // llamada directa
  await analyticsService.updateRevenue(invoice);        // llamada directa
  await workService.markWorkEventsAsInvoiced(invoice);  // llamada directa
}
```

Consecuencias:
- (+) Simple de implementar en v1
- (+) Transaccional (todo o nada)
- (-) BillingService conoce FinancialService, CommunicationService, AnalyticsService, WorkService
- (-) Agregar un nuevo consumidor (ej. un módulo de auditoría) requiere modificar BillingService
- (-) Si Communication falla, Billing falla aunque la factura ya fue guardada
- (-) Los módulos no pueden desplegarse ni testearse de forma independiente
- (-) Las dependencias circulares son posibles (ej. Financial que llama a Billing para verificar algo)

**Opción B — Base de datos compartida**

```
// Todos los módulos leen/escriben en la misma colección `invoices`
// Financial monitorea la colección y procesa cuando status = 'sent'
```

Consecuencias:
- (+) Sin necesidad de mensajería
- (-) El schema de la colección es propiedad de todos → nadie puede cambiarlo sin romper a otros
- (-) Acoplamiento a nivel de base de datos — el peor tipo
- (-) Imposible de escalar de forma independiente
- (-) No hay forma de saber qué módulo causó qué cambio (audit trail débil)

**Opción C — Domain Events (Event-Driven)**

```
BillingService.sendInvoice() {
  invoice.status = 'sent';
  await invoiceRepository.save(invoice);
  await eventBus.publish(InvoiceSent { ... }); // ← Billing termina aquí
}

// En otros módulos — suscritos al event bus:
FinancialTransactionFactory.onInvoiceSent(event) → crea FinancialTransaction
CommunicationDispatcher.onInvoiceSent(event)     → envía email
AnalyticsProjection.onInvoiceSent(event)         → actualiza revenue
WorkEventHandler.onInvoiceItemCreated(event)     → marca WorkEvents invoiced
```

Consecuencias:
- (+) BillingService no sabe que Financial, Communication, ni Analytics existen
- (+) Nuevo módulo se integra sin tocar Billing (solo suscribe al event bus)
- (+) Fallo en Communication no afecta la operación de Billing
- (+) Cada módulo puede testearse con los eventos que consume
- (+) Audit trail completo: cada evento es un hecho inmutable con timestamp
- (-) Consistencia eventual: el Read Model de Analytics puede estar momentáneamente desactualizado
- (-) Requiere diseño cuidadoso de los payloads de eventos (el evento debe ser autocontenido)
- (-) Debugging más complejo: hay que trazar un flujo a través de múltiples handlers
- (-) Los eventos deben ser versionados cuando el schema evoluciona

**Opción D — Saga / Process Manager (coordinación explícita)**

```
InvoiceSentSaga {
  step1: createFinancialTransaction  ← con compensación si falla
  step2: sendCommunication           ← con retry si falla
  step3: updateWorkEvents            ← con compensación si falla
  step4: updateAnalytics             ← sin compensación (eventual)
}
```

Consecuencias:
- (+) Coordinación transaccional entre contextos
- (-) Complejidad de implementación 10x mayor
- (-) Solo necesario cuando hay transacciones distribuidas con compensación
- No necesario para el flujo principal de este ERP en las fases 1-6

---

## Decisión

**Se adopta Domain Events (Opción C) como el patrón canónico de integración entre Bounded Contexts.**

Los Sagas (Opción D) se reservan para flujos futuros que requieran compensación transaccional distribuida (ej. integración con bancos externos donde una transferencia puede revertirse).

---

## Justificación

### 1. Extensibilidad es el requerimiento más importante

El ERP tiene un roadmap de 11 fases. Cada fase agrega nuevos módulos (Expenses, Payroll, Banking, Inventory) que necesitan reaccionar a hechos de módulos ya existentes. Con Domain Events, cada nuevo módulo solo suscribe a los eventos que le interesan — sin modificar ningún módulo existente.

```
Ejemplo concreto:

Cuando se agrega Payroll en Fase 9:
  ✅ PayrollModule suscribe a WorkEventConfirmed (para calcular horas por nómina)
  ✅ PayrollModule suscribe a FiscalPeriodClosed (para cerrar período de pago)
  ✅ NO se modifica WorkModule
  ✅ NO se modifica AccountingModule

Con llamadas directas, Fase 9 requeriría modificar WorkService y AccountingService.
```

### 2. El Accounting Engine no puede acoplarse a módulos operativos

Si la contabilización de facturas fuera una llamada directa de Billing al AccountingEngine, el AccountingEngine necesitaría importar tipos de Billing. Cuando en Fase 6 se agrega Expenses, el AccountingEngine debería importar también tipos de Expenses. Para Fase 9, tipos de Payroll. El Accounting Engine terminaría acoplado a 6+ módulos.

Con Domain Events y FinancialTransactions, el Accounting Engine solo conoce `FinancialTransaction` — independientemente de cuántos módulos lo alimenten.

### 3. Los fallos deben ser aislados

Si el servicio de Communications falla (por ejemplo, un outage del proveedor de email), eso no debe impedir que las facturas se registren y que la contabilidad funcione. Con llamadas directas, un fallo en Communications revertiría toda la operación. Con Domain Events, el fallo en un handler no afecta a los demás handlers del mismo evento.

### 4. El audit trail es un ciudadano de primera clase

Cada Domain Event es un registro inmutable de lo que ocurrió. El log de eventos es la historia del sistema. En el modelo de llamadas directas, no hay rastro de qué causó qué — solo el estado final. En el modelo de eventos, se puede responder: "¿Qué causó este JournalEntry?" → `TransactionPosted` ← `FinancialTransactionCreated` ← `InvoiceSent` ← acción del usuario el 2026-07-05 15:32:00.

---

## Reglas de implementación

### Regla 1 — Los eventos se publican después de confirmar la transacción

```
// CORRECTO — evento publicado después del save
async sendInvoice(id) {
  invoice.status = 'sent';
  await repo.save(invoice);          // ← primero persiste
  await bus.publish(InvoiceSent({})); // ← luego publica
}

// INCORRECTO — publicar antes de confirmar
async sendInvoice(id) {
  await bus.publish(InvoiceSent({})); // ← ¿y si el save falla?
  await repo.save(invoice);
}
```

### Regla 2 — Los handlers son idempotentes

El mismo evento puede entregarse más de una vez (at-least-once delivery). Los handlers deben detectar y descartar procesamientos duplicados.

```
FinancialTransactionFactory.onInvoiceSent(event) {
  // Verificar idempotencia antes de crear
  const exists = await repo.existsByReferenceId(event.invoiceId, 'INVOICE_ISSUED');
  if (exists) return; // ya procesado — descartar
  // ... crear FinancialTransaction
}
```

### Regla 3 — Los eventos son autocontenidos

Un handler no debe necesitar consultar el módulo origen para obtener información. El payload del evento debe incluir todo lo necesario.

```
// INCORRECTO — handler que consulta Billing
FinancialFactory.onInvoiceSent(event) {
  const invoice = await billingService.getInvoice(event.invoiceId); // ← acoplamiento
  createTransaction(invoice.total, invoice.currency, ...);
}

// CORRECTO — payload autocontenido
FinancialFactory.onInvoiceSent(event) {
  // event tiene: total, currency, taxAmount, customerId, jurisdiction, ...
  createTransaction(event.total, event.currency, ...); // ← sin consultas externas
}
```

### Regla 4 — Los eventos se nombran en tiempo pasado

```
✅ InvoiceSent, PaymentRecorded, WorkEventConfirmed
❌ SendInvoice, RecordPayment, ConfirmWorkEvent
```

### Regla 5 — Los eventos tienen versión

```
{
  eventId:     UUID,
  eventType:   'InvoiceSent',
  version:     2,              // ← incrementar cuando cambia el schema del payload
  occurredAt:  DateTime,
  ...
}
```

Los handlers deben manejar múltiples versiones durante la transición.

---

## Consistencia eventual y compensaciones

La adopción de Domain Events implica aceptar consistencia eventual entre dominios. Este trade-off es aceptable porque:

| Caso | ¿Requiere consistencia inmediata? | Solución |
|---|---|---|
| Número de factura único | Sí | Generado en Billing directamente, no via evento |
| businessId del tenant | Sí | Leído desde JWT, no desde evento |
| Estado de Invoice | Sí | Lectura directa del Aggregate |
| Revenue en dashboard | No | Read Model eventualmente consistente |
| JournalEntry generado | No (segundos de lag son ok) | Procesamiento asíncrono via evento |
| Email al Customer | No (segundos de lag son ok) | Handler asíncrono |

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Evento publicado pero no consumido (queue down) | Baja | Alto | Persistent queues con dead-letter. Retry automático. |
| Handler duplicado (evento entregado 2 veces) | Media | Medio | Idempotencia en todos los handlers. |
| Schema de evento incompatible tras cambio | Baja | Alto | Versioning de eventos. Política de deprecación. |
| Debugging complejo de flujos | Alta | Bajo | Correlation ID en todos los eventos. Distributed tracing. |
| Inconsistencia temporal visible al usuario | Media | Bajo | UI que refleja el estado del Aggregate (write side), no del Read Model. |

---

## Documentos relacionados

- `docs/architecture/01-bounded-contexts.md` — Bounded Contexts y sus relaciones
- `docs/architecture/04-domain-events.md` — Catálogo completo de Domain Events
- `docs/architecture/11-context-map.md` — Tipos de relación entre contextos
- `ADR-003-financial-transaction-bridge.md` — Por qué FinancialTransaction es el único puente

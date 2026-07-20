# 07 — Domain Services

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

Los Domain Services encapsulan lógica de negocio que **no pertenece naturalmente a ninguna entidad o aggregate específico**. Son stateless y operan sobre múltiples aggregates o entidades.

**Regla:** Si una operación requiere coordinar más de un aggregate, o si la lógica no puede vivir en una sola entidad sin violar principios de cohesión, pertenece a un Domain Service.

---

## DS-01 — WorkEventCalculationService

### Responsabilidad
Calcular la duración y el monto monetario de un WorkEvent dado un TimeRange, un break y una Rate.

### Por qué es un Domain Service
El cálculo requiere coordinar `TimeRange`, `Duration`, `Rate`, y `Money` — conceptos de diferentes VOs. La entidad `WorkEvent` no debería saber cómo calcular en función de tipos de Rate distintos (hourly vs daily vs fixed).

### Entradas
- `startTime: string` (HH:mm)
- `endTime: string` (HH:mm)
- `breakMinutes: number`
- `rate: Rate`
- `businessTimezone: string`

### Salidas
```typescript
{
  durationMinutes: number;
  calculatedAmount: Money;
}
```

### Lógica
```
durationMinutes = (endTime - startTime) - breakMinutes
// manejar cruce de medianoche cuando endTime < startTime

switch rate.type:
  'hourly': amount = (durationMinutes / 60) * rate.amount
  'daily':  amount = ceil(durationMinutes / 480) * rate.amount  // 480 min = 8h estándar
  'weekly': amount = ceil(durationMinutes / (480*5)) * rate.amount
  'fixed':  amount = rate.amount
```

### Qué NO debe hacer
- No persistir nada
- No conocer la Invoice
- No modificar el WorkEvent — solo calcula

---

## DS-02 — RateResolutionService

### Responsabilidad
Determinar qué Rate debe aplicarse a un WorkEvent dado el contexto (día de la semana, hora, tipo de evento).

### Por qué es un Domain Service
La selección de Rate requiere evaluar múltiples Rates de un Contract contra atributos del WorkEvent. Esta lógica no pertenece ni al WorkEvent ni al Contract solos.

### Entradas
- `contract: Contract` (con sus Rates cargadas)
- `workEvent: { date: Date, type: WorkEventType, startTime: string }`

### Salidas
```typescript
{
  resolvedRate: Rate;
  reason: string;  // 'public_holiday' | 'weekend' | 'overtime' | 'default'
}
```

### Lógica de resolución (orden de prioridad)
```
1. Si type === 'public_holiday' → buscar Rate con name === 'Public Holiday'
2. Si es sábado o domingo → buscar Rate con name === 'Weekend'
3. Si startTime >= '22:00' o endTime <= '06:00' → buscar Rate con name === 'Night Shift'
4. Si type === 'overtime' → buscar Rate con name === 'Overtime'
5. Si no hay Rate específica → usar contract.defaultRate
6. Si no hay defaultRate → lanzar RateNotConfiguredError
```

### Qué NO debe hacer
- No crear Rates
- No modificar el Contract
- No conocer la Invoice

---

## DS-03 — InvoiceCalculationService

### Responsabilidad
Calcular los totales de una Invoice a partir de sus InvoiceItems y la configuración de impuestos del Business.

### Por qué es un Domain Service
El cálculo de totales requiere coordinar múltiples InvoiceItems y la configuración de GST del FiscalProfile. La entidad Invoice no debería cargar el FiscalProfile para calcularse.

### Entradas
- `items: InvoiceItem[]`
- `fiscalProfile: FiscalProfile`

### Salidas
```typescript
{
  subtotal:  Money;
  taxAmount: Money;
  total:     Money;
}
```

### Lógica
```
subtotal  = sum(items.filter(i => !i.taxable).amount) + sum(items.filter(i => i.taxable).amount)
taxAmount = gstRegistered
              ? sum(items.filter(i => i.taxable).amount) * (gstRate / 100)
              : Money(0, currency)
total = subtotal + taxAmount
```

### Qué NO debe hacer
- No persistir
- No conocer Payments
- No enviar comunicaciones

---

## DS-04 — InvoiceNumberGenerationService

### Responsabilidad
Generar el próximo número de Invoice de forma atómica para un Business, garantizando unicidad y secuencia sin gaps.

### Por qué es un Domain Service
La generación del número requiere una operación atómica en la base de datos (incrementar el contador del FiscalProfile) que no puede vivir en la entidad Invoice ni en FiscalProfile sin acceso a infraestructura.

### Entradas
- `businessId: ObjectId`

### Salidas
```typescript
{
  invoiceNumber: InvoiceNumber;
}
```

### Implementación recomendada
Usar `findOneAndUpdate` con `$inc` sobre `FiscalProfile.invoiceNextNumber`:
```
FiscalProfile.findOneAndUpdate(
  { businessId },
  { $inc: { invoiceNextNumber: 1 } },
  { new: true }
)
```
El número generado es `{ prefix, year: currentYear, sequence: invoiceNextNumber }`.

### Qué NO debe hacer
- No generar números sin atomicidad
- No permitir que dos Invoices tengan el mismo número
- No resetear el contador (solo crece)

---

## DS-05 — PaymentAllocationService

### Responsabilidad
Registrar un Payment contra una Invoice y actualizar el estado de cobro de la Invoice.

### Por qué es un Domain Service
La operación requiere coordinar el aggregate `Payment` y el aggregate `Invoice` — dos aggregates distintos no pueden modificarse el uno al otro directamente.

### Entradas
- `payment: Payment`
- `invoice: Invoice`

### Salidas
```typescript
{
  updatedInvoice: {
    amountPaid: Money;
    amountDue:  Money;
    status:     InvoiceStatus;
  };
}
```

### Lógica
```
newAmountPaid = invoice.amountPaid + payment.amount
newAmountDue  = invoice.total - newAmountPaid

if newAmountDue <= 0:
  newStatus = 'paid'
  paidAt    = now()
else if newAmountPaid > 0:
  newStatus = 'partial'
else:
  newStatus = invoice.status  // sin cambio
```

### Qué NO debe hacer
- No procesar el pago bancario
- No enviar comunicaciones
- No modificar el WorkEvent

---

## DS-06 — CalendarSyncService

### Responsabilidad
Orquestar la sincronización de una CalendarIntegration: obtener eventos del proveedor externo e identificar cuáles son nuevos para importar como WorkEvents.

### Por qué es un Domain Service
La sincronización requiere coordinar `CalendarIntegration`, los eventos del proveedor externo, y la creación de `WorkEvent`s — tres fuentes distintas.

### Entradas
- `calendarIntegration: CalendarIntegration`
- `sinceDate: Date` (importar eventos desde esta fecha)

### Salidas
```typescript
{
  imported:    number;  // eventos nuevos importados
  skipped:     number;  // eventos ya existentes
  errors:      CalendarSyncError[];
}
```

### Lógica
```
1. Obtener eventos del proveedor externo entre sinceDate y now()
2. Para cada evento:
   a. Verificar si ya existe un WorkEvent con ese calendarEventId
   b. Si no existe: crear WorkEvent en estado 'draft' con source='calendar'
   c. Si existe y fue editado manualmente: skip (no sobreescribir)
   d. Si existe y no fue editado: actualizar datos básicos (título, hora)
3. Publicar CalendarSynced con contadores
```

### Qué NO debe hacer
- No confirmar los WorkEvents automáticamente — quedan en `draft` para revisión
- No facturar WorkEvents importados
- No modificar eventos en el calendario externo

---

## DS-07 — OverdueInvoiceDetectionService

### Responsabilidad
Identificar Invoices que han pasado su `dueDate` sin estar pagadas y marcarlas como `overdue`.

### Por qué es un Domain Service
Requiere consultar múltiples Invoices de múltiples Businesses — no puede vivir en la entidad Invoice.

### Entradas
- `asOf: Date` (la fecha actual — parametrizable para testing)

### Salidas
```typescript
{
  markedOverdue: ObjectId[];  // IDs de Invoices actualizadas
}
```

### Lógica
```
find all Invoices where:
  dueDate < asOf
  AND status IN ('sent', 'viewed', 'partial')

for each Invoice:
  update status = 'overdue'
  publish InvoiceOverdue event
```

### Ejecución
Debe ejecutarse como job periódico (ej. diariamente a las 00:01 UTC).

---

## DS-08 — CommunicationDispatchService

### Responsabilidad
Construir el payload de una comunicación y enviarlo a la Communications Platform. Es el único punto de salida hacia Communications.

### Por qué es un Domain Service
Requiere combinar datos de múltiples aggregates (Invoice, Customer, Business, FiscalProfile) para construir el payload de la comunicación.

### Entradas
```typescript
{
  type:      'platform' | 'company';
  eventKey:  string;                  // ej. 'invoices.invoice_sent'
  businessId: ObjectId;
  email:      string;
  data:       Record<string, string>;
}
```

### Salidas
```typescript
{
  delivered: boolean;
  logId:     string | null;   // ID del CommunicationLog creado
}
```

### Lógica
```
1. Resolver CommunicationConnection para el context (platform o company)
2. Llamar a Communications Platform API
3. Crear CommunicationLog con el resultado
4. Publicar CommunicationDelivered o CommunicationFailed
```

### Qué NO debe hacer
- No renderizar templates (eso lo hace Communications Platform)
- No decidir qué evento enviar — el caller decide el eventKey
- No conocer la lógica de facturación

---

## DS-09 — InvoiceGenerationService *(orquestador)*

### Responsabilidad
Orquestar la creación de una Invoice a partir de WorkEvents confirmados seleccionados.

### Por qué es un Domain Service
Requiere coordinar: FiscalProfile (para generar el número), WorkEvents (para crearlos como InvoiceItems), e Invoice (para persistirla). Ninguna de esas entidades puede orquestar a las demás.

### Entradas
```typescript
{
  businessId:      ObjectId;
  customerId:      ObjectId;
  contractId:      ObjectId | null;
  workEventIds:    ObjectId[];         // WorkEvents a incluir
  manualItems:     ManualInvoiceItem[]; // Ítems adicionales sin WorkEvent
  issueDate:       Date;
  notes:           string | null;
}
```

### Salidas
```typescript
{
  invoice: Invoice;
}
```

### Lógica
```
1. Validar que todos los workEventIds existen, pertenecen al Business, y están en estado 'confirmed'
2. Generar InvoiceNumber via InvoiceNumberGenerationService
3. Crear InvoiceItems desde los WorkEvents
4. Crear InvoiceItems manuales
5. Calcular totales via InvoiceCalculationService
6. Persistir la Invoice con sus InvoiceItems
7. Marcar los WorkEvents como 'invoiced'
8. Publicar InvoiceGenerated
```

### Qué NO debe hacer
- No enviar la Invoice al Customer (eso lo hace un comando separado)
- No registrar Payments
- No modificar el Contract

---

## Resumen

| Service | Coordina | Estado |
|---|---|---|
| `WorkEventCalculationService` | TimeRange, Rate, Money | ❌ No implementado |
| `RateResolutionService` | Contract, Rate, WorkEvent | ❌ No implementado |
| `InvoiceCalculationService` | InvoiceItem[], FiscalProfile | ❌ No implementado |
| `InvoiceNumberGenerationService` | FiscalProfile | ❌ No implementado |
| `PaymentAllocationService` | Payment, Invoice | ❌ No implementado |
| `CalendarSyncService` | CalendarIntegration, WorkEvent | ❌ No implementado |
| `OverdueInvoiceDetectionService` | Invoice[] (multi-Business) | ❌ No implementado |
| `CommunicationDispatchService` | CommunicationConnection, CommunicationLog | ⚠️ Parcial (`CommunicationClientService`) |
| `InvoiceGenerationService` | WorkEvent, Invoice, FiscalProfile | ❌ No implementado |

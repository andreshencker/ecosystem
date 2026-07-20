# 06 — Value Objects

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

Los Value Objects son objetos del dominio que se definen por sus atributos, no por una identidad propia. Dos Value Objects con los mismos atributos son iguales. Son **inmutables** — para "cambiar" un VO, se crea uno nuevo.

**Regla:** Si dos instancias son iguales cuando tienen los mismos valores, es un Value Object. Si necesitan persistir como entidades separadas con historia propia, son Entities.

---

## VO-01 — Money

**Por qué es un VO:** Dos montos de `$45.00 AUD` son idénticos independientemente de su origen. No tiene identidad propia.

**Propósito:** Representar un monto monetario con su moneda de forma indivisible. Previene errores de mezcla de monedas.

### Estructura
```typescript
type Money = {
  amount:   Decimal;  // con precisión de centavos
  currency: string;   // ISO 4217 — 'AUD', 'USD', 'EUR'
}
```

### Reglas
- `amount` nunca puede ser negativo (para representar descuentos o créditos, usar `DiscountAmount` separado en el futuro).
- `amount` siempre tiene exactamente 2 decimales en la capa de presentación.
- No se puede sumar `Money` de monedas distintas sin conversión explícita.
- En MongoDB: almacenar como `Decimal128` para preservar precisión.

### Operaciones válidas
- `add(Money): Money` — solo si misma moneda
- `subtract(Money): Money` — solo si misma moneda
- `multiply(Decimal): Money`
- `equals(Money): boolean`

### Dónde se usa
`Rate.amount`, `WorkEvent.calculatedAmount`, `Invoice.subtotal`, `Invoice.taxAmount`, `Invoice.total`, `Invoice.amountPaid`, `Invoice.amountDue`, `InvoiceItem.unitPrice`, `InvoiceItem.amount`, `Payment.amount`

---

## VO-02 — Address

**Por qué es un VO:** Una dirección es un conjunto de datos descriptivos sin identidad propia. Cambiar cualquier parte de la dirección produce una dirección completamente diferente.

**Propósito:** Representar una dirección física completa de forma consistente.

### Estructura
```typescript
type Address = {
  street:   string;
  suburb:   string;
  state:    string;        // NSW, VIC, QLD, etc.
  postcode: string;
  country:  string;        // ISO 3166-1 alpha-2 — 'AU', 'US'
}
```

### Reglas
- Todos los campos son strings — no hay tipos especiales para postcode (el formato varía por país).
- `country` usa código de 2 letras (ISO 3166-1 alpha-2).
- Validación de formato es responsabilidad de la capa de aplicación, no del VO.

### Dónde se usa
`Business.address`, `FiscalProfile.billingAddress`, `Customer.billingAddress`

---

## VO-03 — BankAccount

**Por qué es un VO:** Una cuenta bancaria es descriptiva. Dos objetos con el mismo BSB y número de cuenta son la misma cuenta.

**Propósito:** Representar una cuenta bancaria australiana para recibir pagos.

### Estructura
```typescript
type BankAccount = {
  bsb:           string;  // 6 dígitos — ej. '062-198'
  accountNumber: string;  // hasta 9 dígitos
  accountName:   string;  // nombre del titular
}
```

### Reglas
- `bsb` debe tener 6 dígitos (con o sin guion).
- `accountNumber` es string para preservar ceros al inicio.
- **Nunca** almacenar en texto plano en producción si es sensible — usar encriptación a nivel de campo en futuras fases.

### Dónde se usa
`FiscalProfile.bankAccount`

---

## VO-04 — TimeRange

**Por qué es un VO:** Un rango de tiempo se define completamente por su inicio y fin. No tiene identidad propia.

**Propósito:** Representar un período de trabajo con hora de inicio y fin dentro de un día.

### Estructura
```typescript
type TimeRange = {
  startTime: string;  // 'HH:mm' — 24h format
  endTime:   string;  // 'HH:mm' — 24h format
}
```

### Reglas
- El formato es `HH:mm` en horario de 24 horas.
- El tiempo se interpreta en el `timezone` del Business — nunca en UTC directamente.
- `endTime` puede ser menor a `startTime` para representar turnos que cruzan medianoche (ej. `startTime: '22:00'`, `endTime: '06:00'`). En ese caso, la duración se calcula cruzando al día siguiente.
- La duración en minutos se calcula fuera del VO por el Domain Service.

### Dónde se usa
`WorkEvent.startTime` / `WorkEvent.endTime`

---

## VO-05 — Duration

**Por qué es un VO:** Una duración de 90 minutos es igual a cualquier otra duración de 90 minutos. No tiene identidad.

**Propósito:** Representar una duración de tiempo con su unidad.

### Estructura
```typescript
type Duration = {
  minutes: number;  // siempre en minutos como unidad base
}
```

### Operaciones válidas
- `toHours(): Decimal` — `minutes / 60`
- `toDays(): Decimal` — `minutes / 480` (jornada de 8h)
- `add(Duration): Duration`
- `subtract(Duration): Duration`

### Dónde se usa
`WorkEvent.durationMinutes` (aunque actualmente es un `number`, conceptualmente es una Duration)

---

## VO-06 — EmailAddress

**Por qué es un VO:** Un email es un valor descriptivo. `alice@example.com` es igual a cualquier otra ocurrencia de `alice@example.com`.

**Propósito:** Representar una dirección de email validada.

### Estructura
```typescript
type EmailAddress = {
  value: string;  // lowercase, trimmed
}
```

### Reglas
- Siempre lowercase.
- Validado contra RFC 5322 simplificado (formato `local@domain.tld`).
- No se almacena el objeto como tal — en MongoDB el campo es un `String` ya que el VO es una capa del dominio, no de persistencia.

### Dónde se usa
`User.email`, `Contact.email`

---

## VO-07 — PhoneNumber

**Por qué es un VO:** Un número de teléfono es descriptivo. No tiene historia propia.

**Propósito:** Representar un número de teléfono con formato internacional.

### Estructura
```typescript
type PhoneNumber = {
  countryCode: string;  // '+61', '+1', '+34'
  number:      string;  // sin espacios ni guiones
  formatted:   string;  // representación display: '+61 400 123 456'
}
```

### Reglas
- Almacenar en formato E.164 (internacionalmente normalizado).
- `formatted` es solo para display — no es el campo canónico.

### Dónde se usa
`Business.phone`, `Contact.phone`, `Customer` (contacto general)

---

## VO-08 — TaxNumber

**Por qué es un VO:** Un ABN es un identificador tributario del Business, descriptivo y validable. No tiene historia como entidad.

**Propósito:** Representar un número de impuesto con su tipo y validación de formato.

### Estructura
```typescript
type TaxNumber = {
  type:   'ABN' | 'ACN' | 'TFN';  // tipo australiano
  value:  string;                   // solo dígitos
}
```

### Reglas
- ABN: 11 dígitos. Algoritmo de validación: suma ponderada módulo 89.
- ACN: 9 dígitos. Algoritmo de validación: suma ponderada módulo 10.
- TFN: 8-9 dígitos (no se valida públicamente por privacidad).
- Se almacena solo el valor numérico — la presentación con espacios es capa de UI.

### Dónde se usa
`FiscalProfile.abn`, `FiscalProfile.acn`, `Customer.abn`

---

## VO-09 — InvoiceNumber

**Por qué es un VO:** Un número de factura es un identificador descriptivo con formato definido. No tiene identidad propia — es el valor del identificador.

**Propósito:** Representar el número de factura con su formato y garantizar unicidad por Business.

### Estructura
```typescript
type InvoiceNumber = {
  prefix:   string;  // ej. 'INV', 'JS'
  year:     number;  // ej. 2026
  sequence: number;  // ej. 42 → '0042'
  value:    string;  // computed: 'INV-2026-0042'
}
```

### Reglas
- El `sequence` es generado atómicamente desde `FiscalProfile.invoiceNextNumber`.
- Una vez generado, el `InvoiceNumber` es inmutable.
- El `sequence` se formatea con padding a 4 dígitos mínimo (configurable).
- El separador es `-` entre componentes.
- La unicidad está garantizada por `(businessId, invoiceNumber.value)`.

### Dónde se usa
`Invoice.invoiceNumber`

---

## VO-10 — CalendarReference

**Por qué es un VO:** Una referencia a un evento de calendario externo es un identificador descriptivo. Dos referencias con el mismo `externalId` y `provider` son la misma referencia.

**Propósito:** Registrar la identidad del evento en el calendario externo para evitar importaciones duplicadas.

### Estructura
```typescript
type CalendarReference = {
  externalId: string;   // ID único del evento en el proveedor
  provider:   'google' | 'apple' | 'outlook' | 'ical';
  calendarId: string;   // ID del calendario dentro del proveedor
}
```

### Dónde se usa
`WorkEvent.calendarEventId`

---

## VO-11 — RateAmount

**Por qué es un VO:** Una tarifa de "$45/hora" es un valor descriptivo. Combina el monto con el tipo de tarifa.

**Propósito:** Representar una tarifa con su tipo de unidad para permitir cálculos correctos.

### Estructura
```typescript
type RateAmount = {
  amount:   Money;
  rateType: 'hourly' | 'daily' | 'weekly' | 'fixed';
}
```

### Reglas
- Para `hourly`: el cálculo es `durationMinutes / 60 * amount`.
- Para `daily`: el cálculo es `durationDays * amount` (donde `durationDays` se define por la jornada de trabajo del Business).
- Para `weekly`: similar a daily.
- Para `fixed`: el monto es el total, independiente de la duración.

### Dónde se usa
`Rate.amount` (conceptualmente — actualmente sería `Rate.type` + `Rate.amount`)

---

## VO-12 — PaymentTerms

**Por qué es un VO:** Las condiciones de pago (pagar en 30 días) son descriptivas. No tienen historia.

**Propósito:** Representar las condiciones bajo las cuales una Invoice debe pagarse.

### Estructura
```typescript
type PaymentTerms = {
  days:        number;  // 0=inmediato, 7, 14, 30, 60, 90
  description: string;  // 'Net 30', 'Due on receipt', etc.
}
```

### Dónde se usa
`FiscalProfile.paymentTermsDays`, `Contract.paymentTermsDays`, `Customer.defaultPaymentTermsDays`

---

## VO-13 — WorkingHours

**Por qué es un VO:** El horario de trabajo estándar de un Business (ej. 9am-5pm) es un valor de configuración descriptivo.

**Propósito:** Definir la jornada laboral estándar del Business para cálculos de duración diaria.

### Estructura
```typescript
type WorkingHours = {
  startTime: string;  // 'HH:mm'
  endTime:   string;  // 'HH:mm'
  hoursPerDay: number; // derivado de start/end
}
```

### Dónde se usa
`FiscalProfile.workingHours` (campo futuro — para calcular "días" en rates diarias)

---

## Resumen

| VO | Usado en | Estado |
|---|---|---|
| `Money` | Rate, WorkEvent, Invoice, InvoiceItem, Payment | ✅ Conceptual (usar `Decimal128` en MongoDB) |
| `Address` | Business, FiscalProfile, Customer | ❌ Falta |
| `BankAccount` | FiscalProfile | ⚠️ Embedido en Company como raw fields |
| `TimeRange` | WorkEvent | ❌ Falta |
| `Duration` | WorkEvent | ⚠️ Actualmente `number` |
| `EmailAddress` | User, Contact | ⚠️ Validado en DTO, no en dominio |
| `PhoneNumber` | Business, Contact | ❌ Falta |
| `TaxNumber` | FiscalProfile, Customer | ⚠️ Actualmente `String` sin validación |
| `InvoiceNumber` | Invoice | ❌ Falta |
| `CalendarReference` | WorkEvent | ❌ Falta |
| `RateAmount` | Rate | ❌ Falta |
| `PaymentTerms` | FiscalProfile, Contract, Customer | ❌ Falta |
| `WorkingHours` | FiscalProfile | ❌ Falta (fase futura) |

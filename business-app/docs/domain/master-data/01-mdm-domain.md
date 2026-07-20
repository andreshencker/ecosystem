# 01 — MDM Domain

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual oficial

---

## Responsabilidades del dominio

### Lo que MDM DEBE hacer

| Responsabilidad | Descripción |
|---|---|
| **Proveer datos de referencia** | Responder consultas de "¿cuáles son los valores válidos para X?" |
| **Gestionar versiones de datos** | Cuando un valor cambia (ej. tasa fiscal), registrar cuándo fue vigente el anterior |
| **Garantizar unicidad** | No pueden existir dos registros activos del mismo concepto en el mismo contexto |
| **Propagar cambios** | Publicar Domain Events cuando cambia un dato de referencia crítico |
| **Soportar jurisdicciones** | Los datos sensibles a región (TaxRate, HolidayCalendar) están segmentados por jurisdicción |
| **Permitir overrides a nivel Business** | Un Business puede tener variaciones locales referenciando los valores base de MDM |

### Lo que MDM NUNCA debe hacer

| Prohibición | Razón |
|---|---|
| **Conocer facturas, contratos, ni pagos** | Esos son datos operativos — MDM es solo referencia |
| **Ejecutar lógica de negocio** | MDM no calcula impuestos — solo provee la tasa |
| **Depender de ningún módulo operativo** | MDM es upstream de todos. Si MDM dependiera de Billing, habría un ciclo |
| **Almacenar datos transaccionales** | Una venta específica no es un dato de referencia |
| **Ser modificado por módulos operativos** | Solo Platform Admin modifica MDM |

---

## Ownership por categoría de dato

### Categoría A — Datos geopolíticos y estándar

Datos definidos por organismos internacionales (ISO, IANA, IETF). MDM los incorpora tal como están definidos.

| Entidad | Fuente estándar | Ejemplo |
|---|---|---|
| Country | ISO 3166-1 alpha-2 | AU, NZ, CA, GB |
| Currency | ISO 4217 | AUD, NZD, CAD, GBP |
| Language | BCP 47 | en-AU, es-ES, fr-CA |
| Timezone | IANA Timezone Database | Australia/Sydney, Pacific/Auckland |

**Ownership:** MDM recibe actualizaciones cuando los estándares se actualizan. Estos valores son altamente estables.

---

### Categoría B — Datos fiscales y regulatorios

Definidos por gobiernos y organismos fiscales. Cambian cuando cambia la ley.

| Entidad | Variación por jurisdicción | Volatilidad |
|---|---|---|
| TaxType | Sí (GST, VAT, HST, Sales Tax) | Baja (cambia con nuevas leyes) |
| TaxRate | Sí (10% AU, 15% NZ, 13% CA) | Media (puede cambiar en cada presupuesto) |
| HolidayCalendar | Sí (por país y estado) | Alta (fechas anuales) |

**Ownership:** Platform Admin gestiona. Efectividad temporal obligatoria.

---

### Categoría C — Datos de dominio del ERP

Definidos por la arquitectura del sistema. Cambian solo cuando evoluciona el diseño del sistema.

| Entidad | Quién los define | Volatilidad |
|---|---|---|
| InvoiceStatus | ERP arquitectura | Muy baja |
| FinancialTransactionType | ERP arquitectura | Muy baja |
| PaymentMethod | ERP + mercado | Baja |
| DocumentType | ERP arquitectura | Baja |
| WorkType | ERP arquitectura | Baja |
| RateType | ERP arquitectura | Baja |

---

### Categoría D — Datos operacionales de plataforma

Configuraciones que el Platform Admin gestiona para personalizar la plataforma.

| Entidad | Customizable por Business? | Volatilidad |
|---|---|---|
| PaymentTerms | Parcial (Business puede agregar variantes) | Media |
| CustomerCategory | Sí (Business puede definir sus propias) | Media |
| ExpenseCategory | Sí | Media |
| AssetCategory | Sí | Media |
| Industry | No (lista estándar ANZSIC/NAICS) | Muy baja |
| BusinessType | No | Muy baja |

---

### Categoría E — Catálogos de capacidades

Registros de lo que el sistema puede hacer — modelos, KPIs, proveedores.

| Entidad | Ownership | Cuándo se actualiza |
|---|---|---|
| KPICatalog | Analytics domain define; MDM almacena | Cuando se agrega nuevo KPI |
| MLModelCatalog | Analytics domain define; MDM almacena | Cuando se despliega nuevo modelo |
| CalendarProvider | Platform Admin | Cuando se integra nuevo proveedor |
| CommunicationProvider | Platform Admin | Cuando se integra nuevo proveedor |
| IntegrationProvider | Platform Admin | Cuando se integra nuevo proveedor |
| RoleCatalog | Platform Admin | Cuando cambia el modelo de permisos |
| PermissionCatalog | Platform Admin | Cuando se agrega nuevo permiso |

---

## Domain Events de MDM

MDM publica eventos cuando datos críticos cambian. Los dominios que dependen de esos datos deben reaccionar.

### `TaxRateChanged`

```
TaxRateChanged {
    eventId:          UUID
    jurisdiction:     string     — 'AU' | 'NZ' | etc.
    taxType:          string     — 'gst' | 'vat' | etc.
    previousRate:     decimal
    newRate:          decimal
    effectiveFrom:    Date
    publishedAt:      DateTime
}
```

**Consumidores:**
- Financial: actualiza los PostingRules que referencian esta TaxRate
- Analytics: recalcula proyecciones de GSTPosition para períodos futuros
- Billing: notifica que facturas futuras usarán la nueva tasa

---

### `HolidayCalendarUpdated`

```
HolidayCalendarUpdated {
    jurisdiction:     string
    year:             integer
    publicHolidays:   [{ date, name, state? }]
    publishedAt:      DateTime
}
```

**Consumidores:**
- Work: actualiza la TimeDimension en Analytics para marcar public holidays
- Analytics: actualiza el flag `isPublicHoliday` en TimeDimension

---

### `ReferenceDataAdded`

```
ReferenceDataAdded {
    category:    string    — 'PaymentMethod' | 'CustomerCategory' | etc.
    code:        string    — el nuevo valor
    label:       string    — nombre legible
    metadata:    object?
    publishedAt: DateTime
}
```

**Consumidores:** Dominios que usan esta categoría actualizan su cache local si corresponde.

---

## Cómo los dominios consultan MDM

MDM es consultado en tres momentos:

### Momento 1 — Validación de entrada (en tiempo de escritura)

```
Billing.createInvoice(dto) {
    // Validar que el PaymentTerm es válido
    const isValid = await mdm.isValidCode('PaymentTerms', dto.paymentTerms);
    if (!isValid) throw ValidationError('Invalid payment term');
}
```

### Momento 2 — Enriquecimiento de datos (al construir respuestas)

```
Billing.getInvoice(id) {
    const invoice = await invoiceRepo.findById(id);
    const taxTypeLabel = await mdm.getLabel('TaxType', invoice.taxType);
    return { ...invoice, taxTypeLabel };
}
```

### Momento 3 — Inicialización de configuración (al crear un Business)

```
// Cuando se crea un Business en jurisdicción AU:
AccountingEngine.onBusinessCreated(event) {
    const defaultChartOfAccounts = await mdm.getChartOfAccountsTemplate(event.jurisdiction);
    const postingRules = await mdm.getDefaultPostingRules(event.jurisdiction);
    await accountingRepo.initialize(event.businessId, defaultChartOfAccounts, postingRules);
}
```

---

## Cache y performance

Los datos de MDM son altamente estables. Los dominios DEBEN cachear los valores de referencia localmente:

```
MDM Cache Policy:
  TaxRate:            TTL = 24 horas (cambia raramente)
  Country / Currency: TTL = 7 días (casi nunca cambia)
  HolidayCalendar:    TTL = 365 días (se publica anualmente)
  InvoiceStatus:      TTL = indefinido (solo cambia con deploy)
  PaymentTerms:       TTL = 1 hora (puede cambiar por Platform Admin)
```

Cuando MDM publica un evento de cambio, los dominios suscritos invalidan su cache local correspondiente.

---

## La regla de oro de MDM

> **Si un valor puede aparecer como opción en un dropdown del frontend, o como condición en una regla de negocio compartida por múltiples dominios, ese valor vive en MDM.**

Pregunta de validación: *"Si otro dominio necesitara este mismo valor mañana, ¿tendría que duplicarlo?"* → Si la respuesta es sí, pertenece a MDM.

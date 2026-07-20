# 03 — MDM Governance

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual oficial

La gobernanza de MDM define cómo se toman las decisiones sobre los datos maestros: quién puede cambiarlos, cómo se versionan, cómo se comunican los cambios, y cómo los dominios gestionan sus dependencias.

---

## Jerarquía de ownership

```
NIVEL 1 — Estándares externos (ISO, IANA, IETF)
   ├── Country (ISO 3166)
   ├── Currency (ISO 4217)
   ├── Language (BCP 47)
   └── Timezone (IANA)
   Owner: MDM actualiza cuando el estándar lo hace. Sin aprobación interna.

NIVEL 2 — Leyes y regulaciones
   ├── TaxType
   ├── TaxRate
   └── HolidayCalendar
   Owner: Platform Admin con revisión legal. Requiere fecha de vigencia.

NIVEL 3 — Arquitectura del ERP
   ├── InvoiceStatus
   ├── FinancialTransactionType
   ├── DocumentType
   └── WorkType
   Owner: Architecture team. Solo cambia con evolución del sistema. Requiere ADR.

NIVEL 4 — Configuración de la plataforma
   ├── PaymentTerms
   ├── PaymentMethod
   ├── CustomerCategory
   ├── ExpenseCategory
   └── AssetCategory
   Owner: Platform Admin. Puede cambiar sin ADR.

NIVEL 5 — Business-level overrides
   Cualquier dato de Nivel 4 que un Business personaliza para su contexto.
   Owner: Business Owner dentro de los límites definidos por Platform Admin.
```

---

## Versionado de datos de referencia

### Para datos con efectividad temporal (TaxRate, HolidayCalendar)

**Regla:** Nunca se sobrescribe un valor histórico. Se crea un nuevo registro con `effectiveFrom`.

```
TaxRate AU GST:
  Registro 1: { rate: 0.10, effectiveFrom: 2000-07-01, effectiveTo: 2025-12-31 }
  Registro 2: { rate: 0.12, effectiveFrom: 2026-01-01, effectiveTo: null }

Consulta: "¿Qué tasa aplica para AU GST el 2024-03-15?"
  → Seleccionar registro donde effectiveFrom <= 2024-03-15 AND (effectiveTo IS NULL OR effectiveTo >= 2024-03-15)
  → Retorna: 0.10
```

### Para datos de referencia estáticos (InvoiceStatus, WorkType)

**Regla:** Los valores activos son inmutables. Si se necesita deprecar un valor, se marca `isDeprecated: true` pero nunca se borra.

```
InvoiceStatus 'viewed' en el futuro puede marcarse como obsoleto
si se elimina el tracking de apertura de facturas:
  { code: 'viewed', isDeprecated: true, replacedBy: 'sent', deprecatedAt: Date }
```

Los datos históricos que referencian valores deprecados siguen siendo válidos — el valor deprecado sigue existiendo en MDM, solo no aparece en nuevos dropdowns.

### Para datos de plataforma (PaymentTerms, CustomerCategory)

**Regla:** Los valores pueden actualizarse si no tienen datos históricos asociados. Si tienen datos históricos, se deprecan y se crean nuevos.

---

## Proceso de cambio para datos críticos

Cualquier cambio en datos de Nivel 1 al Nivel 3 sigue este proceso:

```
Solicitud de cambio
        │
        ▼
Revisión por Architecture team
        │
        ├── Si es Nivel 1 (estándar externo): aprobación directa
        ├── Si es Nivel 2 (fiscal/legal): requiere referencia legal
        └── Si es Nivel 3 (arquitectura): requiere ADR
        │
        ▼
Planificación de vigencia
        │
        ├── Definir effectiveFrom
        ├── Notificar a dominios dependientes con antelación mínima:
        │       TaxRate: 30 días de anticipación
        │       InvoiceStatus (nuevo valor): 14 días
        │       InvoiceStatus (deprecado): 60 días
        │       Country/Currency: 90 días
        │
        ▼
Publicación del cambio
        │
        ├── Actualizar MDM
        └── Publicar Domain Event (TaxRateChanged, ReferenceDataAdded, etc.)
```

---

## Multi-jurisdicción

MDM maneja la complejidad de que los mismos conceptos tienen significados distintos según la jurisdicción.

### Estrategia: combinación de datos globales + overrides por jurisdicción

```
PaymentTerms:
  Global:       Net30 (siempre disponible en todos los países)
  AU override:  eom_20 (20 del mes siguiente — común en Australia)
  NZ override:  net_20 (20 días — estándar neozelandés)

TaxRate:
  AU:           GST 10%
  NZ:           GST 15%
  CA_ON:        HST 13%
  GB:           VAT 20%

HolidayCalendar:
  AU:           Australia Day, Anzac Day, Christmas (fechas nacionales)
  AU_NSW:       Bank Holiday en agosto (solo NSW)
  AU_VIC:       Melbourne Cup Day (solo VIC)
```

### Resolución en tiempo de ejecución

Cuando un dominio consulta MDM para un dato jurisdiccional:

```
MDM.getTaxRate(jurisdiction: 'AU_NSW', taxType: 'gst', date: '2026-07-05')
    1. Buscar en AU_NSW específico → no encontrado
    2. Buscar en AU (parent jurisdiction) → encontrado: GST 10%
    3. Retornar: 10%

MDM.getPublicHolidays(jurisdiction: 'AU_NSW', year: 2026)
    1. Buscar feriados AU_NSW específicos → Bank Holiday en agosto
    2. Buscar feriados AU (nacionales) → Australia Day, Anzac Day, Christmas, etc.
    3. Combinar y retornar lista unificada
```

---

## Business-level overrides

Un Business puede personalizar ciertos datos de referencia para su contexto sin afectar a otros Businesses.

### Qué puede override un Business

| Dato de referencia | Override permitido | Límites |
|---|---|---|
| PaymentTerms | Sí — puede agregar términos propios | Solo puede agregar, no modificar los estándar |
| CustomerCategory | Sí — puede agregar categorías propias | Solo puede agregar |
| ExpenseCategory | Sí | Solo puede agregar |
| RateType | No — el catálogo es estándar | — |
| TaxRate | No — lo fija la ley | — |
| InvoiceStatus | No — lo fija la arquitectura | — |

### Modelo de override

```
BusinessOverride {
    businessId:        ObjectId
    mdmCategory:       string       — 'PaymentTerms' | 'CustomerCategory' | etc.
    code:              string       — ej. 'net_21_custom'
    label:             string       — ej. 'Net 21 Days (Custom)'
    inheritsFrom:      string?      — si extiende un valor base de MDM
    isActive:          boolean
}
```

Los overrides viven en el dominio de Business, no en MDM. MDM solo provee el catálogo base.

---

## MDM y la evolución del ERP

### Agregar soporte para una nueva jurisdicción (ej. Canada)

```
1. Agregar Country: CA
2. Agregar TaxType: hst_ca_on, gst_ca, pst_ca_bc, etc.
3. Agregar TaxRate para cada tipo por provincia
4. Agregar HolidayCalendar CA para el año actual + siguiente
5. Agregar PostingRules en Financial (referenciando las TaxRates de MDM)
6. Agregar ChartOfAccounts template CA en Accounting
7. MDM publica eventos → dominios actualizan sus caches
```

Sin MDM: pasos 2-4 se distribuirían en Billing, Financial, Accounting, Analytics. Con MDM: se centraliza en el paso 1-4.

### Agregar un nuevo método de pago (ej. "Pago en cuotas")

```
1. Agregar en MDM.PaymentMethod: { code: 'installments', label: 'Instalments', isActive: true }
2. MDM publica ReferenceDataAdded event
3. Billing: aparece como opción en el dropdown de método de pago
4. Financial: puede recibir PaymentFacts con method: 'installments'
5. Analytics: reportes muestran la nueva categoría automáticamente
```

Sin MDM: agregar el valor en Billing, en el enum de Financial, en Analytics. Con MDM: un solo cambio.

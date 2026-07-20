# Master Data Management (MDM) Domain

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual oficial

---

## Qué es MDM

El dominio de Master Data Management (MDM) es el **dueño absoluto de todos los datos de referencia del ERP**. Es la fuente de verdad única para cualquier lista, catálogo, código, o configuración que sea compartida por múltiples dominios.

Datos de referencia son aquellos que:
- Se usan en múltiples dominios pero no pertenecen a ninguno en particular
- Cambian muy lentamente (leyes fiscales, códigos de país, tipos de documento)
- Si duplicaran en múltiples lugares, crearían inconsistencia

---

## Por qué existe

### Sin MDM — el problema

```
BILLING domain define:
  PaymentTerms = ['Net7', 'Net14', 'Net30', 'Net60', 'EOM']

WORK domain define su propia lista:
  BillingCycle = ['weekly', 'fortnightly', 'monthly', 'upon_completion']

ACCOUNTING domain define:
  TaxType = ['gst_collected', 'gst_claimable', 'no_tax']

FINANCIAL domain define:
  TransactionType = ['INVOICE_ISSUED', 'PAYMENT_RECEIVED', ...]
```

Problemas:
- Si Australia cambia la tasa de GST al 12%, hay que actualizar Billing, Financial, Accounting, y Analytics — cada uno con su propia representación
- Si se agrega soporte para Nueva Zelanda, la definición de "GST" tiene significado diferente en AU vs NZ — sin MDM cada dominio lo interpreta a su manera
- La lista de "estados válidos de una factura" está en Billing, pero Analytics también necesita esa misma lista para clasificar sus Facts
- Un nuevo desarrollador no sabe dónde buscar el catálogo oficial de `PaymentMethod`

### Con MDM — la solución

```
MDM es la única fuente de verdad:
  MDM.TaxRate (AU, GST, 0.10, effectiveFrom: 2000-07-01)
  MDM.TaxRate (NZ, GST, 0.15, effectiveFrom: 2010-10-01)
  MDM.TaxRate (CA_ON, HST, 0.13, effectiveFrom: 2010-07-01)

Billing pregunta a MDM: "¿Qué tasa aplica para jurisdiction AU en fecha 2026-07-01?"
Financial pregunta a MDM: "¿Qué tipo de impuesto es GST en AU?"
Accounting consulta MDM: "¿Qué TaxRates están activas este trimestre?"

Cuando Australia cambia la tasa → actualización en un solo lugar.
```

---

## Qué problema resuelve

| Problema sin MDM | Solución con MDM |
|---|---|
| Catálogos duplicados en múltiples dominios | Un solo catálogo con un dueño |
| Inconsistencia entre dominios para los mismos conceptos | Todos usan la misma definición |
| Cambio fiscal requiere deploy de múltiples módulos | Cambiar el dato en MDM, sin deploy |
| Nuevo país requiere modificar N módulos | Agregar entradas en MDM, N módulos las leen |
| No hay forma de saber qué valores son válidos para un campo | MDM es el árbitro oficial |
| La lógica de validación de referencia está dispersa | Centralizada en MDM |

---

## Principios del dominio

| Principio | Descripción |
|---|---|
| **Fuente única de verdad** | Ningún dominio define su propio catálogo de datos de referencia si MDM ya lo tiene |
| **Solo MDM modifica MDM** | Ningún módulo operativo puede escribir en los catálogos de MDM |
| **Lectura universal** | Todos los dominios pueden leer MDM. Solo Platform Admin puede modificarlo. |
| **Efectividad temporal** | Los cambios en datos de referencia tienen `effectiveFrom` y `effectiveTo`, no se sobrescriben |
| **Inmutabilidad retroactiva** | Los valores históricos nunca se modifican — solo se marcan como superseded |
| **Extensibilidad sin deploy** | Agregar un nuevo valor (ej. nuevo tipo de tasa) no requiere cambios de código |

---

## Quién puede modificar MDM

Solo el **Platform Admin** modifica datos maestros — a través de la interfaz de administración de la plataforma.

Excepciones justificadas:
- **Business-level overrides**: Un Business puede tener configuraciones que override ciertos valores de referencia (ej. sus propias categorías de gastos personalizadas). Estos overrides viven en el Business domain, referenciando los valores de MDM como base.

---

## Índice de documentos

| Documento | Descripción |
|---|---|
| [01-mdm-domain.md](./01-mdm-domain.md) | Responsabilidades, fronteras, eventos, ownership |
| [02-reference-data-catalog.md](./02-reference-data-catalog.md) | Catálogo completo de todos los datos de referencia |
| [03-governance.md](./03-governance.md) | Cómo se gobierna MDM: versioning, cambios, overrides, multi-jurisdicción |

---

## Cómo se relaciona con otros dominios

```
MDM (proveedor de referencia)
    │
    ├── Billing: PaymentTerms, InvoiceStatus, DocumentType
    ├── Financial: FinancialTransactionType, TaxType
    ├── Accounting: TaxRate (por jurisdicción), PostingRuleType
    ├── Work: WorkType, RateType, UnitOfMeasure
    ├── Customer: CustomerCategory, PaymentMethod
    ├── Integration: CalendarProvider, CommunicationProvider, IntegrationProvider
    ├── Analytics: KPICatalog, MLModelCatalog
    ├── Identity: RoleCatalog, PermissionCatalog
    └── ALL: Country, Currency, Language, Timezone, Industry
```

La regla es simple: si un valor necesita ser compartido por más de un dominio, vive en MDM.

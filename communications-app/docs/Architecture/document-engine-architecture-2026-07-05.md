# Document Engine — Diseño Arquitectónico Definitivo

**Fecha:** 2026-07-05 | **Estado:** Oficial — Cierre arquitectónico
**Referencia:** `files-module-audit-2026-07-05.md` · `files-composition-audit-2026-07-05.md`

Este documento cierra el diseño del Document Engine. Responde las 10 preguntas arquitectónicas fundamentales y establece el mapa definitivo de qué existe, qué reutilizamos, qué extendemos, y qué nunca modificamos. Después de este documento, la implementación es mecánica.

---

## Premisas del modelo

Antes de responder las preguntas, es necesario enunciar las premisas que guían todas las decisiones:

```
P-01  Business App solicita documentos. Nunca los genera.
P-02  Analytics es la fuente de verdad de los datos. Nunca genera PDFs.
P-03  Communications es el único responsable de generar documentos.
P-04  Los documentos son efímeros. Se generan, se envían, se descartan.
P-05  Permanece: un DocumentExecution (audit trail sin el archivo).
P-06  Toda la lógica de generación vive en Communications.
P-07  Business puede personalizar Templates. Nunca puede modificar Definitions.
P-08  Cada Business tiene su catálogo instalado automáticamente en provisioning.
```

---

## Pregunta 1 — ¿Cómo se representa un Document Definition con los componentes actuales?

### Qué es un Document Definition

Un Document Definition es la **descripción estructural inmutable** de un tipo de documento. Responde: "¿Qué contiene una Invoice? ¿En qué orden van sus bloques? ¿Qué datos necesita cada bloque?"

Es análogo a un plano arquitectónico: define la estructura, no el acabado. El acabado es responsabilidad del Template.

### Cómo se expresa usando los componentes actuales

El sistema existente ya tiene el vocabulario correcto. Una `ReportPayload` con `sections[]` ES esencialmente una Definition en forma de payload de runtime. La diferencia es que hoy el payload es construido por el caller en cada request; la Definition lo convierte en un contrato estable almacenado como constante de plataforma.

**Mapeo directo entre Definition y componentes existentes:**

```
INVOICE DEFINITION          TIPO DE SECCIÓN EXISTENTE
────────────────────────────────────────────────────────
parties                  →  ❌ NO EXISTE (nuevo: type: 'parties')
document-meta            →  ❌ NO EXISTE (nuevo: type: 'document-meta')
line items table         →  ✅ type: 'table'
totals block             →  ✅ type: 'totals'
payment terms notes      →  ✅ type: 'notes'
custom HTML              →  ✅ type: 'html'  (válvula de escape)
KPI summary              →  ✅ type: 'summary'
```

**5 de los 7 bloques necesarios para una Invoice YA EXISTEN.** Solo faltan 2 nuevos tipos de sección.

### ¿Puede expresarse solo componiendo componentes existentes?

**Sí, con una workaround.** Usando `type: 'html'` con un template inline, se puede simular `parties` y `document-meta`:

```typescript
// Workaround actual (funciona pero no es reusable ni mantenible)
{
  type: 'html',
  html: `
    <div style="display:flex; justify-content:space-between">
      <div>Bill To: {{data.customer.name}}<br>{{data.customer.address}}</div>
      <div style="text-align:right">
        Invoice #: {{data.invoice.number}}<br>
        Due: {{data.invoice.dueDate}}
      </div>
    </div>
  `
}
```

**Esto no es una Definition.** Es HTML hardcodeado que viaja en el payload. No es reutilizable entre templates, no es versionable, no es internacionalizable.

### Lo que falta vs lo que sobra

| Elemento | Estado | Acción |
|---|---|---|
| `type: 'table'` | ✅ Existe, funciona | Reutilizar |
| `type: 'totals'` | ✅ Existe, funciona | Reutilizar |
| `type: 'summary'` | ✅ Existe, funciona | Reutilizar |
| `type: 'notes'` | ✅ Existe, funciona | Reutilizar |
| `type: 'html'` | ✅ Existe (válvula de escape) | Mantener pero no usar en Definitions |
| `type: 'parties'` | ❌ No existe | Agregar |
| `type: 'document-meta'` | ❌ No existe | Agregar |
| `type: 'divider'` | ❌ No existe | Agregar (simple, 3 líneas) |
| `type: 'page-break'` | ❌ No existe | Agregar (trivial) |

**Nada sobra. Solo 4 tipos de sección necesitan ser agregados** — todos son simples. Los 2 críticos (`parties`, `document-meta`) son los que habilitan Invoice y Statement.

---

## Pregunta 2 — ¿Cómo se representa un Document Template?

### Qué es un Document Template

Un Document Template es la **capa visual personalizable** sobre una Definition. Donde la Definition dice "tiene un bloque de totales", el Template dice "el bloque de totales tiene este estilo, este label para el total final, y esta fuente".

Un Template es **propiedad del Business** y puede existir en múltiples variantes: `Invoice Modern`, `Invoice Classic`, `Invoice Compact`.

### ¿Hoy existe un concepto parecido?

**Sí. La `layout_templates` collection es el concepto más cercano.**

Hoy un `LayoutTemplate` almacena:
- `templateKey`: clave única (`default_pdf_layout`)
- `html`: el HTML del wrapper
- `css`: estilos adicionales
- `templateType`: `email` | `pdf`
- `isDefault: boolean`
- `companyId`: dueño del template

Lo que le falta para ser un Document Template:
- `documentType`: a qué tipo de documento corresponde (`INVOICE` | `STATEMENT` | ...)
- `variantName`: nombre de la variante (`Modern`, `Classic`, `Compact`)
- `sectionOverrides`: estilos y labels personalizados por sección (opcional)
- `locale`: idioma del template (para futuro)

**La extensión es mínima.** El esquema existente necesita 2-3 campos adicionales. El mecanismo de resolución (query por `companyId + templateType`) se extiende a `companyId + documentType`.

### ¿Dónde viviría?

En la misma colección `layout_templates`, con los campos adicionales. O en una nueva colección `document_templates` que referencia el layout pero agrega el contexto de documento.

La segunda opción es más limpia porque:
- `layout_templates` mantiene su función actual (email layouts + generic PDF)
- `document_templates` es explícita: "soy el template para Invoices de esta empresa"
- La migración es cero — ambas colecciones coexisten

### Las variantes de template

```
INVOICE_DEFINITION (Platform — immutable)
    │
    ├── invoice_modern  (Business Template A — customizable)
    │       layoutHtml: "..."  (header prominente, mucho espacio)
    │       variantName: "Modern"
    │       isDefault: true
    │
    └── invoice_classic  (Business Template B — customizable)
            layoutHtml: "..."  (más denso, tabla más grande)
            variantName: "Classic"
            isDefault: false
```

Solo una variante puede ser `isDefault: true` por `(companyId, documentType)` en un momento dado. El Business puede cambiar la variante activa.

---

## Pregunta 3 — Diagrama de relaciones

```
════════════════════════════════════════════════════════════════════════════
  PLATFORM (código fuente — inmutable)
════════════════════════════════════════════════════════════════════════════

  DocumentDefinitionCatalog
  ┌──────────────────────────────────────────────────────────────────────┐
  │  INVOICE_DEFINITION                                                  │
  │    documentType: 'INVOICE'                                           │
  │    sections: [parties, document-meta, table, totals, notes]          │
  │    datasetSpecs: {                                                   │
  │      invoice:   [number, issueDate, dueDate, status]                 │
  │      customer:  [name, address, abn, email]                          │
  │      lineItems: [description, qty, rate, amount, ruleType]           │
  │      business:  [displayName, address, abn, bankDetails]             │
  │    }                                                                 │
  │                                                                      │
  │  TIMESHEET_DEFINITION                                                │
  │    documentType: 'TIMESHEET'                                         │
  │    sections: [summary, table, totals]                                │
  │    datasetSpecs: { summary: [...], workEvents: [...] }               │
  │                                                                      │
  │  INCOME_REPORT_DEFINITION                                            │
  │  STATEMENT_DEFINITION                                                │
  │  ...                                                                 │
  └──────────────────────────────────────────────────────────────────────┘

  SectionTypeRegistry
  ┌────────────────────────────────────────────────────────────────────┐
  │  'html'          → ReportHtmlSection type                          │
  │  'summary'       → ReportSummarySection type ✅ (existe)           │
  │  'notes'         → ReportNotesSection type ✅ (existe)             │
  │  'table'         → ReportTableSection type ✅ (existe)             │
  │  'totals'        → ReportTotalsSection type ✅ (existe)            │
  │  'parties'       → ReportPartiesSection type ❌ (nuevo)            │
  │  'document-meta' → ReportDocumentMetaSection type ❌ (nuevo)       │
  │  'divider'       → ReportDividerSection type ❌ (nuevo, trivial)   │
  └────────────────────────────────────────────────────────────────────┘

════════════════════════════════════════════════════════════════════════════
  BUSINESS (base de datos — mutable por Business Owner)
════════════════════════════════════════════════════════════════════════════

  document_templates (colección MongoDB)
  ┌────────────────────────────────────────────────────────────────────┐
  │  { companyId, documentType: 'INVOICE', variantName: 'Default',     │
  │    layoutHtml, layoutCss, isDefault: true }                        │
  │                                                                    │
  │  { companyId, documentType: 'TIMESHEET', variantName: 'Default',   │
  │    layoutHtml, layoutCss, isDefault: true }                        │
  └────────────────────────────────────────────────────────────────────┘

  company_themes (colección MongoDB — ya existe)
  ┌────────────────────────────────────────────────────────────────────┐
  │  { companyId, primaryColor, fontFamily, logo, ...tokens }          │
  └────────────────────────────────────────────────────────────────────┘

════════════════════════════════════════════════════════════════════════════
  ANALYTICS (Business App — fuente de datos)
════════════════════════════════════════════════════════════════════════════

  Provee datasets bajo demanda:
  ┌────────────────────────────────────────────────────────────────────┐
  │  invoiceDataset(invoiceId)   → { number, issueDate, ... }          │
  │  customerDataset(customerId) → { name, address, abn, ... }         │
  │  lineItemsDataset(invoiceId) → [ { description, amount, ... } ]    │
  │  workEventsDataset(period)   → [ { date, hours, rate, ... } ]      │
  │  ...                                                               │
  └────────────────────────────────────────────────────────────────────┘

════════════════════════════════════════════════════════════════════════════
  RUNTIME — el Document Engine en acción
════════════════════════════════════════════════════════════════════════════

  Business App                Communications (Document Engine)
       │                               │
       │  DocumentRequest              │
       │  { documentType: 'INVOICE',   │
       │    businessId,                │
       │    invoiceId,                 │
       │    format: 'pdf' }            │
       ├──────────────────────────────►│
       │                               │
       │                     ┌─────────┴──────────────────────────────┐
       │                     │  1. Resolve Definition                  │
       │                     │     DocumentDefinitionCatalog           │
       │                     │     .get('INVOICE')                     │
       │                     │     → sections[], datasetSpecs          │
       │                     │                                         │
       │                     │  2. Resolve Template (from DB)          │
       │                     │     document_templates                  │
       │                     │     WHERE companyId = X                 │
       │                     │       AND documentType = 'INVOICE'      │
       │                     │       AND isDefault = true              │
       │                     │     → layoutHtml, layoutCss             │
       │                     │                                         │
       │                     │  3. Resolve Branding (from DB)          │
       │                     │     SourceOfTruthService                │
       │                     │     → company (name, logo)              │
       │                     │     → theme (colors, fonts)             │
       │                     │                                         │
       │                     │  4. Compile DataRequirements            │
       │                     │     from Definition.datasetSpecs        │
       │                     │     → { invoice, customer, lineItems }  │
       │                     └─────────┬──────────────────────────────┘
       │                               │
       │  DataRequirements manifest    │
       │  ◄────────────────────────────┤
       │                               │
       │  Fetch datasets from Analytics│
       │  (Business App queries its    │
       │   own data services)          │
       │                               │
       │  Datasets response            │
       ├──────────────────────────────►│
       │                               │
       │                     ┌─────────┴──────────────────────────────┐
       │                     │  5. Build Content HTML                  │
       │                     │     ReportContentBuilder.build(         │
       │                     │       definition.sections,              │
       │                     │       datasets                          │
       │                     │     )                                   │
       │                     │     → string HTML                       │
       │                     │                                         │
       │                     │  6. Compose Final HTML                  │
       │                     │     composeHtml(                        │
       │                     │       layoutHtml, layoutCss,            │
       │                     │       contentHtml,                      │
       │                     │       company, theme, data, meta        │
       │                     │     )                                   │
       │                     │     → Full standalone HTML              │
       │                     │                                         │
       │                     │  7. Render                              │
       │                     │     GeneratorService.generate(          │
       │                     │       { format, payload: { html } }     │
       │                     │     )                                   │
       │                     │     → Buffer                            │
       │                     │                                         │
       │                     │  8. Record DocumentExecution            │
       │                     │     (audit trail — sin el archivo)      │
       │                     └─────────┬──────────────────────────────┘
       │                               │
       │  DocumentReady event          │
       │  { documentId, invoiceId }    │
       │  ◄────────────────────────────┤
       │
       │  (opcionalmente, adjuntar a email y enviar)
```

---

## Pregunta 4 — ¿Los bloques existentes son suficientes?

### Inventario de bloques existentes y su idoneidad

| Bloque | Existe | Idóneo para | Limitaciones |
|---|---|---|---|
| `summary` | ✅ | KPIs de reportes, resúmenes de período | `flex-wrap: nowrap` limita a ~6 cards; sin variante vertical |
| `table` | ✅ | Line items, transacciones, workevents | Sin colspan en subtotales; `__kind` solo en primera columna |
| `totals` | ✅ | Bloque de totales de invoice, summaries | Solo alineado a la derecha; no es configurable |
| `notes` | ✅ | Condiciones de pago, disclaimers | Solo lista plana; sin markdown |
| `html` | ✅ | Cualquier layout especial | No es reutilizable; acoplado al template |

### Los 4 bloques que faltan

**`parties` — Bloque emisor/receptor**

El bloque más crítico para documentos comerciales. Aparece en Invoice, Statement, Receipt, Customer Statement.

```typescript
// Lo que necesitaría recibir:
{
  type: 'parties',
  layout: 'horizontal',  // | 'stacked'
  from: {
    label: 'From',
    lines: ['{{company.displayName}}', '{{company.address}}', 'ABN: {{company.abn}}']
  },
  to: {
    label: 'Bill To',
    lines: ['{{data.customer.name}}', '{{data.customer.address}}', 'ABN: {{data.customer.abn}}']
  }
}
// Lo que genera: 2 columnas side-by-side con la info del emisor y receptor
```

**`document-meta` — Metadatos del documento**

Número de documento, fechas, estado, referencia. Aparece en Invoice, Statement, Receipt, BAS.

```typescript
{
  type: 'document-meta',
  layout: 'badge',  // | 'table' | 'inline'
  fields: [
    { label: 'Invoice Number', value: '{{data.invoice.number}}', emphasis: true },
    { label: 'Issue Date',     value: '{{data.invoice.issueDate}}' },
    { label: 'Due Date',       value: '{{data.invoice.dueDate}}',   highlight: true },
    { label: 'Status',         value: '{{data.invoice.status}}',    badge: true }
  ]
}
```

**`divider` — Separador visual**

Simple, pero necesario para separar secciones en documentos largos.

```typescript
{ type: 'divider', style?: 'solid' | 'dashed' | 'space' }
```

**`page-break` — Salto de página**

Para documentos de varias páginas donde el control de paginación es importante.

```typescript
{ type: 'page-break' }
// Genera: <div style="page-break-after: always"></div>
```

### ¿Es suficiente con estos 4 nuevos?

**Para el 90% del catálogo: sí.** Los documentos críticos del ERP (Invoice, Timesheet, Income Report, Statement, Payment Summary) se construyen con los 5 existentes + los 2 críticos (`parties` + `document-meta`).

Para casos edge futuros (contratos con firmas, formularios fiscales complejos, nóminas con muchos campos calculados), `type: 'html'` sirve como válvula de escape mientras se diseñan bloques especializados.

---

## Pregunta 5 — El catálogo de documentos: modelo conceptual

### El catálogo como composición de bloques

Cada tipo de documento es una secuencia ordenada de bloques. El catálogo es un mapa de `DocumentType → [blocks]`:

```
INVOICE
  ├── parties         (de: Business / para: Customer)
  ├── document-meta   (número, fecha emisión, fecha vencimiento, estado)
  ├── table           (líneas de trabajo: descripción, horas, tarifa, monto)
  ├── totals          (subtotal, GST, total due)
  └── notes           (condiciones de pago, datos bancarios)

RECEIPT
  ├── parties         (de: Business / para: Customer)
  ├── document-meta   (número de recibo, fecha de pago, referencia)
  ├── summary         (monto pagado, método, estado)
  └── notes           (opcional: agradecimiento, referencia)

TIMESHEET
  ├── html            (info del trabajador: nombre, período, role)
  ├── summary         (total horas, horas billables, valor total, período)
  ├── table           (work events: fecha, cliente, descripción, h. inicio, h. fin, horas, tarifa, monto)
  ├── totals          (total horas, total monto)
  └── notes           (opcional: aprobado por, condiciones)

INCOME REPORT
  ├── summary         (ingresos brutos, facturas emitidas, cobrado, AR pendiente)
  ├── table           (revenue por cliente)
  ├── table           (breakdown mensual)
  └── totals          (revenue bruto, GST, revenue neto)

STATEMENT (Customer Account Statement)
  ├── parties         (de: Business / para: Customer)
  ├── document-meta   (período, fecha de generación)
  ├── table           (transacciones: fecha, referencia, descripción, invoiced, paid, balance)
  └── totals          (total invoiced, total paid, balance due)

BALANCE SHEET
  ├── document-meta   (fecha del balance, período)
  ├── table           (activos: corriente, no corriente)
  ├── table           (pasivos: corriente, no corriente)
  └── totals          (activos netos, patrimonio)

PROFIT & LOSS
  ├── document-meta   (período)
  ├── table           (ingresos por categoría)
  ├── table           (gastos por categoría)
  └── totals          (gross profit, net profit)

BAS REPORT
  ├── document-meta   (trimestre, ABN, período)
  ├── summary         (GST on sales, GST on purchases, net GST)
  ├── html            (campos G y W del formulario australiano)
  └── totals          (monto a pagar/recuperar del ATO)

PAYMENT SUMMARY
  ├── parties         (de: Business / para: Customer)
  ├── document-meta   (período, número de referencia)
  ├── table           (pagos: fecha, referencia, invoice, monto, método)
  └── totals          (total pagado)

CUSTOMER STATEMENT
  ├── parties         (de: Business / para: Customer)
  ├── document-meta   (período)
  ├── table           (movimientos de cuenta)
  └── totals          (opening balance, total charges, total payments, closing balance)

PAYROLL SUMMARY (Fase 9)
  ├── parties         (de: Business / para: Employee)
  ├── document-meta   (período, pay run número)
  ├── table           (ítems de nómina: ordinario, overtime, allowances, deductions)
  ├── totals          (gross, tax withheld, super, net pay)
  └── notes           (YTD totals, banco de destino)
```

### Clasificación por disponibilidad

| Documento | Bloques requeridos | Estado hoy | Fase ERP |
|---|---|---|---|
| Invoice | parties + document-meta + table + totals + notes | ⚠️ Faltan parties + document-meta | Fase 3 |
| Receipt | parties + document-meta + summary + notes | ⚠️ Faltan parties + document-meta | Fase 3 |
| Timesheet | html + summary + table + totals | ✅ Todo existe | Fase 2 |
| Income Report | summary + table + table + totals | ✅ Todo existe | Fase 5 |
| Statement | parties + document-meta + table + totals | ⚠️ Faltan parties + document-meta | Fase 3+ |
| Balance Sheet | document-meta + table + table + totals | ⚠️ Falta document-meta | Fase 4 |
| P&L | document-meta + table + table + totals | ⚠️ Falta document-meta | Fase 4 |
| BAS | document-meta + summary + html + totals | ⚠️ Falta document-meta | Fase 4 |
| Payment Summary | parties + document-meta + table + totals | ⚠️ Faltan parties + document-meta | Fase 3 |
| Customer Statement | parties + document-meta + table + totals | ⚠️ Faltan parties + document-meta | Fase 5 |
| Payroll Summary | parties + document-meta + table + totals + notes | ⚠️ Faltan parties + document-meta | Fase 9 |

**Conclusión:** Agregar `parties` + `document-meta` desbloquea el 90% del catálogo completo.

---

## Pregunta 6 — Document Definition: ¿datasets o campos individuales?

### Opción A — Datasets

La Definition declara qué **conjunto de datos** necesita cada sección:

```
INVOICE_DEFINITION.datasetSpecs = {
  invoice:   InvoiceDataset     // número, fecha, vencimiento, status
  customer:  CustomerDataset    // nombre, dirección, ABN, email
  lineItems: LineItemsDataset[] // descripción, horas, tarifa, monto
  business:  BusinessDataset    // nombre, dirección, ABN, banco
}
```

| Ventaja | Desventaja |
|---|---|
| Una sola request a Analytics | Puede over-fetchear campos no usados |
| Atomic: todos los datos o ninguno | El Dataset puede crecer y traer datos innecesarios |
| Versionable como unidad | Cambiar un campo del Dataset afecta a todas las Definitions que lo usan |
| Legible: "necesito InvoiceDataset, no 23 campos individuales" | |
| Natural para Analytics (ya trabaja con datasets) | |

### Opción B — Campos individuales

La Definition declara exactamente qué **campos** necesita:

```
INVOICE_DEFINITION.fieldRequirements = {
  'invoice.number':     required
  'invoice.issueDate':  required
  'invoice.dueDate':    required
  'customer.name':      required
  'customer.address':   required
  'lineItems[].description': required
  'lineItems[].amount':      required
  'company.abn':        optional
}
```

| Ventaja | Desventaja |
|---|---|
| Precisión exacta — no hay over-fetching | Chattiness: más consultas o resolución más compleja |
| Self-documenting: se sabe exactamente qué se usa | Frágil: cambiar el nombre de un campo rompe la Definition |
| Validación precisa del payload | La Definition crece a medida que se agregan campos |

### Recomendación: Dataset-first con declaración de campos como documentación

**La respuesta correcta es Dataset-first**, porque:

1. Analytics ya trabaja con datasets estructurados (InvoiceDataset, CustomerDataset, etc.)
2. Un DocumentRequest es natural: "dame los datasets que necesito para generar una Invoice del invoiceId X"
3. La atomicidad es importante: todos los datos deben tener la misma consistencia temporal
4. La alternativa (fields) requiere un servicio de resolución de campos arbitrarios que no existe y añade complejidad sin beneficio real

**La declaración de campos se mantiene como documentación**, no como contrato de request. Sirve para:
- Documentar qué campos de un Dataset realmente usa cada sección
- Validar que el Dataset recibido tiene los campos mínimos antes de renderizar
- Debugging cuando un campo aparece vacío en el PDF

**El modelo resultante:**

```
Definition.datasetSpecs        → qué Datasets necesita (para la request a Analytics)
Definition.sections[x].requiredFields → qué campos del Dataset usa esa sección (para validación)
```

---

## Pregunta 7 — ¿Cómo debería pedir datos al Analytics Engine?

### El patrón incorrecto: múltiples requests pequeñas

```
DocumentEngine:
  fetch invoice(invoiceId)           → request 1
  fetch customer(invoice.customerId) → request 2
  fetch lineItems(invoiceId)         → request 3
  fetch business(businessId)         → request 4
  → 4 requests, posible inconsistencia temporal entre ellas
```

**Problema:** N+1 queries, posibles race conditions si los datos cambian entre requests, latencia acumulada.

### El patrón correcto: manifest único consolidado

```
DocumentEngine:
  1. Lee la Definition: necesito InvoiceDataset + CustomerDataset + LineItemsDataset
  2. Construye un DataRequirementsManifest:
     {
       documentType: 'INVOICE',
       context: { invoiceId, businessId },
       required: ['invoice', 'customer', 'lineItems'],
       optional: ['business']
     }
  3. Una sola request a Business App / Analytics:
     POST /documents/datasets  { manifest }
  4. Analytics retorna todos los datasets en una respuesta:
     {
       invoice:   { number, issueDate, dueDate, status, total, ... }
       customer:  { name, address, abn, email, ... }
       lineItems: [ { description, qty, rate, amount, ruleType }, ... ]
       business:  { displayName, address, abn, bankDetails, ... }
     }
  5. Document Engine tiene todo lo que necesita para renderizar
```

**Por qué este patrón es correcto:**

| Criterio | Manifest único | Múltiples requests |
|---|---|---|
| Consistencia temporal | ✅ Snapshot atómico | ❌ Datos de momentos distintos |
| Latencia | ✅ Una round-trip | ❌ N round-trips en serie |
| Rollback en caso de error | ✅ Fácil | ❌ Estado parcial |
| Cacheable | ✅ Por (documentType + context hash) | ❌ Difícil |
| Observable / auditable | ✅ Un solo log entry | ❌ N log entries correlacionar |
| Analytics puede optimizar | ✅ Conoce todo el requerimiento | ❌ No sabe que hay más requests |

**La clave:** Business App (o Analytics) actúa como el **DataResolver** — conoce cómo obtener cada dataset. Communications solo declara qué necesita, no cómo obtenerlo.

---

## Pregunta 8 — Análisis de separación de responsabilidades

### Estado actual de la separación

```
TemplateRendererService         ✅ Responsabilidad única: {{var}} → valor
TemplateComposerService         ✅ Responsabilidad única: pipeline CSS + content + vars
SourceOfTruthService            ✅ Responsabilidad única: DB → resolved context
GeneratorService                ⚠️ Dual: proxy de composeHtml + orchestrador de render
ReportService                   ✅ Responsabilidad única: orchestrar PDF completo
ReportContentBuilder            ⚠️ Mezcla: genera HTML + embebe su propio <style> block
IFileRenderer / Registry        ✅ Responsabilidad única: format → Buffer
PdfRendererService              ✅ Responsabilidad única: HTML → PDF Buffer
XlsxRendererService             ⚠️ Hardcoded styles — sin theme injection
CsvRendererService              ✅ Responsabilidad única: table → CSV Buffer
default_pdf_layout              ✅ Responsabilidad única: layout HTML del documento
DEFAULT_THEME                   ✅ Responsabilidad única: design tokens por defecto
```

### Los 3 problemas de separación activos

**Problema 1: `ReportContentBuilder` embebe su `<style>` en el content**

El content HTML que produce el builder incluye un bloque `<style>` con las clases `r-*`. Este bloque viaja dentro del `{{content}}` del layout, lo que significa que los estilos de las secciones están incrustados en el `<body>` del documento, no en el `<head>`.

```
ACTUAL:
  layoutHtml = <html><head>{{css}}</head><body>{{content}}</body></html>
  contentHtml = <style>.r-table{...}</style><table>...</table>   ← style en body ⚠️
  Final: <body><style>...</style><table>...</table></body>

IDEAL:
  contentHtml = <table class="r-table">...</table>               ← sin style
  contentCss  = ".r-table { ... }"                               ← separado
  Final: <head><style>.r-table{...}</style></head><body><table>...</table></body>
```

**Impacto:** Bajo en la práctica (Puppeteer procesa estilos en body sin problema), pero es técnicamente incorrecto y dificulta overrides desde el layout.

**Problema 2: `GeneratorService.composeHtml()` es un proxy innecesario**

`ReportService` llama a `generator.composeHtml(params)`, que llama a `composeHtml(this.templateRenderer, params)`. La responsabilidad de composición pertenece a `TemplateComposerService`, no a `GeneratorService`. El Generator debería solo generar (PDF/XLSX/CSV), no componer HTML.

**Impacto:** Bajo hoy, pero confuso. La composición está en 3 lugares: `composeHtml` utility, `TemplateComposerService`, y como proxy en `GeneratorService`.

**Problema 3: `XlsxRenderer` sin theme injection**

El XLSX tiene colores hardcoded (`FFF6E7B7` dorado para headers, `FFE6E6E6` bordes). No usa `company.primaryColor` ni `theme.*`. El mismo Business puede tener un PDF con sus colores corporativos y un XLSX con colores genéricos.

**Impacto:** Cosmético hoy, pero se vuelve relevante cuando el XLSX es un documento empresarial (no solo un export de datos).

### Lo que está bien y NO debe cambiar

- La separación en 4 capas (Layout → ContentBuilder → TemplateRenderer → Renderer)
- La interfaz `IFileRenderer` y el patrón Registry
- El `SourceOfTruthService` como único punto de resolución de contexto de empresa
- El modelo efímero (el buffer nunca se almacena)
- El `composeHtml` utility como función pura

---

## Pregunta 9 — Platform vs Business: quién posee qué

### Mapa definitivo de ownership

```
PLATFORM (código fuente — no modificable por Business Owner)
│
├── DOCUMENT ENGINE
│   ├── Document Definitions (constantes de código)
│   │     INVOICE_DEFINITION, TIMESHEET_DEFINITION, INCOME_REPORT_DEFINITION, ...
│   │     → Lo que son los documentos estructuralmente
│   │
│   ├── Section Type Registry
│   │     'summary', 'table', 'totals', 'notes', 'parties', 'document-meta', ...
│   │     → Los bloques disponibles para construir documentos
│   │
│   ├── Renderers
│   │     PdfRendererService, XlsxRendererService, CsvRendererService
│   │     → Cómo se convierte HTML/tabla en bytes
│   │
│   └── Base Document Templates (constantes de código → instaladas en provisioning)
│         DEFAULT_INVOICE_TEMPLATE, DEFAULT_TIMESHEET_TEMPLATE, ...
│         → El look inicial (editables por Business Owner después de instalar)
│
├── TEMPLATE ENGINE
│   ├── TemplateRendererService ({{var}} → value)
│   ├── TemplateComposerService (pipeline)
│   └── composeHtml utility
│
└── PROVISIONING CATALOG
      Lo que se instala en cada Business al crearse
      → Definitions son código; Templates son datos instalados

─────────────────────────────────────────────────────────────────

BUSINESS (base de datos — mutable por Business Owner)
│
├── BRANDING
│   ├── company_themes: primaryColor, fontFamily, logo, ...
│   └── Aplicado automáticamente a todos los documentos via {{theme.*}}
│
├── DOCUMENT TEMPLATES (per documentType)
│   ├── document_templates: layoutHtml, layoutCss, variantName, isDefault
│   │     El Business edita el HTML/CSS del layout
│   │     El Business no modifica la lista de secciones (eso es la Definition)
│   │
│   └── Variantes: "Invoice Modern", "Invoice Classic" (múltiples por DocumentType)
│
├── COMMUNICATION TEMPLATES (emails)
│   ├── layout_templates: email layout (ya existe)
│   └── event_catalogues: subject + content de cada email (ya existe)
│
├── NOTIFICATION SETTINGS
│   └── Qué canal usar, idioma, opt-in/opt-out
│
└── STORAGE NAMESPACE
      Para media (logos, imágenes de branding) — no para documentos generados
```

### La regla de oro

> El Business Owner personaliza **cómo se ve** un documento (Template).
> Nunca puede modificar **qué contiene** un documento (Definition).
>
> Si la Definition del Invoice dice que tiene un bloque `table` de line items,
> el Business Owner puede cambiar el color de las filas, el tamaño de la fuente,
> el header del PDF — pero no puede quitar la tabla de line items.

### Validación de esta separación

Esta separación es correcta por las siguientes razones:

1. **Legal:** Una Invoice debe tener ciertos campos obligatorios (número, fecha, monto, partes). La Definition garantiza que existen.

2. **Consistencia de datos:** Si el Business pudiera quitar secciones, podría generar un invoice sin totals o sin la información del customer — documentos inválidos.

3. **Mantenibilidad:** Si las Definitions cambian en Platform (se agrega un campo requerido), todos los Business heredan la mejora automáticamente.

4. **UX:** El Business Owner tiene un scope claro: "puedes cambiar cómo se ve, no qué contiene".

---

## Pregunta 10 — ¿El provisioning puede instalar el catálogo automáticamente?

### El patrón actual (ya implementado)

```typescript
CompanyProvisioningService.provisionCompany(companyId, options)
  Step 1: ensureDefaultTheme(companyId)         ← idempotente
  Step 2: ensureEmailLayout(themeId)             ← idempotente
  Step 3: ensurePdfLayout(themeId)               ← idempotente
  --- si isPlatformCompany ---
  Step 4: ensureSecurityDomain(companyId)        ← idempotente
  Step 5: ensureDefaultEvents(domainId)          ← idempotente
  Step 6: ensureNotificationsDomain(companyId)   ← idempotente
```

### El flujo extendido (cómo sería)

```typescript
CompanyProvisioningService.provisionCompany(companyId, options)
  Step 1: ensureDefaultTheme(companyId)
  Step 2: ensureEmailLayout(themeId)
  Step 3: ensurePdfLayout(themeId)              ← estos 3 ya existen

  // NUEVOS (para todas las empresas, no solo Platform)
  Step 4: ensureDocumentTemplates(companyId)
    ├── ensureDocumentTemplate(companyId, 'INVOICE',   DEFAULT_INVOICE_TEMPLATE)
    ├── ensureDocumentTemplate(companyId, 'TIMESHEET', DEFAULT_TIMESHEET_TEMPLATE)
    ├── ensureDocumentTemplate(companyId, 'RECEIPT',   DEFAULT_RECEIPT_TEMPLATE)
    ├── ensureDocumentTemplate(companyId, 'STATEMENT', DEFAULT_STATEMENT_TEMPLATE)
    └── ... (uno por cada DocumentType en el catálogo)
```

**`ensureDocumentTemplate` sigue el mismo patrón idempotente existente:**
```
if (documentTemplateExists(companyId, documentType)):
  skip → report.skipped.push(documentType)
else:
  create from platform DEFAULT_XX_TEMPLATE constant
  → report.created.push(documentType)
```

### ¿Rompe la arquitectura existente?

**No. Es una extensión limpia.** El `CompanyProvisioningService` ya:
- Tiene el patrón `ensureXxx` idempotente
- Tiene el `ProvisioningReportDto` con `created[]` + `skipped[]` + `errors[]`
- Ya instala layouts desde constantes (el mismo patrón)
- Ya está estructurado por pasos numerados

Agregar `Step 4: ensureDocumentTemplates` es seguir exactamente el mismo patrón. La única diferencia es que los Document Templates van a una nueva colección `document_templates` en lugar de `layout_templates`.

### El flujo completo de provisioning extendido

```
Business Creation
        │
        ▼
Phase 1: Atomic (sync)
  └── Create Company record + Owner User
        │
        ▼
Phase 2: Async provisioning
  │
  ├── Step 1: Default Theme
  │     → company_themes collection
  │
  ├── Step 2: Email Layout
  │     → layout_templates collection (type: 'email')
  │
  ├── Step 3: Generic PDF Layout
  │     → layout_templates collection (type: 'pdf', key: 'default_pdf_layout')
  │
  ├── Step 4: Document Templates ← NUEVO
  │     → document_templates collection
  │     ├── Invoice Default Template
  │     ├── Timesheet Default Template
  │     ├── Receipt Default Template
  │     ├── Statement Default Template
  │     └── ... (catálogo completo)
  │
  ├── Step 5: Analytics Workspace
  │     → analytics collection
  │
  ├── Step 6: Chart of Accounts
  │     → accounting collection
  │
  └── → Business Ready: BusinessProvisioned published
```

---

## El diseño definitivo del Document Engine

### Resumen en una sola imagen

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        DOCUMENT ENGINE                                     │
│                    (vive en Communications)                                │
│                                                                            │
│  INPUT                        PROCESO                    OUTPUT            │
│  ─────                        ───────                    ──────            │
│                                                                            │
│  DocumentRequest              1. Resolve Definition      Buffer (PDF/XLSX) │
│  { documentType,              2. Resolve Template              │           │
│    businessId,                3. Resolve Branding        DocumentExecution │
│    context: { invoiceId },    4. Request Datasets        (audit trail)     │
│    format: 'pdf' }            5. Build Content HTML                        │
│                               6. Compose Full HTML                         │
│                               7. Render                                    │
│                               8. Record Execution                          │
└────────────────────────────────────────────────────────────────────────────┘

  RESUELVE                CONSTRUYE               GENERA
  ─────────               ─────────               ──────
  SourceOfTruth           ReportContentBuilder    RendererRegistry
  (company, theme,        (sections[] → HTML)     ├── PdfRendererService
   layout from DB)                                ├── XlsxRendererService
                          composeHtml()            └── CsvRendererService
  DocumentDefinition      (Layout + CSS +
  Catalog                  Content + Vars → HTML)
  (constant code)
```

### Qué reutilizamos del código existente

| Componente existente | Se reutiliza | Cómo |
|---|---|---|
| `IFileRenderer` interface | ✅ Directamente | Contrato de los renderers — no cambia |
| `RendererRegistry` | ✅ Directamente | Mismo patrón, posiblemente agregar `word` en futuro |
| `PdfRendererService` | ✅ Directamente | HTML → PDF sin cambios |
| `XlsxRendererService` | ✅ Con tema | Misma lógica, agregar theme tokens |
| `CsvRendererService` | ✅ Directamente | No necesita cambios |
| `TemplateRendererService` | ✅ Migrado a Handlebars | Misma interface, mejor motor |
| `TemplateComposerService` | ✅ Directamente | El pipeline CSS → content → vars es correcto |
| `composeHtml` utility | ✅ Directamente | Función pura, sin estado |
| `SourceOfTruthService` | ✅ Extendido | Agregar `resolveDocumentTemplate(companyId, documentType)` |
| `ReportContentBuilder` | ✅ Extendido | Agregar `parties` y `document-meta` types |
| `CompanyProvisioningService` | ✅ Extendido | Agregar Step 4: ensureDocumentTemplates |
| `layout_templates` collection | ✅ Intacta | Para email layouts y generic PDF — no se toca |
| `DEFAULT_PDF_LAYOUT_HTML` | ✅ Intacta | Para reportes genéricos — no se toca |
| `DEFAULT_THEME` | ✅ Intacta | No se toca |

### Las pequeñas extensiones necesarias

**Extensión 1: Nuevos tipos de sección en `ReportContentBuilder`**
Agregar `case 'parties'`, `case 'document-meta'`, `case 'divider'`, `case 'page-break'`. Solo código en el `build()` method — sin cambios de arquitectura.

**Extensión 2: Migrar `TemplateRendererService` a Handlebars**
Reemplazar el regex replacer por Handlebars. Interface idéntica — los callers no cambian. El template `{{#if company.logoFullUrl}}` empieza a funcionar. Esta es la extensión de más impacto y de menor riesgo.

**Extensión 3: Agregar `resolveDocumentTemplate` a `SourceOfTruthService`**
Un nuevo método que busca en `document_templates` por `(companyId, documentType)` en lugar de buscar en `layout_templates` por `(companyId, 'pdf')`.

**Extensión 4: Nueva colección `document_templates` en MongoDB**
Schema: `{ companyId, documentType, variantName, layoutHtml, layoutCss, isDefault, locale }`.

**Extensión 5: `DocumentDefinitionCatalog` como constante de plataforma**
Un objeto TypeScript con las Definitions de cada DocumentType. Sin DB — son constantes de código.

**Extensión 6: `DocumentExecution` model**
Una nueva colección MongoDB para el audit trail: `{ businessId, documentType, templateVersion, payloadHash, generatedAt, format, invokeContext }`. Sin guardar el archivo.

**Extensión 7: Paso de provisioning de Document Templates**
En `CompanyProvisioningService`, agregar `ensureDocumentTemplates()` siguiendo el patrón existente.

### Qué nunca debemos cambiar

| Componente | Por qué es invariante |
|---|---|
| El modelo efímero (sin almacenamiento del archivo) | Es la decisión arquitectónica más importante — el archivo nunca se guarda |
| La interfaz `IFileRenderer` | Todos los renderers la implementan — cambiarla es un breaking change |
| El pipeline de 4 capas (Layout → Content → Renderer → Template) | Es la arquitectura correcta y ya está validada |
| La separación Platform (Definitions) / Business (Templates) | Garantía legal y de consistencia de datos |
| El `companyId` como discriminador de tenant en todo | Multi-tenancy fundamental |
| La generación como una función pura: mismo input = mismo output | Reproducibilidad, testabilidad |
| La separación Generation (efímera) / Storage (permanente, solo para branding) | El S3 es para logos e imágenes — no para PDFs generados |

---

## Tabla de implementación: guía para el desarrollador

Esta tabla mapea directamente qué hacer, en qué archivo, y qué no tocar:

| Tarea | Qué modificar / crear | Qué NO tocar |
|---|---|---|
| Soporte para Invoice, Statement | Agregar `parties` y `document-meta` a `ReportContentBuilder.build()` | El resto de `build()` |
| Condicionales en templates | Migrar `TemplateRendererService` a Handlebars | La interface pública del servicio |
| Catálogo de DocumentTypes | Crear `document-engine/definitions/` con constantes TypeScript | Los componentes existentes |
| Template por DocumentType | Crear colección `document_templates` + `resolveDocumentTemplate()` en `SourceOfTruthService` | `layout_templates` collection |
| Provisioning de templates | Agregar `ensureDocumentTemplates()` en `CompanyProvisioningService` | Los steps 1-3 existentes |
| Audit trail | Crear colección `document_executions` + registro al generar | El flujo de generación |
| PDF queue | Mover `renderHtmlToPdf` a BullMQ job | La función `renderHtmlToPdf` en sí |
| Theme en XLSX | Pasar `theme` como parámetro al `XlsxRendererService` | La interface `IFileRenderer` |

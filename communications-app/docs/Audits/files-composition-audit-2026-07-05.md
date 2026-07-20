# Files — Auditoría del Sistema de Composición (el modelo "lego")

**Fecha:** 2026-07-05 | **Módulo:** `src/communication/files/` + `src/communication/common/template-engine/`

Esta auditoría explora el sistema de composición de documentos como un modelo de bloques apilables. El objetivo es entender exactamente qué piezas existen, cómo se conectan entre sí, y si son reutilizables para construir un catálogo completo de documentos del ERP.

---

## Vista macro: las capas de composición

El sistema tiene **4 capas independientes** que se apilan para producir un documento:

```
CAPA 4 — LAYOUT (wrapper HTML del documento)
         Define: header con logo, body con {{content}}, footer con número de página
         Origen: base de datos (layout_templates) — personalizable por company
         Hace esto: envuelve el contenido con branding corporativo

              │  injectContent(layoutHtml, contentHtml)
              ▼

CAPA 3 — CONTENT BUILDER (secciones del cuerpo del documento)
         Define: qué aparece entre el header y el footer
         Origen: payload de secciones que el caller arma
         Hace esto: convierte secciones abstractas → HTML puro

              │  composeHtml(layout, css, content, vars)
              ▼

CAPA 2 — TEMPLATE RENDERER (resolución de variables)
         Define: cómo se resuelven {{company.*}}, {{theme.*}}, {{data.*}}
         Origen: SourceOfTruthService (DB) + payload de datos del caller
         Hace esto: reemplaza placeholders con valores reales

              │  GeneratorService.generate({ format, payload: { html } })
              ▼

CAPA 1 — RENDERER (formato de salida)
         Define: PDF | XLSX | CSV
         Origen: RendererRegistry
         Hace esto: convierte HTML (o payload tabular) en bytes
```

Cada capa tiene una responsabilidad única y puede operar independientemente. El PDF usa las 4 capas. El XLSX y el CSV usan solo las capas 1 y parcialmente 2 (sin layout).

---

## Inventario completo de componentes

### COMPONENTES DE LA CAPA 4 — Layout

---

#### `default_pdf_layout` (constante de provisioning)

**Archivo:** `provisioning/constants/default-pdf-layout.constant.ts`
**Tipo:** HTML template en base de datos
**Responsabilidad:** Envolver cualquier contenido de documento con la identidad corporativa del Business.

**Estructura del HTML:**
```
<html>
  <head>
    <style>  ← estilos base + {{css}} (inyectado dinámicamente)
  </head>
  <body>
    .pdf-header ← logo condicional + nombre company + metadata
    .pdf-body ← {{content}} ← AQUÍ va el contenido de secciones
    .pdf-footer ← copyright + número de página (CSS counter)
  </body>
</html>
```

**Variables que consume:**
```
Requeridas:
  {{company.displayName}}
  {{company.copyrightText}}

Opcionales:
  {{company.legalName}}
  {{company.logoFullUrl}}     ← con bloque condicional {{#...}} NO PROCESADO
  {{company.supportEmail}}
  {{company.webBaseUrl}}
  {{theme.primaryColor}}
  {{theme.fontFamily}}
  {{theme.fontSizeBase}}
  {{theme.fontWeightBold}}
  {{theme.textColor}}
  {{theme.mutedTextColor}}
  {{theme.borderColor}}
  {{theme.linkColor}}
```

**Placeholder de contenido:** `{{content}}` — aquí se inyecta el HTML del ContentBuilder.

**Problema activo:** El layout usa `{{#company.logoFullUrl}}...{{/company.logoFullUrl}}` (sintaxis Mustache condicional) que el `TemplateRendererService` no procesa. El logo nunca se muestra.

---

#### Default theme tokens (provisioning)

**Archivo:** `provisioning/constants/default-theme.constant.ts`
**Tipo:** Objeto de configuración
**Responsabilidad:** Proveer los valores de diseño visual del Business.

```typescript
{
  primaryColor:   '#0F4C81'
  secondaryColor: '#2563EB'
  backgroundColor:'#FFFFFF'
  surfaceColor:   '#F8FAFC'
  textColor:      '#1E293B'
  mutedTextColor: '#64748B'
  borderColor:    '#E2E8F0'
  linkColor:      '#2563EB'
  fontFamily:     '-apple-system, ...'
  fontSizeBase:   '14px'
  fontWeightNormal: 400
  fontWeightBold:   600
}
```

---

### COMPONENTES DE LA CAPA 3 — Content Builder

---

#### `ReportContentBuilder`

**Archivo:** `reports/builders/report-content.builder.ts`
**Tipo:** Injectable NestJS service
**Responsabilidad:** Convertir un array de `ReportSection[]` en un string HTML puro que va dentro del `{{content}}` del layout.

**Interfaz pública:**
```typescript
build(report: ReportPayload, data?: Record<string, any>): string
```

**Contrato de entrada:**
```typescript
ReportPayload {
  meta?: {
    title?:           string   // h1 al inicio del contenido
    subtitle?:        string   // párrafo descriptivo bajo el título
    generatedAtIso?:  string   // ISO timestamp de generación
  }
  sections?: ReportSection[]  // los bloques en orden
}
```

**Los 5 tipos de sección disponibles:**

| Tipo | Clase TypeScript | Responsabilidad |
|---|---|---|
| `html` | `ReportHtmlSection` | HTML crudo — válvula de escape total |
| `summary` | `ReportSummarySection` | Tarjetas KPI en fila horizontal |
| `notes` | `ReportNotesSection` | Lista de bullets |
| `table` | `ReportTableSection` | Tabla con cabecera, filas alternas, subtotales/totales |
| `totals` | `ReportTotalsSection` | Bloque de totales estilo invoice (derecha, anti-page-break) |

El builder también incluye un `<style>` block embebido con las clases CSS base de todos los elementos.

---

#### Sección `html` — válvula de escape

**Propósito:** Inyectar HTML arbitrario cuando ningún otro tipo de sección alcanza.
**Payload:**
```typescript
{
  type: 'html',
  html: '<div>contenido libre...</div>'  // soporta {{data.xxx}}
}
```
**Capacidades:** Resuelve `{{data.xxx}}` inline. Útil para cabeceras de facturas, bloques de dos columnas, o cualquier layout especial.

---

#### Sección `summary` — KPI cards

**Propósito:** Mostrar 2–6 métricas clave en tarjetas lado a lado.
**Payload:**
```typescript
{
  type: 'summary',
  title?: 'Period Overview',
  cards: [
    { label: 'Total Revenue',   value: '$12,450.00', hint: 'July 2026'  },
    { label: 'Hours Worked',    value: '168h',        hint: 'vs 155h prev' },
    { label: 'Invoices Issued', value: '4',           hint: null         },
    { label: 'Outstanding AR',  value: '$2,200.00',   hint: 'Overdue: 1' }
  ]
}
```
**HTML generado:** `div.r-summary-row` con `div.r-kpi` por cada card. Usa `flex: 1 1 0` — todas las cards tienen el mismo ancho.
**Limitación:** `flex-wrap: nowrap` — con más de 6 cards empiezan a comprimirse.

---

#### Sección `notes` — lista de observaciones

**Propósito:** Notas, condiciones, disclaimers, términos de pago.
**Payload:**
```typescript
{
  type: 'notes',
  title?: 'Payment Terms',
  items: [
    'Payment due within 14 days of invoice date',
    'Bank transfer to BSB 062-000 · ACC 12345678',
    'Please quote invoice number on all payments'
  ]
}
```
**HTML generado:** `ul.r-ul` con `li.r-li` por cada ítem. Sin markdown, solo texto plano (HTML-escaped).

---

#### Sección `table` — tabla de datos

**Propósito:** Cualquier tabla tabular — líneas de trabajo, transacciones, items de factura.
**Payload:**
```typescript
{
  type: 'table',
  title?: 'Work Items',
  columns: [
    'date',                           // string simple → key y label auto-humanizado
    { key: 'description', label: 'Description' },
    { key: 'hours',       label: 'Hours' },
    { key: 'rate',        label: 'Rate' },
    { key: 'amount',      label: 'Amount' }
  ],
  rows: [
    { date: '2026-07-01', description: 'Development', hours: '8h', rate: '$38/h', amount: '$304' },
    { date: '2026-07-02', description: 'Consulting',  hours: '4h', rate: '$45/h', amount: '$180' },
    { __kind: 'subtotal', amount: '$484', label: 'Subtotal' },
    { __kind: 'total',    amount: '$532.40', label: 'Total inc. GST' }
  ]
}
```
**`__kind` especial:**
- `subtotal`: fondo amarillo claro, fuente bold — agrupa un bloque de filas
- `total`: fondo amarillo más intenso, fuente 950 — cifra final

**Columnas:** Acepta strings (auto-humanizados: `camelCase` → `Camel Case`) o `{key, label}`.

**Filas:** Aceptan objetos o arrays planos. Si las columnas tienen keys definidos, se mapean; si es un array, se mapean por índice.

---

#### Sección `totals` — bloque de totales

**Propósito:** El bloque estilo invoice de subtotal/impuestos/total. Siempre se queda en la misma página (anti-page-break).
**Payload:**
```typescript
{
  type: 'totals',
  title?: 'Invoice Summary',
  items: [
    { label: 'Subtotal',    value: '$484.00' },
    { label: 'GST (10%)',   value: '$48.40'  },
    { label: 'Total Due',   value: '$532.40', emphasis: 'strong' }
  ]
}
```
**Posición:** Siempre alineado a la derecha, máx. 320px de ancho, con `break-inside: avoid`.
**`emphasis: 'strong'`:** Fuente 13px + peso 950 — para la línea del total final.

---

### COMPONENTES DE LA CAPA 2 — Template Renderer

---

#### `TemplateRendererService`

**Archivo:** `common/template-engine/template-renderer.service.ts`
**Tipo:** Injectable NestJS service
**Responsabilidad:** Resolver variables `{{key}}` en strings HTML.

**Métodos:**
```
applyVariables(template, variables, options?)
  → reemplaza {{key}} con el valor de key en variables

injectContent(layoutHtml, contentHtml)
  → reemplaza {{content}} con el HTML del ContentBuilder

injectCss(layoutHtml, css)
  → busca {{css}}, o </head>, o prepend — inyecta el CSS adicional
```

**Resolución de variables:**
- Plana: `{{displayName}}` → busca `variables.displayName`
- Dot-notation: `{{company.displayName}}` → `variables.company.displayName`
- Alias de compatibilidad: `{{brandPrimary}}` → `theme.primaryColor`
- `leaveDataPlaceholders: true` → deja `{{data.xxx}}` sin resolver (modo preview)

**Aliases de compatibilidad (legacy → real):**
```
brandPrimary   → theme.primaryColor
brandSecondary → theme.secondaryColor
brandText      → theme.textColor
brandMuted     → theme.mutedTextColor
brandBorder    → theme.borderColor
brandLink      → theme.linkColor
fontFamily     → theme.fontFamily
companyName    → company.displayName
logoFullUrl    → company.logoFullUrl
```

---

#### `TemplateComposerService`

**Archivo:** `common/template-engine/template-composer.service.ts`
**Tipo:** Injectable NestJS service
**Responsabilidad:** Orquestar el pipeline completo: content injection → CSS injection → variable resolution.

**Interfaz:**
```typescript
compose(params: ComposeParams): string

ComposeParams {
  layoutHtml:   string
  layoutCss?:   string
  contentHtml?: string
  context?: { company?, theme? }
  data?:    Record<string, any>
  meta?:    Record<string, any>
  leaveDataPlaceholders?: boolean
}
```

**Lo que construye internamente como `rootVars`:**
```
rootVars = {
  // Plano (aliases compat + spread de company/theme/meta)
  ...brandAliases,
  ...company,
  ...theme,
  ...meta,

  // Anidado (recomendado)
  company: { displayName, legalName, logoFullUrl, ... },
  theme:   { primaryColor, fontFamily, ... },
  meta:    { year, generatedAtIso, ... },
  data:    { ...payload específico del documento }
}
```

**Pipeline interno:**
```
1. injectContent(layoutHtml, contentHtml)   ← {{content}} → HTML de secciones
2. injectCss(withContent, layoutCss)        ← {{css}} → estilos adicionales
3. applyVariables(withCss, rootVars)        ← {{company.x}} → valores reales
```

---

#### `composeHtml` utility (función pura)

**Archivo:** `generator/utils/compose-html.util.ts`
**Tipo:** Función pura (no injectable)
**Responsabilidad:** Misma que `TemplateComposerService` pero usable fuera del contexto DI de NestJS. Usada por `GeneratorService.composeHtml()`.

---

#### `SourceOfTruthService`

**Archivo:** `common/source-of-truth/source-of-truth.service.ts`
**Tipo:** Injectable NestJS service
**Responsabilidad:** Resolver desde MongoDB el contexto completo de renderizado para un company: layout HTML/CSS + theme tokens + company info.

**Método principal para PDF reports:**
```typescript
resolveForPdfReport({ companyId, data? })
→ {
    render: {
      company: { displayName, legalName, logoFullUrl, ... }
      theme:   { primaryColor, fontFamily, ... }
      layout:  { html: string, css: string }  // default_pdf_layout del company
      data:    { ...lo que se pasó }
      meta:    { year, generatedAtIso }
    }
  }
```

---

### COMPONENTES DE LA CAPA 1 — Renderers

---

#### `RendererRegistry`

**Archivo:** `generator/renderers/renderer.registry.ts`
**Responsabilidad:** Guardar los 3 renderers y entregar el correcto por formato.

```typescript
registry.get('pdf')  → PdfRendererService
registry.get('xlsx') → XlsxRendererService
registry.get('csv')  → CsvRendererService
registry.get('word') → throws (no existe)
```

---

#### `PdfRendererService`

**Entrada esperada en `payload`:**
```typescript
{ html: string }  // HTML completamente compuesto — incluye layout + estilos + contenido
```
**Motor:** Puppeteer `page.setContent(html)` → `page.pdf({ format: 'A4', printBackground: true })`
**Salida:** `Buffer`

---

#### `XlsxRendererService`

**Entrada esperada en `payload`:**
```typescript
{
  meta?: {
    title?:     string   // aparece como celda grande al inicio
    sheetName?: string   // nombre de la hoja
    createdBy?: string
  },
  table: {
    title?:   string
    columns:  ColumnInput[]  // strings o {key, label}
    rows:     TableRow[]     // objetos, arrays, o {__kind: 'subtotal'|'total'}
  },
  totals?: {
    title?: string
    items: { label, value, emphasis? }[]
  },
  notes?: {
    title?: string
    items: string[]
  }
}
```
**Motor:** ExcelJS Workbook
**Características:** Header con fondo dorado, filas alternas, subtotales/totales con fondos de color, autoFilter en el header, autofit de columnas, formato numérico `#,##0.00` para columnas numéricas (detectadas por key: `amount`, `balance`, `qty`, etc.)
**Salida:** `Buffer`

---

#### `CsvRendererService`

**Entrada esperada en `payload`:**
```typescript
{
  table: {
    columns: ColumnInput[]
    rows:    TableRow[]
  },
  mode?: 'clean' | 'full'  // clean filtra filas __kind subtotal/total
}
```
**Motor:** Node.js nativo (sin dependencias)
**Salida:** `Buffer` UTF-8

---

#### `normalizeColumns` utility

**Archivo:** `generator/utils/columns.util.ts`
**Responsabilidad:** Normalizar columnas de `string | {key, label}` a `{key: string, label: string}`.
**Regla:** Si `label` no se provee, se auto-humaniza: `camelCase` → `Camel Case`, `snake_case` → `Snake Case`.

---

### COMPONENTES DE ORQUESTACIÓN

---

#### `GeneratorService`

**Archivo:** `generator/generator.service.ts`
**Responsabilidad:** Punto de entrada principal del motor de generación. Dos operaciones:
1. `composeHtml(params)` — proxy a `composeHtml()` utility para ReportService
2. `generate(dto)` / `handle(dto)` — selecciona el renderer y produce el buffer

---

#### `ReportService`

**Archivo:** `reports/report.service.ts`
**Responsabilidad:** Orquestador de alto nivel para PDF con contexto empresarial.

**Pipeline que ejecuta:**
```
1. SourceOfTruthService.resolveForPdfReport(companyId)
     → DB: layout HTML+CSS + theme + company
2. ReportContentBuilder.build(report, data)
     → secciones[] → HTML de contenido
3. GeneratorService.composeHtml(layout, css, content, company, theme, data, meta)
     → HTML final completo
4. GeneratorService.generate({ format: 'pdf', filename, payload: { html } })
     → PdfRenderer → Buffer
```

---

## Flujo completo de composición (PDF)

```
CALLER (Business App o interno)
  Envía: { companyId, filename, report: ReportPayload, data?: {} }
    │
    ▼
ReportService.generatePdf()
    │
    ├─1─ SourceOfTruthService.resolveForPdfReport(companyId)
    │         MongoDB query:
    │           - layout_templates WHERE companyId = X AND key = 'default_pdf_layout'
    │           - company_themes WHERE companyId = X AND isDefault = true
    │           - companies WHERE _id = X
    │         Retorna: { render: { layout: {html, css}, company: {...}, theme: {...} } }
    │
    ├─2─ ReportContentBuilder.build(report, data)
    │         Itera report.sections[]:
    │           case 'html'    → <div class="r-block">{{resolveData(html)}}</div>
    │           case 'summary' → <div class="r-summary-row"><div class="r-kpi">...</div>
    │           case 'notes'   → <ul class="r-ul"><li>...</li></ul>
    │           case 'table'   → <table class="r-table">...<tr __kind>...</table>
    │           case 'totals'  → <div class="r-totals r-avoid-break">...</div>
    │         Retorna: string HTML (con <style> block incluido al inicio)
    │
    ├─3─ GeneratorService.composeHtml({layoutHtml, layoutCss, contentHtml, context, data, meta})
    │         composeHtml utility:
    │           a) renderer.injectCss(layoutHtml, layoutCss)
    │              → busca {{css}} en el layout, inyecta layoutCss
    │           b) renderer.injectContent(withCss, contentHtml)
    │              → busca {{content}} en el layout, inyecta el HTML del builder
    │           c) renderer.applyVariables(withContent, rootVars)
    │              → reemplaza {{company.displayName}}, {{theme.primaryColor}}, {{data.*}}
    │         Retorna: HTML final completo (standalone, sin placeholders sin resolver)
    │
    └─4─ GeneratorService.generate({ format: 'pdf', payload: { html } })
              PdfRendererService.render({ payload: { html } })
                puppeteer.launch()
                page.setContent(html, { waitUntil: 'networkidle0' })
                page.pdf({ format: 'A4', printBackground: true, ... })
                browser.close()
              Retorna: DownloadFileResult { format, filename, buffer, mimeType }
    │
    ▼
Response HTTP: buffer con Content-Disposition: attachment
```

---

## Flujo completo de composición (XLSX y CSV)

**Diferencia clave: el XLSX y el CSV bypasean las capas 3 y 4 completamente.**

```
CALLER
  Envía: { format: 'xlsx'|'csv', filename, payload: XlsxPayload | CsvPayload }
    │
    ▼
GeneratorService.generate(dto)  ← directamente, sin ReportService
    │
    ▼
RendererRegistry.get('xlsx') → XlsxRendererService
                                 ExcelJS Workbook construction
                                 Header → Table rows → Totals → Notes
                                 Retorna: Buffer

RendererRegistry.get('csv')  → CsvRendererService
                                 Header row + data rows → UTF-8 string
                                 Retorna: Buffer
    │
    ▼
Response HTTP: buffer
```

**No hay Layout. No hay SourceOfTruth. No hay company/theme context.** El XLSX tiene su propio estilo hardcoded (dorado, gris, etc.).

---

## Las CSS y estilos: quién las define

| Capa | Qué define | Dónde vive |
|---|---|---|
| Layout HTML | Estilos globales del documento: fuentes, header, footer, padding | `default_pdf_layout` en DB — variables `{{theme.*}}` |
| ReportContentBuilder | Estilos de los bloques de contenido: tarjetas, tablas, totales | `<style>` block al inicio del HTML retornado — hardcoded con CSS vars |
| TemplateRendererService | Inyecta estilos adicionales del caller en el layout via `{{css}}` | Lo que el caller ponga en `layoutCss` |
| XlsxRendererService | Estilos de celda: fondos, fuentes, bordes | Hardcoded en ExcelJS (ARGB colors) |
| Puppeteer | Opciones de page: A4, márgenes, footer con page counter | Hardcoded en `html-to-pdf.util.ts` |

---

## Headers y Footers: quién los define

| Componente | Header | Footer |
|---|---|---|
| `default_pdf_layout` | `.pdf-header` → logo + company name + metadata (derecha) | `.pdf-footer` → copyright (izquierda) + page number (derecha) |
| Puppeteer config | Template vacío `<div></div>` (el Puppeteer header está desactivado) | Template con "Page N of M" en la derecha (CSS-styled) |
| ReportContentBuilder | `meta.title` → `<h1>` al inicio del contenido (no es un header de documento) | No genera footer |
| XlsxRendererService | `meta.title` → celda A1 en bold | No genera footer |

**Conflicto activo:** El layout HTML tiene un `.pdf-footer` con `position: fixed` Y Puppeteer también genera un footer con page counter via `displayHeaderFooter`. Los dos footers pueden superponerse dependiendo del contenido.

---

## Reusabilidad para documentos del ERP

La siguiente tabla evalúa qué tan bien encajan los documentos del ERP en el sistema actual.

### Invoice (Factura)

**¿Es viable con el sistema actual?** Sí, pero con trabajo manual en la sección `html`.

```typescript
const invoiceReport: ReportPayload = {
  meta: {
    title: 'Tax Invoice',
    subtitle: 'Invoice #INV-2026-0042 · Due: 19 Jul 2026',
    generatedAtIso: '2026-07-05T14:23:00Z'
  },
  sections: [
    // Datos del emisor y receptor → necesita html raw (2 columnas)
    {
      type: 'html',
      html: `
        <div style="display:flex; justify-content:space-between; margin-bottom:24px">
          <div>
            <div style="font-weight:900">Bill To:</div>
            <div>{{data.customer.name}}</div>
            <div>{{data.customer.address}}</div>
            <div>ABN: {{data.customer.abn}}</div>
          </div>
          <div style="text-align:right">
            <div>Invoice #: <strong>{{data.invoice.number}}</strong></div>
            <div>Date: {{data.invoice.date}}</div>
            <div>Due: {{data.invoice.dueDate}}</div>
          </div>
        </div>
      `
    },
    // Líneas de trabajo
    {
      type: 'table',
      title: 'Services',
      columns: [
        { key: 'description', label: 'Description' },
        { key: 'hours',       label: 'Hours' },
        { key: 'rate',        label: 'Rate' },
        { key: 'amount',      label: 'Amount' }
      ],
      rows: [
        { description: 'Web Development (Fri 18:00-20:00)', hours: '2h', rate: '$38/h', amount: '$76.00' },
        { description: 'Web Development (Fri 20:00-22:00)', hours: '2h', rate: '$45/h', amount: '$90.00' },
        { __kind: 'total', label: 'Total Due', amount: '$181.50' }
      ]
    },
    // Totales
    {
      type: 'totals',
      items: [
        { label: 'Subtotal',  value: '$166.00' },
        { label: 'GST (10%)', value: '$16.60' },
        { label: 'Total Due', value: '$182.60', emphasis: 'strong' }
      ]
    },
    // Términos de pago
    {
      type: 'notes',
      title: 'Payment Terms',
      items: [
        'Payment due within 14 days',
        'BSB 062-000 · ACC 12345678 · Ref: INV-2026-0042'
      ]
    }
  ]
};
```

**Limitaciones para Invoice:**
- El bloque de "emisor / receptor" requiere sección `html` raw (no hay sección de tipo `header-info` o `parties`)
- El número de factura y la fecha están en `meta.subtitle` — no hay campos estructurados para `invoiceNumber`, `dueDate`, `issueDate`
- Las variables del Customer vienen en `data` pero el template dentro de la sección `html` tiene que escribirlas manualmente

---

### Timesheet

**¿Es viable?** Sí, directamente con `table` + `summary`.

```typescript
const timesheetReport: ReportPayload = {
  meta: { title: 'Timesheet', subtitle: 'July 2026 · John Smith' },
  sections: [
    {
      type: 'summary',
      cards: [
        { label: 'Total Hours',    value: '168h' },
        { label: 'Billable Hours', value: '155h' },
        { label: 'Total Value',    value: '$5,890.00' },
        { label: 'Period',         value: '01–31 Jul 2026' }
      ]
    },
    {
      type: 'table',
      title: 'Work Events',
      columns: ['date', 'customer', 'description', 'start', 'end', 'hours', 'rate', 'amount'],
      rows: [ /* ... */ ]
    },
    {
      type: 'totals',
      items: [
        { label: 'Total Billable Hours', value: '155h' },
        { label: 'Total Value',          value: '$5,890.00', emphasis: 'strong' }
      ]
    }
  ]
};
```

**Encaja perfectamente.** Los reportes de tiempo son exactamente el caso de uso para el que el sistema fue construido.

---

### Income Report

**¿Es viable?** Sí, con múltiples secciones `summary` + `table` + `totals`.

```typescript
const incomeReport: ReportPayload = {
  meta: { title: 'Income Report', subtitle: 'Q3 2026 · JS Freelance Services' },
  sections: [
    {
      type: 'summary',
      title: 'Quarter Overview',
      cards: [
        { label: 'Gross Revenue',     value: '$24,500.00', hint: 'Q3 2026' },
        { label: 'Invoices Issued',   value: '12' },
        { label: 'Collected',         value: '$22,300.00', hint: '91%' },
        { label: 'Outstanding AR',    value: '$2,200.00' }
      ]
    },
    {
      type: 'table',
      title: 'Revenue by Customer',
      columns: ['customer', 'invoices', 'amount', 'paid', 'outstanding'],
      rows: [ /* ... */ ]
    },
    {
      type: 'table',
      title: 'Monthly Breakdown',
      columns: ['month', 'hours', 'invoiced', 'collected'],
      rows: [
        { month: 'July',      hours: '168', invoiced: '$8,400', collected: '$8,400' },
        { month: 'August',    hours: '160', invoiced: '$7,900', collected: '$7,900' },
        { month: 'September', hours: '172', invoiced: '$8,200', collected: '$6,000' },
        { __kind: 'total', label: 'Total', invoiced: '$24,500', collected: '$22,300' }
      ]
    },
    {
      type: 'totals',
      items: [
        { label: 'Gross Revenue',  value: '$24,500.00' },
        { label: 'GST Collected',  value: '$2,227.27' },
        { label: 'Net Revenue',    value: '$22,272.73', emphasis: 'strong' }
      ]
    }
  ]
};
```

**Encaja bien.** El Income Report es la composición natural del sistema.

---

### Statement (Extracto de cuenta de Customer)

**¿Es viable?** Sí, con `html` + `table` + `totals`.

```typescript
const statementReport: ReportPayload = {
  meta: { title: 'Account Statement', subtitle: 'Acme Corp · Jul 2026' },
  sections: [
    {
      type: 'html',
      html: `
        <div style="margin-bottom:16px">
          <strong>Account:</strong> Acme Corp Pty Ltd<br/>
          <strong>Period:</strong> 01 Jul – 31 Jul 2026
        </div>`
    },
    {
      type: 'table',
      title: 'Transactions',
      columns: ['date', 'reference', 'description', 'invoiced', 'paid', 'balance'],
      rows: [
        { date: '2026-07-01', reference: 'OB', description: 'Opening Balance', invoiced: '', paid: '', balance: '$0.00' },
        { date: '2026-07-05', reference: 'INV-042', description: 'Services July', invoiced: '$532.40', paid: '', balance: '$532.40' },
        { date: '2026-07-12', reference: 'PMT-018', description: 'Payment received', invoiced: '', paid: '$532.40', balance: '$0.00' },
        { __kind: 'total', label: 'Closing Balance', balance: '$0.00' }
      ]
    },
    {
      type: 'totals',
      items: [
        { label: 'Total Invoiced', value: '$532.40' },
        { label: 'Total Paid',     value: '$532.40' },
        { label: 'Balance Due',    value: '$0.00', emphasis: 'strong' }
      ]
    }
  ]
};
```

---

### Payment Summary

**¿Es viable?** Sí, directo con `summary` + `table`.

---

### Tax Report (BAS)

**¿Es viable?** Parcialmente. El sistema puede generar el PDF del reporte, pero el layout necesita secciones estructuradas para los códigos de impuesto australianos (G1, G2, W1, W2, etc.). Ninguna sección actual tiene ese conocimiento fiscal.

```typescript
const basReport: ReportPayload = {
  meta: { title: 'Business Activity Statement', subtitle: 'Q3 2026 (Jul–Sep)' },
  sections: [
    { type: 'summary', cards: [
      { label: 'GST on Sales (1A)',    value: '$2,227.27' },
      { label: 'GST on Purchases (1B)', value: '$245.00' },
      { label: 'Net GST (9)',           value: '$1,982.27' },
    ]},
    {
      type: 'html',
      html: `<div class="bas-section"><h3>G — GST Amounts</h3>...</div>`
    },
    {
      type: 'totals',
      items: [
        { label: 'Amount Payable to ATO', value: '$1,982.27', emphasis: 'strong' }
      ]
    }
  ]
};
```

**Limitaciones para BAS:** La estructura específica del formulario BAS australiano (con campos numerados G1–G22, W1–W4) requeriría una sección especializada o HTML raw muy específico.

---

## Limitaciones del sistema actual

### L-01: Sin sección de tipo `parties` o `header-info`

El bloque de "emisor / receptor" de una factura — la parte superior con la dirección del Customer, la dirección del Business, y los metadatos del documento — no tiene un tipo de sección dedicado. Hay que usar `html` raw, lo que lo hace no reutilizable entre templates.

### L-02: Motor de templates sin condicionales

`{{#company.logoFullUrl}}...{{/company.logoFullUrl}}` en el layout HTML **no se procesa**. El logo nunca aparece. Tampoco se puede hacer: "Si GST es 0, no mostrar la línea de GST". Toda la lógica condicional requiere pre-procesar los datos en el caller antes de construir el payload.

### L-03: Sin metadatos de documento estructurados

No existe un campo `invoiceNumber`, `dueDate`, `issueDate`, `customerReference` a nivel del `ReportPayload`. Estos datos deben ir en `meta.subtitle` (concatenados como string) o en `data.*` usados dentro de una sección `html`.

### L-04: XLSX y PDF tienen payloads completamente diferentes

El PDF usa `ReportPayload` con secciones. El XLSX usa `XlsxPayload` con `{meta, table, notes, totals}`. Para el mismo documento en dos formatos, hay que construir dos payloads distintos. No existe un payload unificado que produzca el mismo documento en PDF y XLSX.

### L-05: El XLSX no tiene branding

El XLSX tiene estilos hardcoded (dorado, gris). No consume company/theme. Si el Business quiere su reporte con sus colores, no es posible.

### L-06: Sin paginación para tablas largas

Si una tabla tiene 500 filas, el PDF las imprime todas. No hay mecanismo de paginación controlada por el caller (máximo de filas por página antes de añadir una cabecera de continuación).

### L-07: Las secciones `summary` no se adaptan bien en muchas cards

Con más de 6 cards, las tarjetas se comprimen porque `flex-wrap: nowrap`. Un reporte con 10 KPIs en una sola fila quedaría ilegible.

### L-08: Sin tipografía por documento

Todos los documentos usan el mismo `{{theme.fontFamily}}`. No existe configuración de fuente por tipo de documento (una factura puede usar una fuente diferente a un reporte financiero).

### L-09: Sin DocumentType — todos pasan por `default_pdf_layout`

No hay un template específico para Invoice (`invoice_pdf_layout`) distinto del template genérico. Todos los documentos usan el mismo layout con el mismo header y footer, lo cual puede no ser apropiado para todos los tipos de documento.

### L-10: `__kind` total/subtotal no soporta spans de columnas

Una fila de subtotal/total ocupa todas las columnas: la primera celda muestra el label y las demás muestran los valores de la fila. No es posible "fusionar" las primeras N columnas para el label del subtotal como en una factura real.

---

## Qué habría que agregar para un Document Template Catalog

### Agregar: sección `parties` (emisor/receptor)

Un tipo de sección dedicado para mostrar las dos partes de un documento comercial:

```typescript
{
  type: 'parties',
  from: {
    label: 'From',
    name:  '{{company.displayName}}',
    lines: ['{{company.address}}', 'ABN: {{company.abn}}', '{{company.supportEmail}}']
  },
  to: {
    label: 'Bill To',
    name:  '{{data.customer.name}}',
    lines: ['{{data.customer.address}}', 'ABN: {{data.customer.abn}}']
  }
}
```

### Agregar: sección `document-meta`

Para el bloque de metadatos del documento (número, fecha, vencimiento, referencia):

```typescript
{
  type: 'document-meta',
  fields: [
    { label: 'Invoice Number', value: '{{data.invoiceNumber}}' },
    { label: 'Issue Date',     value: '{{data.issueDate}}' },
    { label: 'Due Date',       value: '{{data.dueDate}}'  },
    { label: 'Reference',      value: '{{data.reference}}', optional: true }
  ]
}
```

### Agregar: condicionales en el template engine

Migrar a Handlebars para soportar:
```
{{#if company.logoFullUrl}}<img src="{{company.logoFullUrl}}" />{{/if}}
{{#unless data.gstAmount}}<div>GST: N/A</div>{{/unless}}
{{#each data.items}}<tr>...</tr>{{/each}}
```

### Agregar: layouts nombrados por DocumentType

En lugar de un solo `default_pdf_layout`, proveer:
```
invoice_pdf_layout     → header específico para facturas (número grande, sello de pagado)
statement_pdf_layout   → header específico para extractos de cuenta
report_pdf_layout      → header genérico para reportes (ya es el actual)
```

### Agregar: payload unificado multi-formato

Un payload que describa el documento una sola vez y produzca PDF + XLSX + CSV:

```typescript
{
  documentType: 'timesheet',
  meta: { ... },
  sections: [ /* para PDF */ ],
  table: { /* para XLSX/CSV — el mismo table de sections[].type=table */ }
}
```

---

## Recomendación: A, B o C

### Opción A — Reutilizar tal como está

**Viable para:** reportes analíticos simples, timesheets, income summaries.
**No viable para:** invoices, statements, BAS reports, documentos con dos columnas lado a lado.

### Opción B — Extender el sistema actual ← RECOMENDADA

El motor subyacente es sólido: el pipeline de composición (layout → content → variables → renderer) es correcto. Los renderers son extensibles. La abstracción de capas es limpia.

Lo que se necesita extender (en orden de impacto):

1. **Migrar TemplateRendererService a Handlebars** — desbloquea condicionales, loops, helpers. El template del logo en el layout ya puede funcionar.
2. **Agregar sección `parties`** — para el bloque emisor/receptor de documentos comerciales.
3. **Agregar sección `document-meta`** — para los metadatos estructurados del documento.
4. **Agregar layout por DocumentType** — `invoice_pdf_layout` vs `report_pdf_layout`.
5. **Unificar payload para multi-formato** — mismo `sections[]` produce PDF + XLSX.

Estas extensiones no rompen nada existente y permiten construir el catálogo completo sobre la misma arquitectura.

### Opción C — Reemplazar

**No recomendada.** El sistema tiene la arquitectura correcta. Los problemas son de capacidad del motor de templates y de falta de secciones especializadas — no de diseño estructural. Reemplazarlo requeriría reconstruir una arquitectura equivalente desde cero, perdiendo todo lo que ya funciona.

---

## Resumen del modelo lego

```
┌─────────────────────────────────────────────────────────┐
│  CAPA 4: LAYOUT (de DB)                                 │
│  Header: logo + company name + meta                     │
│  Body:   {{content}}  ← slot de contenido               │
│  Footer: copyright + page number                        │
└───────────────────────────┬─────────────────────────────┘
                            │ injectContent
┌───────────────────────────▼─────────────────────────────┐
│  CAPA 3: CONTENT BUILDER (payload de secciones)         │
│  html     → HTML libre                                  │
│  summary  → tarjetas KPI horizontales                   │
│  notes    → lista de bullets                            │
│  table    → tabla con subtotales/totales                │
│  totals   → bloque de totales estilo invoice            │
└───────────────────────────┬─────────────────────────────┘
                            │ applyVariables
┌───────────────────────────▼─────────────────────────────┐
│  CAPA 2: TEMPLATE RENDERER                              │
│  {{company.*}}  →  de MongoDB (company record)          │
│  {{theme.*}}    →  de MongoDB (theme tokens)            │
│  {{data.*}}     →  del payload del caller               │
│  {{meta.*}}     →  year, generatedAtIso, etc.           │
└───────────────────────────┬─────────────────────────────┘
                            │ render
┌───────────────────────────▼─────────────────────────────┐
│  CAPA 1: RENDERER                                       │
│  pdf  → Puppeteer → Buffer A4                           │
│  xlsx → ExcelJS   → Buffer                              │
│  csv  → Node.js   → Buffer UTF-8                        │
└─────────────────────────────────────────────────────────┘
```

**Los bloques base son:** `html` + `summary` + `notes` + `table` + `totals`

**Lo que falta para facturas:** `parties` + `document-meta` + condicionales en el renderer

**Lo que falta para el catálogo:** layouts nombrados por DocumentType + payload unificado multi-formato

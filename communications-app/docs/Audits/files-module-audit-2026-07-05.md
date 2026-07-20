# Files Module — Auditoría Técnica y Arquitectónica

**Fecha:** 2026-07-05 | **Módulo:** `src/communication/files/` | **App:** communications-app/backend

Esta auditoría analiza el estado actual del módulo Files para determinar qué existe, qué está bien diseñado, qué debe evolucionar, y qué piezas faltan para llegar a un Document Engine completo alineado con la arquitectura del ERP.

---

## Estructura del módulo

```
src/communication/files/
├── files.controller.ts          ← gateway genérico POST /files/generate
├── files.module.ts              ← agrega Generator + Report + Media + Storage
├── generator/                   ← motor de generación puro (sin contexto de negocio)
│   ├── generator.service.ts
│   ├── generator.module.ts
│   ├── dto/
│   │   ├── generate-file.dto.ts     { format, filename, payload, meta? }
│   │   └── download-file.result.ts  { format, filename, buffer, mimeType }
│   ├── renderers/
│   │   ├── renderer.interface.ts    IFileRenderer: supports(format) + render(input)
│   │   ├── renderer.registry.ts     [PDF, CSV, XLSX] → get(format) o throw
│   │   ├── pdf/pdf-renderer.service.ts   → renderHtmlToPdf(html)
│   │   ├── csv/csv-renderer.service.ts   → payload.table.{columns, rows}
│   │   └── xlsx/xlsx-renderer.service.ts → ExcelJS workbook completo
│   └── utils/
│       ├── html-to-pdf.util.ts      Puppeteer (concurrencia limitada por env)
│       ├── compose-html.util.ts     injectCss → injectContent → applyVariables
│       ├── columns.util.ts          normalización de columnas para table/xlsx
│       ├── filename.util.ts         ensureFileExtension
│       ├── mime.util.ts             format → MIME type
│       └── xlsx-autofit.util.ts     cálculo de ancho de columnas
├── reports/                     ← generación con contexto de negocio
│   ├── report.controller.ts     POST /files/reports/generate/pdf
│   ├── report.service.ts        resolveForPdfReport → build → composeHtml → generate
│   ├── report.module.ts
│   ├── builders/
│   │   └── report-content.builder.ts  secciones: html|summary|notes|table|totals
│   ├── dto/
│   │   └── generate-report.dto.ts     { companyId, filename, report, data? }
│   └── types/
│       └── report-payload.types.ts    ReportPayload con secciones tipadas
├── media/                       ← upload/delete de imágenes (logos, branding)
│   ├── media.controller.ts      POST/PUT/DELETE/GET /files/media
│   ├── media.module.ts
│   ├── services/
│   │   ├── media.service.ts         upload → validateImage → resolveS3 → putObject
│   │   ├── media-key.service.ts     key = visibility/prefix/domain/kind/folder/entityId.ext
│   │   └── media-validator.service.ts  solo image/*, max 5 MB
│   └── dto/                         UploadMediaDto, ReplaceMediaDto, etc.
└── storage/                     ← upload/delete genérico (cualquier MIME)
    ├── storage.controller.ts    POST/PUT/DELETE/GET/GET-download /files/storage
    ├── storage.module.ts
    ├── services/
    │   ├── storage.service.ts       upload → validate → resolveS3 → putObject
    │   ├── storage-key.service.ts   key = prefix/visibility/folder/fileName
    │   └── storage-validator.service.ts  MIME/ext/tamaño configurables por request
    ├── dto/                         UploadStorageFileDto, DownloadStorageFileDto, etc.
    └── types/
        └── storage-file-rules.type.ts   { maxBytes?, allowedExtensions?, allowedMimeTypes? }
```

---

## SECCIÓN 1 — Estado actual

### 1.1 Sub-módulos y responsabilidades

| Sub-módulo | Responsabilidad | Tiene BD | Contexto de negocio |
|---|---|---|---|
| `generator` | Motor de bajo nivel: PDF/CSV/XLSX desde payload crudo | No | No |
| `reports` | Generación con contexto de empresa: resolve layout+theme+company, build content, generate | No | Sí (via SourceOfTruth) |
| `media` | Upload/delete de imágenes de branding (logos, assets visuales) | No | Mínimo (companyId) |
| `storage` | Upload/delete de archivos arbitrarios + presigned download URL | No | Mínimo (companyId) |

**Observación crítica:** El módulo Files mezcla dos conceptos que no deberían compartir el mismo módulo:
- **Generación de documentos** (generator + reports): produce buffers desde datos — stateless, efímero
- **Almacenamiento de archivos** (media + storage): persiste binarios en S3 — stateful, permanente

Estas responsabilidades son fundamentalmente distintas y evolucionarán en direcciones diferentes.

---

### 1.2 Endpoints actuales

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| POST | `/files/generate` | API key | Generación genérica: format + filename + payload |
| POST | `/files/reports/generate/pdf` | API key guard | Generación con contexto empresarial |
| POST | `/files/media` | API key header | Upload imagen (multipart) |
| PUT | `/files/media` | API key header | Reemplazar imagen |
| DELETE | `/files/media` | API key header | Eliminar imagen por key |
| GET | `/files/media/info` | API key header | Metadata de imagen |
| POST | `/files/storage` | API key header | Upload archivo genérico |
| PUT | `/files/storage` | API key header | Reemplazar archivo |
| DELETE | `/files/storage` | API key header | Eliminar archivo |
| GET | `/files/storage/info` | API key header | Metadata del archivo |
| GET | `/files/storage/download` | API key header | Presigned download URL (default 60s) |

---

### 1.3 Proveedores y dependencias externas

| Librería | Para qué | Versión detectada |
|---|---|---|
| `puppeteer` | HTML → PDF | Completo (no puppeteer-core) |
| `exceljs` | Generación de XLSX | Sí |
| Built-in (Node streams) | CSV | Sin dependencia externa |
| `@aws-sdk/client-s3` | S3 operations | v3 |
| `@aws-sdk/s3-request-presigner` | Presigned URLs | v3 |

---

## SECCIÓN 2 — Flujo actual

### 2.1 Generación de documento (reports)

```
POST /files/reports/generate/pdf
  { companyId, filename, report: { meta, sections[] }, data? }
    │
    ▼
ReportController.generatePdf()
    │
    ▼
ReportService.generatePdf()
    │
    ├── SourceOfTruthService.resolveForPdfReport({ companyId, data })
    │       → MongoDB: resolve default_pdf_layout (html + css)
    │       → MongoDB: resolve active theme
    │       → MongoDB: resolve company info (displayName, logoFullUrl, etc.)
    │
    ├── ReportContentBuilder.build(report, data)
    │       → secciones: html | summary | notes | table | totals
    │       → HTML puro con <style> embebido
    │
    ├── GeneratorService.composeHtml()
    │       → injectCss(layoutHtml, layoutCss)
    │       → injectContent(withCss, contentHtml)
    │       → applyVariables(withContent, { company, theme, data, meta })
    │
    └── GeneratorService.generate({ format: 'pdf', filename, payload: { html } })
            │
            ▼
        PdfRendererService.render({ payload.html })
            │
            ▼
        renderHtmlToPdf(html) — Puppeteer
            → puppeteer.launch()
            → page.setContent(html, { waitUntil: 'networkidle0' })
            → page.pdf({ format: A4, printBackground, ... })
            → browser.close()
            → Buffer
    │
    ▼
Response: Buffer con Content-Disposition: attachment, Content-Type: application/pdf
```

**El documento nunca se almacena. Se devuelve directamente como buffer HTTP.**

### 2.2 Generación genérica (files.controller)

```
POST /files/generate
  { format: 'pdf'|'xlsx'|'csv', filename, payload, meta? }
    │
    ▼
FilesController.generate()
    │
    ▼
GeneratorService.handle(dto)
    │
    ▼
RendererRegistry.get(format) → PdfRenderer | CsvRenderer | XlsxRenderer
    │
    ▼
renderer.render(input) → Buffer
    │
    ▼
Response: Buffer (sin contexto de empresa, sin layout, sin branding)
```

Este endpoint es una herramienta de bajo nivel. El caller debe proveer el HTML ya compuesto o la tabla ya estructurada.

### 2.3 Upload/download de archivos (storage)

```
POST /files/storage (o /files/media)
  { companyId, folder, fileName, isPublic?, ... } + file (multipart)
    │
    ▼
StorageController.upload()
    │
    ▼
StorageService.upload(file, dto)
    ├── StorageValidatorService.validate(file, rules) — MIME, ext, size
    ├── ChannelsRuntimeResolverService.resolveDefault({ companyId, channelKey: 'storage' })
    │       → MongoDB: busca el proveedor S3 default del company
    │       → resuelve credenciales (access_keys ó iam_role)
    ├── StorageKeyService.buildKey(dto) → "prefix/visibility/folder/fileName"
    └── IStorageChannel.putObject({ key, buffer, contentType, isPublic })
          → S3Client.send(PutObjectCommand)
    │
    ▼
Response: StorageFileInfoDto { key, url, bucket, region, contentType, size }
```

---

## SECCIÓN 3 — Storage

### 3.1 Proveedor

S3-compatible exclusivamente. No hay filesystem, no hay base de datos, no hay Cloud Storage nativo. Soporta:
- **AWS S3** con access keys o IAM role
- **Cualquier S3-compatible** (Minio, DigitalOcean Spaces, Wasabi) via `endpoint` custom + `forcePathStyle`

### 3.2 Abstracción

Existe una interfaz limpia: `IStorageChannel`

```typescript
interface IStorageChannel {
  verifyCredentials(): Promise<boolean>
  putObject(params): Promise<{ key, url }>
  deleteObject(key): Promise<void>
  headObject(key): Promise<{ size, contentType, lastModified, etag }>
  getSignedDownloadUrl(key, expiresInSeconds, fileName?): Promise<string>
}
```

Dos implementaciones:
- `S3StorageChannel` (access_keys)
- `S3IamRoleStorageChannel` (iam_role / instancia de EC2/ECS)

La factory `ChannelsImplementationFactory.getStorageChannel(connectionType)` resuelve la implementación correcta. La abstracción es extensible — agregar GCS o Azure Blob requeriría solo una nueva implementación de `IStorageChannel`.

### 3.3 Resolución en runtime

El proveedor S3 se resuelve en tiempo de request, por `companyId`. No existe configuración S3 estática del sistema. Cada empresa tiene sus propias credenciales de S3 almacenadas en la colección de canales.

```
companyId → ChannelsRuntimeResolverService.resolveDefault('storage')
          → credenciales S3 del company en MongoDB
          → S3Client instanciado para esa request
```

**Ventaja:** Aislamiento real por tenant — cada empresa puede tener su propio bucket.
**Desventaja:** Una query a MongoDB en cada request de generación (sin cache de credenciales).

### 3.4 URLs

- Archivos públicos: `publicBaseUrl/<key>` si `publicBaseUrl` está configurado, sino `https://<bucket>.s3.<region>.amazonaws.com/<key>`
- Archivos privados: presigned URL con TTL (default 60s) vía `getSignedDownloadUrl`

### 3.5 Aislamiento multi-tenant

El aislamiento existe pero no es estructural — es de convención. Las keys de S3 incluyen prefijos pero no impiden que una llamada incorrecta acceda a keys de otro company si el companyId es manipulado. La protección viene de:
1. La resolución runtime: cada request usa las credenciales S3 del company solicitante
2. La validación del API key (`COMMUNICATION_API_KEY`)

**Gap de seguridad:** No existe validación de que la key solicitada pertenezca al `companyId` del request. Un caller puede solicitar `info` o `download` de una key de otro company si conoce la key.

### 3.6 Permisos

No existe modelo de permisos por archivo. La granularidad es binaria: `isPublic: true` (ACL public-read en S3) o privado (acceso solo vía presigned URL).

---

## SECCIÓN 4 — Templates

### 4.1 Motor de templates

Existe un motor de templates propio: `TemplateRendererService`. Es un regex replacer de `{{variable}}` sin dependencias externas.

**Capacidades:**
- Resolución de variables planas: `{{displayName}}`
- Resolución por dot-notation: `{{company.displayName}}`, `{{theme.primaryColor}}`
- Aliases de compatibilidad: `{{brandText}}` → `theme.textColor`
- Inyección de contenido: `{{content}}` (placeholder del layout)
- Inyección de CSS: `{{css}}` o `</head>` fallback

**Incapacidades críticas:**
- **No soporta condicionales** `{{#condition}}...{{/condition}}`
- **No soporta bucles** `{{#each items}}...{{/each}}`
- **No soporta helpers** (formateo de fechas, monedas, etc.)
- **No soporta partial templates** (sub-templates reutilizables)

El default PDF layout en las constantes de provisioning usa sintaxis Mustache `{{#company.logoFullUrl}}...{{/company.logoFullUrl}}` para el logo condicional, pero el `TemplateRendererService` **no procesa estos bloques**. Los bloques condicionales quedan como texto literal en el HTML generado.

### 4.2 Templates en base de datos

Existen templates en MongoDB (`layout_templates` collection) con:
- `templateKey` (e.g., `default_pdf_layout`, `default_email_layout`)
- `html` y `css` separados
- `isDefault: boolean`
- `templateType: 'email' | 'pdf'`

La resolución se hace vía `SourceOfTruthService.resolveForPdfReport(companyId)` que busca el layout `default_pdf_layout` del company.

**No existe hoy:**
- Named templates por tipo de documento (Invoice, Statement, Receipt)
- Versioning de templates
- Template catalog por tipo de negocio
- Template variables contract (qué variables requiere cada template)
- Herencia de templates (layout + partial)

### 4.3 Variables del template PDF

Las variables disponibles en los templates PDF provienen de `composeHtml`:
```
company.*       (displayName, legalName, logoFullUrl, supportEmail, etc.)
theme.*         (primaryColor, secondaryColor, fontFamily, etc.)
meta.*          (generatedAtIso, generatedAtPretty, year)
data.*          (payload dinámico de cada documento)
```

Planas también disponibles (aliases):
```
{{displayName}} = {{company.displayName}}
{{primaryColor}} = {{theme.primaryColor}}
... etc.
```

---

## SECCIÓN 5 — Tipos de documentos soportados hoy

| Formato | Soportado | Motor | Entrada requerida |
|---|---|---|---|
| **PDF** | ✅ | Puppeteer v HTML | HTML string compuesto |
| **XLSX** | ✅ | ExcelJS | `{ meta, table: { columns, rows }, notes?, totals? }` |
| **CSV** | ✅ | Node nativo | `{ table: { columns, rows }, mode?: 'clean'|'full' }` |
| HTML | ⚠️ | Indirecto | Se puede devolver el HTML compuesto antes de generar el PDF |
| Word (.docx) | ❌ | No existe | — |
| Imágenes | ❌ | No existe | — |
| ZIP | ❌ | No existe | — |
| TXT | ❌ | No existe | — |

---

## SECCIÓN 6 — Relación con Notifications

El módulo Files actualmente tiene **acoplamiento mínimo** con Notifications:

- `ReportService` → usa `SourceOfTruthService` para resolver layout+theme+company (el mismo servicio que usan las Notifications para renderizar emails)
- `composeHtml` → usa `TemplateRendererService` (el mismo que usa el Notification Engine)
- `Preview module` → `PreviewService.previewReportPdf()` usa `GeneratorService`

**Lo que NO existe hoy:**
- Un flujo que genera un PDF y lo adjunta a un email automáticamente
- Un evento `DocumentReady` que el Notification Engine pueda consumir
- Un `DocumentRequest` → `DocumentGenerated` → `Communications send with attachment` flow
- El `ExecutionLog` de Communications no registra documentos generados

**El flujo objetivo definido en `docs/domain/revenue/10-document-request.md` todavía no existe** como implementación — está definido como arquitectura conceptual pero no hay código que lo materialice.

---

## SECCIÓN 7 — Multi-Tenant

### Identificación del company

Todo request al módulo Files requiere `companyId` como campo del DTO. La autenticación usa el `COMMUNICATION_API_KEY` del ambiente — es una clave global, no por company.

**Gap:** No existe un JWT por company en las llamadas a `/files/*`. La validación de que el `companyId` del DTO corresponde al caller es implícita (la clave API es del sistema, no del company).

### Aislamiento

- **Storage S3:** Cada company tiene sus propias credenciales S3 resueltas en runtime — aislamiento real por credenciales
- **Templates:** Los templates se buscan por `companyId` — aislamiento por query
- **Theme/Company context:** Resuelto por `companyId` en el `SourceOfTruthService`

### Gap de tenant isolation

No existe validación de que la `key` de un archivo (en las operaciones `info`, `download`, `delete`) pertenezca al `companyId` del request. Si alguien sabe la key de otro company, puede consultarla con su propio API key.

---

## SECCIÓN 8 — Problemas actuales identificados

### P-01 — Mezcla de responsabilidades en un solo módulo

El módulo `files` mezcla:
- Generación de documentos (stateless, efímero) → `generator`, `reports`
- Almacenamiento de archivos (stateful, permanente) → `media`, `storage`

Son dominios distintos que evolucionarán en direcciones diferentes. La generación de documentos debería evolucionar hacia un Document Engine. El almacenamiento de branding assets (logos) podría seguir como Media.

### P-02 — Motor de templates incompleto

`TemplateRendererService` no soporta condicionales, bucles, ni helpers. Los bloques `{{#company.logoFullUrl}}...{{/company.logoFullUrl}}` del default PDF layout quedan como texto literal en el HTML final. Para un Invoice PDF real (con logo condicional, IVA condicional, notas opcionales), el motor actual es insuficiente.

### P-03 — PDF generación síncrona sin cola

Puppeteer corre sincrónicamente en el mismo proceso. El cap de 3 instancias simultáneas es un `let activePuppeteerInstances = 0` en memoria — se pierde si el proceso se reinicia, no funciona con múltiples instancias del servicio. No hay retry, no hay DLQ. El comentario en el código mismo lo reconoce:
```
// This cap is a safety net until PDF generation is moved to a dedicated BullMQ queue in Phase 1.
```

### P-04 — Sin DocumentExecution / audit trail

No existe registro de qué documentos se generaron, para qué company, con qué template, en qué momento. Si se necesita auditar "¿cuándo se generó el PDF de la Invoice X?", el sistema no tiene esa información.

### P-05 — Sin DocumentType / catálogo de plantillas

No existe el concepto de `documentType: 'invoice' | 'statement' | 'receipt'`. Hoy todos los PDFs pasan por el mismo `default_pdf_layout`. Para un catálogo (Invoice Template, Statement Template, BAS Report Template), el sistema necesita plantillas nombradas por tipo.

### P-06 — Sin versionado de templates

Los templates en MongoDB son mutables. Si el Business Owner edita el layout de una factura, todos los PDFs regenerados usarán el nuevo layout, incluso si se refieren a invoices históricas. Para reproducibilidad, un documento histórico debería regenerarse con la versión del template vigente cuando fue generado.

### P-07 — Sin soporte de locale / idioma

No existe ningún mecanismo de localización. Los textos del template están hardcoded en inglés. Para soportar negocios en español, francés, o con formato de fecha/moneda diferente, el sistema no tiene nada.

### P-08 — Sin tests

Cero tests en todo el módulo Files. `PdfRendererService`, `CsvRendererService`, `XlsxRendererService`, `ReportContentBuilder`, `TemplateRendererService`, `MediaService`, `StorageService` — ninguno tiene spec.

### P-09 — Endpoint POST /files/generate demasiado genérico

Este endpoint expone el motor sin ningún contexto de negocio. No sabe qué company, no aplica branding, no valida permisos. Funciona para casos internos (ej. Business App llamando directamente), pero no es un contrato de API sostenible.

### P-10 — Gap de seguridad en operaciones storage por key

Las operaciones `info`, `download`, `delete` del StorageController aceptan cualquier key sin validar que pertenezca al companyId del request. Un caller puede leer metadata de archivos de otro company si conoce su key.

---

## COMPARACIÓN: Estado actual vs Arquitectura objetivo

### Lo que el objetivo requiere (de `docs/domain/revenue/10-document-request.md`)

```
Invoice.Approved
    → DocumentRequested { invoiceId, documentType: PDF_INVOICE, businessId }
    → Document Management resuelve: template + branding + datos
    → PDF generado y almacenado efímeramente
    → DocumentGenerated { documentId, invoiceId, documentReference }
    → Billing adjunta referencia
    → InvoiceReadyToSend
    → Communications envía email con PDF adjunto
    → Eliminar archivo temporal
```

### Gap analysis

| Capacidad objetivo | ¿Existe hoy? | Estado |
|---|---|---|
| Resolver Business/Company | ✅ | `SourceOfTruthService.resolveForPdfReport` |
| Resolver Document Template por tipo | ❌ | Solo `default_pdf_layout` — no hay `PDF_INVOICE` template |
| Resolver Branding (theme + company) | ✅ | `composeHtml` con company + theme |
| Resolver locale/idioma | ❌ | No existe |
| Resolver formato | ✅ | RendererRegistry con pdf/xlsx/csv |
| Resolver Layout | ✅ | Default PDF layout por company |
| Resolver variables del template | ✅ (parcial) | Sin condicionales ni bucles |
| Renderizar documento | ✅ | GeneratorService.generate() |
| Generar PDF | ✅ | Puppeteer |
| Generar Excel | ✅ | ExcelJS |
| Generar CSV | ✅ | Node nativo |
| Entrega al proceso solicitante | ✅ (solo HTTP sync) | No hay evento DocumentGenerated |
| DocumentRequest como evento | ❌ | No existe |
| DocumentGenerated como evento | ❌ | No existe |
| DocumentExecution audit trail | ❌ | No existe |
| Generación efímera (sin almacenamiento permanente) | ✅ | Ya es el comportamiento actual |
| Eliminación del archivo temporal | ✅ | Ya no hay archivo — solo buffer en memoria |
| Cola para generación asíncrona | ❌ | Puppeteer síncrono |

---

## Evaluación: ¿Soporta el modelo efímero?

**Respuesta: Sí. Ya lo hace.**

El módulo `generator` y el módulo `reports` NO almacenan documentos. Producen un `Buffer` que se devuelve directamente en la respuesta HTTP. No existe ninguna persistencia de los PDFs o XLSXs generados.

El modelo efímero descrito en la arquitectura objetivo **ya es el comportamiento actual** para documentos generados. La diferencia es que hoy el buffer se devuelve en una respuesta HTTP síncrona, mientras que el objetivo requiere que se entregue a través de un evento asíncrono (`DocumentGenerated`).

**Lo que falta para el modelo efímero completo:**
- La entrega async vía evento (en lugar de HTTP response)
- El `DocumentExecution` como trazabilidad (sin guardar el archivo)
- La cola de generación (Puppeteer síncrono → BullMQ)

---

## Análisis del Document Engine objetivo

### Conceptos que deben introducirse

| Concepto | Existe hoy | Forma actual | Qué hacer |
|---|---|---|---|
| `DocumentType` | ❌ | Hardcoded `'pdf'` en el DTO | Introducir como catálogo de tipos de documento |
| `DocumentTemplate` | Parcial | Solo `default_pdf_layout` por company | Extender a templates nombrados por tipo |
| `TemplateVersion` | ❌ | Templates mutables | Agregar campo de versión, historial de versiones |
| `TemplateVariables` | Implícitas | Documentadas en DEC-017 | Formalizar como contrato: qué variables requiere cada template |
| `DocumentRequest` | ❌ | Solo DTO de API | Introducir como evento de dominio |
| `DocumentRenderer` | ✅ | `GeneratorService` + renderers | Renombrar y formalizar |
| `DocumentExecution` | ❌ | No existe | Crear como audit log (sin el archivo) |
| `DocumentResult` | Parcial | `DownloadFileResult { buffer }` | Extender para incluir metadata de ejecución |
| `Branding` | ✅ | Company + Theme en composeHtml | Formalizar como concepto |
| `Localization` | ❌ | No existe | Introducir locale en DocumentRequest |
| `OutputFormat` | Parcial | Enum en DTO | Formalizar como OutputFormat |
| `TemplateCatalog` | ❌ | No existe | Crear por company, con provisioning automático |

---

## Análisis del catálogo de plantillas

### ¿La arquitectura actual soportaría el catálogo completo?

**Respuesta: Con las extensiones correctas, sí.**

La arquitectura actual tiene los fundamentos:
- El `SourceOfTruthService` ya resuelve company + theme + layout por companyId
- La lookup de layout es por `templateKey` (hoy solo `'default_pdf_layout'`)
- El `ReportContentBuilder` ya soporta múltiples tipos de sección

Para soportar el catálogo completo, el cambio no es arquitectónico — es de datos y de contratos de templates:

| Template del catálogo | ¿Soportado hoy? | Qué falta |
|---|---|---|
| Invoice | ⚠️ Parcial | Template específico `invoice_pdf` + variables: invoiceNumber, items[], totals, dueDate, customer |
| Receipt | ❌ | Template `receipt_pdf` + variables simplificadas |
| Credit Note | ❌ | Template `credit_note_pdf` + variables de ajuste |
| Statement | ❌ | Template `statement_pdf` + tabla de movimientos por período |
| Income Report | ⚠️ | ReportContentBuilder ya soporta summary + table + totals |
| Expense Report | ⚠️ | Idem — solo cambiaría el payload de datos |
| Balance Sheet | ⚠️ | Requiere secciones con subtotales anidados |
| P&L | ⚠️ | Idem |
| Trial Balance | ⚠️ | Tabla estándar con columnas DR/CR |
| BAS Report | ❌ | Requiere campos fiscales específicos de AU |
| Timesheet | ⚠️ | Tabla de WorkEvents — ReportContentBuilder viable |
| General Ledger | ⚠️ | Tabla paginada — viable pero requiere paginación |
| Payroll Summary | ❌ | Requiere Fase 9 |
| Inventory Report | ❌ | Requiere Fase 10 |

Los ⚠️ son "soportados con el motor actual pero sin template dedicado". Los ❌ son "no existe ni el template ni los datos origen todavía".

---

## Qué está bien diseñado

| Componente | Por qué es correcto |
|---|---|
| `IFileRenderer` interface + `RendererRegistry` | Abierto a extensión, cerrado a modificación. Agregar Word/ZIP/HTML requiere solo una nueva implementación |
| `composeHtml` pipeline | Separación correcta: CSS injection → content injection → variable resolution |
| Runtime S3 resolution por company | Multi-tenancy real — cada empresa puede tener su propio bucket |
| `S3IamRoleStorageChannel` | Soporte de IAM role para deployment en AWS ECS/EC2 sin credenciales hardcoded |
| Generación efímera (sin persistencia) | El buffer nunca se almacena — ya implementa el modelo correcto |
| `ReportService` como orquestador | Separa correctamente: resolve → build → compose → generate |
| `ReportPayload.sections[]` tipado | Extensible, semántico, fácil de agregar nuevos tipos de sección |
| `SourceOfTruthService` compartido con Notifications | Un solo punto de verdad para company + theme + layout |

## Qué debe evolucionar

| Componente | Qué hacer |
|---|---|
| `files.module.ts` | Separar en `document-engine` (generator+reports) y `media` (uploads de branding) |
| `TemplateRendererService` | Migrar a Handlebars o Liquid para soportar condicionales `{{#if}}`, helpers `{{formatDate}}`, y partials |
| `html-to-pdf.util.ts` | Mover a una cola BullMQ. El counter en memoria no es distribuible ni retryable |
| `POST /files/generate` | Deprecar como endpoint público. Reemplazar por un DocumentRequest handler interno |
| `ReportService` | Renombrar como `DocumentGeneratorService` o `DocumentEngine`. Agregar soporte de `documentType` |
| `generate-report.dto.ts` | Evolucionar hacia `DocumentRequest { documentType, businessId, locale, format, payload, metadata }` |

## Qué puede reutilizarse

| Componente | Reutilizable | Cómo |
|---|---|---|
| `GeneratorService.generate()` | ✅ Directamente | Core del Document Engine |
| `RendererRegistry` + los 3 renderers | ✅ Directamente | Agregar más formatos como implementaciones |
| `composeHtml` utility | ✅ Con enhancements | Base del rendering pipeline |
| `IStorageChannel` + implementaciones S3 | ✅ Para media assets | No para documentos generados (son efímeros) |
| `SourceOfTruthService.resolveForPdfReport` | ✅ Con extensión | Agregar resolución por `documentType` |
| `ReportContentBuilder` secciones | ✅ Para reportes | Agregar nuevas secciones según catálogo |
| `StorageKeyService.ensureSafeKey` | ✅ | Protección contra path traversal |

## Qué debe eliminarse

| Componente | Por qué |
|---|---|
| `POST /files/generate` (endpoint público) | Demasiado genérico, sin contexto de negocio, sin branding |
| Counter `activePuppeteerInstances` en memoria | No es distribuible — reemplazar por queue |
| Mezcla Media + Storage + Generator en un módulo | Genera confusión conceptual y dificulta evolución independiente |

## Qué debe abstraerse

| Abstracción faltante | Propósito |
|---|---|
| `DocumentType` | Catálogo de tipos (`INVOICE`, `STATEMENT`, `RECEIPT`, etc.) |
| `DocumentTemplate` nombrado por tipo | Resolver el template correcto según documentType |
| `DocumentRequest` como evento | Trigger asíncrono del Document Engine |
| `DocumentExecution` como audit log | Trazabilidad sin persistir el archivo |
| `Locale` en el request | Internacionalización de templates |
| `TemplateVersion` | Reproducibilidad histórica |

---

## Recomendaciones arquitectónicas

**REC-01 — Migrar el motor de templates a Handlebars**
El `TemplateRendererService` hand-rolled no puede crecer. El bloque condicional `{{#company.logoFullUrl}}` del default layout ya no funciona. Handlebars es el reemplazo natural: misma sintaxis, soporte de `{{#if}}`, `{{#each}}`, helpers, y partials. La migración es de bajo impacto (mismo syntax `{{var}}`).

**REC-02 — Introducir DocumentType como primer paso del catálogo**
Antes de crear templates específicos, definir el enum/catalog de `DocumentType`. Esto desbloquea:
- Resolución de template por tipo
- Provisioning automático de templates por tipo al crear un Business
- Audit trail por tipo de documento

**REC-03 — Crear DocumentExecution antes de mover Puppeteer a la cola**
El `DocumentExecution` es simple (no almacena el archivo, solo metadata) y es la base del audit trail. Es el primer concepto nuevo a implementar.

**REC-04 — Mover Puppeteer a BullMQ en la siguiente iteración de rendimiento**
El código ya tiene el comentario. La infraestructura de BullMQ existe en el proyecto. El job de generación de PDF es naturalmente asíncrono. Sin esta cola, el servicio no escala.

**REC-05 — Separar DocumentEngine de Media en módulos distintos**
El módulo `files` debería dividirse en:
- `document-engine/` (generator + reports + future: templates, executions)
- `media/` (upload/delete de imágenes de branding — sigue siendo útil)

**REC-06 — No implementar almacenamiento permanente de PDFs**
La arquitectura actual ya lo hace correctamente. No construir nada que persista los documentos generados. Si se necesita "volver a bajar el PDF de la invoice 123", la respuesta correcta es regenerarlo desde la fuente — no recuperarlo de S3.

**REC-07 — Agregar `TemplateVariablesContract` a cada template**
Antes de construir el catálogo, cada template debe declarar qué variables requiere (`invoiceNumber: string`, `items: InvoiceItem[]`, etc.) y cuáles son opcionales. Esto permite validar el payload antes de renderizar y evita PDFs con `undefined` en campos críticos.

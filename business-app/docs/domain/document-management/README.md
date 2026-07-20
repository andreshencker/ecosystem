# Document Management Domain

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual oficial

---

## Qué es Document Management

El dominio de Document Management (DM) es el **único responsable de la existencia, el almacenamiento, el versionado, y el ciclo de vida de todos los documentos del ERP**.

Un documento es cualquier artefacto binario con significado de negocio que el sistema genera o recibe: PDFs de facturas, contratos, reportes financieros, comprobantes de pago, imágenes de recibos, exportaciones, archivos de nómina, estados de cuenta.

Sin Document Management:
- Billing genera PDFs y los almacena en su propia lógica
- Analytics genera reportes y los almacena en otro lugar
- Communications adjunta archivos sin saber de dónde vienen
- No existe versionado uniforme
- No existe un lugar único donde buscar "todos los documentos de este cliente"

---

## Principios

| Principio | Descripción |
|---|---|
| **Único almacén** | Todo documento del ERP pasa por Document Management |
| **Agnóstico de almacenamiento** | El proveedor de storage (S3, R2, GDrive) es un detalle de infraestructura |
| **Versionado obligatorio** | Todo documento regenerado crea una nueva versión, no sobrescribe |
| **Inmutabilidad del contenido** | Una vez creada una versión, su contenido es inmutable |
| **Referencias, no copias** | Los dominios guardan `DocumentReference`, nunca el archivo en sí |
| **Ciclo de vida explícito** | Los documentos tienen estados: draft → active → archived → deleted |
| **Ownership claro** | Cada documento sabe quién lo generó y a qué entidad pertenece |

---

## Índice de documentos

| Documento | Descripción |
|---|---|
| [01-document-domain.md](./01-document-domain.md) | Conceptos, entidades, ciclo de vida, eventos |
| [02-document-relationships.md](./02-document-relationships.md) | Cómo cada dominio del ERP se relaciona con los documentos |
| [03-storage-providers.md](./03-storage-providers.md) | Proveedores de almacenamiento y el patrón de abstracción |
| [04-document-lifecycle.md](./04-document-lifecycle.md) | Ciclo de vida documental completo: Invoice Approved → Email enviado → Estado actualizado |

---

## El problema que resuelve

```
SIN Document Management:

Billing genera:          invoices/INV-042.pdf
Analytics genera:        reports/pl-2026-q3.pdf
Communications adjunta:  ??? (no sabe dónde buscar)
Accounting genera:       statements/trial-balance.xlsx

Resultado:
  - 4 rutas de almacenamiento distintas
  - Ningún sistema unificado de búsqueda
  - Si el bucket S3 cambia, hay que actualizar 4 módulos
  - Auditor pide "todos los documentos del trimestre" → buscar en 4 lugares

CON Document Management:

Billing genera PDF → DocumentManagement.store() → retorna DocumentReference
Analytics genera reporte → DocumentManagement.store() → retorna DocumentReference
Communications consulta → DocumentManagement.getDocumentUrl(documentId)
Accounting busca → DocumentManagement.listByEntity(entityType: 'fiscal_period', entityId)

Resultado:
  - Un lugar para buscar todos los documentos
  - Si el bucket S3 cambia → solo cambia Document Management
  - Auditor pide "todos los documentos del trimestre" → una sola consulta
```

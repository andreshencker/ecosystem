# 01 — Document Domain

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual oficial

---

## Conceptos del dominio

### Document (el aggregate root)

Un `Document` es la entidad central del dominio. Representa un artefacto con significado de negocio. No es el archivo — es el registro que describe el archivo y lo hace encontrable y referenciable.

```
Document {
    // Identidad
    documentId:       UUID
    businessId:       ObjectId     — tenant scope
    documentType:     string       — referencia a MDM.DocumentType
    title:            string       — nombre legible del documento

    // Ownership semántico
    ownerDomain:      string       — qué dominio lo generó ('billing', 'accounting', 'analytics')
    ownerEntityType:  string       — qué tipo de entidad lo originó ('invoice', 'fiscal_period')
    ownerEntityId:    ObjectId     — ID de la entidad origen

    // Versiones
    currentVersionId: UUID
    versionCount:     integer

    // Ciclo de vida
    status:           string       — 'draft' | 'active' | 'archived' | 'deleted'
    createdAt:        DateTime
    archivedAt:       DateTime?
    deletedAt:        DateTime?
    retentionUntil:   Date         — cuándo puede ser eliminado definitivamente

    // Metadata
    tags:             string[]
    locale:           string?      — idioma del documento
    isConfidential:   boolean
    isShared:         boolean      — si fue compartido externamente
}
```

**Invariantes:**
- Un Document siempre tiene al menos una versión
- El `currentVersionId` apunta siempre a la versión más reciente activa
- Solo el dominio que creó el documento puede archivarlo o eliminarlo
- Un documento `deleted` no puede recuperarse (soft delete con retención)

---

### DocumentVersion

Una `DocumentVersion` representa el contenido binario de un documento en un momento específico.

```
DocumentVersion {
    versionId:        UUID
    documentId:       UUID          — Document al que pertenece
    versionNumber:    integer       — 1, 2, 3, ...
    versionLabel:     string?       — 'v1', 'v2', o 'Original', 'Corrected'

    // Ubicación en storage
    storageKey:       string        — ruta interna en el proveedor de storage
    storageProvider:  string        — 'aws_s3' | 'cloudflare_r2' | 'local' | etc.
    storageBucket:    string

    // Metadata del archivo
    mimeType:         string        — 'application/pdf' | 'image/jpeg' | etc.
    sizeBytes:        integer
    checksum:         string        — SHA-256 del contenido (para integridad)
    encoding:         string?       — 'utf-8' para texto

    // Trazabilidad
    generatedBy:      string        — 'billing_service' | 'analytics_service' | 'user_upload'
    generatedAt:      DateTime
    isActive:         boolean       — la versión actual es true; las anteriores quedan como false
}
```

**Inmutabilidad del contenido:**
Una vez creada, una `DocumentVersion` nunca se modifica. Si el documento necesita actualizarse (ej. la factura fue regenerada con un logo diferente), se crea una nueva `DocumentVersion`. El contenido del archivo al que apunta `storageKey` también es inmutable — nunca se sobreescribe en el storage provider.

---

### DocumentReference

Un `DocumentReference` es cómo los demás dominios referencian un documento sin conocer los detalles de almacenamiento.

```
DocumentReference {
    documentId:     UUID          — apunta a Document.documentId
    versionId:      UUID?         — si null, apunta a la versión actual (currentVersionId)
    contextLabel:   string?       — ej. 'Invoice PDF', 'Contract Copy', 'Payment Receipt'
}
```

**Regla:** Ningún dominio excepto Document Management almacena rutas de archivos, URLs, ni storage keys directamente. Solo almacenan `DocumentReference`.

```
// CORRECTO — Billing almacena una referencia
Invoice {
    pdfDocumentRef: DocumentReference { documentId: UUID }
}

// INCORRECTO — Billing almacena la URL directamente
Invoice {
    pdfUrl: 'https://s3.amazonaws.com/bucket/invoices/INV-042.pdf'
}
```

---

### DocumentMetadata

Atributos adicionales que hacen al documento buscable y clasificable.

```
DocumentMetadata {
    documentId:        UUID
    // Atributos indexables
    entityReferences: [
        { entityType: 'invoice', entityId: ObjectId }
        { entityType: 'customer', entityId: ObjectId }
        { entityType: 'fiscal_period', entityId: ObjectId }
    ]
    period:            string?    — 'YYYY-MM' si aplica
    amount:            decimal?   — si el documento tiene un monto (factura, pago)
    currency:          string?
    keywords:          string[]   — para búsqueda fulltext
    customAttributes:  object?    — extensible
}
```

---

### StorageProvider (abstracción de infraestructura)

```
StorageProvider {
    providerId:     string    — 'aws_s3' | 'cloudflare_r2' | 'gcs' | 'local'
    isActive:       boolean
    isDefault:      boolean
    region:         string?
    tier:           string    — 'hot' | 'warm' | 'cold' (para lifecycle policies)
}
```

Document Management abstrae completamente al caller del proveedor de almacenamiento. Si se migra de S3 a Cloudflare R2, solo cambia Document Management — ningún otro dominio sabe que hubo un cambio.

---

### Preview y Thumbnail

Para mejorar la UX, Document Management puede generar representaciones de baja resolución:

```
DocumentPreview {
    documentId:   UUID
    versionId:    UUID
    previewType:  'thumbnail' | 'preview' | 'text_extract'
    storageKey:   string    — ruta del preview en storage
    sizeBytes:    integer
    generatedAt:  DateTime
}
```

- **Thumbnail**: imagen de la primera página (para listados)
- **Preview**: páginas 1-3 para previsualización rápida
- **Text extract**: contenido de texto extraído (para búsqueda fulltext — futuro)

---

## Ciclo de vida de un documento

```
GENERACIÓN
  ├── Billing genera un PDF de factura
  ├── Llama a DocumentManagement.store(content, metadata)
  └── Document Management:
        ├── Crea Document entity
        ├── Crea DocumentVersion (v1) y sube al storage
        ├── Genera preview/thumbnail en background
        ├── Publica DocumentCreated event
        └── Retorna DocumentReference al caller

ACTUALIZACIÓN (nueva versión)
  ├── Billing regenera el PDF (ej. cliente pidió cambiar logo)
  ├── Llama a DocumentManagement.addVersion(documentId, newContent)
  └── Document Management:
        ├── Crea DocumentVersion (v2)
        ├── Marca v1 como isActive: false
        ├── Actualiza Document.currentVersionId → v2
        ├── Publica DocumentVersionCreated event
        └── Retorna nueva DocumentReference

ARCHIVADO
  ├── Al cerrar un período fiscal, los documentos del período se archivan
  ├── DocumentManagement.archive(documentId, reason)
  └── Document Management:
        ├── Cambia Document.status → 'archived'
        ├── Mueve a tier de storage 'cold' si aplica
        └── Publica DocumentArchived event

ELIMINACIÓN
  ├── Solo posible para documentos 'archived' con retentionUntil pasada
  ├── DocumentManagement.delete(documentId)
  └── Document Management:
        ├── Verifica que retentionUntil < hoy
        ├── Elimina el binario del storage
        ├── Registra el tombstone (Document entity permanece con status 'deleted')
        └── Publica DocumentDeleted event
```

**Regla de retención:** La retención mínima de documentos financieros es 7 años (requerimiento legal en Australia). Document Management aplica esta regla automáticamente basado en el `documentType`.

---

## Domain Events de Document Management

### `DocumentCreated`
```
DocumentCreated {
    documentId:       UUID
    businessId:       ObjectId
    documentType:     string
    ownerDomain:      string
    ownerEntityType:  string
    ownerEntityId:    ObjectId
    versionId:        UUID
    sizeBytes:        integer
    mimeType:         string
    createdAt:        DateTime
}
```
**Consumidores:** Analytics (registra en DocumentFact), Communications (puede adjuntar a emails), Search index.

---

### `DocumentVersionCreated`
```
DocumentVersionCreated {
    documentId:       UUID
    businessId:       ObjectId
    versionId:        UUID
    versionNumber:    integer
    previousVersionId: UUID
    reason:           string?
    createdAt:        DateTime
}
```
**Consumidores:** Analytics, audit log.

---

### `DocumentArchived`
```
DocumentArchived {
    documentId:       UUID
    businessId:       ObjectId
    documentType:     string
    archivedAt:       DateTime
    reason:           string?
    retentionUntil:   Date
}
```
**Consumidores:** Storage lifecycle (mover a cold tier), Analytics.

---

### `DocumentDeleted`
```
DocumentDeleted {
    documentId:       UUID
    businessId:       ObjectId
    documentType:     string
    deletedAt:        DateTime
    dataRetained:     boolean    — si el tombstone se retiene por auditoría
}
```
**Consumidores:** Audit log, Analytics (elimina de proyecciones).

---

### `DocumentShared`
```
DocumentShared {
    documentId:       UUID
    businessId:       ObjectId
    sharedWith:       string    — email o URL pública
    expiresAt:        DateTime?
    accessLevel:      string    — 'view_only' | 'download'
    sharedAt:         DateTime
}
```
**Consumidores:** Communications (puede notificar al destinatario), Analytics.

---

## Quién puede eliminar documentos

La eliminación es la operación más destructiva y tiene reglas estrictas:

| Actor | Puede archivar | Puede eliminar | Condición |
|---|---|---|---|
| Dominio que creó el documento | Sí | No directamente | Solo puede archivar |
| Business Owner | Sí | Sí (soft) | Solo si retentionUntil ha pasado |
| Platform Admin | Sí | Sí (hard) | En cumplimiento con Privacy Act/GDPR |
| Cualquier otro | No | No | — |

**Hard delete** (Platform Admin): elimina el binario pero retiene el tombstone por 7 años.

**Soft delete** (Business Owner): marca el documento como deleted y programa la eliminación definitiva para `retentionUntil`.

# 03 — Storage Providers

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual oficial

---

## El patrón de abstracción de storage

Document Management abstrae completamente el proveedor de almacenamiento físico. Los dominios que usan documentos nunca saben en qué proveedor están almacenados.

```
CAPA DE DOMINIO          CAPA DE ABSTRACCIÓN        CAPA DE INFRAESTRUCTURA
─────────────────────────────────────────────────────────────────────────
Billing.sendInvoice()
  → docMgmt.store(pdf)   → StoragePort.upload()     → S3.putObject()
                                                     (o R2.put() o GCS.upload())

Business Owner descarga
  → docMgmt.getUrl(id)   → StoragePort.presignUrl() → S3.getSignedUrl()
```

---

## Estrategia de tiers de almacenamiento

No todos los documentos tienen el mismo patrón de acceso. Un PDF de factura de hace 5 años se accede con mucha menos frecuencia que uno de la semana pasada.

| Tier | Acceso | Costo relativo | Cuándo usar |
|---|---|---|---|
| Hot | Inmediato (ms) | Alto | Últimos 90 días |
| Warm | Segundos | Medio | 3 meses a 2 años |
| Cold | Minutos | Bajo | > 2 años |
| Archive | Horas | Muy bajo | Retención legal sin acceso previsto |

### Política de lifecycle automático

```
Documento creado → Tier Hot
    ↓ Después de 90 días
Tier Warm (automáticamente, si no hubo acceso reciente)
    ↓ Después de 2 años
Tier Cold
    ↓ Cuando status = 'archived'
Tier Archive
    ↓ Cuando retentionUntil pasa y status = 'deleted'
Eliminación definitiva
```

Esta política se configura en el Storage Provider — no en el código del dominio.

---

## Proveedores soportados (y futuros)

| Proveedor | Tier | Estado |
|---|---|---|
| Amazon S3 | Hot/Warm/Cold/Archive (Glacier) | Soportado |
| Cloudflare R2 | Hot/Warm | Soportado (sin egress fees) |
| Google Cloud Storage | Hot/Warm/Cold/Archive | Soportado |
| Azure Blob Storage | Hot/Warm/Cold/Archive | Futuro |
| Local FileSystem | Solo dev/test | Dev |
| Google Drive | Hot | Futuro (opcional Business) |
| Dropbox | Hot | Futuro (opcional Business) |
| OneDrive | Hot | Futuro (opcional Business) |

### Estrategia multi-proveedor

Un Business puede elegir dónde almacenar sus documentos (data sovereignty — datos en Australia vs EU). Document Management soporta configuración de proveedor por Business:

```
BusinessStorageConfig {
    businessId:         ObjectId
    defaultProvider:    string    — 'aws_s3' | 'cloudflare_r2'
    region:             string    — 'ap-southeast-2' (Sydney) | 'eu-west-1' (Ireland)
    tier:               string
}
```

---

## Seguridad del storage

### Principios de seguridad

1. **Acceso denegado por defecto**: Ningún archivo es públicamente accesible. Todo acceso requiere un presigned URL temporal generado por Document Management.

2. **URLs firmadas con expiración corta**: Para descarga → 15 minutos. Para adjuntar en email → 7 días (el PDF debe ser descargable durante el período de lectura del email).

3. **Cifrado en reposo**: AES-256 (manejado por el proveedor de storage).

4. **Aislamiento por Business**: Los archivos de Business A están en un prefijo/bucket separado de Business B.

```
Estructura de keys en storage:
  {businessId}/{year}/{month}/{documentType}/{documentId}/{versionId}.pdf
  
Ejemplo:
  6789abcd1234/2026/07/invoice_pdf/uuid-doc/uuid-version.pdf
```

5. **Integridad verificable**: El `checksum` SHA-256 se calcula al subir y se verifica al descargar. Si no coinciden, se alerta y se usa una versión anterior.

---

## Evolución a 10 años

### Año 1-2
- Un proveedor primario (S3 o R2)
- Hot/Cold tiers básicos
- PDFs de facturas y reportes

### Año 3-4
- Multi-proveedor (Business puede elegir región)
- Firma digital de contratos
- OCR de receipts para Expenses (extracción de datos de imágenes)

### Año 5+
- Full-text search sobre contenido de documentos
- AI: extracción automática de datos de facturas de proveedores (para AP)
- Compliance: retención automática por tipo de documento y jurisdicción
- Data sovereignty: garantías por regulación (GDPR, Privacy Act)

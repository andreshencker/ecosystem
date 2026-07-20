> ⚠️ **DEPRECATED** — Este documento fue migrado a:
> **`docs/integrations/communications/notifications.md`** (§3 Platform Events, §4 Business Events, §Estado de implementación)
> No actualizar este documento. Usar la nueva fuente de verdad.

# Communication Provisioning — Seed Catalog y Configuración por defecto

**Versión:** 2.0 | **Fecha:** 2026-07-07 | **Estado:** Canónico — reemplaza v1.0

> **Cambio respecto a v1.0:** El modelo anterior describía la creación de dominios/eventos en Communications al crear la empresa. Eso era incorrecto — en ese momento el Business no tiene token. La arquitectura correcta es el Seed Catalog, documentado en ADR-019.

---

## 1. Dos mundos separados

### Eventos Platform (`type: 'platform'`)

Los eventos de Platform (auth, invitaciones, seguridad) **ya existen en Communications desde el despliegue inicial**. Los crea el equipo de infraestructura como parte de la configuración de la empresa base (`isPlatformCompany: true`).

Business App no provisiona estos eventos. Solo los usa.

**Ubicación en Communications:**
```
communications-app/backend/src/communication/company/provisioning/constants/default-events.constant.ts
```

| eventKey | Estado |
|---|---|
| `security.company_verify_email` | ✅ Existe en Communications |
| `security.company_forgot_password` | ✅ Existe en Communications |
| `security.company_password_changed` | ✅ Existe en Communications |
| `security.company_admin_invitation` | ✅ Existe en Communications |
| `security.company_user_invitation` | ✅ Existe en Communications |
| `security.company_invitation_resent` | ✅ Existe en Communications |
| `security.company_welcome_message` | ✅ Existe en Communications |

---

### Eventos Business (`type: 'business'`)

Los eventos de Business (facturas, pagos, documentos) NO se crean al registrar la empresa. Se crean cuando el Business configura su token de Communications.

**Fuente de verdad:** El Seed Catalog en Business App.

```
business-app/backend/src/settings/communication-client/seed-catalog.ts
```

---

## 2. El Seed Catalog — qué es

El Seed Catalog es el archivo en Business App que define todos los dominios y eventos comunicables que cualquier Business puede usar. Es código TypeScript versionado en el repositorio.

**Propiedades obligatorias:**
- Un `domainKey` por grupo de eventos (ej: `billing`, `documents`)
- Un `eventKey` por evento (ej: `invoice_sent`)
- Canal (`email`, `sms`)
- Subject del email (template con variables)
- Content del email (SOLO el body — sin layout corporativo)
- `requiredVariables` y `optionalVariables`

**Lo que el Seed Catalog NO incluye:**
- Credenciales de proveedor → siempre configuración manual
- Enabled providers → siempre configuración manual  
- Eventos Platform (`security.*`) → ya existen en Communications
- Lógica de negocio

---

## 3. Cuándo se provisiona

```
Al crear la empresa:
  → NO se crea nada en Communications
  → El Business existe en Business App DB
  → El Seed Catalog espera

Al configurar el token:
  CommunicationConnectionService.save()
    1. Valida el token contra Communications
    2. Guarda CommunicationConnection en Business App DB
    3. Lee el Seed Catalog
    4. Crea dominios en Communications (idempotente)
    5. Crea eventos en Communications (idempotente)
    6. Crea layout templates en Communications (idempotente)

Resultado:
  El Business queda listo en Communications.
  notifyEvent() funciona inmediatamente para todos los eventos del catálogo.
```

---

## 4. Catálogo de Business Events (target — pendiente implementación)

| Domain | eventKey | Canal | typeBusiness | Sprint |
|---|---|---|---|---|
| `billing` | `invoice_sent` | email | business | Sprint 6 |
| `billing` | `invoice_overdue` | email | business | Sprint 6 |
| `billing` | `payment_received` | email | business | Sprint 6 |
| `documents` | `document_shared` | email | business | Sprint 9 |
| `contracts` | `contract_sent` | email | business | Sprint 7 |

Cada nueva entrada al catálogo requiere:
1. Agregar a `seed-catalog.ts`
2. Actualizar esta tabla
3. Actualizar `communication-architecture.md` §2 (tabla de Business Events)

---

## 5. Sincronización

Cuando se agrega un nuevo evento al Seed Catalog, los Businesses que ya tienen token deben recibirlo:

```
Nueva entrada en seed-catalog.ts
         │
         ▼
Ejecutar sync: POST /communications/sync-catalog (admin)
         │
Para cada Business con CommunicationConnection activa:
  → crear dominios/eventos faltantes (idempotente)
  → skip si ya existe
  → NUNCA sobreescribir personalizaciones del Business
```

---

## 6. Estado de implementación del Seed Catalog

| Componente | Estado |
|---|---|
| `seed-catalog.ts` — archivo | ⏳ Pendiente |
| `SeedProvisioningService` — lógica de push | ⏳ Pendiente |
| Hook en `CommunicationConnectionService.save()` | ⏳ Pendiente |
| Endpoint de sincronización manual | ⏳ Pendiente |

Referencia: ADR-019 para el contexto completo de la decisión.

---

## 7. Responsabilidades

| Responsabilidad | Dueño |
|---|---|
| Definir qué eventos existen | Business App (Seed Catalog) |
| Crear dominios/eventos en Communications | Business App → Communications API (al guardar token) |
| Renderizar y entregar notificaciones | Communications |
| Mantener credenciales de proveedor | Usuario (manual) |
| Templates HTML/contenido final | Communications (editable por usuario) |
| Logs de entrega | Communications |

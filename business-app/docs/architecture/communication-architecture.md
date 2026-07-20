> ⚠️ **DEPRECATED** — Este documento fue reemplazado por la nueva estructura oficial:
> - **`docs/integrations/communications/README.md`** — arquitectura, conexión, token resolution
> - **`docs/integrations/communications/notifications.md`** — catálogo, eventos, notifyEvent, provisioning
> - **`docs/integrations/communications/files.md`** — capacidad Files (definición pendiente)
>
> No actualizar este documento. Todos los cambios van en los documentos nuevos.

# Communication Architecture

**Versión:** 3.0 | **Fecha:** 2026-07-07 | **Estado:** DEPRECATED — ver nota arriba

> Lectura **obligatoria** antes de implementar cualquier método en un Application Service.
> Este documento define el estándar oficial para todos los módulos del ERP.

---

## 0. Tres principios absolutos

Estos principios no pueden ser ignorados ni reinterpretados. Cualquier código que los viole es no conforme.

### P-01 — El frontend siempre muestra feedback inmediato

Toda acción del usuario termina con Toast/Snackbar — éxito o error. Siempre. Sin excepciones.
**Esta responsabilidad pertenece exclusivamente al frontend. Nunca depende de Communications.**

### P-02 — Business App es dueño del proceso. Communications es motor de entrega.

```
Business App decide:        Communications resuelve:      Frontend decide:
────────────────────        ─────────────────────────     ──────────────────
cuándo enviar               domain                        Toast/Snackbar
qué evento ejecutar         event                         feedback inmediato
a quién enviar              template
qué payload enviar          canal
platform o business         provider
                            credenciales
                            renderizado
                            entrega
                            logs y delivery status

Domain Events decide:
────────────────────
integración interna con
Analytics, BI, Audit,
Accounting, etc.
```

Communications **nunca** toma decisiones de negocio. Business App **nunca** implementa lógica de envío.

### P-03 — businessId del JWT, siempre

El `businessId` para eventos Business siempre viene del `AuthContext` / JWT resuelto en el backend. Nunca de parámetros del request del frontend. Sin excepciones.

---

## 1. Las 5 preguntas oficiales (Communication First Decision)

Este árbol de 5 preguntas es el **estándar oficial del proyecto**. Debe aplicarse por cada método público de cada Application Service, en este orden exacto.

---

### Pregunta 1: ¿La operación terminó correctamente?

**Respuesta: siempre sí** (éxito o error, el resultado siempre es visible).

```
↓ Acción en Application Service
↓
Frontend SIEMPRE muestra Toast/Snackbar con el resultado.
  ✅ "Cliente creado."
  ✅ "Factura enviada."
  ❌ "Error al crear el cliente."
  ❌ "No se pudo enviar la factura."
```

Esta respuesta es **siempre afirmativa** — no existe una acción sin feedback para el usuario.

---

### Pregunta 2: ¿Debe informar a otros módulos internos?

Responder: ¿necesita Analytics, BI, Audit, Accounting, o alguna integración interna saber que esto ocurrió?

```
Sí → publicar Domain Event al Outbox DESPUÉS del save
No → continuar con la pregunta 3
```

**Ejemplos que SÍ informan módulos internos:**
- `CustomerCreated` → BI (dim_customer), Analytics (CustomerSummary)
- `InvoiceSent` → BI (fact_invoice), Accounting (asiento)
- `WorkEventConfirmed` → BI (fact_work_event), Revenue pipeline

**Ejemplos que NO informan módulos internos:**
- Cambio de timezone de la empresa → solo UI
- Agregar un contacto a un Customer → solo CRUD local
- Paginar una lista → solo lectura

---

### Pregunta 3: ¿Debe informar por canal externo?

Responder: ¿un usuario externo (cliente, proveedor, invitado) necesita recibir algo por email, SMS, push, o documento?

Solo las acciones **importantes, sensibles, o que requieren evidencia formal** justifican canal externo.

```
No → FIN.
     Solo Toast + Domain Event si aplica.

Sí → continuar con la pregunta 4.
```

**Acciones que NO justifican canal externo:**
- Crear / editar Customer
- Crear / editar Company settings
- Crear Rate
- Actualizar estado interno de un Contract
- Registrar Work Event
- Crear Invoice draft (no enviado)
- Login / Logout / Refresh token
- Cambio de rol de un usuario

**Acciones que SÍ justifican canal externo:**
- Verificar email (registro)
- Recuperar / cambiar contraseña
- Invitar usuario al sistema
- Enviar Invoice al cliente
- Recordatorio de pago
- Compartir documento
- Enviar contrato a cliente para firma

---

### Pregunta 4: ¿Es Platform o Business?

```
PLATFORM
  El evento pertenece al sistema, no a ningún Business de usuario.
  Ejemplos: auth, invitaciones, seguridad.
  Token: empresa base (isPlatformCompany = true).
  businessId: solo para logging — no determina el token.

BUSINESS
  El evento pertenece al Business logueado, que envía algo a sus clientes.
  Ejemplos: Invoice, documentos, contratos.
  Token: CommunicationConnection del Business.
  businessId: obligatorio — del AuthContext/JWT.
```

---

### Pregunta 5: Ejecutar notifyEvent()

```typescript
// PLATFORM
this.notificationClient.notifyEvent({
  type:      'platform',
  companyId: actor.businessId,  // solo para logs
  event:     'security.company_verify_email',
  email:     user.email,
  data:      { firstName, verificationUrl, expiresAt },
});

// BUSINESS
this.notificationClient.notifyEvent({
  type:      'business',         // en código actual: 'company'
  companyId: actor.businessId,  // del JWT — nunca del request body
  event:     'billing.invoice_sent',
  email:     customer.email,
  data:      { invoiceNumber, amount, dueDate, customerName },
});
```

**Regla de la Pregunta 5:**
- Solo se llama `notifyEvent()` — nunca lógica propia de envío, render o credenciales dentro del módulo.
- Si es Business event, el eventKey **debe existir en el Communication Catalog** antes de llamar `notifyEvent()`.

---

## 2. Tabla de decisión por método (obligatoria en cada módulo)

Todo módulo nuevo debe documentar esta tabla en su PR y en su doc de arquitectura:

| Método | Toast | Domain Event | Canal externo | Platform/Business | eventKey en catálogo |
|---|---|---|---|---|---|
| `createCustomer()` | ✅ | `CustomerCreated` → BI/Analytics | ❌ No | N/A | N/A |
| `updateCustomer()` | ✅ | `CustomerUpdated` → BI | ❌ No | N/A | N/A |
| `deactivateCustomer()` | ✅ | `CustomerDeactivated` → BI | ❌ No | N/A | N/A |
| `register()` | ✅ | — | ✅ Sí | Platform | `security.company_verify_email` |
| `forgotPassword()` | ✅ | — | ✅ Sí | Platform | `security.company_forgot_password` |
| `sendInvitation()` | ✅ | — | ✅ Sí | Platform | `security.company_admin_invitation` / `security.company_user_invitation` |
| `sendInvoice()` | ✅ | `InvoiceSent` → BI/Accounting | ✅ Sí | Business | `billing.invoice_sent` |
| `recordPayment()` | ✅ | `PaymentRecorded` → BI/Accounting | ✅ Sí (opcional) | Business | `billing.payment_received` |
| `shareDocument()` | ✅ | `DocumentShared` → Audit | ✅ Sí | Business | `documents.document_shared` |

---

## 3. Communication Catalog — contrato estable

### 3.1 Definición

El **Communication Catalog** (`seed-catalog.ts`) es la fuente de verdad única de todos los Business Events comunicables del ERP.

```
business-app/backend/src/settings/communication-client/seed-catalog.ts
```

**Propiedades del catálogo:**

| Propiedad | Regla |
|---|---|
| **Unicidad** | Un solo catálogo para todo el ERP. Nunca fragmentado, nunca duplicado. |
| **Versionado** | En git. El historial muestra cuándo se agregó cada evento. |
| **Fuente de verdad** | Ningún Business Event puede existir en código si no está aquí primero. |
| **Estabilidad** | Los eventKeys son contrato interno estable (ver §3.2). |
| **Crecimiento** | Solo se extiende — cada módulo agrega sus dominios/eventos aquí, nunca en otro lugar. |
| **Mantenimiento** | El equipo de desarrollo — nunca autogenerado. |

### 3.2 Contrato de estabilidad de eventKeys

Los eventKeys son un contrato interno. Una vez publicado un event, los Businesses activos pueden tenerlo configurado. Cambiarlo rompe su configuración.

**Reglas de estabilidad:**

```
✅ Permitido:
  - agregar un nuevo domain
  - agregar un nuevo event
  - agregar variables opcionales
  - extender el template por defecto de forma compatible

❌ Prohibido:
  - renombrar un eventKey existente
    ✗ billing.invoice_sent → billing.sent_invoice
  - eliminar un eventKey usado por Businesses con token
  - cambiar variables obligatorias de un event existente

📌 Para cambios incompatibles → versión nueva:
  billing.invoice_sent     (v1 — mantener)
  billing.invoice_sent_v2  (v2 — agregar, con payload extendido)
```

**Deprecación:**
```
Si un event debe ser eliminado:
  1. Marcarlo como deprecated = true en el catálogo
  2. Documentar la fecha de eliminación (mínimo 2 sprints de aviso)
  3. Verificar que ningún Business activo lo tenga en uso
  4. Solo entonces eliminarlo del catálogo + sync a Communications
```

### 3.3 Versiones del catálogo

```
v1.0 — Sprint 6
  billing
    invoice_sent       (billing v1)
    payment_received   (billing v1)

v1.1 — Sprint 6 hotfix
  billing
    invoice_sent       (billing v2)
    payment_received   (billing v2)
    invoice_cancelled  (billing v2)   ← NUEVO

v1.2 — Sprint 7
  billing     (billing v2)
  contracts              ← NUEVO DOMAIN
    contract_sent      (contracts v1)

v1.3 — Sprint 9
  billing     (billing v2)
  contracts   (contracts v1)
  documents              ← NUEVO DOMAIN
    document_shared    (documents v1)
```

### 3.4 Estructura del catálogo

```typescript
// seed-catalog.ts

export const COMMUNICATION_CATALOG: CatalogDomain[] = [
  {
    domainKey:   'billing',
    displayName: 'Billing',
    isSystem:    false,
    version:     2,
    events: [
      {
        eventKey:          'invoice_sent',
        displayName:       'Invoice Sent',
        channel:           'email',
        subject:           'Invoice {{data.invoiceNumber}} from {{company.displayName}}',
        content:           '...',  // body solo — sin wrapper corporativo
        requiredVariables: ['invoiceNumber', 'amount', 'dueDate', 'customerName'],
        optionalVariables: ['viewUrl', 'notes'],
      },
    ],
  },
];
```

**Invariante de unicidad:**
> Un solo `COMMUNICATION_CATALOG`. Nunca dos archivos de catálogo. Ningún módulo crea su propio catálogo paralelo.

---

## 4. Ciclo de vida del catálogo en nuevos módulos

```
Nuevo módulo o feature
         │
         ▼
Listar todos los métodos públicos del Application Service
         │
         ▼
Por cada método → aplicar las 5 preguntas (§1)
         │
         ├── NO requiere canal externo
         │     → no tocar el catálogo
         │     → solo Toast + Domain Event si aplica
         │
         └── SÍ requiere canal externo
                   │
                   ▼
             ¿Es Platform o Business?
                   │
           Platform│Business
                   │       │
                   ▼       ▼
       Crear en            ¿Domain existe en
       Communications      COMMUNICATION_CATALOG?
       directamente             │
       (default-events.ts)  No  │  Sí
                            ▼   │  ▼
                        Agregar │ ¿Event existe?
                        Domain  │     │
                                │  No │  Sí
                                │   ▼  ▼
                                │  Agregar Event
                                │  + template
                                │
                                ▼
                     Actualizar documentación:
                     - §2 tabla de este doc
                     - provisioning-default-templates.md §4
                     - doc del evento si corresponde
                                │
                                ▼
                     Bump version del domain
                                │
                                ▼
                     Implementar notifyEvent()
                                │
                                ▼
                     Communication Checklist (§9)
```

---

## 5. Flujo Platform — detalle técnico

Los assets de Platform (domains, events, templates) **existen en Communications desde el deploy inicial**. No requieren provisioning al crear un Business.

```
AuthService / UserInvitationsService
         │  type: 'platform'
         ▼
notifyEvent({ type:'platform', event:'security.*', email, data })
         │
         ▼
getCommunicationConnectionForContext('platform')
  → busca Company donde isPlatformCompany = true
  → obtiene CommunicationConnection activa → descifra token
  → si no existe → log CRITICAL, retorna null
         │
         ▼
POST /notifications/event
  header: x-api-key: <token empresa base>
  body: { companyId: <remoteId>, event, email, payload }
         │
         ▼
─────── COMMUNICATIONS ──────────────────────────────────
GlobalAuthGuard: companyId desde token (nunca del body)
NotificationService:
  1. EventCatalogue[companyId, eventKey]
  2. DomainCatalogue[companyId, domainKey]
  3. ProviderCredentials[companyId, channel]
  4. Layout + Theme → render → deliver → log
─────────────────────────────────────────────────────────
```

**Agregar nuevo Platform Event:**
1. Crear en `communications-app/.../default-events.constant.ts`
2. Ejecutar seed/migration en Communications (empresa base)
3. Documentar en `docs/communications/auth-communication-events.md`
4. Implementar `notifyEvent({ type: 'platform', ... })` en el Service
5. Actualizar §1 tabla de este documento

---

## 6. Flujo Business — detalle técnico

### Al crear la empresa
```
POST /auth/register
         │
         ▼
Business + Owner User (atómico — solo Business App DB)
         │
         ▼
ProvisioningService (async)
  ✅ P-03: FiscalProfile defaults
  ⏳ Otros pasos pendientes
  ⏳ Communications: NO ocurre aquí — no hay token

Business existe. Communications NO sabe de este Business.
COMMUNICATION_CATALOG espera.
```

### Al configurar el token
```
CommunicationConnectionService.save(userId, 'communications', token)
  1. GET /company-integrations/me → valida, obtiene remoteCompanyId
  2. Guarda CommunicationConnection cifrada en Business App DB
  3. [TODO ADR-019] lee COMMUNICATION_CATALOG
     → por cada domain → crear en Communications (idempotente)
     → por cada event  → crear en Communications (idempotente)
     → skip si ya existe, nunca sobreescribir personalizaciones

Business completamente configurado. notifyEvent() funciona inmediatamente.
```

### En operación
```
BillingService.sendInvoice(invoiceId, actor)
         │
         ▼
notifyEvent({
  type:      'business',          // código actual: 'company'
  companyId: actor.businessId,   // JWT — nunca del body
  event:     'billing.invoice_sent',
  email:     customer.email,
  data:      { invoiceNumber, amount, dueDate, customerName },
})
         │
         ▼
getCommunicationConnectionForContext('company', businessId)
  → busca CommunicationConnection activa del Business
  → si no existe → log WARNING, retorna false (flujo de negocio NO falla)
         │
         ▼
POST /notifications/event con token del Business
Communications resuelve (mismo pipeline que Platform)
```

---

## 7. Sincronización incremental

```
Actualización del catálogo: nuevo event billing.invoice_cancelled

Para cada Business CON CommunicationConnection activa:
  → crear billing.invoice_cancelled en Communications (si no existe)
  → skip si ya existe
  → NUNCA modificar events personalizados por el Business

Para Businesses SIN token:
  → quedan pendientes
  → cuando configuren token: reciben catálogo completo (versión actual)
  → nunca reciben catálogo parcial

Trigger:
  - automático: al guardar CommunicationConnection
  - manual: POST /communications/admin/sync-catalog
```

**Regla de idempotencia estricta:** crear si no existe. Nunca modificar si existe.

---

## 8. Resolución de token

Única función autorizada:

```typescript
CommunicationConnectionService.getCommunicationConnectionForContext(
  type: 'platform' | 'company',
  businessId?: string,
): Promise<CompanyConnection | null>
```

```
Ningún módulo resuelve tokens directamente.
businessId siempre del JWT, nunca del request body.
Communications nunca recibe el 'type' — solo el token ya resuelto.
```

---

## 9. Communication Checklist (DoD — por cada método)

```
COMMUNICATION CHECKLIST — por método público del Application Service

  [ ] Apliqué las 5 preguntas oficiales
  [ ] El resultado está en la tabla §2 del doc del módulo o en el PR

  Pregunta 1 (Toast):
  [ ] Frontend muestra Toast/Snackbar en éxito y en error

  Pregunta 2 (Domain Event):
  [ ] Si informo a módulos internos: Domain Event publicado al Outbox DESPUÉS del save
  [ ] Si no informo: justificado ("solo CRUD local", "solo lectura", etc.)

  Pregunta 3 (canal externo):
  [ ] Si NO requiere: justificado en comentario o tabla
  [ ] Si SÍ requiere: continúa →

  Pregunta 4 (tipo):
  [ ] Tipo determinado: 'platform' o 'business'
  [ ] businessId del AuthContext/JWT — NUNCA del request body
  [ ] eventKey en formato: domainKey.eventKey

  Pregunta 5 (notifyEvent):
  [ ] Solo llamo notificationClient.notifyEvent()
  [ ] No resuelvo tokens manualmente
  [ ] No renderizo HTML en el Service
  [ ] No gestiono credenciales en el Service

  Si type = 'business':
  [ ] eventKey existe en COMMUNICATION_CATALOG antes de este commit
  [ ] Si es nuevo: domain/event agregado al catálogo, domain version bumped
  [ ] §2 tabla de este documento actualizada
  [ ] provisioning-default-templates.md §4 actualizada

  Si type = 'platform':
  [ ] eventKey existe en Communications default-events.constant.ts
  [ ] Si es nuevo: creado en Communications + auth-communication-events.md actualizado
  [ ] §1 tabla de Platform Events de este documento actualizada
```

---

## 10. Catálogo actual — estado de implementación

### Platform Events (implementados)

| eventKey | Servicio | Estado |
|---|---|---|
| `security.company_verify_email` | `AuthService.register()` | ✅ |
| `security.company_forgot_password` | `AuthService.forgotPassword()` | ✅ |
| `security.company_password_changed` | `AuthService.resetPassword()` | ✅ |
| `security.company_admin_invitation` | `UserInvitationsService.sendInvitation()` | ✅ |
| `security.company_user_invitation` | `UserInvitationsService.sendInvitation()` | ✅ |
| `security.company_invitation_resent` | `UserInvitationsService.resendInvitation()` | ✅ |
| `security.company_welcome_message` | `UserInvitationsService.handlePasswordCompleted()` | ✅ |

### Business Events (Communication Catalog — target)

| Domain | eventKey | Sprint | Estado |
|---|---|---|---|
| `billing` | `invoice_sent` | Sprint 6 | ⏳ Catálogo pendiente |
| `billing` | `invoice_overdue` | Sprint 6 | ⏳ Catálogo pendiente |
| `billing` | `payment_received` | Sprint 6 | ⏳ Catálogo pendiente |
| `contracts` | `contract_sent` | Sprint 7 | ⏳ Catálogo pendiente |
| `documents` | `document_shared` | Sprint 9 | ⏳ Catálogo pendiente |

---

## 11. Referencias

| Documento | Contenido |
|---|---|
| `docs/decisions/ADR-019-seed-catalog.md` | Decisión arquitectónica del Communication Catalog |
| `docs/architecture/module-development-standard.md` | Guía oficial para nuevos módulos |
| `docs/communications/auth-communication-events.md` | Platform Events detallados |
| `docs/communications/communication-token-resolution.md` | Detalle técnico del resolver |
| `docs/communications/domain-events-vs-communication-events.md` | Regla de decisión y ejemplos |
| `docs/communications/provisioning-default-templates.md` | Seed provisioning y tabla target |
| `docs/business-model/08-business-provisioning.md` | Lifecycle del Business (P-05 a P-10) |
| `docs/engineering/12-definition-of-done.md` | DoD completo |
| `communications-app/docs/Decisions/DEC-017` | Composition model y rendering flow |
| `communications-app/docs/Decisions/DEC-019` | Single notifyEvent() pipeline |
| `communications-app/docs/Decisions/ADR-007` | Trust boundary y reglas de seguridad |

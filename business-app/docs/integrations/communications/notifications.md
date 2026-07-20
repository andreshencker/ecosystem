# Communications — Notifications

**Versión:** 3.0 | **Fecha:** 2026-07-07 | **Estado:** Canónico — especificación técnica de implementación

> **Esta es la única fuente de verdad para Communications Notifications.**
> Todos los documentos anteriores relacionados con Communication Events, Platform Events, Business Events, Event Catalog, Seed Catalog, notifyEvent y Provisioning quedan reemplazados por este documento.
> Ver lista completa en §15.

---

## Terminología oficial

Este documento usa la terminología oficial del proyecto. Las reglas siguientes son obligatorias para todo código nuevo y documentación futura.

| Término oficial | Significado | Término legacy (no usar) |
|---|---|---|
| `businessId` | Identificador del Business en Business App | `companyId` (para el tenant local) |
| `type: 'business'` | Evento del tenant Business | `type: 'company'` |
| `businessName` | Nombre del Business | `companyName` (en datos del tenant) |
| `business owner` | Owner del tenant | `company owner` |
| `business user` | Usuario del tenant | `company user` |
| `business admin` | Admin del tenant | `company admin` |
| `remoteCompanyId` | ID del Business **en Communications App** | N/A — este nombre se mantiene |

### Regla de la frontera de traducción

```
Business App usa:              Communications App sigue usando:
  businessId                     companyId (su propio campo interno)

La integración traduce:
  businessId ──► IntegrationConnection.remoteCompanyId ──► body.companyId (hacia Communications)
```

**Communications App puede continuar usando `companyId` en sus propios modelos, endpoints y schemas.** Business App nunca expone `companyId` para referirse a su tenant local. El único lugar donde `companyId` aparece en Business App es en el body que se envía hacia Communications — y en ese contexto siempre se aclara que es el `remoteCompanyId` resuelto.

---

## Sección 1 — ¿Qué es Communications Notifications?

### Objetivo

Communications Notifications es el subsistema que permite a Business App enviar comunicaciones externas — emails, SMS, y en el futuro push notifications — a usuarios y clientes, sin que ningún módulo de dominio sepa cómo se entrega ni a través de qué proveedor.

### Responsabilidades de Business App

- Decidir **cuándo** enviar (qué acción de negocio lo dispara)
- Decidir **qué evento** ejecutar (el `eventKey` del catálogo)
- Decidir **a quién** enviar (el email o teléfono del destinatario)
- Decidir **qué payload** enviar (las variables `data.*` del template)
- Decidir si el evento es **Platform** o **Business** (el `type`)

### Responsabilidades de Communications App

- Resolver el domain y el event del catálogo
- Seleccionar el template y el layout
- Aplicar el theme del Business
- Resolver el proveedor de entrega y sus credenciales
- Renderizar el mensaje final
- Entregar por el canal configurado
- Registrar el resultado (ExecutionLog)

### Qué NO hace Business App

- No renderiza HTML
- No resuelve proveedores ni credenciales
- No gestiona templates
- No implementa lógica SMTP/SendGrid/Twilio
- No decide si un canal está activo
- No reintenta entregas fallidas (eso es responsabilidad de Communications)

### Relación entre los dos servicios

```
Business App                              Communications App
────────────────                          ──────────────────────────────────
decide cuándo enviar          ──POST──►   recibe la request autenticada
elige el eventKey                         resuelve el domain y el event
provee el payload data                    selecciona layout + theme
resuelve el token correcto                resuelve provider y credenciales
hace el HTTP call                         renderiza email/SMS
registra si fue entregado   ◄──resp──     entrega y escribe ExecutionLog
```

---

## Sección 2 — Arquitectura completa

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BUSINESS APP                                    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Application Services (AuthService, UserInvitationsService, etc.)    │   │
│  │                                                                      │   │
│  │  Decide: qué pasó, qué evento, a quién, qué payload, type            │   │
│  │  Regla: no saben nada de templates, providers, ni credenciales       │   │
│  └───────────────────────────────┬──────────────────────────────────────┘   │
│                                  │ this.commClient.notifyEvent(params)       │
│                                  ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  src/integrations/communications/                                    │   │
│  │  (actualmente en src/settings/communication-client/)                 │   │
│  │                                                                      │   │
│  │  CommunicationClientService.notifyEvent()                            │   │
│  │    1. getCommunicationConnectionForContext(type, businessId)         │   │
│  │    2. Descifra token AES-256-GCM                                     │   │
│  │    3. POST /notifications/event con x-api-key: <token>               │   │
│  └───────────────────────────────┬──────────────────────────────────────┘   │
│                                  │                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  src/integrations/communications/connection/                         │   │
│  │  (actualmente en src/settings/communication-connection/)             │   │
│  │                                                                      │   │
│  │  IntegrationConnection (MongoDB, colección: integration_connections) │   │
│  │    - businessId     ← ID del Business en Business App                │   │
│  │    - encryptedToken (AES-256-GCM)                                    │   │
│  │    - remoteCompanyId ← ID del Business en Communications App         │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ POST /notifications/event
                                       │ Header: x-api-key: <token>
                                       │ Body: { companyId: remoteCompanyId, event, email, payload: { data } }
                                       │        ↑ Communications usa "companyId" — es su propio campo
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           COMMUNICATIONS APP                                 │
│                  (usa "companyId" internamente — es su propio vocabulario)   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  GlobalAuthGuard                                                     │   │
│  │                                                                      │   │
│  │  COMMUNICATION_API_KEY   → resolvePlatformCompany()                  │   │
│  │                              authContext.companyId = platform company│   │
│  │                                                                      │   │
│  │  integration token       → resolveCompanyByToken()                   │   │
│  │                              authContext.companyId = token owner     │   │
│  └───────────────────────────────┬──────────────────────────────────────┘   │
│                                  │                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  NotificationController                                              │   │
│  │                                                                      │   │
│  │  effectiveCompanyId = authContext.companyId  ← NUNCA del body        │   │
│  │  effectiveDto = { ...dto, companyId: effectiveCompanyId }            │   │
│  └───────────────────────────────┬──────────────────────────────────────┘   │
│                                  │                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  NotificationService.notifyEvent(dto)                                │   │
│  │                                                                      │   │
│  │  1. Resolver event por canonicalKey (domainKey.eventKey)             │   │
│  │  2. Leer channelContent del event (email / sms / push)               │   │
│  │  3. Para cada canal enabled → resolver ProviderCredentials           │   │
│  │  4. Rendering: Layout + Theme + EventContent                         │   │
│  │  5. Delivery via provider adapter                                    │   │
│  │  6. Escribir ExecutionLog                                            │   │
│  └───────────────────────────────┬──────────────────────────────────────┘   │
│                                  │                                           │
│           ┌──────────────────────┼──────────────────────┐                   │
│           ▼                      ▼                      ▼                   │
│  ┌──────────────┐      ┌──────────────────┐    ┌──────────────────┐         │
│  │ Email adapter│      │  SMS adapter     │    │  ExecutionLog    │         │
│  │ (SMTP,       │      │  (Twilio, etc.)  │    │  (MongoDB)       │         │
│  │  SendGrid,   │      │                  │    │                  │         │
│  │  Mailgun)    │      │                  │    │                  │         │
│  └──────────────┘      └──────────────────┘    └──────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Sección 3 — Communication Catalog

### Qué es

El **Communication Catalog** es el único archivo TypeScript que define todos los eventos comunicables del ERP — tanto los eventos de la plataforma (Platform Events) como los eventos de negocio de los tenants (Business Events). Es código versionado en el repositorio, nunca generado automáticamente.

### Por qué existe un único catálogo

Sin un catálogo centralizado:
- Un desarrollador que agrega un nuevo evento de facturación no sabe dónde buscarlo
- Un evento puede existir en producción sin estar documentado en el código
- Los cambios de variables o templates se hacen en múltiples lugares
- Es imposible auditar qué eventos existen y en qué estado están

El catálogo resuelve esto siendo el **único lugar** donde se define qué eventos existen, qué variables requieren y cuál es su template por defecto.

### Dónde vive

```
src/integrations/communications/catalog/communication-catalog.ts
```

**Estado actual:** Este archivo no existe todavía. Los Platform Events están definidos en Communications App (ver §5). La creación de este archivo unificado es el primer paso de la implementación pendiente.

### Invariante de unicidad

> **Regla absoluta:** Existe exactamente un `COMMUNICATION_CATALOG` en Business App. Ningún módulo crea su propio catálogo, constante separada, ni archivo paralelo. Todo nuevo evento — Platform o Business — se agrega aquí y solo aquí.

---

## Sección 4 — Estructura exacta del catálogo

### Tipos TypeScript

```typescript
// src/integrations/communications/catalog/communication-catalog.types.ts

export type CatalogChannel = 'email' | 'sms' | 'push';

export interface CatalogEventEmail {
  enabled:           boolean;
  subject:           string;               // Mustache template
  content:           string;               // HTML body solo — sin wrapper corporativo
  requiredVariables: string[];             // e.g. ['data.firstName', 'data.email']
  optionalVariables: string[];
}

export interface CatalogEventSms {
  enabled:           boolean;
  text:              string;               // plain text, solo variables {{data.*}}
  requiredVariables: string[];
  optionalVariables: string[];
}

export interface CatalogEventPush {
  enabled:           boolean;
  title:             string;
  body:              string;
  requiredVariables: string[];
  optionalVariables: string[];
}

export interface CatalogEventChannels {
  email?: CatalogEventEmail;
  sms?:   CatalogEventSms;
  push?:  CatalogEventPush;
}

export interface CatalogEvent {
  eventKey:          string;               // bare key: 'company_verify_email' (sin dominio)
  displayName:       string;
  description:       string;
  eventType:         'notification' | 'alert' | 'security';
  channels:          CatalogEventChannels;
}

export interface CatalogDomain {
  domainKey:    string;                    // 'security', 'billing', etc.
  displayName:  string;
  isSystem:     boolean;                   // true = no puede eliminarse
  version:      number;                    // bump cuando cambia el dominio
  events:       CatalogEvent[];
}

export interface UnifiedCatalog {
  platform: CatalogDomain[];              // eventos del sistema
  business: CatalogDomain[];              // eventos de los tenants
}
```

### Estructura del catálogo

```typescript
// src/integrations/communications/catalog/communication-catalog.ts

import { UnifiedCatalog } from './communication-catalog.types';

export const COMMUNICATION_CATALOG: UnifiedCatalog = {

  // ─────────────────────────────────────────────────────────────────────────
  //  PLATFORM — eventos del sistema, entregados siempre via empresa base
  //  Provisioning: al arrancar Business App (startup)
  //  Token: COMMUNICATION_API_KEY → empresa base (isPlatformCompany: true)
  // ─────────────────────────────────────────────────────────────────────────

  platform: [
    {
      domainKey:   'security',
      displayName: 'Security',
      isSystem:    true,
      version:     1,
      events: [
        {
          eventKey:     'company_verify_email',
          displayName:  'Email Verification',
          description:  'Deliver the email verification link to a business user who self-registered.',
          eventType:    'security',
          channels: {
            email: {
              enabled:           true,
              subject:           'Verify your email address',
              content:           '...',    // ver default-events.constant.ts en Communications
              requiredVariables: ['data.firstName', 'data.email', 'data.verificationUrl', 'data.expiresAt'],
              optionalVariables: ['data.loginUrl'],
            },
            // sms: undefined   (no implementado — preparado para el futuro)
            // push: undefined  (no implementado — preparado para el futuro)
          },
        },
        {
          eventKey:     'company_forgot_password',
          displayName:  'Business Forgot Password',
          description:  'Deliver a password reset link to a business user.',
          eventType:    'security',
          channels: {
            email: {
              enabled:           true,
              subject:           'Reset your password',
              content:           '...',
              requiredVariables: ['data.firstName', 'data.email', 'data.businessName', 'data.resetUrl', 'data.expiresAt'],
              optionalVariables: [],
            },
          },
        },
        {
          eventKey:     'company_password_changed',
          displayName:  'Business Password Changed',
          description:  'Notify a business user that their password was changed.',
          eventType:    'security',
          channels: {
            email: {
              enabled:           true,
              subject:           'Your password was changed',
              content:           '...',
              requiredVariables: ['data.firstName', 'data.email', 'data.businessName', 'data.when'],
              optionalVariables: ['data.ipAddress'],
            },
          },
        },
        {
          eventKey:     'company_admin_invitation',
          displayName:  'Business Admin Invitation',
          description:  'Deliver onboarding credentials to a newly provisioned business admin.',
          eventType:    'notification',
          channels: {
            email: {
              enabled:           true,
              subject:           'You have been invited to manage {{data.businessName}}',
              content:           '...',
              requiredVariables: ['data.firstName', 'data.email', 'data.businessName', 'data.tempPassword', 'data.loginUrl', 'data.role'],
              optionalVariables: [],
            },
          },
        },
        {
          eventKey:     'company_user_invitation',
          displayName:  'Business User Invitation',
          description:  'Deliver onboarding credentials to a business user invited by a business_owner or business_admin.',
          eventType:    'notification',
          channels: {
            email: {
              enabled:           true,
              subject:           'You have been invited to join {{data.businessName}}',
              content:           '...',
              requiredVariables: ['data.firstName', 'data.businessName', 'data.role', 'data.email', 'data.tempPassword', 'data.loginUrl'],
              optionalVariables: ['data.expiresAt'],
            },
          },
        },
        {
          eventKey:     'company_invitation_resent',
          displayName:  'Business Invitation Resent',
          description:  'Re-deliver invitation credentials when an admin resends a pending invitation.',
          eventType:    'notification',
          channels: {
            email: {
              enabled:           true,
              subject:           'Your invitation to {{data.businessName}} has been resent',
              content:           '...',
              requiredVariables: ['data.firstName', 'data.email', 'data.businessName', 'data.tempPassword', 'data.loginUrl', 'data.role'],
              optionalVariables: [],
            },
          },
        },
        {
          eventKey:     'company_welcome_message',
          displayName:  'Business Welcome Message',
          description:  'Welcome an invited business user after they complete their first login.',
          eventType:    'notification',
          channels: {
            email: {
              enabled:           true,
              subject:           'Welcome to {{data.businessName}}',
              content:           '...',
              requiredVariables: ['data.firstName', 'data.email', 'data.businessName', 'data.loginUrl', 'data.role'],
              optionalVariables: [],
            },
          },
        },
        {
          eventKey:     'platform_admin_invitation',
          displayName:  'Platform Admin Invitation',
          description:  'Deliver onboarding credentials to a newly invited platform administrator.',
          eventType:    'security',
          channels: {
            email: {
              enabled:           true,
              subject:           'You have been invited to join the platform team',
              content:           '...',
              requiredVariables: ['data.firstName', 'data.email', 'data.tempPassword', 'data.loginUrl', 'data.role'],
              optionalVariables: [],
            },
          },
        },
        {
          eventKey:     'platform_forgot_password',
          displayName:  'Platform Admin Forgot Password',
          description:  'Deliver a password reset link to a platform admin user.',
          eventType:    'security',
          channels: {
            email: {
              enabled:           true,
              subject:           'Reset your platform password',
              content:           '...',
              requiredVariables: ['data.firstName', 'data.email', 'data.resetUrl', 'data.expiresAt'],
              optionalVariables: [],
            },
          },
        },
        {
          eventKey:     'platform_password_changed',
          displayName:  'Platform Admin Password Changed',
          description:  'Notify a platform admin that their password was changed.',
          eventType:    'security',
          channels: {
            email: {
              enabled:           true,
              subject:           'Your platform password was changed',
              content:           '...',
              requiredVariables: ['data.firstName', 'data.email', 'data.when'],
              optionalVariables: [],
            },
          },
        },
      ],
    },

    {
      domainKey:   'notifications',
      displayName: 'System Notifications',
      isSystem:    true,
      version:     1,
      events: [
        { eventKey: 'integration_token_created',        /* ... */ } as any,
        { eventKey: 'integration_token_rotated',        /* ... */ } as any,
        { eventKey: 'integration_token_revoked',        /* ... */ } as any,
        { eventKey: 'integration_token_expired',        /* ... */ } as any,
        { eventKey: 'provider_credential_created',      /* ... */ } as any,
        { eventKey: 'provider_credential_updated',      /* ... */ } as any,
        { eventKey: 'provider_credential_activated',    /* ... */ } as any,
        { eventKey: 'provider_credential_deactivated',  /* ... */ } as any,
        { eventKey: 'provider_credential_deleted',      /* ... */ } as any,
        { eventKey: 'provider_credential_verified',     /* ... */ } as any,
        // Ver default-notifications-events.constant.ts para templates completos
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────────────────
  //  BUSINESS — eventos de los tenants, entregados via token del Business
  //  Provisioning: al guardar el integration token del Business
  //  Token: integration token del Business → su empresa en Communications
  // ─────────────────────────────────────────────────────────────────────────

  business: [
    // billing domain — pendiente implementación
    // {
    //   domainKey:   'billing',
    //   displayName: 'Billing',
    //   isSystem:    false,
    //   version:     1,
    //   events: [
    //     { eventKey: 'invoice_sent', ... },
    //     { eventKey: 'invoice_overdue', ... },
    //     { eventKey: 'payment_received', ... },
    //   ],
    // },
    // documents domain — pendiente implementación
    // contracts domain — pendiente implementación
  ],

};
```

### Nota sobre eventKeys del dominio `security`

Los eventKeys del dominio `security` (como `company_verify_email`, `company_user_invitation`) son **identificadores estables** — son el nombre del evento en Communications y no pueden cambiarse una vez publicados. El prefijo `company_` es parte del identificador histórico y **no cambia** aunque el vocabulario del proyecto use `business`. Solo los campos `data.*` del payload y los textos descriptivos usan la nueva terminología.

### Canales implementados vs planificados

| Canal | Estado | Notas |
|---|---|---|
| `email` | ✅ Implementado | SMTP, SendGrid, Mailgun, AWS SES, OAuth Gmail/Outlook |
| `sms` | ✅ Implementado en Communications | SMS adapter existe. No hay ningún evento con SMS activo aún. |
| `push` | ❌ No implementado | Reservado para futuras versiones. El campo `push` en `CatalogEvent` lo define. |

**Por qué SMS y Push están preparados pero sin eventos activos:**
- La infraestructura de entrega existe en Communications App (SMS adapter implementado)
- El schema del catálogo incluye `sms` y `push` en `CatalogEventChannels`
- Ningún evento del negocio ha justificado SMS o push notification hasta este sprint
- Cuando se defina el primer evento SMS, el catálogo y el provisioning ya están preparados

---

## Sección 5 — Platform Events

### Qué son

Los Platform Events son comunicaciones que la plataforma (Business App / ERP) envía como parte de su propio funcionamiento — no de ningún Business de usuario. Incluyen toda la autenticación, las invitaciones de usuarios, y el lifecycle de la plataforma.

**Criterio definitivo:** Un evento es Platform si Business App lo dispararía aunque el Business receptor no tuviera su propia `CommunicationConnection` configurada. La plataforma no puede depender del tenant para enviar un email de verificación.

### Qué token utilizan

Los Platform Events siempre usan la `CommunicationConnection` de la **empresa base** de Business App (`isPlatformCompany: true`). Esa empresa tiene su propio integration token en Communications. Todos los emails de Platform salen desde las credenciales configuradas en esa empresa.

El token se obtiene con:
```typescript
getCommunicationConnectionForContext('platform')
// → busca { isPlatformCompany: true } en Business App
// → obtiene su CommunicationConnection activa
// → descifra el token
```

Si la empresa base no tiene `CommunicationConnection` → log CRITICAL → notificación skipped. **Esto bloquea toda la auth de la plataforma.** Antes de ir a producción, la empresa base debe tener conexión activa.

### Qué endpoint utilizan

```
POST /notifications/event       (Communications App)
Header: x-api-key: <COMMUNICATION_API_KEY>
```

`COMMUNICATION_API_KEY` es la API key de administración de Communications. Cuando Communications recibe esta key, su `GlobalAuthGuard` la reconoce y resuelve la empresa base como `authContext.companyId` (terminología interna de Communications).

### Cómo se crean en Communications (estado actual y arquitectura objetivo)

**Estado actual:** Los Platform Events están definidos directamente en Communications App como constantes TypeScript:
- `communications-app/backend/src/communication/company/provisioning/constants/default-events.constant.ts` → dominio `security` (10 eventos)
- `communications-app/backend/src/communication/company/provisioning/constants/default-notifications-events.constant.ts` → dominio `notifications` (10 eventos)

Estos eventos se provisionan en Communications para la empresa base (`isPlatformCompany: true`) mediante el `CompanyProvisioningService` de Communications.

**Arquitectura objetivo:** Los Platform Events se definen en `COMMUNICATION_CATALOG.platform` en Business App y se provisionan desde Business App al arrancar, usando `COMMUNICATION_API_KEY`.

### Cuándo se sincronizan

Los Platform Events son estáticos para la empresa base. Se crean una vez y no cambian en operación normal. Si se agrega un nuevo Platform Event al catálogo, se pushea en el siguiente deploy/restart de Business App.

### Catálogo completo de Platform Events implementados

#### Dominio `security` (10 eventos)

> **Nota:** Los eventKeys (`company_verify_email`, `company_forgot_password`, etc.) son identificadores históricos en Communications App — no se renombran. Los campos `data.*` del payload sí usan la nueva terminología (`data.businessName`).

| Canonical Key | Disparado por | Variables obligatorias |
|---|---|---|
| `security.company_verify_email` | `AuthService.register()` | firstName, email, verificationUrl, expiresAt |
| `security.company_forgot_password` | `AuthService.forgotPassword()`, `UsersController.sendPasswordReset()` | firstName, email, businessName, resetUrl, expiresAt |
| `security.company_password_changed` | `AuthService.resetPassword()`, `UsersController.changePassword()` | firstName, email, businessName, when |
| `security.company_admin_invitation` | `UserInvitationsService.sendInvitation()` (business_admin) | firstName, email, businessName, tempPassword, loginUrl, role |
| `security.company_user_invitation` | `UserInvitationsService.sendInvitation()` (otros roles) | firstName, businessName, role, email, tempPassword, loginUrl |
| `security.company_invitation_resent` | `UserInvitationsService.resendInvitation()` | firstName, email, businessName, tempPassword, loginUrl, role |
| `security.company_welcome_message` | `UserInvitationsService.handlePasswordCompleted()` | firstName, email, businessName, loginUrl, role |
| `security.platform_admin_invitation` | (pendiente de implementar en Business App) | firstName, email, tempPassword, loginUrl, role |
| `security.platform_forgot_password` | (pendiente de implementar en Business App) | firstName, email, resetUrl, expiresAt |
| `security.platform_password_changed` | (pendiente de implementar en Business App) | firstName, email, when |

#### Dominio `notifications` (10 eventos)

| Canonical Key | Propósito |
|---|---|
| `notifications.integration_token_created` | Notificar al business owner que se creó un integration token |
| `notifications.integration_token_rotated` | Notificar que un token fue rotado (el anterior queda inválido) |
| `notifications.integration_token_revoked` | Notificar que un token fue revocado permanentemente |
| `notifications.integration_token_expired` | Notificar que un token expiró |
| `notifications.provider_credential_created` | Notificar que se agregó una credencial de proveedor |
| `notifications.provider_credential_updated` | Notificar modificación de credencial |
| `notifications.provider_credential_activated` | Notificar reactivación de credencial |
| `notifications.provider_credential_deactivated` | Notificar desactivación de credencial |
| `notifications.provider_credential_deleted` | Notificar eliminación permanente de credencial |
| `notifications.provider_credential_verified` | Notificar verificación exitosa de credencial |

---

## Sección 6 — Business Events

### Qué son

Los Business Events son comunicaciones que un Business (tenant) de la plataforma envía a sus propios clientes — facturas, pagos, documentos, contratos. Salen desde las credenciales del propio Business, no desde la plataforma.

**Criterio definitivo:** Un evento es Business si pertenece al workflow operativo del tenant — el cliente recibe algo en nombre del Business, no en nombre de la plataforma.

### Cómo se obtiene el businessId

El `businessId` para eventos Business **siempre viene del `AuthContext`** resuelto por el JWT en el backend. Nunca de parámetros del frontend. Nunca del request body.

```typescript
// ✅ CORRECTO
this.commClient.notifyEvent({
  type:       'business',
  businessId: actor.businessId,   // del AuthContext/JWT
  event:      'billing.invoice_sent',
  email:      customer.email,
  data:       { ... },
});

// ❌ PROHIBIDO — nunca del request body
this.commClient.notifyEvent({
  businessId: dto.businessId,     // ← VIOLACIÓN — viene del frontend
  ...
});
```

### Qué token utiliza

Los Business Events usan la `CommunicationConnection` del propio Business. Se obtiene con:

```typescript
getCommunicationConnectionForContext('business', actor.businessId)
// → busca CommunicationConnection activa para ese businessId en Business App
// → descifra el integration token
// → si no existe → log WARNING, retorna null (el flujo de negocio NO falla)
```

La ausencia de token es un estado esperado y correcto: un Business que nunca configuró Communications simplemente no envía notificaciones propias. El flujo de negocio continúa sin error.

### Cuándo se crean los dominios y eventos en Communications

Los Business Events se crean en Communications **únicamente cuando el Business guarda su integration token**. Nunca al crear el Business (no hay token en ese momento).

El proceso (pendiente de implementación):
```
CommunicationConnectionService.save(userId, 'communications', token)
  1. verifyTokenWithRemote('communications', token)
     → GET /company-integrations/me
     → Header: x-integration-token: <token>
     → Response: { companyId, companyKey, companyName }   ← terminología de Communications App
  2. Guardar IntegrationConnection en MongoDB (cifrado)
     businessId = <ID del Business en Business App>
     remoteCompanyId = <companyId devuelto por Communications>
  3. SeedProvisioningService.provisionBusinessEvents(businessId)  ← TODO
     → Lee COMMUNICATION_CATALOG.business
     → Para cada domain → POST /domain-catalogues (si no existe)
     → Para cada event  → POST /event-catalogues (si no existe)
     → Idempotente: skip si ya existe
```

### Cómo se sincronizan Businesses existentes cuando hay un evento nuevo

Cuando se agrega un nuevo evento a `COMMUNICATION_CATALOG.business`:

```
Para cada Business CON CommunicationConnection activa (isActive: true):
  → SeedProvisioningService.syncBusiness(businessId)
  → Crea domain/event si no existe (idempotente)
  → Skip si ya existe (nunca sobreescribe personalizaciones del Business)

Para Businesses SIN token:
  → No se hace nada
  → Al configurar su token en el futuro, recibirán el catálogo completo (versión actual)
  → Nunca reciben un catálogo parcial

Trigger del sync:
  - Automático: al guardar CommunicationConnection (cada token-save)
  - Manual: POST /communications/admin/sync-catalog (admin endpoint — pendiente)
```

### Catálogo target de Business Events

| Domain | eventKey | Estado |
|---|---|---|
| `billing` | `invoice_sent` | Pendiente |
| `billing` | `invoice_overdue` | Pendiente |
| `billing` | `payment_received` | Pendiente |
| `contracts` | `contract_sent` | Pendiente |
| `documents` | `document_shared` | Pendiente |

---

## Sección 7 — Provisioning

### Visión completa del ciclo de vida

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  STARTUP de Business App                                                     │
│                                                                              │
│  SeedProvisioningService.provisionPlatformEvents()            [PENDIENTE]   │
│    → Lee COMMUNICATION_CATALOG.platform                                     │
│    → Para cada domain → crear en Communications (si no existe)               │
│    → Para cada event  → crear en Communications (si no existe)               │
│    → Token: COMMUNICATION_API_KEY (empresa base de Communications)           │
│    → Endpoint: POST /domain-catalogues, POST /event-catalogues              │
│    → Idempotente: seguro de ejecutar en cada restart                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                  │
                         Business App operativo
                                  │
┌─────────────────────────────────────────────────────────────────────────────┐
│  CREACIÓN DE UN BUSINESS (POST /auth/register o POST /businesses/with-owner)│
│                                                                              │
│  Fase 1 (atómica): Business + Owner User en Business App DB                 │
│  Fase 2 (async): ProvisioningService.provisionBusiness(businessId)          │
│    → P-03 FiscalProfile defaults (implementado)                             │
│    → Communications: NO ocurre nada — no hay token todavía                 │
│                                                                              │
│  Business existe en Business App. Communications no sabe que existe.        │
└─────────────────────────────────────────────────────────────────────────────┘
                                  │
                    El business owner va a Settings → Communications
                                  │
┌─────────────────────────────────────────────────────────────────────────────┐
│  GUARDAR TOKEN  (PUT /settings/communications)                               │
│  [Ruta actual legacy — target: bajo src/integrations/communications/]       │
│                                                                              │
│  CommunicationConnectionService.save(userId, 'communications', token)       │
│    1. verifyTokenWithRemote(token)                                          │
│       → GET /company-integrations/me                                        │
│       → Header: x-integration-token: <token>                                │
│       → Obtiene: remoteCompanyId (= companyId en Communications)            │
│    2. Guarda IntegrationConnection cifrada en MongoDB                       │
│       { businessId, remoteCompanyId, encryptedToken, ... }                  │
│    3. SeedProvisioningService.provisionBusinessEvents(businessId) [TODO]    │
│       → Lee COMMUNICATION_CATALOG.business                                  │
│       → Crea domain/event en Communications (idempotente)                   │
│       → Token: integration token del Business                               │
│                                                                              │
│  Business configurado. notifyEvent({ type: 'business', ... }) funciona.    │
└─────────────────────────────────────────────────────────────────────────────┘
                                  │
                    Se agrega un nuevo evento al catálogo
                                  │
┌─────────────────────────────────────────────────────────────────────────────┐
│  SINCRONIZACIÓN DE CATÁLOGO ACTUALIZADO                                      │
│                                                                              │
│  Para cada Business con CommunicationConnection activa:                     │
│    SeedProvisioningService.syncBusiness(businessId)           [PENDIENTE]   │
│    → Crea solo los assets que faltan (create if missing, skip if present)   │
│    → NUNCA sobreescribe personalizaciones del Business                      │
│                                                                              │
│  Trigger: automático en cada token-save + manual via admin endpoint         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Idempotencia

**Regla absoluta:** Provisioning es idempotente. Ejecutarlo N veces en el mismo Business produce exactamente el mismo resultado que ejecutarlo una vez. La lógica es:

```
para cada asset del catálogo:
  si ya existe en Communications → skip (nunca sobreescribir)
  si no existe → crear
```

Esto hace que el provisioning también sea el mecanismo de reparación: si un asset se elimina accidentalmente, el siguiente token-save o sync lo restaura.

### Estado de implementación del provisioning

| Componente | Estado |
|---|---|
| `default-events.constant.ts` (Platform Events en Communications) | ✅ Implementado |
| `communication-catalog.ts` (catálogo unificado en Business App) | ❌ Pendiente de crear |
| `SeedProvisioningService.provisionPlatformEvents()` | ❌ Pendiente |
| `SeedProvisioningService.provisionBusinessEvents()` | ❌ Pendiente |
| Hook en `CommunicationConnectionService.save()` (paso 3) | ❌ Pendiente (hay TODO en el código) |
| Endpoint sync manual | ❌ Pendiente |

---

## Sección 8 — notifyEvent()

### Quién lo llama

Solo los **Application Services** del backend de Business App. Nunca el frontend. Nunca Infrastructure. Nunca controllers directamente (salvo `UsersController` que actualmente llama `commClient` directamente — esto debe refactorizarse a `UsersService`).

Servicios que actualmente llaman `notifyEvent()`:
- `AuthService` (3 llamadas)
- `UserInvitationsService` (3 llamadas)
- `UsersController` (2 llamadas — debe moverse a `UsersService`)

### Cuándo se llama

**Siempre fire-and-forget.** Las llamadas a `notifyEvent()` nunca bloquean el flujo de negocio. Se usan `.then().catch()` o `void` para desacoplar el resultado del flujo principal.

```typescript
// ✅ Correcto — fire-and-forget
this.commClient.notifyEvent({ ... })
  .then((delivered) => this.logger.log(`delivered=${delivered}`))
  .catch((err)      => this.logger.error(`notifyEvent threw: ${err?.message}`));

// También correcto para casos donde no interesa el resultado
void this.commClient.notifyEvent({ ... });

// ❌ Incorrecto — bloquea el flujo si notifications falla
const delivered = await this.commClient.notifyEvent({ ... });
if (!delivered) throw new Error(...);  // ← NUNCA hacer esto
```

### Interfaz objetivo (target)

Esta es la interfaz que debe existir en `src/integrations/communications/client/communication-client.service.ts`:

```typescript
export interface NotifyEventParams {
  /**
   * Routing context — determina qué CommunicationConnection se usa.
   *
   * 'platform': usa la empresa base (isPlatformCompany: true).
   *             Eventos del sistema: verify email, forgot password, invitations.
   *             Funciona aunque el Business no tenga CommunicationConnection.
   *
   * 'business': usa la CommunicationConnection del businessId recibido.
   *             Eventos del tenant: invoices, payments, documents.
   *             Requiere que el Business tenga CommunicationConnection configurada.
   *
   * Communications nunca recibe este campo — es interno a Business App.
   */
  type: 'platform' | 'business';

  /**
   * ID del Business en Business App (ObjectId como string).
   * - type='platform': opcional — solo para logging diagnóstico.
   * - type='business': obligatorio — identifica de qué Business usar el token.
   *
   * SIEMPRE viene del AuthContext/JWT. NUNCA del request body del frontend.
   */
  businessId?: string;

  /** Canonical event key. Formato: 'domainKey.eventKey'. Ej: 'security.company_verify_email' */
  event: string;

  /** Email del destinatario */
  email: string;

  /** Variables del template. Se envían a Communications como payload.data. */
  data: Record<string, string | undefined | null>;
}
```

### Interfaz actual en código (legacy — pendiente rename)

```typescript
// src/settings/communication-client/communication-client.service.ts
// ESTADO ACTUAL — usar solo hasta que se migre a src/integrations/

export interface NotifyEventParams {
  type:      'platform' | 'company';   // ← legacy: 'company' debe renombrarse a 'business'
  companyId?: string;                   // ← legacy: debe renombrarse a 'businessId'
  event:     string;
  email:     string;
  data:      Record<string, string | undefined | null>;
}
```

### Qué hace internamente `notifyEvent()`

```typescript
async notifyEvent(params: NotifyEventParams): Promise<boolean> {
  // 1. Resolver la conexión correcta según el type
  const conn = await this.connections.getCommunicationConnectionForContext(
    params.type,       // 'platform' | 'business'
    params.businessId, // del AuthContext/JWT
  );

  if (!conn) {
    // type='platform' → log CRITICAL (bloquea auth de la plataforma)
    // type='business' → log WARNING (el negocio continúa)
    return false;
  }

  // 2. Construir la request hacia Communications
  //    conn.communicationCompanyId es el remoteCompanyId — el ID del Business en Communications
  const url  = `${COMMUNICATION_API_URL}/notifications/event`;
  const body = {
    companyId: conn.communicationCompanyId, // ← campo "companyId" de Communications (su vocabulario)
                                            //   = remoteCompanyId en Business App
    event:     params.event,
    email:     params.email,
    payload:   { data: params.data },       // ← envuelto en payload.data
  };

  // 3. Llamar a Communications con el token resuelto
  await this.http.post(url, body, {
    headers: { 'x-api-key': conn.decryptedToken },
    timeout: 10_000,
  });

  return true;
}
```

### Qué recibe Communications

```json
POST /notifications/event
Header: x-api-key: <integration_token_o_COMMUNICATION_API_KEY>

Body:
{
  "companyId": "<remoteCompanyId — ID del Business en Communications App>",
  "event":     "security.company_verify_email",
  "email":     "usuario@business.com",
  "payload": {
    "data": {
      "firstName":       "Juan",
      "email":           "usuario@business.com",
      "verificationUrl": "https://app.ejemplo.com/auth/verify-email?token=...",
      "expiresAt":       "2026-07-08T12:00:00.000Z",
      "loginUrl":        "https://app.ejemplo.com/auth/login"
    }
  }
}
```

**Nota sobre `companyId` en el body:** El campo `companyId` que aparece en el body es el `remoteCompanyId` — el identificador del Business **en Communications App**. No es el `businessId` de Business App. Son valores distintos. Communications **ignora** el `companyId` del body para decisiones de seguridad — siempre usa el valor resuelto desde el token de autenticación.

### Errores y comportamiento

| Situación | Comportamiento |
|---|---|
| `type='platform'` sin conexión activa | log CRITICAL, retorna `false`. Bloquea auth de la plataforma. |
| `type='business'` sin conexión activa | log WARNING, retorna `false`. El flujo de negocio continúa. |
| Communications responde 400 (event no existe) | log ERROR con detalle, retorna `false`. |
| Communications responde 207 (canal parcialmente entregado) | log WARNING, retorna `true` (al menos un canal entregó). |
| Timeout (> 10 segundos) | log ERROR, retorna `false`. |
| Error de red | log ERROR, retorna `false`. |
| Decryption falla | log ERROR, retorna `false`. |

---

## Sección 9 — Token Resolution

### La función autorizada (interfaz objetivo)

```typescript
// CommunicationConnectionService
async getCommunicationConnectionForContext(
  type:       'platform' | 'business',
  businessId?: string,
): Promise<BusinessConnection | null>

interface BusinessConnection {
  communicationCompanyId: string;  // remoteCompanyId — ObjectId del Business en Communications
  decryptedToken:         string;  // plaintext del integration token (nunca loggear completo)
  status:                 'connected' | 'failed' | null;
  isActive:               boolean;
}
```

**Nota sobre el nombre `CompanyConnection`:** En el código actual, esta interfaz se llama `CompanyConnection`. Debe renombrarse a `BusinessConnection` en el refactor. El campo `communicationCompanyId` se mantiene — identifica al Business en Communications App, donde ese sistema sí usa `companyId` internamente.

**Regla de oro:** Ningún módulo resuelve tokens directamente. Solo `CommunicationClientService.notifyEvent()` llama al resolver.

### Flujo para `type = 'platform'`

```
getCommunicationConnectionForContext('platform')
  ↓
Business App DB:
  Business.findOne({ isPlatformCompany: true })
  → platformBusinessId (ObjectId del Business base en Business App)
  ↓
IntegrationConnection.findOne({
  businessId: platformBusinessId,  // [legacy: campo en DB se llama companyId]
  provider:   'communications',
  isActive:   true,
})
  ↓
Si no existe → log CRITICAL, return null
Si existe:
  CryptoService.decryptJson(doc.encryptedToken)
  → { token: '<raw>' }
  return {
    communicationCompanyId: doc.remoteCompanyId,  // ID en Communications
    decryptedToken: token,
    status: doc.lastStatus,
    isActive: true,
  }
```

### Flujo para `type = 'business'`

```
getCommunicationConnectionForContext('business', businessId)
  ↓
IntegrationConnection.findOne({
  businessId: ObjectId(businessId),  // [legacy: campo en DB se llama companyId]
  provider:   'communications',
  isActive:   true,
})
  ↓
Si no existe → log WARNING, return null
Si doc.remoteCompanyId es null → return null (token nunca verificado)
Si existe:
  CryptoService.decryptJson(doc.encryptedToken)
  → { token: '<raw>' }
  return {
    communicationCompanyId: doc.remoteCompanyId,  // ID en Communications
    decryptedToken: token,
    status: doc.lastStatus,
    isActive: true,
  }
```

### Schema de IntegrationConnection (MongoDB) — estado objetivo

```typescript
// Colección: integration_connections
// Índice único: { businessId: 1, provider: 1 }
//
// NOTA LEGACY: el campo en la base de datos actualmente se llama 'companyId'.
// Debe renombrarse a 'businessId' en un sprint de migración de schema.
// El índice actual es { companyId: 1, provider: 1 }.

IntegrationConnection {
  businessId:      ObjectId    // ID del Business en Business App
                               // [Legacy en DB: campo llamado 'companyId']
  provider:        string      // 'communications' | 'accounting' | ...
  encryptedToken:  object      // AES-256-GCM blob: { alg, ivBase64, tagBase64, dataBase64 }
                               // Payload cifrado: { token: '<raw_integration_token>' }
  tokenPrefix:     string      // Primeros 12 chars del token (seguro para mostrar en UI)
  remoteCompanyId: string|null // ID del Business en Communications App.
                               // Null hasta que el token sea verificado.
                               // Se mantiene como 'remoteCompanyId' — identifica al Business
                               // en Communications, que usa 'companyId' internamente.
  isActive:        boolean     // false = conexión desactivada (token sigue cifrado)
  lastTestedAt:    Date|null
  lastStatus:      'connected' | 'failed' | null
  lastError:       string|null
  createdAt:       Date
  updatedAt:       Date
}
```

### COMMUNICATION_API_KEY vs Integration Token

| Mecanismo | Quién lo usa | Qué resuelve en Communications |
|---|---|---|
| `COMMUNICATION_API_KEY` (env var) | Business App para Platform Events | La empresa base (`isPlatformCompany: true`) |
| Integration Token (`gpf_live_...`) | Business App para Business Events | El Business propietario del token |

El `GlobalAuthGuard` de Communications reconoce ambos:
- Si `x-api-key` === `COMMUNICATION_API_KEY` → empresa base
- Si `x-api-key` o `x-integration-token` !== `COMMUNICATION_API_KEY` → `resolveCompanyByToken()`

### Validación del token (al guardar)

```
GET /company-integrations/me                    (endpoint de Communications App)
Header: x-integration-token: <rawToken>
Response: {
  companyId:   "<ObjectId en Communications>",  ← terminología de Communications App
  companyKey:  "<key>",
  companyName: "<name>",
}
```

Business App recibe `companyId` de Communications (vocabulario de Communications) y lo almacena como `remoteCompanyId` en `IntegrationConnection`. Si este endpoint falla (Communications caído), el token se guarda igualmente pero sin `remoteCompanyId` — las notificaciones quedarán skipped hasta que se ejecute un test.

### Variables de entorno requeridas

| Variable | Propósito | Obligatoria |
|---|---|---|
| `COMMUNICATION_API_URL` | URL base de Communications App | Sí |
| `CREDENTIALS_MASTER_KEY_BASE64` | Clave AES-256-GCM para cifrar tokens | Sí |

---

## Sección 10 — Reglas de implementación

Las siguientes reglas son **no negociables**. Un PR que las viole debe ser rechazado.

### R-01 — Todo evento existe en el catálogo primero

Ningún eventKey puede usarse en código si no está definido en `COMMUNICATION_CATALOG`. Primero se agrega al catálogo, luego se implementa la llamada.

### R-02 — Nunca llamar directamente a Communications desde un módulo de dominio

Los módulos de dominio (customer, billing, contracts, etc.) no importan `CommunicationClientService`. Solo los Application Services lo hacen.

### R-03 — Nunca renderizar HTML dentro de Business App

Ningún servicio de Business App construye un template de email. El único HTML que procesa es el que recibe de Communications.

### R-04 — Nunca resolver tokens manualmente

Ningún servicio de Business App accede directamente a `IntegrationConnection`. Solo `CommunicationConnectionService.getCommunicationConnectionForContext()` lo hace.

### R-05 — Nunca usar SMTP directamente para notificaciones

El único método de envío de notificaciones es `CommunicationClientService.notifyEvent()`. El `testSmtp()` de `BusinessService` existe solo para verificar configuración, no para enviar notificaciones.

### R-06 — businessId siempre del JWT

El `businessId` en las llamadas a `notifyEvent()` siempre viene del `AuthContext` resuelto en el backend por el JWT guard. Nunca de parámetros del frontend, nunca del request body. El código legacy usa `companyId` — todo código nuevo debe usar `businessId`.

### R-07 — notifyEvent es siempre fire-and-forget

Ningún flujo de negocio falla porque una notificación no pudo entregarse. El resultado de `notifyEvent()` se logea, nunca se usa para decidir el comportamiento del flujo principal.

### R-08 — Todo Application Service aplica las 5 preguntas

Antes de implementar cualquier método público de un Application Service, el desarrollador debe responder:
1. ¿La operación terminó? → Toast en el frontend siempre
2. ¿Informar módulos internos? → Domain Event al Outbox
3. ¿Canal externo? → Si no, fin
4. ¿Platform o Business? → type
5. ¿Llamar `notifyEvent()`?

### R-09 — Frontend siempre muestra Toast

Todo resultado de acción de usuario — éxito o error — muestra Toast/Snackbar. Esta responsabilidad es exclusiva del frontend. Nunca depende de si la notificación fue entregada.

### R-10 — Catálogo único, sin duplicación

Existe exactamente un `COMMUNICATION_CATALOG`. Ningún módulo crea su propio listado de eventos, constante de eventos, ni servicio paralelo de notificaciones.

### R-11 — Nunca usar `companyId` para referirse al tenant local

En Business App, el identificador del tenant es siempre `businessId`. La única excepción es `remoteCompanyId`, que identifica al Business en Communications App y usa el vocabulario de ese sistema.

---

## Sección 11 — Agregar un nuevo evento

### Paso 1 — Analizar el método

El desarrollador identifica un método de un Application Service que podría necesitar canal externo. Aplica las **5 preguntas de §10 (R-08)**.

Si la respuesta a "¿Canal externo?" es Sí, continúa:

### Paso 2 — Determinar tipo (Platform o Business)

```
¿El evento pertenece al ciclo de vida de la plataforma,
independientemente del Business?
  Sí → type = 'platform'
       Usar COMMUNICATION_CATALOG.platform
  No → type = 'business'
       Usar COMMUNICATION_CATALOG.business
```

### Paso 3 — Agregar al catálogo

Abrir `src/integrations/communications/catalog/communication-catalog.ts`:

```typescript
// ¿El domain ya existe?
// Sí → agregar el evento al array events del domain existente
// No → crear un nuevo CatalogDomain y agregarlo al array platform[] o business[]

// Estructura mínima de un nuevo evento:
{
  eventKey:     'invoice_sent',           // bare key — sin domain prefix
  displayName:  'Invoice Sent',
  description:  'Delivered to the customer when an invoice is sent.',
  eventType:    'notification',
  channels: {
    email: {
      enabled:           true,
      subject:           'Invoice {{data.invoiceNumber}} from {{company.displayName}}',
      content:           '<p>Hi {{data.customerName}}...</p>',  // body solo
      requiredVariables: ['data.invoiceNumber', 'data.customerName', 'data.amount', 'data.dueDate'],
      optionalVariables: ['data.viewUrl'],
    },
  },
},
```

**Reglas del template:**
- `content` es el cuerpo del email únicamente. Sin header, sin footer, sin logo corporativo.
- El layout wrapper lo aplica Communications al renderizar.
- Variables de payload: prefijo `data.*`; datos del Business: `company.*`; colores: `theme.*`.

Si se agrega un nuevo domain, inicializarlo con `version: 1`. Si se modifica un domain existente, incrementar su `version`.

### Paso 4 — Estabilidad del eventKey

El eventKey es un contrato. Una vez que existe en producción, **no puede renombrarse**.

```
✅ Permitido:
  - agregar un nuevo event
  - agregar optional variables
  - modificar el template por defecto

❌ Prohibido:
  - renombrar: billing.invoice_sent → billing.sent_invoice
  - eliminar un event que Businesses tienen configurado
  - cambiar required variables (puede romper envíos existentes)

📌 Para cambios incompatibles:
  billing.invoice_sent     (v1 — mantener)
  billing.invoice_sent_v2  (v2 — agregar)
```

### Paso 5 — Provisioning

- **Platform Event nuevo:** Se provisiona automáticamente en el próximo startup de Business App (cuando `SeedProvisioningService.provisionPlatformEvents()` esté implementado).
- **Business Event nuevo:** Se provisiona en el próximo token-save de cada Business. Para Businesses existentes con token activo, ejecutar el sync manual.

### Paso 6 — Implementar la llamada

```typescript
// En el Application Service correspondiente:

// Platform Event — usa la conexión de la empresa base
this.commClient.notifyEvent({
  type:       'platform',
  businessId: String(user.businessId),   // solo para logging diagnóstico
  event:      'security.company_verify_email',
  email:      user.email,
  data: {
    firstName:       user.firstName,
    email:           user.email,
    verificationUrl: url,
    expiresAt:       expiresAt.toISOString(),
    loginUrl,                              // opcional
  },
}).catch((err) => this.logger.error(`notifyEvent threw: ${err?.message}`));

// Business Event — usa la conexión del Business emisor
this.commClient.notifyEvent({
  type:       'business',
  businessId: actor.businessId,           // del AuthContext/JWT — NUNCA del request body
  event:      'billing.invoice_sent',
  email:      customer.email,
  data: {
    invoiceNumber: invoice.number,
    customerName:  customer.displayName,
    amount:        invoice.total.toFixed(2),
    dueDate:       invoice.dueDate.toISOString(),
  },
}).catch((err) => this.logger.warn(`notifyEvent billing.invoice_sent: ${err?.message}`));
```

### Paso 7 — Actualizar la tabla del módulo

El PR debe incluir la tabla de decisión para el método:

```
| Método | Toast | Domain Event | Canal externo | Platform/Business | eventKey |
| sendInvoice() | ✅ | InvoiceSent → Outbox | ✅ Sí | Business | billing.invoice_sent |
```

### Paso 8 — PR checklist

Ver checklist completo en §14.

---

## Sección 12 — Actualizar eventos existentes

### Nuevo optional variable en un evento existente

1. Agregar a `optionalVariables` en el catálogo
2. Opcionalmente agregar al template (sin romper renders que no lo provean)
3. Actualizar la tabla §5 o §6 de este documento
4. El sync de catálogo enviará la actualización a Communications

### Nuevo canal en un evento existente

```typescript
// Agregar sms al evento company_user_invitation:
channels: {
  email: { /* existente */ },
  sms: {
    enabled:           true,
    text:              'Invitation for {{data.businessName}}: temp password {{data.tempPassword}}',
    requiredVariables: ['data.businessName', 'data.tempPassword'],
    optionalVariables: [],
  },
},
```

- El provisioning crea el canal en Communications si no existe
- Para Businesses existentes con token activo: sync manual
- Para Businesses sin token: lo reciben al configurar

### Cambio de template (content o subject)

El template por defecto en el catálogo aplica solo a nuevas instalaciones. Los Businesses que ya tienen el evento configurado y lo han personalizado no se verán afectados (idempotencia: create if missing, skip if present).

Para actualizar el template en Businesses existentes se requiere una operación explícita de migración (fuera del scope del provisioning normal).

### Businesses sin token al momento del sync

Un Business que nunca configuró su integration token no recibe el catálogo en el sync masivo. Cuando finalmente configure su token, recibirá el catálogo completo en ese momento (versión actual, sin eventos que se hayan deprecado).

---

## Sección 13 — Arquitectura de carpetas

### Ubicación target (según ADR-020)

```
src/integrations/communications/
  ├── communications.module.ts             # NestJS module — exporta CommunicationClientService
  │
  ├── client/
  │   ├── communication-client.module.ts
  │   └── communication-client.service.ts # notifyEvent() — único punto de llamada HTTP
  │
  ├── connection/
  │   ├── communication-connection.module.ts
  │   ├── communication-connection.controller.ts  # PUT /settings/communications (ruta legacy)
  │   ├── communication-connection.service.ts     # save(), test(), toggle(), getCommunicationConnectionForContext()
  │   ├── schemas/
  │   │   └── communication-connection.schema.ts  # IntegrationConnection (colección: integration_connections)
  │   └── dto/
  │       └── communication-connection.dto.ts     # SaveConnectionDto, TestConnectionDto, etc.
  │
  ├── catalog/
  │   ├── communication-catalog.ts           # COMMUNICATION_CATALOG (la única fuente de verdad)
  │   └── communication-catalog.types.ts     # UnifiedCatalog, CatalogDomain, CatalogEvent, etc.
  │
  ├── provisioning/
  │   ├── seed-provisioning.module.ts
  │   └── seed-provisioning.service.ts       # provisionPlatformEvents(), provisionBusinessEvents(), syncBusiness()
  │
  └── config/
      └── communications.config.ts           # Variables de entorno: COMMUNICATION_API_URL
```

### Estado actual (migración pendiente)

```
src/settings/
  communication-client/    → migrar a src/integrations/communications/client/
  communication-connection/ → migrar a src/integrations/communications/connection/
```

La migración de código es un paso separado documentado en ADR-020. Los imports que dependen de `settings/communication-*` necesitan actualizarse cuando se mueva el código.

### Responsabilidad de cada carpeta

| Carpeta | Responsabilidad |
|---|---|
| `client/` | HTTP client hacia Communications. Solo responsable de construir y enviar la request. |
| `connection/` | Estado de la conexión (IntegrationConnection schema). CRUD del token. Cifrado/descifrado. |
| `catalog/` | Definición de todos los eventos comunicables. Solo TypeScript, sin lógica de runtime. |
| `provisioning/` | Pushear el catálogo a Communications al momento correcto (startup, token-save, sync). |
| `config/` | Variables de entorno propias de la integración. |

---

## Sección 14 — Checklist obligatorio

Todo método público nuevo de un Application Service debe completar este checklist antes del merge.

```
COMMUNICATION CHECKLIST — método: <NombreServicio.metodo()>

  DECISIÓN INICIAL
  [ ] Apliqué las 5 preguntas (§10 R-08)
  [ ] Resultado documentado en la tabla del módulo o en el PR

  PREGUNTA 1 — TOAST
  [ ] Frontend muestra Toast/Snackbar en éxito y error
      (responsabilidad del frontend — no depende de Communications)

  PREGUNTA 2 — DOMAIN EVENT
  [ ] Si informo módulos internos: Domain Event publicado al Outbox DESPUÉS del save
  [ ] Si no informo: justificado ("solo CRUD local", "solo lectura", etc.)

  PREGUNTA 3 — CANAL EXTERNO
  [ ] Si NO requiere canal externo: justificado → FIN DEL CHECKLIST
  [ ] Si SÍ requiere canal externo → continuar

  PREGUNTA 4 — TIPO
  [ ] type determinado: 'platform' o 'business' (ver criterio en §5 y §6)
  [ ] businessId viene del AuthContext/JWT — NUNCA del request body

  CATÁLOGO
  [ ] eventKey existe en COMMUNICATION_CATALOG antes de este commit
  [ ] eventKey en formato: 'domainKey.eventKey' (ej: 'security.company_verify_email')
  [ ] Si es evento nuevo: domain/event agregado al catálogo
  [ ] Si es domain nuevo: domain creado con isSystem correcto y version: 1
  [ ] Si se modifica domain existente: version bumped
  [ ] Tabla de §5 (Platform) o §6 (Business) de este documento actualizada

  IMPLEMENTACIÓN
  [ ] Solo llamo this.commClient.notifyEvent() — sin lógica de envío propia
  [ ] No resuelvo tokens manualmente
  [ ] No renderizo HTML en el Service
  [ ] No gestiono credenciales en el Service
  [ ] La llamada es fire-and-forget (.then().catch() o void)
  [ ] El flujo de negocio no falla si notifyEvent() retorna false
  [ ] Uso 'business' como type (no 'company')
  [ ] Uso businessId como parámetro (no companyId)

  TABLA DEL MÓDULO (en el PR)
  [ ] Incluida tabla con columns: Método | Toast | Domain Event | Canal externo | Platform/Business | eventKey
```

---

## Sección 15 — Referencias legacy en código

Las siguientes referencias legacy existen en el código actual y deben ser corregidas en un sprint de refactor. **No son bugs — el sistema funciona.** Son inconsistencias de nomenclatura respecto a la terminología oficial.

| Archivo | Legacy en código | Debe ser | Prioridad |
|---|---|---|---|
| `communication-client.service.ts` | `type: 'company'` | `type: 'business'` | Media |
| `communication-client.service.ts` | `companyId?: string` (en `NotifyEventParams`) | `businessId?: string` | Media |
| `communication-connection.service.ts` | `getCommunicationConnectionForContext(type: '...', businessCompanyId?)` | `getCommunicationConnectionForContext(type: '...', businessId?)` | Media |
| `communication-connection.service.ts` | `CompanyConnection` (nombre de interfaz) | `BusinessConnection` | Baja |
| `communication-connection.schema.ts` | campo `companyId` en MongoDB | campo `businessId` | Media (requiere migration) |
| `communication-connection.schema.ts` | índice `{ companyId: 1, provider: 1 }` | `{ businessId: 1, provider: 1 }` | Media (con la migration) |
| `auth.service.ts`, `user-invitations.service.ts`, `users.controller.ts` | `type: 'platform'` con `companyId:` | `type: 'platform'` con `businessId:` | Media |
| `user-invitations.service.ts` | `type: 'company'` en invitaciones (todavía no aparece — futuro) | `type: 'business'` | — |
| `integration_connections` (colección MongoDB) | campo `companyId` | campo `businessId` | Media |

**`remoteCompanyId` NO está en esta lista.** Es el nombre correcto — identifica al Business en Communications App, donde ese sistema usa `companyId`. Es parte de la frontera de traducción documentada en la sección "Terminología oficial".

---

## Documentos reemplazados por este documento

| Documento reemplazado | Estado |
|---|---|
| `docs/communications/auth-communication-events.md` | DEPRECATED — contenido migrado a §5 |
| `docs/communications/communication-event-routing.md` | DEPRECATED — contenido migrado a §5, §6, §9 |
| `docs/communications/communication-token-resolution.md` | DEPRECATED — contenido migrado a §9 |
| `docs/communications/domain-events-vs-communication-events.md` | DEPRECATED — contenido migrado a §10 R-08 |
| `docs/communications/provisioning-default-templates.md` | DEPRECATED — contenido migrado a §5, §6, §7 |
| `docs/architecture/communication-architecture.md` | DEPRECATED — reemplazado por este documento |

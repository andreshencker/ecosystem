# Integrations

**Versión:** 1.1 | **Fecha:** 2026-07-08 | **Estado:** Canónico — fuente de verdad para todas las integraciones externas

> **Decisión de arquitectura:** ADR-020 — `src/integrations/` es la ubicación canónica y exclusiva para todo el código de integración con sistemas externos en Business App.

---

## ¿Qué es una Integration?

Una **Integration** es un adaptador acotado entre Business App y un sistema externo específico.

Su función es estrictamente técnica: gestiona el ciclo de vida de la conexión, maneja la autenticación, ejecuta llamadas HTTP, y normaliza las respuestas al vocabulario interno del sistema. No contiene reglas de negocio. No decide qué hacer con los datos importados.

```
Sistema externo
      │
      │  (Google, Stripe, Xero, Communications Platform, etc.)
      ▼
┌─────────────────────────────────────┐
│         src/integrations/           │
│                                     │
│  autenticación   ← tokens, OAuth2   │
│  conexión        ← estado, revocación│
│  cliente HTTP    ← requests/responses│
│  sincronización  ← polling, webhooks │
│  normalización   ← formato externo → │
│                    vocabulario interno│
└─────────────────────┬───────────────┘
                      │ Domain Events normalizados
                      ▼
              src/modules/ (dominio)
```

Los módulos de dominio nunca se conectan directamente a sistemas externos. Las integraciones nunca contienen lógica de negocio.

---

## Principio de aislamiento

Cada integración es completamente independiente. Un fallo en la integración de Google Calendar no puede afectar a la integración de Communications. Un cambio de versión de la API de Stripe se contiene dentro de `src/integrations/stripe/` sin tocar nada más.

---

## Integraciones existentes

| Integración | Carpeta | Estado | Tipo |
|---|---|---|---|
| Communications Platform | `communications/` | ✅ Implementado | Outbound |
| Business Intelligence | `business-intelligence/` | ✅ Implementado | Outbound |

---

## Integraciones de calendario — responsabilidad de Communications App

> **ADR-022:** Las conexiones OAuth con Google Calendar, Outlook (Microsoft Graph) y Apple iCal son responsabilidad de **Communications App**, no de Business App.

Business App tiene un dominio Calendar (`src/modules/calendar/`) que gestiona `CalendarEvent`, `ScheduledEvent`, y `CalendarSource`. Pero las credenciales OAuth, el refresh de tokens, los SDKs de terceros (Google Calendar API, Microsoft Graph, CalDAV), y el polling de sincronización viven en Communications App.

**Business App NO creará** las carpetas `src/integrations/google-calendar/`, `src/integrations/outlook-calendar/`, ni `src/integrations/icloud-calendar/`.

El flujo es:
```
Google Calendar → Communications App → Business App Calendar Domain → CalendarEventImported → WorkEvent
```

Ver: `docs/decisions/ADR-022-calendar-provider-delegation-to-communications.md`

---

## Integraciones planificadas (en Business App)

Referencia completa en `docs/domain/integration/03-provider-catalog.md`.

| Categoría | Integración | Fase ERP |
|---|---|---|
| **Almacenamiento** | Amazon S3 / Cloudflare R2 | Sprint 5+ |
| **Almacenamiento** | Google Drive | Sprint 5+ |
| **Almacenamiento** | OneDrive | Sprint 5+ |
| **Almacenamiento** | Dropbox | Sprint 5+ |
| **Pagos** | Stripe | Sprint 3 (Billing) |
| **Pagos** | Square | Sprint 3+ |
| **Pagos** | GoCardless | Sprint 3+ |
| **Contabilidad** | Xero | Sprint 4 (Accounting) |
| **Contabilidad** | MYOB | Sprint 4+ |
| **Contabilidad** | QuickBooks | Sprint 4+ |
| **Bancario** | CDR Open Banking (AU) | Sprint 7 |
| **Bancario** | OFX / CSV Import | Sprint 7 |
| **Fiscal** | ATO Single Touch Payroll | Sprint 9 |
| **Fiscal** | ATO BAS Lodgment | Sprint 4 |
| **CRM** | Shopify | Sprint 4+ |
| **CRM** | HubSpot / Salesforce | Sprint 4+ |

---

## Estructura estándar de una integración

Cada integración es un folder auto-contenido bajo `src/integrations/`. Todo el código relacionado con un sistema externo vive junto.

```
src/integrations/<nombre>/
  <nombre>.module.ts              # Módulo NestJS — declara providers y exports
  <nombre>.service.ts             # Servicio principal — gestión de conexión
  <nombre>.client.ts              # Cliente HTTP al sistema externo (si aplica)
  schemas/
    <nombre>-connection.schema.ts # Schema MongoDB para el estado de conexión
  dto/
    <nombre>-connection.dto.ts    # DTOs de request/response
  tests/
    <nombre>.service.spec.ts      # Tests unitarios
  README.md                       # Documentación específica de la integración
```

### Elementos obligatorios

Toda integración, sin importar su complejidad, debe tener:

| Elemento | Por qué es obligatorio |
|---|---|
| `<nombre>.module.ts` | Define qué exporta al resto de la app |
| Servicio principal | Único punto de acceso a la integración |
| `README.md` | Explica qué conecta, qué requiere, qué provee, cómo probarla |

### Elementos opcionales (según la integración)

| Elemento | Cuándo agregar |
|---|---|
| `<nombre>.client.ts` | Cuando el cliente HTTP es suficientemente complejo para separarlo del service |
| `schemas/` | Cuando la integración persiste estado de conexión en MongoDB |
| `processors/` | Cuando la integración usa BullMQ para sync asíncrono |
| `providers/` | Cuando hay adaptadores internos adicionales (normalizers, formatters) |
| `webhooks/` | Cuando la integración recibe webhooks inbound |

---

## Cómo crear una nueva integración

### Paso 1 — Verificar que realmente es una integración

Una integración nueva se justifica cuando Business App necesita conectarse con un sistema externo que:
- Tiene su propio ciclo de autenticación (OAuth2, API key, integration token)
- Mantiene estado de conexión que debe persistirse
- Produce o consume datos que necesitan normalización

Si es solo una llamada HTTP puntual sin estado, puede no necesitar una integración completa.

### Paso 2 — Crear el ADR correspondiente

Antes de escribir código, documentar en `docs/decisions/`:

```
ADR-XXX-<nombre>-integration.md
```

El ADR debe responder:
- Qué sistema externo se integra y para qué
- Qué patrón usa (polling, webhook, streaming, outbound push)
- Qué autenticación requiere
- Qué Domain Events produce (si es inbound)
- Qué Domain Events consume (si es outbound)
- Qué módulos de dominio dependen de esta integración

### Paso 3 — Crear la carpeta

```
src/integrations/<nombre>/
```

Seguir la estructura estándar definida en esta guía.

### Paso 4 — Registrar en AppModule

```typescript
// src/app.module.ts
import { NombreModule } from './integrations/nombre/nombre.module';

@Module({
  imports: [
    // ...
    NombreModule,
  ],
})
export class AppModule {}
```

### Paso 5 — Documentar la integración

Crear `src/integrations/<nombre>/README.md` con:

```markdown
# <Nombre> Integration

## Qué es
<Una línea describiendo el sistema externo.>

## Para qué sirve en Business App
<Qué problema resuelve, qué módulos la usan.>

## Autenticación
<OAuth2 / API Key / Integration Token — cómo se obtiene y dónde se almacena.>

## Variables de entorno requeridas
<Lista de env vars necesarias.>

## Qué provee a otros módulos
<Qué exporta el módulo — servicios, métodos públicos.>

## Qué produce (Domain Events)
<Si genera eventos, cuáles y hacia qué dominio.>

## Cómo probar la conexión
<Pasos para verificar que la integración funciona.>
```

### Paso 6 — Añadir a esta tabla

Agregar la integración a la tabla de "Integraciones existentes" al inicio de este README.

---

## Responsabilidades por capa

```
┌─────────────────────────────────────────────────────────────────┐
│  src/integrations/<nombre>/                                     │
│                                                                 │
│  ✅ Autenticación — gestionar tokens, refresh, revocación       │
│  ✅ Estado de conexión — activo, needs_reauth, error            │
│  ✅ Cliente HTTP — construir y ejecutar requests externos       │
│  ✅ Sincronización — polling, webhooks, sync jobs               │
│  ✅ Normalización — traducir formato externo al vocabulario     │
│                      interno (sin lógica de negocio)            │
│  ✅ Resiliencia — retry, circuit breaker, dead letter          │
│  ✅ Modelos propios — schemas y DTOs de la conexión             │
│                                                                 │
│  ❌ Reglas de negocio                                           │
│  ❌ Entidades de dominio (Customer, Invoice, User, etc.)        │
│  ❌ Decisiones sobre qué hacer con los datos importados         │
│  ❌ Lógica de rendering o templates                             │
│  ❌ Autenticación de usuarios en Business App                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                    Domain Events normalizados
                              │
┌─────────────────────────────────────────────────────────────────┐
│  src/modules/<dominio>/                                         │
│                                                                 │
│  ✅ Consumir Domain Events de las integraciones                 │
│  ✅ Aplicar reglas de negocio sobre los datos importados        │
│  ✅ Decidir qué hacer con un CalendarEventImported              │
│  ✅ Calcular tarifas, duraciones, impuestos                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Patrones de integración

Business App usa cuatro patrones. Cada integración declara cuál(es) implementa.

| Patrón | Cuándo usar | Ejemplos |
|---|---|---|
| **Polling** | El sistema externo no tiene webhooks | Google Calendar, Apple iCal |
| **Webhook Inbound** | El sistema externo notifica activamente | Stripe, Shopify, GoCardless |
| **Streaming** | Alto volumen, requiere broker de mensajes | CDR Open Banking (futuro) |
| **Push / Sync Outbound** | Business App envía datos al exterior | Xero, ATO STP, Communications |

Detalle completo en `docs/domain/integration/02-integration-patterns.md`.

---

## Autenticación

Toda credencial de integración se almacena **cifrada con AES-256-GCM** en reposo. Nunca en texto plano, nunca en logs, nunca en responses de API.

Los tres métodos de autenticación soportados:

| Método | Cuándo usar | Ejemplos |
|---|---|---|
| **OAuth2 Authorization Code** | El usuario autoriza el acceso en el proveedor | Google Calendar, Xero, Outlook |
| **API Key / Integration Token** | Credencial estática emitida por el proveedor | Communications Platform, Stripe, BI |
| **HMAC Signature** | Verificar webhooks inbound | Stripe webhooks, Shopify webhooks |

---

## Resiliencia

Toda integración debe manejar fallos del sistema externo sin afectar la operación del ERP.

| Mecanismo | Aplica a |
|---|---|
| Retry con backoff exponencial | Errores transitorios (5xx, timeouts, 429) |
| Circuit Breaker | Proveedores que fallan repetidamente |
| Dead Letter Queue | Eventos que no pudieron procesarse tras todos los reintentos |
| Idempotencia | Prevenir duplicados en polling y webhooks |
| Health checks periódicos | Detectar conexiones que necesitan reautenticación |

Detalle completo en `docs/domain/integration/04-resilience.md`.

---

## Documentación relacionada

| Documento | Contenido |
|---|---|
| `ADR-020-integrations-architecture.md` | Decisión de arquitectura que crea esta estructura |
| `docs/architecture/06-integration-architecture.md` | Modelo arquitectónico completo (patterns, auth, error handling) |
| `docs/domain/integration/01-integration-domain.md` | Entidades del dominio: IntegrationConnection, Connector, SyncJob |
| `docs/domain/integration/02-integration-patterns.md` | Los cuatro patrones de integración en detalle |
| `docs/domain/integration/03-provider-catalog.md` | Catálogo completo de todos los proveedores planificados |
| `docs/domain/integration/04-resilience.md` | Circuit breaker, retry, dead letter, idempotencia |

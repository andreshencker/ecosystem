# 08 — Business Provisioning

**Versión:** 1.1 | **Fecha:** 2026-07-07 | **Estado:** Oficial — actualizado Sprint 2
**Referencias:** DEC-017 · DEC-020 · ADR-006 · ADR-003 · ADR-019

El Business Provisioning es el proceso que convierte un Business recién creado en una entidad completamente operativa. Un Business que termina el provisioning puede emitir facturas, registrar trabajo, generar asientos contables, y consumir analytics. Las comunicaciones externas (email, SMS) quedan disponibles cuando el Business configura su token de Communications.

> **Principio:**
> Todo Business nace operativo para las operaciones core del ERP. El provisioning de Communications es un segundo paso deliberado: ocurre cuando el Business configura su integration token. Ver ADR-019 y `docs/architecture/communication-architecture.md`.

> **Corrección v1.1 (2026-07-07):** Los pasos P-05 a P-10 (Communications) fueron revisados. No es posible ni correcto crear dominios/eventos en Communications al crear la empresa — en ese momento no existe un integration token. La arquitectura correcta usa el **Seed Catalog** (ADR-019): Business App define los dominios/eventos en código, y los provisiona en Communications cuando el Business configura su token.

---

## Propósito del Provisioning

Un Business es el Tenant Root del ERP. Antes de que pueda operar, el sistema debe construir el conjunto completo de recursos que lo hacen funcional como tenant aislado:

- Un perfil fiscal desde el que emitir facturas
- Una configuración de comunicaciones desde la que enviar emails
- Un catálogo de eventos con los que notificar a sus Users y Customers
- Un Plan de Cuentas con el que registrar sus asientos contables
- Reglas de contabilización con las que mapear hechos financieros a cuentas
- Un espacio de almacenamiento para sus documentos
- Un espacio de analytics para sus métricas y dashboards

Sin provisioning, el Business existiría como registro en la base de datos — pero no podría operar como entidad de negocio.

---

## Modelo de dos fases

El provisioning sigue un modelo de dos fases, alineado con DEC-017 §3:

```
┌─────────────────────────────────────────────┐
│  FASE 1 — Transacción atómica (síncrona)    │
│                                             │
│  P-01. Create Business entity               │
│  P-02. Create Owner User (Identity)         │
│                                             │
│  Si cualquier paso falla → ROLLBACK TOTAL   │
│  La API responde después de este commit     │
└─────────────────────────────────────────────┘
                      │
                      ▼ (Fase 1 committed)
┌─────────────────────────────────────────────┐
│  FASE 2 — Aprovisionamiento asíncrono       │
│  (non-atomic, idempotente, con retry)       │
│                                             │
│  P-03. Provision FiscalProfile              │
│  P-04. Provision Business Personality       │
│  P-05. Provision Default Theme              │
│  P-06. Provision Email Layout Template      │
│  P-07. Provision PDF Layout Template        │
│  P-08. Provision Security Domain            │
│  P-09. Provision Default Company Events     │
│  P-10. Provision Notification Settings      │
│  P-11. Provision Analytics Workspace        │
│  P-12. Provision Default Read Models        │
│  P-13. Provision KPI Catalog                │
│  P-14. Provision Chart of Accounts          │
│  P-15. Provision Posting Rules              │
│  P-16. Provision Storage Namespace          │
│  P-17. Publish BusinessProvisioned          │
│                                             │
│  Fallos en Fase 2 NUNCA revierten Fase 1.   │
│  El Business y el User existen siempre.     │
└─────────────────────────────────────────────┘
                      │
                      ▼
              Business Ready
              (system.business_provisioned publicado)
```

**Regla clave de la separación de fases:**
La API retorna éxito después del commit de Fase 1. Los pasos de Fase 2 son visibles progresivamente para el User a medida que se completan. Si un paso de Fase 2 falla, el Business existe y el User puede iniciar sesión — los activos faltantes se crean en el siguiente ciclo de provisioning (reparación idempotente, BR-PRV-006).

---

## Los pasos en detalle

Para cada paso se documentan: dominio responsable, Domain Events publicados, dependencias, estrategia de idempotencia, comportamiento ante falla, y consistencia eventual.

---

### P-01 — Create Business Entity

**Fase:** 1 (síncrona, atómica)
**Dominio responsable:** Business
**Triggered by:** `POST /auth/register` (registro público) o `POST /businesses/with-owner` (Platform Admin)

**Qué crea:**
- El registro `Business` con `businessName`, `businessKey`, `timezone`, `locale`, `currency`
- El flag `isPlatformCompany: false` (excepto cuando el Platform Admin crea la empresa operadora de la plataforma)

**Domain Events publicados:** `system.business_created` (Platform Event — no tiene `businessId` de tenant de usuario)

**Dependencias:** Ninguna — es el primer paso

**Idempotencia:** Por `businessKey` único en la plataforma. Si el `businessKey` ya existe, la solicitud es rechazada antes de crear.

**Si falla:** Rollback total de Fase 1. No se crea el Business ni el User. La API retorna error.

**Consistencia:** Inmediata — es parte de la transacción atómica de Fase 1.

---

### P-02 — Create Owner User

**Fase:** 1 (síncrona, atómica)
**Dominio responsable:** Identity
**Triggered by:** El mismo evento que P-01 (son atómicos)

**Qué crea:**
- El registro `User` con `email`, `passwordHash`, `role: business_owner`, `businessId`
- El token de verificación de email (si es registro público) o la contraseña temporal (si es invitación de Platform Admin)

**Domain Events publicados:**
- `UserRegistered` (si registro público — incluye `businessId`)
- `UserInvited` con `role: business_owner` (si Platform Admin crea la empresa)

**Dependencias:** P-01 (necesita el `businessId` ya existente)

**Idempotencia:** Por `email` único en la plataforma. Si el email ya existe, la solicitud es rechazada.

**Si falla:** Rollback total de Fase 1. No se crea el Business creado en P-01. Transacción revertida.

**Consistencia:** Inmediata — atómica con P-01.

---

### P-03 — Provision FiscalProfile

**Fase:** 2 (asíncrona)
**Dominio responsable:** Business
**Disparado por:** `system.business_created`

**Qué crea:**
- El registro `FiscalProfile` asociado al `businessId`, con valores por defecto para la jurisdicción detectada (Australia: GST habilitado, términos de pago 14 días, moneda AUD)
- El `FiscalProfile` nace incompleto — no tiene ABN, ni cuenta bancaria. El Business Owner los completa en la UI.

**Domain Events publicados:** `FiscalProfileProvisioned`

**Dependencias:** P-01 (`businessId` debe existir)

**Idempotencia:** Por `(businessId, fiscalProfileType)` — exactamente un FiscalProfile por Business (BR-BUS-001). Si ya existe, se omite.

**Si falla:** El Business existe pero no puede emitir Invoices hasta que el FiscalProfile exista. El siguiente ciclo de provisioning lo crea (reparación idempotente).

**Consistencia eventual:** El FiscalProfile puede estar disponible segundos después de que el Business se cree. El Business Owner es informado de que debe completar su perfil fiscal antes de emitir la primera factura.

---

### P-04 — Provision Business Personality

**Fase:** 2 (asíncrona)
**Dominio responsable:** Business
**Disparado por:** `system.business_created`

**Qué crea:**
- El registro `BusinessPersonality` con configuración por defecto: timezone (inferido de la jurisdicción), locale (`en-AU`), currency (`AUD`), working week (Lunes-Viernes), invoice number prefix (`INV-`)

**Domain Events publicados:** `BusinessPersonalityProvisioned`

**Dependencias:** P-01 (`businessId`)

**Idempotencia:** Por `businessId` único. Si ya existe la Personality, se omite.

**Si falla:** El Business usa valores hardcoded del sistema hasta que la Personality se cree. Es el único fallback aceptable.

---

### P-05 a P-10 — Communications Platform provisioning

> **NOTA ARQUITECTÓNICA (v1.1 — 2026-07-07):**
>
> Estos pasos fueron revisados en el Sprint 2. El modelo anterior (v1.0) describía la creación de Theme, Layout Templates, Domains, y Events en Communications como pasos de la Fase 2 del provisioning, disparados por `system.business_created`.
>
> **Ese modelo es incorrecto.** Al crear un Business no existe integration token. Sin token, Business App no puede autenticarse en Communications como ese Business para crear sus activos.
>
> **El modelo correcto** está documentado en ADR-019 y `docs/architecture/communication-architecture.md`:
> - Los Events Platform (`security.*`) ya existen en Communications desde el deploy inicial — no requieren provisioning.
> - Los Events Business (`billing.*`, `documents.*`, etc.) están definidos en el **Seed Catalog** (`src/settings/communication-client/seed-catalog.ts`).
> - Los activos de Communications para un Business se crean **al guardar el integration token** (`CommunicationConnectionService.save()`), no al registrar la empresa.

---

### P-05 — Provision Default Theme (Communications)

**Fase:** Token-triggered (no Fase 2 del registro)
**Dominio responsable:** Communications Platform
**Disparado por:** `CommunicationConnectionService.save()` — cuando el Business configura su token

**Estado actual:** ⏳ Pendiente implementación del Seed Catalog (ADR-019)

**Qué debe crear** (cuando se implemente):
- El `Theme` por defecto del Business con los brand tokens de la plataforma
- Marcado como `isDefault: true`, `isActive: true`

**Idempotencia:** Por `(businessId en Communications, isDefault: true)`. Si ya existe, se omite.

---

### P-06 — Provision Email Layout Template (Communications)

**Fase:** Token-triggered
**Estado actual:** ⏳ Pendiente implementación del Seed Catalog (ADR-019)

**Qué debe crear** (cuando se implemente):
- `LayoutTemplate` email (`templateKey: default_email_layout`) con `{{content}}` obligatorio

---

### P-07 — Provision PDF Layout Template (Communications)

**Fase:** Token-triggered
**Estado actual:** ⏳ Pendiente implementación del Seed Catalog (ADR-019)

**Qué debe crear** (cuando se implemente):
- `LayoutTemplate` PDF (`templateKey: default_pdf_layout`)

---

### P-08 — Provision Security Domain (Communications)

**Fase:** Token-triggered
**Estado actual:** ⏳ Pendiente implementación del Seed Catalog (ADR-019)

**Nota:** Los eventos `security.*` para **Platform** ya existen en Communications (empresa base). Este paso crea el dominio `security` para el **Business** específico en Communications, vinculado a su companyId.

---

### P-09 — Provision Default Business Events (Communications)

**Fase:** Token-triggered
**Estado actual:** ⏳ Pendiente implementación del Seed Catalog (ADR-019)

**Qué debe crear** (cuando se implemente, desde el Seed Catalog):
- Todos los dominios definidos en `seed-catalog.ts`
- Todos los eventos de cada dominio
- Template por defecto de cada evento

**Fuente de verdad:** `src/integrations/communications/catalog/communication-catalog.ts` (COMMUNICATION_CATALOG.business)

---

### P-10 — Provision Notification Settings (Communications)

**Fase:** Token-triggered
**Estado actual:** ⏳ Pendiente implementación del Seed Catalog (ADR-019)

---

### P-11 — Provision Analytics Workspace

**Fase:** 2 (asíncrona)
**Dominio responsable:** Analytics
**Disparado por:** `system.business_created`

**Qué crea:**
- El `AnalyticsWorkspace` del Business: el contenedor de todos sus Read Models, KPIs, y Datasets
- Configurado con la moneda y timezone de la Business Personality

**Domain Events publicados:** `AnalyticsWorkspaceProvisioned`

**Dependencias:** P-01 (`businessId`). P-04 (Business Personality) es deseable pero no bloqueante — puede usar defaults del sistema.

**Idempotencia:** Por `businessId`.

**Si falla:** El dashboard y los KPIs no están disponibles. El ERP opera sin analytics. Reparable.

---

### P-12 — Provision Default Read Models

**Fase:** 2 (asíncrona)
**Dominio responsable:** Analytics
**Disparado por:** `AnalyticsWorkspaceProvisioned`

**Qué crea:**
- Los Read Models por defecto del Business en el Analytics Store:
  - `BusinessDashboardView` — resumen del estado del Business
  - `AccountsReceivableView` — saldo pendiente de cobro
  - `RevenueByPeriodView` — ingresos por período
  - `WorkloadView` — horas trabajadas y billables

Estos Read Models están vacíos al crearse — se irán llenando con los Domain Events operativos conforme el Business opere.

**Dependencias:** P-11 (el Workspace debe existir)

**Idempotencia:** Por `(workspaceId, readModelKey)`.

---

### P-13 — Provision KPI Catalog

**Fase:** 2 (asíncrona)
**Dominio responsable:** Analytics
**Disparado por:** `AnalyticsWorkspaceProvisioned`

**Qué crea:**
- El catálogo de KPIs por defecto del Business:
  - `gross_revenue_mtd` — revenue bruto del mes actual
  - `outstanding_ar` — total de Accounts Receivable pendiente
  - `collections_rate` — porcentaje de Invoices cobradas en los últimos 90 días
  - `effective_hourly_rate` — tarifa efectiva promedio del período

**Dependencias:** P-11 (el Workspace)

**Idempotencia:** Por `(workspaceId, kpiKey)`.

---

### P-14 — Provision Chart of Accounts

**Fase:** 2 (asíncrona)
**Dominio responsable:** Accounting
**Disparado por:** `FiscalProfileProvisioned`

**Qué crea:**
- El `ChartOfAccounts` del Business desde la plantilla estándar de su jurisdicción (Australia: AS-GAAP, cuentas para Ingresos, Activos, Pasivos, Patrimonio, Gastos, GST)
- El `Account` estándar por tipo: 1000-Accounts Receivable, 2000-Accounts Payable, 3000-GST Collected, 4000-Revenue, 5000-COGS, etc.

**Domain Events publicados:** `ChartOfAccountsProvisioned`

**Dependencias:** P-03 (FiscalProfile — para conocer la jurisdicción y configurar el Plan de Cuentas correcto)

**Idempotencia:** Por `(businessId, chartKey)`. Si el ChartOfAccounts ya existe, se omite.

**Si falla:** Las FinancialTransactions no pueden ser procesadas por el Accounting Engine — no hay cuentas a las que postear. La Fase 4 del ERP no está disponible. Reparable.

**Consistencia eventual:** El ChartOfAccounts puede estar disponible minutos después del FiscalProfile. El Business puede operar en Fases 1-3 (Work, Billing) sin el CoA — solo la Fase 4 (Accounting) lo requiere.

---

### P-15 — Provision Posting Rules

**Fase:** 2 (asíncrona)
**Dominio responsable:** Financial
**Disparado por:** `ChartOfAccountsProvisioned`

**Qué crea:**
- Las `PostingRules` estándar para la jurisdicción del Business, mapeando cada tipo de `FinancialTransaction` a las líneas de débito/crédito correspondientes:
  - `INVOICE_ISSUED` → Debit Accounts Receivable / Credit Revenue + GST Collected
  - `PAYMENT_RECEIVED` → Debit Bank / Credit Accounts Receivable
  - `INVOICE_VOIDED` → reversión del asiento original
  - Y todas las demás FinancialTransaction types que el sistema genera

**Domain Events publicados:** `PostingRulesProvisioned`

**Dependencias:** P-14 (el ChartOfAccounts debe existir — las PostingRules referencian códigos de cuenta)

**Idempotencia:** Por `(businessId, transactionType, jurisdicción)`.

**Si falla:** Las FinancialTransactions quedan en estado `pending` — el Accounting Engine no puede procesarlas. Reparable.

**Diseño clave:** Las PostingRules son configuración (datos), no código. Esto permite que nuevas jurisdicciones se soporten agregando PostingRules sin modificar el Accounting Engine (ADR-005).

---

### P-16 — Provision Storage Namespace

**Fase:** 2 (asíncrona)
**Dominio responsable:** Document Management
**Disparado por:** `system.business_created`

**Qué crea:**
- El namespace de almacenamiento aislado del Business en el StorageProvider
- La configuración de retención por tipo de documento (financieros: 7 años, operativos: configurable)

**Domain Events publicados:** `StorageNamespaceProvisioned`

**Dependencias:** P-01 (`businessId`)

**Idempotencia:** Por `businessId`.

**Si falla:** Los PDFs de Invoice no pueden almacenarse. Los documentos del Business no tienen destino. Reparable.

---

### P-17 — Publish BusinessProvisioned

**Fase:** 2 (último paso)
**Dominio responsable:** Business
**Disparado por:** Coordinador de provisioning — cuando todos los pasos críticos han completado

**Qué hace:**
- Cambia el estado del Business de `provisioning` a `active` (o `verifying` si el email no fue confirmado aún)
- Publica `system.business_provisioned` (Platform Event — marca la finalización del ciclo de provisioning)

**Pasos críticos requeridos antes de P-17:**
P-03 (FiscalProfile), P-05 (Theme), P-06 (Email Layout), P-08 (Security Domain), P-09 (Events), P-14 (ChartOfAccounts), P-15 (PostingRules), P-16 (Storage Namespace)

**Pasos opcionales (no bloquean P-17):**
P-11, P-12, P-13 (Analytics — el Business puede operar sin analytics)

---

## Recursos por defecto de un Business

Todo Business tiene los siguientes recursos desde el momento en que `BusinessProvisioned` es publicado:

```
BUSINESS (Tenant Root)
│
├── [Business domain]
│   ├── FiscalProfile (incompleto — sin ABN ni cuenta bancaria)
│   └── BusinessPersonality (timezone, locale, currency, working week)
│
├── [Communications Platform]  ← activos disponibles DESPUÉS de configurar token
│   ├── Theme (default — colores de la plataforma)
│   ├── LayoutTemplates
│   │   ├── default_email_layout (con {{content}})
│   │   └── default_pdf_layout (con {{content}})
│   ├── Domains (definidos en Seed Catalog, creados al configurar token)
│   │   ├── security (isSystem: true)
│   │   ├── billing (al implementar Sprint 6)
│   │   └── documents (al implementar Sprint 9)
│   └── Events (bajo sus dominios, desde Seed Catalog)
│       ├── security.company_verify_email
│       ├── security.company_user_invitation
│       ├── security.company_password_changed
│       ├── security.company_forgot_password
│       ├── security.company_welcome_message
│       └── ... (todos los del Seed Catalog)
│
│   NOTA: Sin token configurado, este bloque NO existe.
│   Los eventos Platform (security.*) funcionan sin token del Business
│   porque usan el token de la empresa base.
│   Los eventos Business requieren token propio.
│
├── [Analytics]
│   ├── AnalyticsWorkspace
│   ├── ReadModels (vacíos — se llenan con operación)
│   │   ├── BusinessDashboardView
│   │   ├── AccountsReceivableView
│   │   ├── RevenueByPeriodView
│   │   └── WorkloadView
│   └── KPICatalog
│       ├── gross_revenue_mtd
│       ├── outstanding_ar
│       ├── collections_rate
│       └── effective_hourly_rate
│
├── [Accounting]
│   └── ChartOfAccounts (desde plantilla estándar de la jurisdicción)
│       └── Accounts (AR, AP, Revenue, GST, etc.)
│
├── [Financial]
│   └── PostingRules (para todos los FinancialTransaction types)
│
└── [Document Management]
    └── StorageNamespace (aislado, con reglas de retención por tipo)
```

### Lo que el Business Owner debe configurar manualmente

Estos recursos no se aprovisionan automáticamente porque requieren información o decisiones específicas del Business Owner:

| Recurso | Por qué no se auto-provisiona |
|---|---|
| ABN y cuenta bancaria (FiscalProfile) | Datos legales únicos del Business — no los conoce la plataforma |
| Credenciales de proveedor de email (SMTP, API Key) | Vinculan a infraestructura externa del Business |
| Enabled Providers (canal → proveedor) | Decisión explícita del Business Owner sobre qué proveedor usar |
| Customers, Contracts, Rates | Datos de negocio propios del Business |
| Calendar Integration | Requiere autorización OAuth del usuario |

---

## Platform Events vs Company Events

Esta es una separación arquitectónica fundamental del ERP. Confundirlos genera problemas de seguridad y de aislamiento entre tenants.

```
PLATFORM EVENTS                    COMPANY EVENTS
─────────────────────              ──────────────────────────────
Publicados por: Plataforma         Publicados por: dominios del Business
Dominio: security.*, system.*      Dominio: invoice.*, payment.*,
                                   customer.*, contract.*, work.*,
                                   analytics.*, documents.*

Incluyen businessId: No            Incluyen businessId: Siempre
(son del sistema global)           (discriminador de tenant)

Configurables por Business: No     Configurables por Business: Sí
(son del sistema — solo Platform   (templates, workflows, notificaciones)
Admin puede modificarlos)

Consumidos por: Plataforma         Consumidos por: dominios del mismo
                                   Business (nunca por otro Business)
```

### Catálogo de Platform Events

| Event Key | Cuándo se publica |
|---|---|
| `system.business_created` | Fase 1 del provisioning completa |
| `system.business_provisioned` | Fase 2 del provisioning completa |
| `system.subscription_changed` | Plan del Business cambia |
| `system.business_archived` | Business pasa a estado `archived` |
| `system.maintenance_started` | Plataforma entra en mantenimiento |
| `security.user_registered` | Usuario completa registro público |
| `security.email_verified` | Usuario confirma su email |
| `security.password_reset` | Usuario completa el reset de contraseña |
| `security.platform_admin_invitation` | Platform Admin invita a otro Platform Admin |

### Catálogo de Company Events (por fase de habilitación)

| Fase | Dominio | Event Keys |
|---|---|---|
| Fase 1 (provisioning) | `security` | `security.company_verify_email`, `security.company_user_invitation`, `security.company_password_changed`, `security.company_forgot_password`, `security.company_welcome_message` |
| Fase 3 (Billing) | `invoices` | `invoice.draft_created`, `invoice.sent`, `invoice.viewed`, `invoice.overdue`, `invoice.paid`, `invoice.voided` |
| Fase 3 (Billing) | `payments` | `payment.received`, `payment.reversed` |
| Fase 2 (Work) | `contracts` | `contract.created`, `contract.activated`, `contract.completed`, `contract.cancelled` |
| Fase 2 (Work) | `work` | `work_event.confirmed`, `work_event.voided` |
| Fase 3+ | `customers` | `customer.created`, `customer.updated`, `customer.inactive` |

> Los Company Events de fases futuras (Billing, Work) son dominios reservados en el Company Event Catalog. Se crean durante el provisioning del módulo correspondiente — no durante el provisioning inicial del Business.

---

## Tabla de Ownership

Define qué pertenece al Business (tenant de usuario), qué pertenece a la Plataforma, y qué es compartido.

| Recurso | Business | Platform | Notas |
|---|---|---|---|
| Customers | ✅ | | Aislados por `businessId` |
| Contacts | ✅ | | Pertenecen al Customer del Business |
| Contracts | ✅ | | Creados por el Business |
| Rates | ✅ | | Dentro de los Contracts del Business |
| WorkEvents | ✅ | | Registrados por Users del Business |
| Invoices | ✅ | | Emitidas por el Business |
| InvoiceItems | ✅ | | Dentro de las Invoices del Business |
| Payments | ✅ | | Registrados contra Invoices del Business |
| FinancialTransactions | ✅ | | Con `businessId` como discriminador |
| JournalEntries | ✅ | | Del General Ledger del Business |
| ChartOfAccounts | ✅ | Plantilla de ✅ | Creado desde plantilla de Platform, owned por Business |
| PostingRules | ✅ | Plantilla de ✅ | Creado desde plantilla de Platform, owned por Business |
| FiscalPeriods | ✅ | | Gestionados por el Business |
| FiscalProfile | ✅ | | ABN, GST, cuenta bancaria del Business |
| Business Personality | ✅ | | Timezone, locale, working week del Business |
| Documents | ✅ | | Almacenados en el namespace del Business |
| Analytics Workspace | ✅ | | Datos de analytics aislados por Business |
| Read Models | ✅ | | Derivados de los Domain Events del Business |
| KPI Catalog | ✅ | | Catálogo de métricas del Business |
| Company Event Catalog | ✅ | Provisiona ✅ | Platform provisiona; Business configura y extiende |
| Default Theme | ✅ | Provisiona ✅ | Platform crea el default; Business lo personaliza |
| Layout Templates | ✅ | Provisiona ✅ | Platform crea los defaults; Business los edita |
| Security Domain | ✅ | `isSystem` de ✅ | Platform lo marca como sistema; Business no puede borrarlo |
| IntegrationConnections | ✅ | | Credenciales cifradas del Business |
| JWT / Access Tokens | | ✅ | Emitidos y validados por la plataforma |
| Credenciales (email, contraseña) | | ✅ | Gestionadas por Identity — nunca por Business |
| MFA | | ✅ | Gestionado por Identity |
| Security Logs | | ✅ | Audit log del sistema — no del Business |
| Platform Settings | | ✅ | Configuración global de la plataforma |
| Subscriptions / Billing del SaaS | | ✅ | La plataforma factura al Business, no al revés |
| PostingRule templates | | ✅ | Las plantillas son de Platform; las instancias son del Business |
| Global Channel Providers | | ✅ | Los proveedores de email/SMS están en Platform |
| Platform Event Bus | | ✅ | Infraestructura de la plataforma |

---

## Principios del Provisioning

**PP-01 — Todo Business nace operativo:**
Al finalizar el provisioning, el Business puede emitir facturas, enviar comunicaciones, y llevar contabilidad sin ningún paso manual adicional sobre sus recursos por defecto. Los únicos pasos manuales son los que requieren información que solo el Business Owner conoce (ABN, credenciales de email).

**PP-02 — El provisioning repara lo que falta:**
Volver a ejecutar el provisioning en un Business existente crea los activos faltantes y omite los existentes. Es seguro ejecutarlo N veces. Las personalizaciones del Business Owner nunca son sobrescritas (DEC-017 §21.3).

**PP-03 — Los Platform Events nunca pertenecen a un Business de usuario:**
`system.business_created` y `system.business_provisioned` son eventos de la plataforma — no del Business. Un Business de usuario no puede publicar ni configurar Platform Events (BR-PLT-003).

**PP-04 — La entrega de notificaciones es una decisión manual:**
El provisioning deja el Business "listo para personalización" en Communications — no "listo para entrega". La entrega requiere que el Business Owner configure explícitamente un proveedor de email y sus credenciales. Esta separación está documentada en DEC-017 §17.

**PP-05 — La Fase 1 es atómica o no ocurre:**
Si la creación del Business o del Owner User falla, ambos se revierten. No existe un Business sin Owner ni un Owner sin Business.

**PP-06 — La Fase 2 es eventual pero observable:**
Cada paso de la Fase 2 publica un Domain Event que el sistema puede monitorear. Si un paso falla, el fallo es visible en el ProvisioningReport (DEC-020 §10) y puede corregirse sin volver a ejecutar toda la Fase 2.

---

## Relación con decisiones existentes

| Decisión | Relación con este documento |
|---|---|
| **DEC-017** | Define el modelo de composición de notificaciones y los pasos P-05 a P-10. Este documento extiende DEC-017 hacia los dominios no-Communication (Accounting, Analytics, Document Management). |
| **DEC-020** | Define el proceso de cambio de activos de provisioning y la flag `isSystem`. Este documento referencia DEC-020 para la gestión de cambios en los activos de Communications. |
| **ADR-006** | Justifica por qué Business es el Tenant Root. Este documento describe el mecanismo que hace operativo al Tenant Root: el provisioning. |
| **ADR-005** | Justifica que las PostingRules son configuración, no código. Este documento documenta P-15 como consecuencia de esa decisión. |
| **ADR-003** | Justifica la FinancialTransaction como puente entre Billing y Accounting. El provisioning de PostingRules (P-15) hace posible ese puente para el Business. |

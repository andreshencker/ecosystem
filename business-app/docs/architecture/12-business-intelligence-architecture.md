# 12 — Business Intelligence Architecture

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial — Decisión arquitectónica cerrada  
**Autor:** CTOAgent  
**Referencias:** BC-10 (Analytics), `docs/domain/analytics/`, ADR-004

---

## La pregunta que responde este documento

El proyecto tiene dos cosas que parecen hacer lo mismo pero son fundamentalmente distintas:

1. **Analytics** — un Bounded Context dentro de `business-app/backend`
2. **Business Intelligence** — un microservicio separado en `business-intelligence/`

Este documento define con precisión qué es cada uno, qué datos viven en cada lado, cuándo se implementa cada uno, y cómo se sincronizan.

---

## 1. Qué es Analytics dentro del ERP

Analytics (BC-10) es el **motor analítico operativo del ERP**. Vive dentro de `business-app/backend` como un Bounded Context más, al mismo nivel que Billing, Work o Customer.

**Propósito:** Responder preguntas de negocio en tiempo real sin que el Frontend tenga que cruzar múltiples dominios operativos.

```
Pregunta operativa: "¿Cuánto facturé este mes y qué clientes me deben dinero?"
Respondida por: Analytics (BC-10) ← datos del event bus de business-app
Tiempo de respuesta: < 100ms (pre-calculado en Read Models)
```

**Características clave:**

| Característica | Valor |
|---|---|
| Ubicación física | `business-app/backend/src/analytics/` |
| Base de datos | MongoDB (mismo cluster que los demás BCs) |
| Latencia de respuesta | < 100ms para dashboards, < 1s para snapshots |
| Tenant awareness | Siempre filtra por `businessId` |
| Quién lo llama | Business App backend (nunca el frontend directamente) |
| Tipo de datos | Facts, Dimensions, Snapshots, Read Models pre-calculados |
| Mecanismo de alimentación | Domain Events del event bus interno de business-app |

Analytics **no es un proyecto separado**. Es un módulo de NestJS que corre en el mismo proceso que Billing, Work, y los demás dominios.

---

## 2. Qué es Business Intelligence como proyecto separado

Business Intelligence es un **microservicio Python/FastAPI independiente** ubicado en `business-app/business-intelligence/`. Es la capa de análisis **estratégico y dimensional** que complementa la analítica operativa de BC-10.

**Propósito:** Proporcionar análisis cross-tenant, reportes avanzados, pipelines de ML, y ser la fuente de datos para herramientas de BI externas (Metabase, PowerBI, Tableau).

```
Pregunta estratégica: "¿Cuáles de mis clientes tienen el mayor riesgo de pago tardío en los próximos 30 días, basado en el comportamiento histórico de los últimos 18 meses?"
Respondida por: Business Intelligence (servicio separado)
Tiempo de respuesta: segundos a minutos (queries complejos sobre datos históricos)
```

**Características clave:**

| Característica | Valor |
|---|---|
| Ubicación física | `business-app/business-intelligence/` |
| Stack | Python 3.11 + FastAPI + SQLAlchemy |
| Base de datos | **PostgreSQL Neon** (OLAP, star schema) |
| Latencia de respuesta | Segundos a minutos (analítica estratégica) |
| Tenant awareness | Soporta queries cross-tenant (platform_admin) y per-tenant |
| Quién lo llama | Business App backend (como proxy autenticado) |
| Tipo de datos | Dimensional model: tablas dim_ y fact_ |
| Mecanismo de alimentación | Event-driven + scheduled ETL desde business-app |

Business Intelligence **no reemplaza a Analytics**. Extiende sus capacidades hacia el análisis estratégico y dimensional.

---

## 3. Qué datos se guardan en business-app (MongoDB)

Business-app tiene **dos capas de datos**:

### 3a. Datos operativos (por dominio, MongoDB)

Los Aggregate Roots y entidades mutables de cada dominio operativo:

```
COLECCIONES OPERATIVAS (ejemplos):
  companies         ← BC-02 Business
  users             ← BC-01 Identity
  refresh_tokens    ← BC-01 Identity
  customers         ← BC-03 Customer
  contracts         ← BC-04 Work
  work_events       ← BC-04 Work
  invoices          ← BC-06 Billing
  invoice_items     ← BC-06 Billing
  payments          ← BC-06 Billing
  journal_entries   ← BC-08 Accounting
  ...
```

**Regla:** Datos mutables, con estado, regulados por business rules.

### 3b. Analytics Store (BC-10, MongoDB)

Los Read Models y Facts proyectados desde Domain Events:

```
COLECCIONES DE ANALYTICS (ejemplos):
  analytics.invoice_facts
  analytics.payment_facts
  analytics.work_event_facts
  analytics.customer_dimension
  analytics.business_dimension
  analytics.revenue_snapshots
  analytics.ar_snapshots
  analytics.processed_events      ← idempotencia
  analytics.invoice_list_view     ← Read Model ORM-01
  analytics.customer_summary_view ← Read Model ORM-02
  analytics.business_dashboard    ← Read Model ERM-01
  ...
```

**Regla:** Datos inmutables (Facts) o actualizados por events (Dimensions/Snapshots/Read Models). Solo lectura desde fuera del Analytics module.

---

## 4. Qué datos se guardan en business-intelligence (PostgreSQL Neon)

Business Intelligence usa un **modelo dimensional** (star/snowflake schema) en PostgreSQL Neon. Este modelo está optimizado para queries analíticos complejos, joins entre múltiples dimensiones, y procesamiento batch.

**Por qué PostgreSQL Neon (y no MongoDB):**
- PostgreSQL soporta SQL complejo, window functions, CTEs y GROUP BY — ideal para reportes
- Neon provee escalado serverless (paga por uso) — apropiado para workloads analíticos
- Los modelos dimensionales (dim_ / fact_) son naturalmente relacionales
- MongoDB es excelente para documentos y OLTP; PostgreSQL es mejor para OLAP

**Esquema dimensional:**

```sql
-- DIMENSIONES (de cambio lento)

dim_business          -- Un registro por Business (tenant)
dim_user              -- Usuarios del sistema
dim_customer          -- Clientes de cada Business
dim_time              -- Tabla de fechas pre-poblada (2020-2040)

-- HECHOS (inmutables, append-only)

fact_invoice          -- Una fila por Invoice emitida
fact_payment          -- Una fila por Payment registrado
fact_work_event       -- Una fila por WorkEvent confirmado
fact_customer_activity -- Una fila por actividad significativa de un Customer
```

Cada tabla se describe en detalle en la sección 5.

**Qué NO se almacena en PostgreSQL Neon:**
- Credenciales de usuarios (están en MongoDB, son secretos)
- Tokens de autenticación
- Entidades mutables (Invoice con estado modificable)
- Datos de configuración del ERP
- Ningún dato que requiera business rules sobre él

---

## 5. Modelos BI — definición de tablas

### `dim_business`

Dimensión de los tenants del sistema. Una fila por Business.

```sql
dim_business (
  business_id       UUID PRIMARY KEY,    -- businessId del ERP (ObjectId como UUID string)
  company_key       VARCHAR(100),         -- slug único del Business
  business_name     VARCHAR(200),
  jurisdiction      VARCHAR(10),          -- 'AU', 'NZ', etc.
  currency          CHAR(3),              -- 'AUD', 'USD', etc.
  timezone          VARCHAR(50),
  is_active         BOOLEAN DEFAULT TRUE,
  is_platform       BOOLEAN DEFAULT FALSE, -- TRUE solo para la modules company
  created_at        TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ           -- última actualización por evento
)
```

**Alimentado por:** `BusinessCreated`, `BusinessProfileUpdated`

---

### `dim_user`

Dimensión de usuarios del sistema (Business Owners, admins, staff).

```sql
dim_user (
  user_id           UUID PRIMARY KEY,
  business_id       UUID REFERENCES dim_business,
  email             VARCHAR(254),
  first_name        VARCHAR(100),
  last_name         VARCHAR(100),
  full_name         VARCHAR(200),   -- full_name = first_name || ' ' || last_name
  role              VARCHAR(50),    -- 'business_owner', 'business_admin', 'staff', etc.
  scope             VARCHAR(20),    -- 'global' | 'company'
  is_active         BOOLEAN,
  created_at        TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ
)
```

**Alimentado por:** `UserRegistered`, `UserActivated`, `UserDeactivated`

---

### `dim_customer`

Dimensión de los clientes de cada Business.  
SCD Type 1: el nombre actual sobrescribe el anterior (no historial de renombrados).

```sql
dim_customer (
  customer_id       UUID PRIMARY KEY,
  business_id       UUID REFERENCES dim_business,
  display_name      VARCHAR(200),
  customer_type     VARCHAR(20),   -- 'company' | 'individual'
  abn               VARCHAR(11),
  email             VARCHAR(254),
  is_active         BOOLEAN,
  created_at        TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ
)
```

**Alimentado por:** `CustomerCreated`, `CustomerUpdated`, `CustomerDeactivated`

---

### `dim_time`

Tabla de fechas pre-poblada. No se alimenta de eventos — se genera una sola vez en el setup.

```sql
dim_time (
  date_key          DATE PRIMARY KEY,    -- 2026-07-05
  year              INT,
  quarter           INT,                  -- 1-4
  fiscal_year       INT,                  -- AU: año que termina en junio
  fiscal_quarter    INT,                  -- AU: Q1 = julio-septiembre
  month             INT,
  month_name        VARCHAR(20),
  week_of_year      INT,
  day_of_week       INT,                  -- 1=Monday..7=Sunday
  is_weekend        BOOLEAN,
  is_au_public_holiday BOOLEAN DEFAULT FALSE  -- futuro
)
```

---

### `fact_invoice`

Un registro por Invoice emitida. Inmutable: si una factura es anulada, se agrega una fila de reversión en lugar de modificar la original.

```sql
fact_invoice (
  fact_id           UUID PRIMARY KEY,
  -- Claves foráneas
  business_id       UUID REFERENCES dim_business,
  customer_id       UUID REFERENCES dim_customer,
  issue_date_key    DATE REFERENCES dim_time,
  due_date_key      DATE REFERENCES dim_time,
  -- Identidad operativa
  invoice_id        UUID NOT NULL,    -- ObjectId del ERP
  invoice_number    VARCHAR(50),
  event_id          UUID UNIQUE,      -- idempotencia: un event_id = una fila
  -- Montos
  subtotal          NUMERIC(18,2),
  tax_amount        NUMERIC(18,2),
  gross_amount      NUMERIC(18,2),
  currency          CHAR(3),
  -- Estado (al momento del evento)
  status            VARCHAR(20),      -- 'sent', 'paid', 'voided', etc.
  sent_at           TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  voided_at         TIMESTAMPTZ,
  is_voided         BOOLEAN DEFAULT FALSE,
  -- Métricas derivadas
  work_event_count  INT,
  days_to_due       INT,              -- (due_date - issue_date)
  -- Auditoría
  ingested_at       TIMESTAMPTZ DEFAULT NOW()
)
```

**Alimentado por:** `InvoiceSent`, `InvoicePaid`, `InvoiceVoided`

---

### `fact_payment`

Un registro por Payment registrado.

```sql
fact_payment (
  fact_id           UUID PRIMARY KEY,
  business_id       UUID REFERENCES dim_business,
  customer_id       UUID REFERENCES dim_customer,
  payment_date_key  DATE REFERENCES dim_time,
  -- Identidad operativa
  payment_id        UUID NOT NULL,
  invoice_id        UUID NOT NULL,
  event_id          UUID UNIQUE,
  -- Montos
  amount            NUMERIC(18,2),
  currency          CHAR(3),
  payment_method    VARCHAR(50),
  -- Estado
  is_reversed       BOOLEAN DEFAULT FALSE,
  reversed_at       TIMESTAMPTZ,
  -- Métricas derivadas
  days_to_payment   INT,              -- (payment_date - invoice_issue_date)
  ingested_at       TIMESTAMPTZ DEFAULT NOW()
)
```

**Alimentado por:** `PaymentRecorded`, `PaymentReversed`

---

### `fact_work_event`

Un registro por WorkEvent confirmado.

```sql
fact_work_event (
  fact_id           UUID PRIMARY KEY,
  business_id       UUID REFERENCES dim_business,
  customer_id       UUID REFERENCES dim_customer,
  user_id           UUID REFERENCES dim_user,
  work_date_key     DATE REFERENCES dim_time,
  -- Identidad operativa
  work_event_id     UUID NOT NULL,
  contract_id       UUID,
  event_id          UUID UNIQUE,
  -- Métricas
  duration_minutes  INT,
  duration_hours    NUMERIC(8,2),
  calculated_amount NUMERIC(18,2),
  currency          CHAR(3),
  rate_type         VARCHAR(30),     -- 'standard', 'overtime', 'weekend', etc.
  billable          BOOLEAN,
  -- Estado
  is_voided         BOOLEAN DEFAULT FALSE,
  invoiced_at       TIMESTAMPTZ,
  source            VARCHAR(20),     -- 'manual' | 'calendar'
  ingested_at       TIMESTAMPTZ DEFAULT NOW()
)
```

**Alimentado por:** `WorkEventConfirmed`, `WorkEventVoided`, `WorkEventInvoiced`

---

### `fact_customer_activity`

Una fila por actividad significativa de un Customer: creación, desactivación, primera factura, primer pago. Permite analizar el ciclo de vida del cliente.

```sql
fact_customer_activity (
  fact_id           UUID PRIMARY KEY,
  business_id       UUID REFERENCES dim_business,
  customer_id       UUID REFERENCES dim_customer,
  activity_date_key DATE REFERENCES dim_time,
  event_id          UUID UNIQUE,
  -- Tipo de actividad
  activity_type     VARCHAR(50),
    -- 'customer_created'
    -- 'customer_deactivated'
    -- 'first_invoice_sent'
    -- 'first_payment_received'
    -- 'reactivated'
  -- Contexto
  reference_id      UUID,            -- invoiceId, paymentId si aplica
  amount            NUMERIC(18,2),   -- si es una transacción financiera
  ingested_at       TIMESTAMPTZ DEFAULT NOW()
)
```

**Alimentado por:** `CustomerCreated`, `CustomerDeactivated`, `InvoiceSent` (primera vez), `PaymentRecorded` (primera vez)

---

## 6. Cuándo se implementa BI en el roadmap

### La respuesta corta

**BI no es parte de los primeros 11 sprints del ERP.** Se implementa después de que Analytics Fase 1 está en producción y el ERP tiene datos reales acumulados.

### Mapa de dependencias

```
Sprint 1-2   Platform + Customer           → Sin Analytics, sin BI
Sprint 3     Calendar Domain               → Sin Analytics, sin BI
Sprint 4     Work + Rate Engine            → Sin Analytics, sin BI
Sprint 5     Revenue Domain               → Sin Analytics, sin BI
Sprint 6     Billing Domain               → Sin Analytics, sin BI ← primer punto de datos
Sprint 7     Financial Engine             → Sin Analytics, sin BI
Sprint 8     Accounting Engine            → Sin Analytics, sin BI
Sprint 9     Document Platform            → Sin Analytics, sin BI
Sprint 10    Communications Integration   → Sin Analytics, sin BI
Sprint 11    Analytics Engine (Fase 1)    ← Analytics BC-10 se implementa aquí
             ↓ (6+ meses de datos en producción)
BI           Business Intelligence        ← BI se implementa después de Sprint 11
             (no tiene número de sprint fijo — depende de datos acumulados)
```

### Por qué Analytics primero, BI después

Analytics (BC-10) es el prerequisito de BI:
1. BI necesita datos históricos limpios y estructurados
2. BC-10 (Analytics) produce esos datos como parte normal del ERP
3. Sin 6+ meses de datos en producción, el modelo dimensional de BI no tiene sentido
4. BI se implementa cuando el Business Owner ya usa el ERP y quiere análisis más profundos

---

## 7. Sprint 1 y Sprint 2: ¿deben implementar BI?

**No. De ninguna forma.**

| Sprint | BI real | Contrato/Evento | Razón |
|---|---|---|---|
| Sprint 1 | ❌ | ❌ | No hay datos que analizar. Platform Foundation. |
| Sprint 2 | ❌ | ❌ | Customer y MDM. No hay hechos financieros aún. |
| Sprint 3-10 | ❌ | ❌ | Construyendo los dominios que producirán los hechos. |
| Sprint 11 | Parcial | ✅ | Analytics BC-10 arranca. Sin BI externo todavía. |
| Post-Sprint 11 | ✅ | ✅ | BI arranca cuando hay 6+ meses de datos reales. |

**Lo que SÍ deben hacer Sprint 1 y Sprint 2:**
- Publicar los Domain Events correctos desde sus dominios (CustomerCreated, UserRegistered, etc.)
- Esos eventos serán consumidos por Analytics cuando BC-10 sea implementado en Sprint 11
- No hay código de Analytics ni BI en Sprint 1 o Sprint 2

**El contrato que Sprint 2 debe cumplir:**
El Customer domain debe publicar `CustomerCreated` y `CustomerDeactivated` con el payload correcto. Cuando llegue Sprint 11, Analytics los consumirá. No hay que hacer nada especial ahora — solo publicar los eventos.

---

## 8. Cómo se sincronizan los datos

### Entre business-app y Analytics BC-10 (dentro del mismo sistema)

```
business-app domains        Analytics BC-10
    │                            │
    │  Domain Event publicado    │
    │  via EventBus interno      │
    └──────────────────────────► │
                                 │  Event Handler
                                 │  (idempotente)
                                 │
                                 ▼
                          Analytics Store (MongoDB)
                          Facts, Dimensions, Snapshots
```

**Mecanismo:** Event-driven, tiempo real (< 1s de lag).  
**Idempotencia:** `processed_events` collection con `eventId`.  
**Rebuild:** Replay completo desde el event log si hay corrupción.

---

### Entre business-app y Business Intelligence (sistemas separados)

BI recibe datos de business-app a través de **dos mecanismos complementarios**:

**Mecanismo 1 — Event forwarding (principal, tiempo real)**

```
business-app Event Bus
        │
        │  [Event forwarding bridge]
        │  business-app publica eventos al bus externo
        │  BI Service suscribe al bus externo
        ▼
BI Ingestion Service (Python)
        │
        ▼
PostgreSQL Neon (INSERT INTO fact_invoice...)
```

Eventos que BI consume del bus externo:
- `CustomerCreated`, `CustomerDeactivated`
- `InvoiceSent`, `InvoicePaid`, `InvoiceVoided`
- `PaymentRecorded`, `PaymentReversed`
- `WorkEventConfirmed`, `WorkEventVoided`
- `UserRegistered`, `UserDeactivated`
- `BusinessCreated`, `BusinessProfileUpdated`

**Mecanismo 2 — Scheduled API pull (bootstrap y reconciliación)**

```
BI ETL Job (scheduled, diario)
        │
        │  GET /api/analytics/export/invoices?from=&to=
        │  GET /api/analytics/export/customers?from=&to=
        │  (Endpoints de export en business-app, autenticados con service token)
        ▼
BI Ingestion Service
        │
        ▼
PostgreSQL Neon (UPSERT)
```

Usado para:
- Backfill histórico al desplegar BI por primera vez
- Reconciliación diaria para detectar eventos perdidos
- **No es el mecanismo principal** — solo complementario

**Mecanismo 3 — Direct MongoDB replication (PROHIBIDO)**

```
❌ BI Service → MongoDB de business-app directamente
```

**Nunca.** BI no tiene acceso a la base de datos operativa. Viola el principio de separación entre contextos.

---

## 9. Qué base de datos usa BI

**PostgreSQL Neon** (PostgreSQL serverless en la nube).

### Por qué Neon específicamente

| Característica | Beneficio para BI |
|---|---|
| PostgreSQL nativo | SQL completo, window functions, CTEs, GROUP BY |
| Serverless | Escala a cero — sin costo cuando no hay queries |
| Branching | Se puede crear una rama de la DB para tests sin afectar producción |
| Columnar storage (futuro) | Para analytics de alto volumen |
| Compatibilidad con pgvector | Para ML embeddings en Fase 4+ |

### Alternativas consideradas y descartadas

| Alternativa | Por qué descartada |
|---|---|
| MongoDB (igual que business-app) | No es OLAP; SQL analytics es más natural para dimensional model |
| BigQuery | Costo y complejidad excesiva para esta etapa |
| DuckDB | Ideal para analytics local; Neon tiene mejor persistencia en la nube |
| Snowflake | Over-engineering para el tamaño actual del proyecto |

---

## 10. Qué NO debe hacer BI

```
❌ BI no gestiona autenticación ni sesiones
   → Auth es responsabilidad de business-app (BC-01 Identity)
   → BI recibe businessId ya autenticado como parámetro

❌ BI no aplica reglas de negocio
   → Las business rules existen en los dominios operativos
   → BI solo observa y calcula métricas desde hechos ya ocurridos

❌ BI no crea ni modifica entidades operativas
   → No crea Customers
   → No crea Users
   → No crea Invoices
   → No crea Payments
   → BI es de solo lectura desde la perspectiva del ERP

❌ BI no accede a MongoDB de business-app directamente
   → Todo dato llega vía Domain Events o API pull
   → El schema de MongoDB puede cambiar sin afectar a BI

❌ BI no es el gateway de datos para el frontend del Business App
   → Analytics BC-10 (MongoDB) sirve las pantallas operativas
   → BI sirve reportes avanzados y herramientas externas
   → Business App actúa como proxy autenticado entre ambos

❌ BI no reemplaza a Analytics BC-10
   → Son complementarios: Analytics es operacional, BI es estratégico
   → Eliminar uno de los dos dejaría un hueco funcional

❌ BI no se implementa en los primeros 11 sprints
   → No hay datos suficientes para que un modelo dimensional tenga valor
   → Primero el ERP debe producir hechos financieros reales
```

---

## Mapa de decisión: ¿Analytics o BI?

Cuando surge la pregunta "¿dónde va esto?", usar este árbol:

```
¿Es una pregunta operativa que el Business Owner necesita en tiempo real?
    SÍ → Analytics BC-10 (MongoDB, dentro de business-app)
    │
    └── Ejemplos: dashboard principal, lista de facturas, saldo AR

¿Es un reporte histórico profundo que requiere cruzar múltiples dimensiones
y varios meses de datos?
    SÍ → Business Intelligence (PostgreSQL Neon, servicio separado)
    │
    └── Ejemplos: P&L últimos 12 meses, segmentación de clientes, forecast de revenue

¿Es un ML model o análisis predictivo?
    SÍ → Business Intelligence (alimenta la Feature Store para ML)

¿Es una integración con Metabase/PowerBI/Tableau?
    SÍ → Business Intelligence (expone el star schema via SQL)
```

---

## Diagrama de la arquitectura completa

```
┌──────────────────────────────────────────────────────────────────────┐
│                        BUSINESS APP                                  │
│                                                                      │
│  ┌────────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────────┐ │
│  │ CUSTOMER   │  │ BILLING  │  │   WORK   │  │   ... otros BCs    │ │
│  │  (BC-03)   │  │ (BC-06)  │  │  (BC-04) │  │                    │ │
│  └─────┬──────┘  └────┬─────┘  └────┬─────┘  └─────────┬──────────┘ │
│        │              │             │                    │            │
│        └──────────────┴─────────────┴────────────────────┘            │
│                            EVENT BUS (interno)                        │
│                                 │                                     │
│                                 ▼                                     │
│                    ┌────────────────────────┐                         │
│                    │   ANALYTICS (BC-10)    │                         │
│                    │   MongoDB              │                         │
│                    │   Facts, Dimensions    │                         │
│                    │   Read Models, KPIs    │                         │
│                    └─────────────┬──────────┘                         │
│                                  │ (solo desde business-app backend)  │
│  ┌────────────────────────────┐   │                                    │
│  │   BUSINESS APP BACKEND     │◄──┘                                    │
│  │   Auth + RBAC gateway      │                                        │
│  └──────────┬─────────────────┘                                        │
└─────────────┼────────────────────────────────────────────────────────┘
              │                              │
              │ (dashboard operativo)        │ (API pull + event bridge)
              ▼                              ▼
       FRONTEND                   ┌──────────────────────────┐
       (React/Next.js)            │  BUSINESS INTELLIGENCE   │
                                  │  Python/FastAPI          │
                                  │  PostgreSQL Neon         │
                                  │  dim_ + fact_ tables     │
                                  └──────────────────────────┘
                                              │
                                              │ (SQL export)
                                              ▼
                                    Metabase / PowerBI / Tableau
```

---

## Estado actual del proyecto BI

| Componente | Estado |
|---|---|
| `business-intelligence/app/main.py` | Skeleton básico (FastAPI + health endpoint) |
| `business-intelligence/requirements.txt` | FastAPI + Uvicorn + Pydantic |
| PostgreSQL Neon | No configurado todavía |
| Ingestion service | No implementado todavía |
| Dimensional model | Definido en este documento (pendiente de implementación) |
| Event bridge | No implementado todavía |

**El skeleton existe pero no debe expandirse hasta que Analytics BC-10 esté implementado (Sprint 11).**

---

## Acción requerida por sprint

| Sprint | Acción BI | Responsable |
|---|---|---|
| 1-10 | Nada. Solo publicar Domain Events correctos. | Agentes de dominio |
| 11 | Implementar Analytics BC-10 (MongoDB) | AnalyticsAgent |
| Post-11 | Configurar PostgreSQL Neon, implementar ingestion ETL | ProvisioningAgent + AnalyticsAgent |
| Post-11 | Implementar dim_ y fact_ tables | AnalyticsAgent |
| Post-11 | Configurar event bridge | IntegrationAgent |
| Post-11 | Implementar Query API en BI service | AnalyticsAgent |

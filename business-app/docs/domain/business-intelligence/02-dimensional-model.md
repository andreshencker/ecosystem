# 02 — Dimensional Model (Data Warehouse)

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial

El Data Warehouse de BI usa un modelo dimensional (star schema) en PostgreSQL Neon. Optimizado para SQL analítico: window functions, CTEs, GROUP BY, JOINs entre dimensiones.

---

## Principios del modelo

- **Append-only facts:** Una fila de fact nunca se modifica. Las reversiones generan una nueva fila con signo negativo o flag `is_reversed`.
- **SCD Type 1 en dimensiones:** Las dimensiones se sobrescriben con el estado actual. No se mantiene historial de cambios de nombre.
- **Idempotencia por `event_id`:** Cada fila tiene un `event_id` (UUID del Domain Event) con constraint UNIQUE. Reprocesar el mismo evento no genera duplicados.
- **`business_id` en todas las tablas:** Discriminador de tenant. Nunca se omite.

---

## Dimensiones (dim_)

### `dim_business`

```sql
dim_business (
  business_id        UUID PRIMARY KEY,
  company_key        VARCHAR(100) UNIQUE,
  business_name      VARCHAR(200) NOT NULL,
  jurisdiction       VARCHAR(10),              -- 'AU', 'NZ', etc.
  currency           CHAR(3),                  -- 'AUD', 'USD', etc.
  timezone           VARCHAR(50),
  is_active          BOOLEAN DEFAULT TRUE,
  is_platform        BOOLEAN DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL,
  updated_at         TIMESTAMPTZ NOT NULL
)
```

Alimentada por: `BusinessCreated`, `BusinessProfileUpdated`

---

### `dim_user`

```sql
dim_user (
  user_id            UUID PRIMARY KEY,
  business_id        UUID NOT NULL REFERENCES dim_business,
  email              VARCHAR(254) NOT NULL,
  first_name         VARCHAR(100),
  last_name          VARCHAR(100),
  full_name          VARCHAR(201),   -- computed: first + ' ' + last
  role               VARCHAR(50),    -- 'business_owner', 'business_admin', etc.
  scope              VARCHAR(20),    -- 'global' | 'company'
  is_active          BOOLEAN DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL,
  updated_at         TIMESTAMPTZ NOT NULL
)
```

Alimentada por: `UserRegistered`, `UserActivated`, `UserDeactivated`

---

### `dim_customer`

SCD Type 1: el nombre actual sobrescribe el anterior.

```sql
dim_customer (
  customer_id        UUID PRIMARY KEY,
  business_id        UUID NOT NULL REFERENCES dim_business,
  display_name       VARCHAR(200) NOT NULL,
  customer_type      VARCHAR(20) NOT NULL,   -- 'company' | 'individual'
  abn                VARCHAR(11),
  email              VARCHAR(254),
  is_active          BOOLEAN DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL,
  updated_at         TIMESTAMPTZ NOT NULL
)
```

Alimentada por: `CustomerCreated`, `CustomerUpdated`, `CustomerDeactivated`

---

### `dim_time`

Pre-poblada al inicializar el Data Warehouse. Cubre 2020-2040.

```sql
dim_time (
  date_key           DATE PRIMARY KEY,
  year               INT NOT NULL,
  quarter            INT NOT NULL,           -- 1-4
  fiscal_year        INT,                    -- AU: año que termina en junio
  fiscal_quarter     INT,                    -- AU: Q1=jul-sep
  month              INT NOT NULL,
  month_name         VARCHAR(20),
  week_of_year       INT,
  day_of_week        INT,                    -- 1=Mon..7=Sun
  is_weekend         BOOLEAN NOT NULL,
  is_au_public_holiday BOOLEAN DEFAULT FALSE
)
```

---

## Facts (fact_)

### `fact_invoice`

Una fila por evento de Invoice. Append-only.

```sql
fact_invoice (
  fact_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id           UUID NOT NULL UNIQUE,   -- idempotencia

  -- FKs
  business_id        UUID NOT NULL REFERENCES dim_business,
  customer_id        UUID REFERENCES dim_customer,
  issue_date_key     DATE REFERENCES dim_time,
  due_date_key       DATE REFERENCES dim_time,

  -- Operacional
  invoice_id         UUID NOT NULL,
  invoice_number     VARCHAR(50),

  -- Montos
  subtotal           NUMERIC(18,2) DEFAULT 0,
  tax_amount         NUMERIC(18,2) DEFAULT 0,
  gross_amount       NUMERIC(18,2) NOT NULL,
  currency           CHAR(3) NOT NULL DEFAULT 'AUD',

  -- Estado al momento del evento
  event_type         VARCHAR(30) NOT NULL,   -- 'sent'|'paid'|'voided'|'overdue'
  is_voided          BOOLEAN DEFAULT FALSE,

  -- Métricas derivadas
  work_event_count   INT DEFAULT 0,
  days_to_due        INT,

  ingested_at        TIMESTAMPTZ DEFAULT NOW()
)
```

Alimentada por: `InvoiceSent`, `InvoicePaid`, `InvoiceVoided`, `InvoiceOverdue`

---

### `fact_payment`

Una fila por Payment registrado.

```sql
fact_payment (
  fact_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id           UUID NOT NULL UNIQUE,

  -- FKs
  business_id        UUID NOT NULL REFERENCES dim_business,
  customer_id        UUID REFERENCES dim_customer,
  payment_date_key   DATE REFERENCES dim_time,

  -- Operacional
  payment_id         UUID NOT NULL,
  invoice_id         UUID NOT NULL,

  -- Montos
  amount             NUMERIC(18,2) NOT NULL,
  currency           CHAR(3) NOT NULL DEFAULT 'AUD',
  payment_method     VARCHAR(50),

  -- Estado
  is_reversed        BOOLEAN DEFAULT FALSE,

  -- Métricas derivadas
  days_to_payment    INT,   -- payment_date - invoice_issue_date

  ingested_at        TIMESTAMPTZ DEFAULT NOW()
)
```

Alimentada por: `PaymentRecorded`, `PaymentReversed`

---

### `fact_work_event`

Una fila por WorkEvent confirmado.

```sql
fact_work_event (
  fact_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id           UUID NOT NULL UNIQUE,

  -- FKs
  business_id        UUID NOT NULL REFERENCES dim_business,
  customer_id        UUID REFERENCES dim_customer,
  user_id            UUID REFERENCES dim_user,
  work_date_key      DATE REFERENCES dim_time,

  -- Operacional
  work_event_id      UUID NOT NULL,
  contract_id        UUID,

  -- Métricas
  duration_minutes   INT NOT NULL,
  duration_hours     NUMERIC(8,2) NOT NULL,
  calculated_amount  NUMERIC(18,2),
  currency           CHAR(3) DEFAULT 'AUD',
  rate_type          VARCHAR(30),   -- 'standard'|'overtime'|'weekend'|'night'
  billable           BOOLEAN DEFAULT TRUE,

  -- Estado
  is_voided          BOOLEAN DEFAULT FALSE,
  source             VARCHAR(20),  -- 'manual'|'calendar'

  ingested_at        TIMESTAMPTZ DEFAULT NOW()
)
```

Alimentada por: `WorkEventConfirmed`, `WorkEventVoided`

---

### `fact_customer_activity`

Una fila por actividad significativa del ciclo de vida del cliente.

```sql
fact_customer_activity (
  fact_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id           UUID NOT NULL UNIQUE,

  -- FKs
  business_id        UUID NOT NULL REFERENCES dim_business,
  customer_id        UUID NOT NULL REFERENCES dim_customer,
  activity_date_key  DATE NOT NULL REFERENCES dim_time,

  -- Tipo de actividad
  activity_type      VARCHAR(50) NOT NULL,
    -- 'customer_created'
    -- 'customer_deactivated'
    -- 'first_invoice_sent'
    -- 'first_payment_received'

  -- Contexto opcional
  reference_id       UUID,
  amount             NUMERIC(18,2),
  currency           CHAR(3),

  ingested_at        TIMESTAMPTZ DEFAULT NOW()
)
```

Alimentada por: `CustomerCreated`, `CustomerDeactivated`, `InvoiceSent` (primera vez por customer), `PaymentRecorded` (primera vez por customer)

---

## Índices principales

```sql
-- Filtro de tenant (obligatorio en todas las queries)
CREATE INDEX ON fact_invoice(business_id, issue_date_key);
CREATE INDEX ON fact_payment(business_id, payment_date_key);
CREATE INDEX ON fact_work_event(business_id, work_date_key);
CREATE INDEX ON fact_customer_activity(business_id, activity_date_key);

-- Customer analytics
CREATE INDEX ON fact_invoice(business_id, customer_id);
CREATE INDEX ON fact_payment(business_id, customer_id);

-- Idempotencia
-- (event_id ya tiene UNIQUE constraint = índice implícito)
```

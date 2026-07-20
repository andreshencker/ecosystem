# Invoice App — ERP Architecture

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Arquitectura oficial

---

## Visión

Invoice App es un **ERP modular, multi-tenant y extensible** para freelancers, contractors y pequeñas empresas. No es una app de facturación. Es un sistema operativo financiero que cubre el ciclo completo del negocio — desde el tiempo trabajado hasta la contabilidad.

La plataforma está diseñada para escalar a lo largo de una década sin requerir rediseños estructurales. Cada módulo nuevo se agrega; ninguno rompe lo existente.

---

## Principios arquitectónicos

| # | Principio | En una frase |
|---|---|---|
| P1 | **Bounded Contexts** | Cada dominio posee su información y no comparte estado con otros. |
| P2 | **Event-Driven** | Los dominios se comunican exclusivamente a través de Domain Events. |
| P3 | **Single Owner** | Cada pieza de información tiene exactamente un dueño. Solo él la modifica. |
| P4 | **FinancialTransaction como contrato** | El único puente entre operaciones y contabilidad. |
| P5 | **Read Models separados** | Los reportes nunca consultan modelos de escritura directamente. |
| P6 | **Multi-tenancy nativa** | Todo dato está aislado por `businessId` desde el diseño. |
| P7 | **Extensión aditiva** | Nuevos módulos se agregan; nunca modifican los existentes. |
| P8 | **Idempotencia obligatoria** | Procesar el mismo evento dos veces produce el mismo resultado. |
| P9 | **Reversibilidad sobre eliminación** | Los hechos del pasado no se borran; se revierten. |
| P10 | **Jurisdicción en datos** | Las reglas fiscales viven en configuración, no en código. |

---

## Los doce dominios del ERP

```
┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
│  IDENTITY  │  │  BUSINESS  │  │  CUSTOMER  │  │   WORK     │
│            │  │            │  │            │  │            │
│ Auth       │  │ Business   │  │ Customer   │  │ Contract   │
│ Users      │  │ FiscalProf │  │ Contact    │  │ Rate       │
│ Invitations│  │ Settings   │  │            │  │ WorkEvent  │
└────────────┘  └────────────┘  └────────────┘  └────────────┘

┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
│  CALENDAR  │  │  BILLING   │  │ FINANCIAL  │  │ ACCOUNTING │
│            │  │            │  │            │  │            │
│ Integration│  │ Invoice    │  │ Financial  │  │ Chart/Acct │
│ Sync       │  │ InvItem    │  │ Transaction│  │ Journal    │
│            │  │ Payment    │  │ PostingRule│  │ Ledger     │
└────────────┘  └────────────┘  └────────────┘  └────────────┘

┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
│ COMMUNI-   │  │ ANALYTICS  │  │ INTEGRATION│  │  PLATFORM  │
│  CATION    │  │            │  │            │  │            │
│ Connection │  │ Read Models│  │ Inbound    │  │ SaaS Admin │
│ Log        │  │ Reports    │  │ Outbound   │  │ Tenancy    │
│            │  │ ML         │  │ Webhooks   │  │ Config     │
└────────────┘  └────────────┘  └────────────┘  └────────────┘
```

---

## El flujo principal del ERP

```
TIEMPO TRABAJADO
      │
      │  [Calendar Sync o creación manual]
      ▼
  WorkEvent
  (draft → confirmed)
      │
      │  [Agrupación por período/contrato]
      ▼
   Invoice + InvoiceItems
   (draft → sent)
      │
      │  [Email al Customer vía Communications]
      ▼
   Payment recibido
   (cleared)
      │
      │  [Cada operación genera FinancialTransaction]
      ▼
  AccountingEngine
  (JournalEntry → GeneralLedger)
      │
      │  [Aggregation asíncrona]
      ▼
   Analytics / Reports / BAS
```

---

## Separación de capas

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                    │
│            (Frontend, API Gateway, Mobile)               │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                      │
│         (Use Cases, Command Handlers, Orchestration)     │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                     DOMAIN LAYER                        │
│  (Aggregates, Entities, Value Objects, Domain Services) │
│  (Domain Events, Domain Rules, Posting Rules)           │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                 INFRASTRUCTURE LAYER                     │
│    (Database, Message Broker, External APIs, Cache)      │
└─────────────────────────────────────────────────────────┘
```

---

## Diagrama de flujo de eventos

```
                    DOMAIN EVENTS (Event Bus)
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
    │         WorkEventConfirmed                  │
    │         InvoiceSent                         │
    │         PaymentRecorded                     │
    │         InvoiceOverdue                      │
    │                      │                      │
    ▼                      ▼                      ▼
COMMUNICATION         FINANCIAL              ANALYTICS
 DOMAIN            TRANSACTION              READ MODELS
(sends emails)      FACTORY                (dashboards)
                       │
                       ▼
                ACCOUNTING ENGINE
                (JournalEntry)
                       │
                       ▼
                GENERAL LEDGER
                (source of truth)
```

---

## Índice de documentos

| Documento | Título | Qué responde |
|---|---|---|
| [01-bounded-contexts.md](./01-bounded-contexts.md) | Bounded Contexts | ¿Qué hace cada dominio? |
| [02-domain-ownership.md](./02-domain-ownership.md) | Domain Ownership | ¿Quién posee cada dato? |
| [03-aggregate-roots.md](./03-aggregate-roots.md) | Aggregate Roots | ¿Cuál es la raíz de cada dominio? |
| [04-domain-events.md](./04-domain-events.md) | Domain Events | ¿Qué eventos fluyen por el sistema? |
| [05-system-pipelines.md](./05-system-pipelines.md) | System Pipelines | ¿Cuáles son los flujos de extremo a extremo? |
| [06-integration-architecture.md](./06-integration-architecture.md) | Integration Architecture | ¿Cómo se integran sistemas externos? |
| [07-read-models.md](./07-read-models.md) | Read Models | ¿Cómo se leen los datos sin acoplar dominios? |
| [08-multi-tenancy.md](./08-multi-tenancy.md) | Multi-Tenancy | ¿Cómo se aíslan los datos por Business? |
| [09-architecture-principles.md](./09-architecture-principles.md) | Architecture Principles | ¿Cuáles son las reglas inquebrantables? |
| [10-evolution-roadmap.md](./10-evolution-roadmap.md) | Evolution Roadmap | ¿Cómo evoluciona el ERP en 10 años? |
| [11-context-map.md](./11-context-map.md) | Context Map | ¿Cómo se relacionan formalmente los dominios (DDD)? |

---

## Documentos de dominio relacionados

| Carpeta | Contenido |
|---|---|
| [`docs/domain/`](../domain/README.md) | Diseño de dominio: entidades, VOs, reglas, relaciones |
| [`docs/domain/accounting/`](../domain/accounting/README.md) | Financial & Accounting Engine |
| [`docs/decisions/`](../decisions/) | Architecture Decision Records (ADRs) |
| [`docs/communications/`](../communications/) | Integración con Communications Platform |

---

## Para el nuevo desarrollador

Si acabas de unirte al proyecto, lee en este orden:

```
1. Este README (visión general)
2. 01-bounded-contexts.md (qué hace cada dominio)
3. 11-context-map.md (cómo se relacionan formalmente — tipos DDD)
4. 09-architecture-principles.md (reglas que no se rompen)
5. 04-domain-events.md (cómo se comunican los dominios)
6. 05-system-pipelines.md (los flujos de extremo a extremo)
7. docs/domain/README.md (las entidades detalladas)
8. docs/domain/accounting/README.md (el motor financiero)
9. docs/decisions/ (las ADRs que explican el por qué de cada decisión)
```

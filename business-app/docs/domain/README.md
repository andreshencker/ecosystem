# Domain Design — Invoice App

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

Este directorio contiene la documentación de dominio oficial de Invoice App, elaborada con principios de Domain Driven Design (DDD). Es la referencia arquitectónica que precede a toda implementación.

> **Regla:** Antes de crear un schema, módulo o endpoint relacionado con el dominio de negocio, leer primero los documentos de esta carpeta. Si un concepto no está aquí documentado, documentarlo primero.

---

## Índice de documentos

| # | Documento | Descripción | Estado |
|---|---|---|---|
| 01 | [Domain Overview](./01-domain-overview.md) | Qué es Invoice App, actores, flujos de negocio | ✅ |
| 02 | [Ubiquitous Language](./02-ubiquitous-language.md) | Diccionario oficial del dominio | ✅ |
| 03 | [Bounded Contexts](./03-bounded-contexts.md) | Fronteras del dominio y responsabilidades | ✅ |
| 04 | [Aggregates](./04-aggregates.md) | Aggregate Roots e invariantes | ✅ |
| 05 | [Entities](./05-entities.md) | Todas las entidades del dominio con sus campos | ✅ |
| 06 | [Value Objects](./06-value-objects.md) | Objetos de valor inmutables | ✅ |
| 07 | [Domain Services](./07-domain-services.md) | Servicios de lógica de negocio transversal | ✅ |
| 08 | [Domain Events](./08-domain-events.md) | Eventos del dominio y sus consumidores | ✅ |
| 09 | [Relations](./09-relations.md) | Diagramas de relaciones y cardinalidades | ✅ |
| 10 | [Domain Rules](./10-domain-rules.md) | Todas las reglas de negocio catalogadas | ✅ |
| 11 | [Roadmap](./11-roadmap.md) | Orden de implementación por dominio | ✅ |
| 12 | [Open Questions](./12-open-questions.md) | Decisiones pendientes con opciones | ✅ |

---

## Orden recomendado de lectura

### Para entender el problema de negocio
```
01 → 02 → 03
```
Primero el problema que resuelve, luego el lenguaje oficial, luego cómo se divide el dominio.

### Para diseñar la arquitectura
```
03 → 04 → 05 → 06 → 07 → 08 → 09
```
Bounded Contexts → Aggregates → Entidades → Value Objects → Servicios → Eventos → Relaciones.

### Para implementar una feature nueva
```
02 (verificar el lenguaje) → 03 (identificar el BC) → 04 (identificar el aggregate) → 05 (campos) → 07 (servicios necesarios) → 10 (reglas) → 11 (en qué fase va)
```

### Para tomar una decisión de diseño
```
12 (ver si ya hay una pregunta abierta) → 10 (impacto en reglas) → 09 (impacto en relaciones)
```

---

## Dependencias entre documentos

```
01 Domain Overview
    └── informa a 02, 03, 11

02 Ubiquitous Language
    └── base de todos los demás documentos

03 Bounded Contexts
    ├── define el alcance de 04, 05, 07, 08
    └── organiza 09, 11

04 Aggregates
    ├── depende de 03 (Bounded Contexts)
    └── define las raíces para 05, 08, 10

05 Entities
    ├── depende de 04 (Aggregates)
    ├── depende de 06 (usa VOs)
    └── referenciada por 07, 08, 09, 10

06 Value Objects
    ├── depende de 05 (contexto de uso)
    └── usada en 07, 10

07 Domain Services
    ├── depende de 05 (Entities)
    └── referenciada por 08, 11

08 Domain Events
    ├── depende de 04, 05 (Aggregates y Entities)
    └── depende de 03 (productores y consumidores por BC)

09 Relations
    └── depende de 05 (campos de relación)

10 Domain Rules
    └── depende de 04, 05, 07 (para saber quién las enforcea)

11 Roadmap
    └── depende de 03, 10 (dependencias entre BCs y reglas)

12 Open Questions
    └── referencia a todos — lista las decisiones no tomadas
```

---

## Mapa del dominio (una página)

```
                      BUSINESS
                    (emisor de facturas)
                          │
         ┌────────────────┼────────────────┐
         │                │                │
       USERS        FiscalProfile    CUSTOMERS
    (internos)      (fiscal/pago)    (externos)
                                          │
                               ┌──────────┴──────────┐
                           CONTACTS              CONTRACTS
                           (contacto)            (acuerdo)
                                                     │
                                                   RATES
                                              (tarifas)
                                                     │
                              CALENDAR ─────► WORK EVENTS
                              INTEGRATION     (turnos trabajados)
                                                     │
                                              INVOICE ITEMS ◄── (ítems manuales)
                                                     │
                                              INVOICES
                                    (documentos financieros)
                                                     │
                                              PAYMENTS
                                              (cobros)
                                                     │
                                        COMMUNICATION LOG
                                        (historial de envíos)
                                                     │
                                              ↕ vía
                                     COMMUNICATION CONNECTION
                                     (integración con
                                      Communications Platform)
```

---

## Documentos relacionados (fuera de esta carpeta)

| Documento | Ubicación | Relevancia |
|---|---|---|
| `invoice-app-domain-model.md` | `docs/domain/` | Primer documento de diseño — base de estos documentos |
| `ADR-001-business-concept-and-companyid-migration.md` | `docs/decisions/` | Decisión de renombre Company→Business |
| `communication-event-routing.md` | `docs/communications/` | Cómo Business App enruta eventos a Communications |
| `roles-and-permissions.md` | `docs/` | Definición de roles de usuario |
| `ADR-007-Communication-Auth-and-Event-Resolution.md` | `communications-app/docs/Decisions/` | Arquitectura de autenticación en Communications |

---

## Subdirectorios de dominio especializado

| Carpeta | Descripción |
|---|---|
| [`accounting/`](./accounting/README.md) | Financial Engine + Accounting Engine: FinancialTransaction, Posting Engine, General Ledger |
| [`analytics/`](./analytics/README.md) | Analytics Domain: KPIs, Datasets, Read Models, ML Roadmap |

---

## Estado de implementación del dominio

| Bounded Context | Entidades | Estado |
|---|---|---|
| Identity | User, RefreshToken, Invitation | ✅ Implementado |
| Business Management | Business, FiscalProfile | ⚠️ Parcial — falta FiscalProfile, naming incorrecto |
| Customer Management | Customer, Contact | ❌ No implementado |
| Contract Management | Contract, Rate | ❌ No implementado |
| Calendar Integration | CalendarIntegration | ❌ No implementado |
| Work Management | WorkEvent | ❌ No implementado |
| Billing | Invoice, InvoiceItem | ❌ No implementado |
| Payments | Payment | ❌ No implementado |
| Communication | CommunicationConnection, CommunicationLog | ⚠️ Parcial — falta CommunicationLog |
| Analytics/BI | — | ❌ Fase futura |

**Próximo paso:** Decidir y ejecutar Fase 0 del Roadmap (ver `11-roadmap.md` y `ADR-001`).

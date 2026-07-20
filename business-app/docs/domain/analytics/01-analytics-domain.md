# 01 — Analytics Domain (Operativo — BC-10)

**Versión:** 1.1 | **Fecha:** 2026-07-06 | **Estado:** Oficial

> **Este documento describe únicamente el Analytics operativo (BC-10).** Analytics vive en `business-app/backend/src/analytics/`, usa NestJS + MongoDB, y sirve read models rápidos para el dashboard operacional.
>
> El análisis estratégico, KPIs compuestos, modelo dimensional (dim_/fact_), forecasting, y el Data Warehouse pertenecen al servicio **Business Intelligence (BC-13)** en `business-intelligence/` (Python + PostgreSQL Neon). Ver `docs/domain/business-intelligence/`.
>
> **Analytics ≠ Business Intelligence.** No mezclar.

---

## Por qué existe Analytics

### El problema sin Analytics

Sin un dominio de Analytics dedicado, el Business Owner tiene tres opciones para entender la salud de su negocio:

**Opción 1 — Cada módulo expone sus propios reportes**

```
Billing: "Dame el total de facturas del mes"
Work: "Dame las horas trabajadas del mes"
Accounting: "Dame el General Ledger del mes"
Payments: "Dame los cobros del mes"
```

Problemas:
- El dashboard necesita llamar a 4+ servicios distintos para construir una sola pantalla
- Cada servicio expone su modelo de escritura → coupling fuerte entre presentación y dominio
- Si Billing cambia su schema, el dashboard se rompe
- Performance: múltiples queries en colecciones de escritura con joins complejos
- No existe ningún lugar donde preguntar: *"¿Cuánto facturé por cliente en los últimos 12 meses?"* — requeriría un join entre Billing y Customer que viola la separación de dominios

**Opción 2 — Base de datos analítica por cada módulo**

```
Billing replica → Billing Analytics DB
Work replica → Work Analytics DB
Accounting replica → Accounting Analytics DB
```

Problemas:
- No hay una vista consolidada del negocio
- Las preguntas cross-domain (ej. "Revenue vs Horas trabajadas por cliente") siguen siendo imposibles sin coordinación entre módulos

**Opción 3 — Analytics como dominio propio (la solución)**

Un dominio dedicado que:
- Ingiere eventos de todos los dominios
- Los normaliza en su propio modelo analítico
- Responde preguntas cross-domain con una sola consulta
- No tiene acoplamiento con los schemas operativos

---

## Qué problema resuelve Analytics

Analytics existe para responder tres tipos de preguntas que ningún módulo operativo puede responder solo:

### Preguntas de estado
*"¿Cuánto dinero me deben mis clientes ahora mismo?"*

Requiere: Billing + Payments. Sin Analytics, hay que sumar facturas y restar pagos en tiempo real. Con Analytics, existe un `AccountsReceivableSnapshot` pre-calculado.

### Preguntas de tendencia
*"¿Está creciendo mi ingreso mes a mes?"*

Requiere: 12 meses de datos de Billing agregados por período. Sin Analytics, scan de toda la colección de facturas. Con Analytics, un `RevenueTimeSeries` pre-construido.

### Preguntas cross-domain
*"¿Qué clientes me pagan más rápido?"*

Requiere: Customer + Invoice (Billing) + Payment (Billing). Estas entidades pertenecen a dominios distintos con ownership propio. Sin Analytics, violación de boundaries. Con Analytics, el `CustomerPaymentBehaviorView` consolida todo.

---

## Responsabilidades de Analytics

### Lo que Analytics DEBE hacer

| Responsabilidad | Descripción |
|---|---|
| **Ingerir Domain Events** | Consumir todos los eventos relevantes del event bus |
| **Mantener el Analytics Store** | Actualizar su propio modelo analítico con cada evento |
| **Responder queries de KPIs** | Calcular y retornar KPIs bajo demanda |
| **Entregar datasets** | Devolver colecciones estructuradas de datos para visualización |
| **Generar snapshots** | Calcular y almacenar agregaciones periódicas |
| **Proyectar tendencias** | Calcular métricas de crecimiento y velocidad |
| **Soportar filtros** | Responder queries filtradas por período, cliente, contrato, usuario |
| **Garantizar reconstruibilidad** | El Analytics Store debe poder reconstruirse desde el event log |

### Lo que Analytics NUNCA debe hacer

| Prohibición | Por qué |
|---|---|
| **Modificar datos operativos** | Analytics es observación pura — nunca tiene efectos secundarios |
| **Consultar colecciones operativas directamente** | Acopla Analytics a los schemas de escritura |
| **Conocer JWT o sesiones** | La autenticación es responsabilidad de Business App |
| **Conocer permisos de usuario** | La autorización es responsabilidad de Business App |
| **Producir visualizaciones** | Charts, HTML, SVG — el Frontend decide la forma |
| **Ejecutar lógica de negocio** | Calcular GST, generar números de factura — eso es Billing |
| **Modificar el estado del sistema** | Ni siquiera como efecto secundario de leer |
| **Depender de otros dominios en runtime** | Si Billing está caído, Analytics sigue funcionando sobre su store |

---

## Información que Analytics posee

Analytics posee exclusivamente datos **derivados** de Domain Events. Nunca es la fuente primaria de ningún dato.

### Hechos (Facts)
Representaciones inmutables de eventos ya ocurridos, enriquecidos para consulta analítica.

| Fact | Origen |
|---|---|
| `InvoiceFact` | Proyección de InvoiceSent, InvoiceVoided, InvoicePaid |
| `PaymentFact` | Proyección de PaymentRecorded, PaymentReversed |
| `WorkEventFact` | Proyección de WorkEventConfirmed, WorkEventInvoiced |
| `JournalFact` | Proyección de JournalEntryPosted |
| `CustomerFact` | Proyección de CustomerCreated, CustomerDeactivated |
| `ExpenseFact` | Proyección de ExpenseApproved (futuro) |
| `PayrollFact` | Proyección de PayrollProcessed (futuro) |

### Dimensiones
Entidades que dan contexto a los hechos.

| Dimensión | Descripción |
|---|---|
| `BusinessDimension` | El Business del tenant |
| `CustomerDimension` | Los clientes del Business |
| `TimeDimension` | Fechas, meses, trimestres, años fiscales |
| `ContractDimension` | Los contratos (futuro) |
| `EmployeeDimension` | Los empleados/usuarios del Business (futuro) |
| `AccountDimension` | Las cuentas del Chart of Accounts (futuro) |

### Snapshots
Agregaciones pre-calculadas para respuestas rápidas.

| Snapshot | Descripción |
|---|---|
| `RevenueSnapshot` | Ingresos acumulados por período y Business |
| `ARSnapshot` | Saldo de Cuentas por Cobrar en un momento dado |
| `WorkloadSnapshot` | Horas trabajadas acumuladas por período |
| `CashFlowSnapshot` | Flujo de efectivo por período (futuro) |
| `GSTSnapshot` | Posición de GST por período fiscal (futuro) |

---

## Información que Analytics NUNCA posee

```
Información que NO vive en Analytics:

  ✗ Las facturas como entidades mutables (Invoice con estado modificable)
  ✗ Los pagos como registros modificables
  ✗ El General Ledger (eso es Accounting)
  ✗ Las reglas de negocio de ningún dominio
  ✗ Las credenciales de usuarios
  ✗ Los tokens de autenticación
  ✗ Los Chart of Accounts (eso es Accounting)
  ✗ Las Posting Rules (eso es Financial)
  ✗ Los contratos de trabajo (eso es Work)
  ✗ El estado actual operativo de ninguna entidad
```

Si Analytics necesita el nombre del Customer para un reporte, lo tiene **desnormalizado en su propia dimensión `CustomerDimension`**, no consultando la colección `customers` de Customer domain.

---

## Qué dominios producen información para Analytics

```
PRODUCTORES (upstream de Analytics)
─────────────────────────────────────────

IDENTITY     → UserRegistered, UserActivated, UserDeactivated
BUSINESS     → BusinessCreated, BusinessProfileUpdated, FiscalProfileConfigured
CUSTOMER     → CustomerCreated, CustomerUpdated, CustomerDeactivated
WORK         → WorkEventConfirmed, WorkEventVoided, WorkEventInvoiced, ContractActivated
CALENDAR     → CalendarSynced, CalendarEventImported
BILLING      → InvoiceGenerated, InvoiceSent, InvoiceOverdue, InvoicePaid, InvoiceVoided
BILLING      → PaymentRecorded, PaymentReversed
FINANCIAL    → FinancialTransactionCreated, TransactionPosted, TransactionRejected
ACCOUNTING   → JournalEntryPosted, FiscalPeriodClosed, FiscalPeriodLocked
COMMUNICATION → CommunicationDelivered, CommunicationFailed

FUTUROS:
EXPENSES     → ExpenseApproved, ExpenseReimbursed
AP           → SupplierBillReceived, SupplierPaymentMade
BANKING      → BankTransactionImported, ReconciliationCompleted
ASSETS       → AssetPurchased, AssetDepreciated, AssetDisposed
PAYROLL      → PayrollProcessed, SuperannuationAccrued
INVENTORY    → InventoryPurchased, InventorySold
```

---

## Qué dominios consumen Analytics

```
CONSUMIDORES (downstream de Analytics — siempre vía Business App backend)
──────────────────────────────────────────────────────────────────────────

BUSINESS APP BACKEND (único gateway autorizado)
  ├── Dashboard API endpoints  → devuelve read models al Frontend
  ├── Reporting API endpoints  → datos operativos al Frontend
  └── Dataset API              → datasets para Document Platform (PDFs)

FUERA DEL SCOPE DE ANALYTICS BC-10:
  ✗ BI Tools (Metabase, Tableau, PowerBI) — eso es responsabilidad de BC-13 BI
  ✗ Data Warehouse export               — eso es responsabilidad de BC-13 BI
  ✗ ML Pipeline                         — eso es responsabilidad de BC-13 BI
  ✗ KPIs estratégicos con historia larga — eso es responsabilidad de BC-13 BI
  ✗ Forecasting                         — eso es responsabilidad de BC-13 BI
```

Analytics BC-10 nunca expone su API directamente al exterior. Todo pasa por `business-app/backend`. El Frontend nunca llama a Analytics directamente.

---

## La frontera del dominio

```
DENTRO del Analytics Domain:
─────────────────────────────
  Ingestion Layer          ← recibe y normaliza eventos
  Analytics Store          ← almacena datos analíticos
  Query Engine             ← responde consultas
  Snapshot Scheduler       ← genera snapshots periódicos
  Rebuild Engine           ← reconstruye desde event log

FUERA del Analytics Domain (no le pertenece):
─────────────────────────────────────────────
  La autenticación         → Business App / Identity
  La autorización RBAC     → Business App
  Los datos operativos     → Cada dominio operativo
  Las visualizaciones      → Frontend
  El cache de respuestas   → Business App
  El rate limiting         → Business App
  La composición de UI     → Frontend
```

---

## Diagrama de ownership

```
                    ANALYTICS DOMAIN
                    ┌─────────────────────────────────┐
                    │                                 │
Events In ─────────►│  Ingestion     Analytics        │
                    │  Layer    ──►  Store         ──►│──► Datasets Out
                    │                                 │
                    │  Business App is the            │
                    │  only authorized caller         │
                    │                                 │
                    └─────────────────────────────────┘

Rules:
  ✅ Analytics OWNS: its store, its models, its query logic
  ✅ Analytics READS: domain events (via event bus subscription)
  ✅ Analytics PRODUCES: datasets (via query interface)
  ❌ Analytics NEVER WRITES: any operational domain data
  ❌ Analytics NEVER READS: operational domain databases directly
  ❌ Analytics NEVER KNOWS: who is asking (JWT, session, user)
  ❌ Analytics NEVER PRODUCES: visual components
```

---

## Consistencia eventual — por qué es aceptable

Analytics es eventualmente consistente con los dominios operativos. El lag típico es < 1 segundo para eventos simples y < 5 segundos para recálculos de snapshots complejos.

Esto es aceptable porque:

| Tipo de dato | ¿Requiere consistencia inmediata? | Solución |
|---|---|---|
| Estado de una Invoice específica | Sí | Business App consulta Billing directamente |
| Revenue del mes en el dashboard | No (lag de 1s es invisible) | Analytics Read Model |
| Número de factura siguiente | Sí | Generado por Billing directamente |
| Posición de AR en tiempo real | No (segundos de lag son ok) | Analytics Snapshot |
| Historial de pagos del cliente | No | Analytics Dataset |
| ¿Factura #INV-042 fue pagada? | Sí | Business App consulta Billing directamente |

La regla es clara: **para confirmaciones de estado inmediato de entidades específicas, Business App consulta el dominio operativo. Para análisis histórico, tendencias y KPIs, Business App consulta Analytics.**

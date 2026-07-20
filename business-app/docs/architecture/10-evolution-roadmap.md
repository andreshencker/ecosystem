# 10 — Evolution Roadmap

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

Este roadmap describe la evolución del ERP durante los próximos 5+ años. Cada fase es aditiva — no modifica los dominios ya construidos. La arquitectura event-driven garantiza que agregar un nuevo módulo no requiere cambios en los módulos existentes.

**Principio del roadmap:**
> Construir el núcleo correcto primero. Cada expansión debe ser tan natural como agregar un nuevo módulo a un framework ya establecido.

---

## Estado actual (pre-Fase 1)

```
✅ Infrastructure ready:
   MongoDB, Redis, Queue (BullMQ), EventBus, JWT, NestJS monorepo

✅ Communications Platform:
   API de notificaciones separada y operativa

⚠️ Business App (parcial):
   Auth, Users, Invitations, Company (→ Business, naming pendiente)
   CommunicationConnection
   No hay: Customer, Contract, Rate, WorkEvent, Invoice, Payment
   No hay: Financial Engine, Accounting Engine
```

---

## FASE 1 — Core Foundation

**Horizonte:** Sprint 1–3 (6–9 semanas)

**Pregunta que responde:** ¿Quién soy como negocio y con quién trabajo?

### Lo que agrega

```
├── IDENTITY (completar)
│   └── Migrar roles: company_owner → business_owner (ADR-001)
│
├── BUSINESS (completar)
│   ├── Migrar Company → Business (schema, colección, naming)
│   ├── Crear FiscalProfile (extraer ABN, depositAccount)
│   └── Agregar campos: timezone, address, phone, logoUrl
│
└── CUSTOMER
    ├── Customer entity + CRUD
    └── Contact entity + CRUD
```

### Lo que reutiliza
- Auth flow existente (login, registro, invitaciones)
- CommunicationConnection existente
- Communications Platform existente

### Lo que NO modifica
- Schema de User (solo renombra campos)
- Flow de autenticación
- Communications Platform

### Resultado al final de la Fase
Un Business puede registrarse, configurar su perfil fiscal, e ingresar sus Customers con datos de contacto de facturación.

---

## FASE 2 — Work Foundation

**Horizonte:** Sprint 4–6 (6–9 semanas)

**Pregunta que responde:** ¿Para quién trabajo y bajo qué condiciones?

### Lo que agrega

```
├── WORK DOMAIN
│   ├── Contract entity + CRUD + state machine (draft→active→completed)
│   ├── Rate entity + CRUD (hourly, daily, fixed, overtime, weekend)
│   ├── RateResolutionService (selección de tarifa por contexto)
│   └── WorkEventCalculationService (horas × tarifa = monto)
│
└── CALENDAR DOMAIN
    ├── CalendarIntegration (Google Calendar OAuth)
    ├── CalendarSyncService (import + deduplication)
    └── WorkEvent entity + state machine (draft→confirmed→invoiced)
```

### Lo que reutiliza
- Business, Customer de Fase 1
- EventBus para publicar CalendarEventImported, WorkEventConfirmed
- Queue para jobs de sync periódico

### Lo que NO modifica
- Identity, Business, Customer
- Communications Platform
- CommunicationConnection

### Resultado al final de la Fase
Un Business puede configurar contratos con sus Customers, definir tarifas, registrar turnos manualmente o importarlos de Google Calendar, y confirmarlos para facturar.

---

## FASE 3 — Billing

**Horizonte:** Sprint 7–10 (8–12 semanas)

**Pregunta que responde:** ¿Cuánto cobro y cómo lo comunico?

### Lo que agrega

```
├── BILLING DOMAIN
│   ├── Invoice entity + state machine (draft→sent→paid→overdue→void)
│   ├── InvoiceItem entity (desde WorkEvents o manuales)
│   ├── Payment entity + PaymentAllocationService
│   ├── InvoiceNumberGenerationService (atómico desde FiscalProfile)
│   ├── InvoiceGenerationService (orquestador Work→Billing)
│   ├── InvoiceCalculationService (subtotal, GST, total)
│   ├── OverdueInvoiceDetectionService (job diario)
│   └── PDF Generation (servicio de soporte)
│
└── COMMUNICATION (completar)
    ├── Trigger InvoiceSent → email al Customer
    ├── Trigger InvoiceOverdue → recordatorio
    └── CommunicationLog entity
```

### Lo que reutiliza
- Work domain: WorkEvents confirmados
- FiscalProfile: número de factura, datos del emisor
- Customer: datos del destinatario
- Communications Platform: envío de emails

### Lo que NO modifica
- Work domain (solo consume WorkEventConfirmed)
- Identity, Business, Calendar

### Resultado al final de la Fase
Un Business puede generar facturas desde sus turnos, enviarlas a sus Customers por email, registrar los pagos, y recibir alertas de facturas vencidas. El flujo Shift-to-Cash está completo en su dimensión operativa.

---

## FASE 4 — Financial Engine y Accounting

**Horizonte:** Sprint 11–15 (10–15 semanas)

**Pregunta que responde:** ¿Cuál es mi posición financiera real?

### Lo que agrega

```
├── FINANCIAL DOMAIN
│   ├── FinancialTransaction entity (inmutable)
│   ├── FinancialTransactionFactories (Billing, Payments adapters)
│   ├── PostingRule (por tipo + jurisdicción)
│   └── AccountingEngine (orquestador del flujo)
│
├── ACCOUNTING DOMAIN
│   ├── ChartOfAccounts + Account entities
│   ├── Chart of Accounts templates por jurisdicción (AU, NZ, CA, UK)
│   ├── Journal + JournalEntry + JournalLine entities
│   ├── GeneralLedger (LedgerAccount)
│   ├── FiscalPeriod con state machine (open→closed→locked)
│   ├── PostingEngine (Account Resolution, Tax Resolution, Line Generation)
│   └── TrialBalance generation
│
└── REPORTING (básico)
    ├── P&L Report (desde GeneralLedger)
    ├── Balance Sheet (desde GeneralLedger)
    └── GST Position (para BAS preparation)
```

### Lo que reutiliza
- Todos los Domain Events de Billing (InvoiceSent, PaymentRecorded, etc.)
- FiscalProfile: configuración de GST, jurisdicción
- EventBus existente

### Lo que NO modifica
- Billing, Work, Calendar, Identity, Business, Customer
- Communications Platform

### Resultado al final de la Fase
El ERP tiene un libro mayor completo. Cada factura emitida, cada pago recibido se refleja automáticamente en el General Ledger. El P&L y el Balance Sheet están disponibles en tiempo real. La preparación del BAS trimestral es un reporte, no un proceso manual.

---

## FASE 5 — Analytics y Business Intelligence

**Horizonte:** Sprint 16–19 (8–12 semanas)

**Pregunta que responde:** ¿Cómo está mi negocio y hacia dónde va?

### Lo que agrega

```
├── ANALYTICS DOMAIN (Read Models)
│   ├── BusinessDashboardView (dashboard principal)
│   ├── RevenueByPeriodView (ingresos por mes/trimestre)
│   ├── AccountsReceivableView (aging report)
│   ├── CashFlowView (flujo de efectivo)
│   ├── GSTPositionView (posición fiscal AU)
│   ├── WorkloadAnalysisView (horas por empleado/cliente)
│   └── CustomerProfitabilityView
│
└── REPORTING ENGINE
    ├── PDF export de todos los reportes
    ├── CSV/Excel export
    └── Scheduled reports (envío automático por email)
```

### Lo que reutiliza
- Domain Events de todos los dominios anteriores
- GeneralLedger (vía events, no acceso directo)
- Communications Platform (para scheduled reports)

### Lo que NO modifica
- Ningún dominio anterior

### Resultado al final de la Fase
El Business Owner tiene visibilidad completa de su negocio — ingresos, gastos, cobranza, carga de trabajo — en un dashboard en tiempo real. Puede exportar reportes para su contador.

---

## FASE 6 — Expenses y Accounts Payable

**Horizonte:** Sprint 20–24 (10–15 semanas)

**Pregunta que responde:** ¿Cuánto gasto y a quién le debo?

### Lo que agrega

```
├── EXPENSES DOMAIN
│   ├── Expense entity (gasto registrado por staff o owner)
│   ├── ExpenseCategory (clasificación por tipo)
│   ├── Receipt storage (imagen del comprobante)
│   ├── ExpenseApprovalFlow (staff registra, admin aprueba)
│   └── ExpenseFinancialTransactionFactory

├── ACCOUNTS PAYABLE DOMAIN
│   ├── SupplierBill entity (factura de proveedor)
│   ├── Supplier entity (similar a Customer pero para compras)
│   ├── SupplierPayment entity
│   └── APFinancialTransactionFactory
│
└── FINANCIAL DOMAIN (extensión)
    └── Nuevas Posting Rules: EXPENSE_*, SUPPLIER_*
```

### Lo que reutiliza
- Accounting Engine existente (solo nuevas Posting Rules)
- Financial domain existente (solo nuevas FinancialTransactionFactories)
- Analytics (nuevos Read Models de gastos y AP)

### Lo que NO modifica
- Billing, Work, Calendar — absolutamente nada

### Resultado al final de la Fase
El ERP tiene visión completa de gastos e ingresos. La utilidad neta en el P&L es real — incluye todos los costos.

---

## FASE 7 — Banking y Conciliación

**Horizonte:** Sprint 25–28 (8–10 semanas)

**Pregunta que responde:** ¿Mi dinero está donde creo que está?

### Lo que agrega

```
├── BANKING DOMAIN
│   ├── BankAccount entity (cuenta bancaria del Business)
│   ├── BankTransaction entity (movimientos importados)
│   ├── Importación OFX/CSV/Open Banking
│   └── BankFinancialTransactionFactory (comisiones, intereses)
│
└── RECONCILIATION ENGINE
    ├── Matching: BankTransaction ↔ Payment
    ├── Matching: BankTransaction ↔ SupplierPayment
    ├── Unmatched queue (revisión manual)
    └── ReconciliationReport
```

### Lo que reutiliza
- Financial Engine, Accounting Engine
- Payments, SupplierPayments existentes

### Lo que NO modifica
- Billing, Work, Expenses — nada

### Resultado al final de la Fase
La conciliación bancaria es automática. El Business Owner sabe en tiempo real si lo que muestra el sistema coincide con el banco.

---

## FASE 8 — Fixed Assets y Depreciación

**Horizonte:** Sprint 29–32 (8–10 semanas)

**Pregunta que responde:** ¿Qué activos tengo y cuánto valen realmente?

### Lo que agrega

```
├── ASSETS DOMAIN
│   ├── FixedAsset entity (computadora, vehículo, herramienta)
│   ├── AssetCategory + DepreciationMethod (straight-line, declining)
│   ├── AssetDepreciationJob (job mensual automático)
│   └── AssetDisposalFlow (venta o baja)
│
└── FINANCIAL DOMAIN (extensión)
    └── Posting Rules: ASSET_PURCHASED, ASSET_DEPRECIATION, ASSET_DISPOSED
```

### Resultado al final de la Fase
Los activos fijos se deprecian automáticamente. El Balance Sheet refleja su valor neto real.

---

## FASE 9 — Payroll (Australia)

**Horizonte:** Sprint 33–40 (16–24 semanas — es complejo)

**Pregunta que responde:** ¿Cuánto le pago a mi equipo y cómo cumplo con el ATO?

### Lo que agrega

```
├── PAYROLL DOMAIN
│   ├── Employee entity (distinto de User — puede no tener login)
│   ├── PayPeriod entity
│   ├── PayslipCalculationService (PAYG, super, deductions)
│   ├── SingleTouchPayroll (STP) integration con ATO
│   └── PayrollFinancialTransactionFactory
│
└── FINANCIAL DOMAIN (extensión)
    └── Posting Rules: PAYROLL_PROCESSED_AU, SUPERANNUATION_*
```

### Resultado al final de la Fase
Nómina procesada automáticamente. PAYG withholding calculado. Superannuation devengado y pagado. STP reporting al ATO automático.

---

## FASE 10 — Inventory

**Horizonte:** Sprint 41–46 (12–15 semanas)

**Pregunta que responde:** ¿Qué tengo en stock y cuánto vale?

### Lo que agrega

```
├── INVENTORY DOMAIN
│   ├── Product entity
│   ├── StockLevel entity
│   ├── InventoryMovement entity (purchase, sale, adjustment)
│   └── InventoryValuation (FIFO, Average Cost)
│
└── BILLING (extensión menor)
    └── InvoiceItem puede referenciar Product (además de WorkEvent)
```

### Resultado al final de la Fase
Empresas de productos pueden usar el ERP. COGS calculado automáticamente. P&L incluye Gross Profit.

---

## FASE 11 — Machine Learning y Forecasting

**Horizonte:** Sprint 47+ (en paralelo con Fase 10)

**Pregunta que responde:** ¿Qué pasará con mi negocio?

### Lo que agrega

```
├── ML PIPELINE
│   ├── Revenue forecasting (basado en patrones históricos)
│   ├── Invoice payment likelihood scoring
│   │   (¿este cliente pagará a tiempo?)
│   ├── Anomaly detection (transacción fuera de lo normal)
│   ├── Cash flow projection (próximos 30/60/90 días)
│   └── Customer churn prediction
│
└── DATA WAREHOUSE
    ├── Nightly export de Read Models
    ├── Historical training data
    └── ML Model serving
```

### Lo que NO modifica
- Ningún dominio operacional — ML es solo lectura

---

## Vista de 10 años

```
Año 1:   Phases 1-3  →  ERP operativo: trabajo + facturación
Año 2:   Phase 4     →  Contabilidad formal y reportes
Año 2-3: Phase 5     →  Analytics y BI
Año 3:   Phases 6-7  →  Gastos, AP, Banking
Año 4:   Phase 8-9   →  Assets, Payroll
Año 5:   Phase 10    →  Inventory
Año 5+:  Phase 11    →  ML y Forecasting
```

---

## Lo que cada fase agrega y lo que NO modifica

| Fase | Agrega | NO modifica |
|---|---|---|
| 1 | Business, FiscalProfile, Customer | — |
| 2 | Contract, Rate, WorkEvent, Calendar | Fase 1 |
| 3 | Invoice, Payment, Communications | Fases 1-2 |
| 4 | Financial Engine, Accounting, Reporting | Fases 1-3 |
| 5 | Analytics, Read Models | Fases 1-4 |
| 6 | Expenses, Accounts Payable | Fases 1-5 |
| 7 | Banking, Reconciliation | Fases 1-6 |
| 8 | Fixed Assets, Depreciation | Fases 1-7 |
| 9 | Payroll | Fases 1-8 |
| 10 | Inventory | Fases 1-9 (minor Billing extension) |
| 11 | ML, Forecasting | Nada — solo lectura |

---

## La promesa de la arquitectura

Si este roadmap se ejecuta con disciplina en los principios arquitectónicos, el resultado al año 5 es:

- Un ERP completo para pequeñas empresas australianas
- Con soporte para múltiples jurisdicciones (sin modificar los módulos de negocio)
- Completamente multi-tenant (miles de Businesses en la misma plataforma)
- Con un General Ledger que refleja en tiempo real toda la actividad del negocio
- Con ML que predice problemas de flujo de caja antes de que ocurran
- Donde agregar soporte para Nueva Zelanda es solo configurar Posting Rules

Y en cada punto del camino, el código de Billing del Año 1 sigue siendo el mismo que en el Año 5 — sin refactorizaciones estructurales, sin deuda técnica acumulada por acoplamiento, sin el "¡no toques eso porque rompe todo!".

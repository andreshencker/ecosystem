# 09 — Relations

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

Este documento define todas las relaciones entre entidades del dominio de Invoice App con diagramas ASCII. Incluye cardinalidades, tipos de relación y notas de implementación.

---

## 1. Vista general del dominio

```
                            ┌─────────────────────────────────────────────┐
                            │                 BUSINESS                     │
                            │                                              │
                            │  businessKey · businessName · timezone       │
                            │  defaultCurrency · isActive                  │
                            └────────────────────┬────────────────────────┘
                                                 │
                   ┌─────────────────────────────┼─────────────────────────────┐
                   │                             │                             │
          ┌────────▼────────┐          ┌─────────▼────────┐        ┌─────────▼────────┐
          │      USERS      │          │  FISCAL PROFILE  │        │    CUSTOMERS     │
          │  (N per Business)│         │  (1 per Business)│        │  (N per Business)│
          │                 │          │                  │        │                  │
          │ role · scope    │          │ abn · gstRate    │        │ name · type · abn│
          │ email           │          │ bankAccount      │        │ billingAddress   │
          └─────────────────┘          │ invoicePrefix    │        └────────┬─────────┘
                   │                  │ invoiceNextNumber│                 │
                   │                  └──────────────────┘        ┌────────┴─────────┐
                   │                           │                  │                  │
                   │                  consumed by Billing         │                  │
                   │                                     ┌────────▼──────┐  ┌────────▼──────┐
                   │                                     │   CONTACTS    │  │   CONTRACTS   │
                   │                                     │ (N per Customer│  │ (N per Customer│
                   │                                     │ name · email  │  │ startDate     │
                   │                                     │ phone         │  │ status        │
                   │                                     └───────────────┘  │ billingCycle  │
                   │                                                         └───────┬───────┘
                   │                                                                 │
                   │                                                        ┌────────┴────────┐
                   │                                                        │     RATES       │
                   │                                                        │ (N per Contract)│
                   │                                                        │ name · type     │
                   │                                                        │ amount · isDefault│
                   │                                                        └────────┬────────┘
                   │                                                                 │
                   │                    ┌────────────────────┐                      │
                   │                    │ CALENDAR INTEGRATION│                     │
                   │                    │ (N per Business)    │                     │
                   │                    │ provider · token    │                     │
                   │                    │ lastSyncedAt        │                     │
                   │                    └─────────┬───────────┘                     │
                   │                              │                                 │
                   └──────────────────────────────┼─────────────────────────────────┘
                                                  │ importa
                                         ┌────────▼────────┐
                                         │   WORK EVENTS   │
                                         │(N per Business) │
                                         │ date · startTime│
                                         │ endTime · status│
                                         │ calculatedAmount│
                                         └────────┬────────┘
                                                  │ agrupa en
                                         ┌────────▼────────┐
                                         │  INVOICE ITEMS  │
                                         │(N per Invoice)  │
                                         │ description     │
                                         │ quantity · price│
                                         └────────┬────────┘
                                                  │ pertenece a
                                         ┌────────▼────────┐
                                         │    INVOICES     │
                                         │(N per Business) │
                                         │ invoiceNumber   │
                                         │ status · total  │
                                         │ amountDue       │
                                         └────────┬────────┘
                                                  │ recibe
                                         ┌────────▼────────┐
                                         │    PAYMENTS     │
                                         │(N per Invoice)  │
                                         │ amount · date   │
                                         │ method · status │
                                         └─────────────────┘
```

---

## 2. Relaciones de Business

```
Business (1)
    │
    ├── User (N)                    businessId → Business
    │   └── [role: owner, admin, accountant, staff, viewer]
    │
    ├── FiscalProfile (1)           businessId → Business [unique]
    │   └── [abn, bankAccount, invoicePrefix, invoiceNextNumber]
    │
    ├── Customer (N)                businessId → Business
    │   ├── Contact (N)             customerId → Customer
    │   └── Contract (N)            customerId → Customer
    │       └── Rate (N)            contractId → Contract
    │
    ├── CalendarIntegration (N)     businessId → Business
    │
    ├── CommunicationConnection (N) businessId → Business [unique per provider]
    │
    └── CommunicationLog (N)        businessId → Business
```

**Cardinalidades:**
| Relación | Tipo |
|---|---|
| Business → Users | 1:N |
| Business → FiscalProfile | 1:1 (único) |
| Business → Customers | 1:N |
| Business → CalendarIntegrations | 1:N |
| Business → CommunicationConnections | 1:N (unique por provider) |
| Business → CommunicationLogs | 1:N |

---

## 3. Relaciones de Customer

```
Customer (1)
    │
    ├── Contact (N)               customerId → Customer
    │   └── [isPrimary: uno principal]
    │
    ├── Contract (N)              customerId → Customer
    │   ├── Rate (N)              contractId → Contract
    │   │   └── [isDefault: solo uno]
    │   └── WorkEvent (N)         contractId → Contract [nullable]
    │
    └── Invoice (N)               customerId → Customer
        └── InvoiceItem (N)       invoiceId → Invoice
```

**Nota:** Un Customer puede tener múltiples Contracts, pero cada Contract pertenece a un solo Customer. No se comparten Contracts entre Customers.

---

## 4. Flujo WorkEvent → Invoice

```
WorkEvent (status: confirmed)
    │
    │ InvoiceGenerationService selecciona WorkEvents confirmados
    ▼
InvoiceItem (N)
    │ workEventId → WorkEvent [nullable]
    │ invoiceId → Invoice
    │
    │ WorkEvent.status → 'invoiced'
    ▼
Invoice
    │
    │ InvoiceSent → Customer recibe email
    ▼
Payment (N)
    │ invoiceId → Invoice
    │
    │ PaymentAllocationService actualiza amountPaid
    ▼
Invoice.status → 'partial' | 'paid'
```

---

## 5. Flujo CalendarIntegration → WorkEvent

```
CalendarIntegration
    │ provider: google/apple/outlook/ical
    │ encryptedToken (OAuth2)
    │
    │ CalendarSyncService ejecuta sync periódico
    ▼
Evento externo del calendario
    │ calendarEventId (external ID)
    │
    │ Si no existe WorkEvent con ese calendarEventId:
    ▼
WorkEvent (status: draft)
    │ calendarIntegrationId → CalendarIntegration
    │ calendarEventId (CalendarReference VO)
    │
    │ Usuario revisa y confirma
    ▼
WorkEvent (status: confirmed)
```

---

## 6. Referencia completa de campos de relación

| Campo | Entidad origen | Referencia | Tipo actual | Tipo objetivo |
|---|---|---|---|---|
| `businessId` | User | Business | String | ObjectId |
| `businessId` | FiscalProfile | Business | — (nueva) | ObjectId |
| `businessId` | Customer | Business | — (nueva) | ObjectId |
| `businessId` | Contact | Business | — (nueva) | ObjectId |
| `businessId` | Contract | Business | — (nueva) | ObjectId |
| `businessId` | Rate | Business | — (nueva) | ObjectId |
| `businessId` | CalendarIntegration | Business | — (nueva) | ObjectId |
| `businessId` | WorkEvent | Business | — (nueva) | ObjectId |
| `businessId` | Invoice | Business | — (nueva) | ObjectId |
| `businessId` | InvoiceItem | Business | — (nueva) | ObjectId |
| `businessId` | Payment | Business | — (nueva) | ObjectId |
| `businessId` | CommunicationLog | Business | — (nueva) | ObjectId |
| `businessId` | CommunicationConnection | Business | `companyId` (ObjectId) | ObjectId (renombrar) |
| `ownerUserId` | Business | User | String | ObjectId |
| `customerId` | Contract | Customer | — (nueva) | ObjectId |
| `customerId` | WorkEvent | Customer | — (nueva) | ObjectId |
| `customerId` | Invoice | Customer | — (nueva) | ObjectId |
| `contractId` | WorkEvent | Contract | — (nueva) | ObjectId (nullable) |
| `contractId` | Invoice | Contract | — (nueva) | ObjectId (nullable) |
| `rateId` | WorkEvent | Rate | — (nueva) | ObjectId (nullable) |
| `defaultRateId` | Contract | Rate | — (nueva) | ObjectId (nullable) |
| `invoiceId` | InvoiceItem | Invoice | — (nueva) | ObjectId |
| `invoiceId` | Payment | Invoice | — (nueva) | ObjectId |
| `workEventId` | InvoiceItem | WorkEvent | — (nueva) | ObjectId (nullable) |
| `invoiceItemId` | WorkEvent | InvoiceItem | — (nueva) | ObjectId (nullable) |
| `calendarIntegrationId` | WorkEvent | CalendarIntegration | — (nueva) | ObjectId (nullable) |
| `userId` | WorkEvent | User | — (nueva) | ObjectId |
| `userId` | CalendarIntegration | User | — (nueva) | ObjectId |

---

## 7. Índices recomendados por entidad

### Business / `businesses`
```
{ businessKey: 1 }                        unique
{ isPlatformCompany: 1 }                  unique parcial (isPlatformCompany: true)
{ isActive: 1 }
```

### User / `users`
```
{ email: 1 }                              unique
{ businessId: 1, role: 1 }               compound
{ businessId: 1, isActive: 1 }
```

### Customer / `customers`
```
{ businessId: 1, isActive: 1 }
{ businessId: 1, name: 1 }               text search
```

### Contract / `contracts`
```
{ businessId: 1, customerId: 1 }
{ businessId: 1, status: 1 }
{ businessId: 1, endDate: 1 }            para detectar contratos vencidos
```

### WorkEvent / `work_events`
```
{ businessId: 1, status: 1 }
{ businessId: 1, date: 1 }               queries por período
{ businessId: 1, customerId: 1, status: 1 }
{ calendarEventId: 1, businessId: 1 }    unique para deduplicación de imports
{ invoiceItemId: 1 }                     sparse — solo cuando facturado
```

### Invoice / `invoices`
```
{ businessId: 1, status: 1 }
{ businessId: 1, customerId: 1 }
{ businessId: 1, dueDate: 1, status: 1 } para detección de overdue
{ invoiceNumber: 1, businessId: 1 }      unique compound
```

### InvoiceItem / `invoice_items`
```
{ invoiceId: 1 }
{ businessId: 1, invoiceId: 1 }
{ workEventId: 1 }                       sparse — para verificar duplicados
```

### Payment / `payments`
```
{ businessId: 1, invoiceId: 1 }
{ businessId: 1, date: 1 }
{ businessId: 1, status: 1 }
```

---

## 8. Restricciones de integridad que MongoDB no puede enforcer

Las siguientes restricciones son responsabilidad de la capa de aplicación (Domain Services):

1. **Un WorkEvent solo puede pertenecer a un InvoiceItem activo** — verificar que `workEventId` no esté ya en otro InvoiceItem de una Invoice no `void`.
2. **Un Contract tiene exactamente una Rate con `isDefault: true`** — enforceado al crear/actualizar Rates.
3. **`Invoice.total = sum(InvoiceItems.amount) + taxAmount`** — recalcular en cada mutación.
4. **`Invoice.amountDue >= 0`** — validar al registrar Payments.
5. **El `invoiceNumber` es único por Business** — generado atómicamente desde `FiscalProfile.invoiceNextNumber`.

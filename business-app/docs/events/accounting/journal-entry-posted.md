# Evento: accounting.journal_entry_posted

**Versión del contrato:** 1
**Fecha:** 2026-07-06
**Productor:** Accounting domain (`src/accounting/`)
**Estado:** Oficial — pendiente de implementación (Sprint 8)

---

## Propósito

Indica que un JournalEntry fue registrado en el General Ledger. BI no consume este evento en la Fase 1 — los KPIs de BI se calculan desde las facts operativas (invoices, payments). En Fase futura, puede alimentar un modelo de P&L analítico.

---

## Payload

| Campo | Tipo | Requerido | BI Column | Descripción |
|---|---|---|---|---|
| `businessId` | UUID | ✅ | — | Tenant owner |
| `journalEntryId` | UUID | ✅ | — | ID del JournalEntry |
| `fiscalPeriodId` | UUID | ✅ | — | Período fiscal |
| `transactionType` | string | ✅ | — | Tipo de transacción contable |
| `totalDebit` | decimal | ✅ | — | Total débito (debe = crédito) |
| `totalCredit` | decimal | ✅ | — | Total crédito |
| `currency` | string(3) | ✅ | — | Moneda |
| `postedAt` | ISO8601 | ✅ | — | Timestamp |

---

## BI Relevance

No alimenta tablas de BI en Fase 1. Reservado para Fase 3+ (modelo P&L dimensional en BI).

---

## Analytics Relevance

Analytics BC-10 puede consumir este evento para actualizar el General Ledger summary en el dashboard de Accounting.

---

## Estado de implementación

- ❌ No implementado aún (Sprint 8)

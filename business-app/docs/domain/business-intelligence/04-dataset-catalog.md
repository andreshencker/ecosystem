# 04 — Dataset Catalog (Business Intelligence)

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial

Datasets que BI expone vía endpoints internos hacia Business App.

---

## DS-CUST-001 — Customer Summary (implementado Sprint 2)

**Endpoint:** `GET /internal/customers/summary`

```json
{
  "businessId": "...",
  "totalCustomers": 24,
  "activeCustomers": 21,
  "inactiveCustomers": 3,
  "customersByType": { "company": 18, "individual": 6 },
  "recentCustomers": [...]
}
```

---

## DS-DASH-001 — Dashboard Basic (implementado Sprint 2)

**Endpoint:** `GET /internal/dashboard/summary`

```json
{
  "businessId": "...",
  "period": "2026-07",
  "customers": { "total": 24, "active": 21, "newThisPeriod": 3 }
}
```

---

## Datasets futuros (Sprint 11+)

| Dataset | Descripción |
|---|---|
| DS-REV-001 | Revenue by Month |
| DS-REV-002 | Revenue by Customer |
| DS-AR-001 | AR Aging Report |
| DS-WORK-001 | Hours by Period |
| DS-FORE-001 | Revenue Forecast |

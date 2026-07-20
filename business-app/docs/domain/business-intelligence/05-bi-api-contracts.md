# 05 — BI API Contracts

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial

Todos los endpoints bajo `/internal/` requieren header `x-internal-service-token`.

---

## GET `/health`

No requiere autenticación. Retorna estado del servicio y conexión a la base de datos.

**Response:**

```json
{
  "status": "ok",
  "version": "0.1.0",
  "database": "connected"
}
```

---

## GET `/internal/customers/summary`

Resumen analítico de customers de un Business.

**Query params:**

| Param | Tipo | Requerido | Descripción |
|---|---|---|---|
| `businessId` | string (UUID) | Sí | businessId del tenant |
| `period` | string | No | Filtro de período, ej. `2026-07`. Si omitido, retorna acumulado. |

**Response:**

```json
{
  "businessId": "...",
  "period": "2026-07",
  "totalCustomers": 24,
  "activeCustomers": 21,
  "inactiveCustomers": 3,
  "customersByType": {
    "company": 18,
    "individual": 6
  },
  "recentCustomers": [
    {
      "customerId": "...",
      "displayName": "Acme Corp",
      "customerType": "company",
      "createdAt": "2026-07-01T00:00:00Z"
    }
  ],
  "calculatedAt": "2026-07-06T14:00:00Z"
}
```

---

## GET `/internal/dashboard/summary`

Dashboard ejecutivo básico para el Business Owner.

**Query params:**

| Param | Tipo | Requerido | Descripción |
|---|---|---|---|
| `businessId` | string (UUID) | Sí | businessId del tenant |
| `period` | string | No | `YYYY-MM`. Default: mes actual. |

**Response:**

```json
{
  "businessId": "...",
  "period": "2026-07",
  "customers": {
    "total": 24,
    "active": 21,
    "newThisPeriod": 3
  },
  "calculatedAt": "2026-07-06T14:00:00Z"
}
```

---

## Errores estándar

| Código | Cuando |
|---|---|
| 401 | `x-internal-service-token` faltante o inválido |
| 400 | `businessId` faltante o malformado |
| 404 | No data found para el businessId (no es error — retorna vacío) |
| 500 | Error de base de datos u otro error interno |

```json
// 401
{ "detail": "Invalid service token" }

// 400
{ "detail": "businessId is required" }
```

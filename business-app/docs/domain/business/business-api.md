# Business API

**Versión:** v1  
**Base path:** `/v1/businesses`  
**Auth:** Requerida (JWT via GlobalAuthGuard)

---

## Endpoints

| Método | Path | Descripción | Response |
|---|---|---|---|
| `POST` | `/v1/businesses` | Crear business | 201 BusinessResponse |
| `GET` | `/v1/businesses` | Listar businesses del tenant | 200 BusinessResponse[] |
| `GET` | `/v1/businesses/:id` | Obtener business por ID | 200 / 404 |
| `PUT` | `/v1/businesses/:id` | Actualizar business | 200 / 404 / 422 |
| `DELETE` | `/v1/businesses/:id` | Soft delete | 200 / 404 |
| `PATCH` | `/v1/businesses/:id/activate` | Activar | 200 / 404 / 422 |
| `PATCH` | `/v1/businesses/:id/deactivate` | Desactivar | 200 / 404 / 422 |

---

## Crear Business — POST /v1/businesses

```json
{
  "name": "Acme Pty Ltd",           // required, 1-200 chars
  "legalName": "Acme Pty Limited",  // optional
  "abn": "51824753556",             // optional, 11 digits
  "currency": "AUD",                // optional, default AUD
  "language": "en",                 // optional, default en
  "locale": "en-AU",                // optional, default en-AU
  "timezone": "Australia/Sydney",   // optional, default Australia/Sydney
  "country": "AU",                  // optional, default AU
  "type": "company"                 // required: company|sole_trader|partnership|trust
}
```

---

## Response shape

```json
{
  "businessId": "uuid",
  "tenantId": "uuid",
  "name": "Acme Pty Ltd",
  "legalName": null,
  "abn": null,
  "currency": "AUD",
  "language": "en",
  "locale": "en-AU",
  "timezone": "Australia/Sydney",
  "country": "AU",
  "status": "active",
  "type": "company",
  "correlationId": null,
  "createdAt": "2026-07-06T00:00:00.000Z",
  "updatedAt": "2026-07-06T00:00:00.000Z",
  "deletedAt": null,
  "createdBy": "user-id",
  "updatedBy": "user-id",
  "version": 1
}
```

---

## Errores HTTP

| HTTP | Código | Cuándo |
|---|---|---|
| 404 | `NOT_FOUND` | Business ID no existe en el tenant |
| 422 | `VALIDATION_ERROR` | Campos inválidos (nombre vacío, ABN incorrecto, tipo no válido) |
| 422 | `BUSINESS_ALREADY_ACTIVE` | Activar un business ya activo |
| 422 | `BUSINESS_ALREADY_INACTIVE` | Desactivar un business ya inactivo |
| 422 | `BUSINESS_ALREADY_DELETED` | Operación sobre business eliminado |

---

## Tenant Isolation

`tenantId` se extrae automáticamente del JWT (`authContext.companyId`). El cliente nunca pasa `tenantId` en el body. Toda operación filtra por tenantId del usuario autenticado.

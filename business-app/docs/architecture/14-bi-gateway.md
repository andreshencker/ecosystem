# 14 — BI Gateway — business-app/backend como único intermediario

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial

---

## Principio

El servicio Business Intelligence (Python/FastAPI/Neon) nunca es accesible directamente desde el Frontend. `business-app/backend` es el único gateway autorizado.

```
FRONTEND
  │  HTTP + JWT (autenticado por business-app/backend)
  ▼
BUSINESS-APP BACKEND
  │  HTTP interno + x-internal-service-token
  │  businessId resuelto del JWT (nunca del body del request)
  ▼
BUSINESS INTELLIGENCE SERVICE
  │  SQL
  ▼
POSTGRESQL NEON
```

---

## Flujo de una request típica

```
1. Frontend: GET /api/bi/customers/summary?period=2026-Q2
   Header: Authorization: Bearer <jwt>

2. business-app/backend:
   a. Valida JWT → extrae businessId, userId, roles
   b. Verifica permisos RBAC
   c. Llama a BiClientService.getCustomerSummary(businessId, period)

3. BiClientService (src/settings/bi-client/bi-client.service.ts):
   a. GET http://bi-service/internal/customers/summary?businessId=XXX&period=2026-Q2
   b. Header: x-internal-service-token: <token>

4. BI Service:
   a. Valida x-internal-service-token
   b. Ejecuta query filtrada por businessId
   c. Retorna resultado

5. business-app/backend:
   a. Maneja errores de BI (timeout, 5xx → retorna 503 al frontend)
   b. Retorna datos al frontend
```

---

## Implementación del Gateway en backend

### Estructura de módulo

```
business-app/backend/src/settings/bi-client/
  bi-client.module.ts   ← módulo NestJS con HttpModule
  bi-client.service.ts  ← cliente HTTP contra BI (ya implementado)

business-app/backend/src/bi/              ← (a crear cuando haya endpoints BI para frontend)
  bi.module.ts          ← importa BiClientModule, expone controllers
  bi.controller.ts      ← endpoints que el frontend puede llamar
  bi.service.ts         ← lógica de orquestación backend (extrae businessId del JWT)
```

### Reglas de implementación

```typescript
// ✅ CORRECTO — businessId siempre del JWT, nunca del body/query del frontend
@Get('customers/summary')
@UseGuards(JwtAuthGuard)
async getCustomerSummary(
  @CurrentUser() user: AuthenticatedUser,  // businessId viene del JWT
  @Query('period') period?: string,
) {
  // businessId resuelto por el guard, nunca por el frontend
  return this.biService.getCustomerSummary(user.businessId, period);
}

// ❌ INCORRECTO — businessId del query param (el frontend podría falsificarlo)
@Get('customers/summary')
async getCustomerSummary(@Query('businessId') businessId: string) {
  return this.biService.getCustomerSummary(businessId); // PROHIBIDO
}
```

### Manejo de errores de BI

```typescript
// BiClientService ya implementa esto — error → null → 503 al frontend
async getCustomerSummary(businessId: string, period?: string) {
  try {
    const res = await this.http.get(`${this.baseUrl}/internal/customers/summary`, {
      headers: this.headers(),
      params: { businessId, period },
      timeout: 10_000,
    });
    return res.data;
  } catch (err) {
    this.logger.error(`[BI] failed: ${err.message}`);
    return null; // el controller convierte null en 503
  }
}
```

---

## Correlación de requests

El gateway debe agregar `correlationId` a todas las requests hacia BI:

```typescript
private headers(correlationId?: string): Record<string, string> {
  return {
    'x-internal-service-token': this.serviceToken,
    ...(correlationId ? { 'x-correlation-id': correlationId } : {}),
  };
}
```

BI debe loguear el `x-correlation-id` para poder rastrear una request end-to-end.

---

## Configuración requerida en business-app/backend

```env
BI_SERVICE_URL=http://localhost:8000          # URL del servicio BI
BI_INTERNAL_SERVICE_TOKEN=<token-secreto>    # Mismo token que BI_INTERNAL_SERVICE_TOKEN en BI
```

**Regla:** `BI_INTERNAL_SERVICE_TOKEN` debe ser el mismo valor en ambos servicios. Se configura en `.env` de cada servicio y nunca se hardcodea.

---

## Lo que el Gateway NUNCA debe hacer

```
❌ Exponer endpoints /internal/* de BI directamente al frontend
❌ Pasar el JWT del usuario a BI (BI no lo valida)
❌ Usar businessId del body de la request del frontend
❌ Retornar errores de BI con información interna al frontend (solo 503 genérico)
❌ Cachear respuestas de BI con datos de otro tenant
❌ Llamar a BI sin x-internal-service-token
```

---

## Estado actual del gateway

| Componente | Estado |
|---|---|
| `BiClientService` (bi-client.service.ts) | ✅ Implementado |
| `BiClientModule` (bi-client.module.ts) | ✅ Implementado |
| Controller que expone endpoints BI al frontend | ❌ No implementado (Sprint 11) |
| businessId siempre del JWT en controllers | ✅ Patrón correcto en BiClientService |
| x-internal-service-token en todas las requests | ✅ Implementado |
| Manejo de errores (null → 503) | ✅ Implementado |

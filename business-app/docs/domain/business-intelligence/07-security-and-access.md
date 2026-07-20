# 07 — Security and Access Control

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial

---

## Principio fundamental

Business Intelligence no autentica usuarios finales. Solo acepta llamadas internas desde Business App, autenticadas con un service token compartido.

```
CORRECTO:
  Frontend → Business App (JWT de usuario) → BI (service token)

PROHIBIDO:
  Frontend → BI (JWT de usuario directamente)
  Frontend → BI (cualquier request directo)
```

---

## Service Token

### Variables de entorno requeridas

**En Business Intelligence (`business-intelligence/.env`):**

```
BI_DATABASE_URL=postgresql+asyncpg://...
BI_INTERNAL_SERVICE_TOKEN=<token-secreto-largo>
PORT=8000
```

**En Business App (`business-app/backend/.env`):**

```
BI_SERVICE_URL=http://localhost:8000
BI_INTERNAL_SERVICE_TOKEN=<mismo-token-secreto>
```

### Header obligatorio

Todo request de Business App a BI debe incluir:

```
x-internal-service-token: <token>
```

### Comportamiento en BI

```python
# Middleware en BI
if x-internal-service-token no existe o no coincide:
    return HTTP 401 { "detail": "Invalid service token" }
```

El token se valida contra `BI_INTERNAL_SERVICE_TOKEN` de la config. Comparación en tiempo constante (no susceptible a timing attacks).

---

## Flujo de autenticación completo

```
1. Usuario abre el dashboard en el Frontend
   │
2. Frontend envía GET /analytics/customers/summary + JWT
   │   (al Business App backend)
   │
3. Business App valida el JWT (GlobalAuthGuard)
   │   Extrae userId, role, companyId → AuthContext
   │
4. Business App construye la llamada a BI:
   │   GET http://BI_SERVICE_URL/internal/customers/summary
   │   Header: x-internal-service-token: <token>
   │   Param: businessId=<companyId del JWT>
   │
5. BI valida el service token (InternalAuthMiddleware)
   │   Si inválido → 401
   │   Si válido → ejecuta la query con WHERE business_id = <businessId>
   │
6. BI retorna dataset al Business App
   │
7. Business App retorna el dataset al Frontend
```

**Nota crítica:** El `businessId` lo determina Business App a partir del JWT del usuario. El Frontend **nunca** puede elegir libremente qué `businessId` consultar en BI.

---

## Generación del service token

El token debe ser:
- Al menos 32 bytes aleatorios
- Codificado en hex o base64
- Nunca commiteado al repositorio
- Diferente en cada environment (dev, staging, prod)

Generar en terminal:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
# o
openssl rand -hex 32
```

---

## Endpoints públicos (sin service token)

Solo el health check:

```
GET /health  →  No requiere x-internal-service-token
```

Todos los demás endpoints bajo `/internal/` requieren el service token.

---

## Postura de seguridad adicional

| Medida | Estado |
|---|---|
| BI no está expuesto a internet directamente | Obligatorio en producción (solo acceso desde Business App) |
| Token en variables de entorno, nunca en código | Obligatorio |
| Comparación de token en tiempo constante | Implementado via `hmac.compare_digest` |
| Rate limiting | Responsabilidad de Business App (no de BI) |
| HTTPS entre Business App y BI | Obligatorio en producción |

# 04 — Resilience

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual oficial

Las integraciones son inherentemente inestables: los sistemas externos fallan, los tokens expiran, las APIs tienen rate limits. La capa de resiliencia garantiza que estos fallos no comprometan la operación del ERP.

---

## Circuit Breaker

El Circuit Breaker previene que el Integration Hub siga llamando a un sistema externo que está fallando, evitando saturar el sistema y sobrecargar al proveedor.

```
Estado del Circuit Breaker:

  CLOSED (normal)
    → Todas las llamadas pasan
    → Si threshold_failures ocurren en window_time → OPEN

  OPEN (cortado)
    → Todas las llamadas se rechazan inmediatamente (sin llamar al externo)
    → Después de recovery_timeout → HALF_OPEN

  HALF_OPEN (probando)
    → Una sola llamada de prueba pasa
    → Si tiene éxito → CLOSED
    → Si falla → OPEN nuevamente
```

**Configuración por proveedor:**

| Parámetro | Google Calendar | Stripe | Xero |
|---|---|---|---|
| threshold_failures | 5 en 60s | 3 en 30s | 5 en 120s |
| recovery_timeout | 60s | 30s | 120s |
| probe_success_count | 1 | 1 | 2 |

**Comportamiento cuando el circuit está OPEN:**
```
Si el Circuit Breaker está abierto para Google Calendar:
  → El SyncJob se cancela y se registra en el historial
  → El Integration Hub NO falla silenciosamente
  → Automation puede recibir el evento CalendarConnectionFailed
  → Automation puede notificar al Business Owner
  → El Business Owner ve en la UI: "Google Calendar connection unstable. Retrying in 60 seconds."
```

---

## Retry Policy por categoría de error

No todos los errores son iguales. La retry policy depende del tipo de error:

### Errores transitorios (retry automático)

| Error | Causa típica | Estrategia |
|---|---|---|
| HTTP 429 Too Many Requests | Rate limit del proveedor | Exponential backoff + respetar `Retry-After` header |
| HTTP 503 Service Unavailable | Downtime del proveedor | Exponential backoff. Max 3 intentos. |
| HTTP 504 Gateway Timeout | Timeout de la infraestructura | Retry inmediato una vez. Luego backoff. |
| Network error / DNS | Problema de red | Retry inmediato 2 veces. Luego backoff. |
| Connection reset | Keep-alive expirado | Retry inmediato |

### Errores de cliente (NO retry)

| Error | Causa típica | Acción |
|---|---|---|
| HTTP 401 Unauthorized | Token inválido o revocado | Marcar conexión como `needs_reauth`. Alertar al usuario. |
| HTTP 403 Forbidden | Scope insuficiente | Marcar conexión como `needs_reauth`. Alertar al usuario. |
| HTTP 404 Not Found | El recurso externo fue eliminado | Registrar. No reintentar. |
| HTTP 400 Bad Request | Payload mal construido | Es un bug del Connector. Registrar. Dead Letter. |
| HTTP 422 Unprocessable | Datos inválidos para el sistema externo | Registrar con detalle. Dead Letter para revisión. |

### Estrategia de backoff exponencial

```
Intento 1: falla → esperar 1 segundo
Intento 2: falla → esperar 2 segundos
Intento 3: falla → esperar 4 segundos
Intento 4: falla → esperar 8 segundos
...
Intento N: falla → esperar min(2^N, maxDelay)

Si recibe Retry-After: 60 → esperar exactamente 60 segundos
(ignorar el backoff calculado si Retry-After es mayor)
```

---

## Rate Limiting proactivo

El Integration Hub implementa rate limiting proactivo — antes de superar el límite del proveedor:

```
RateLimiter por proveedor:
  Google Calendar:
    → Token Bucket: 100 tokens, rellena 1 token/segundo
    → Antes de cada request: ¿hay token disponible?
      SÍ → consume el token y envía
      NO → espera hasta que haya token (backing off)

Stripe:
    → Sliding Window: max 100 requests en 60 segundos
    → Si la ventana se llena → cola y espera

Xero:
    → Token Bucket: 60 tokens, rellena 1 token/segundo
```

**Por qué proactivo (no reactivo):**
Si se esperara un 429 del proveedor para frenar, ya se habrían enviado requests innecesarios que consumen quota. El rate limiting proactivo previene que se llegue al límite.

---

## Dead Letter Queue para integraciones

Cuando un evento de integración no puede procesarse después de todos los reintentos:

```
DeadLetterEntry {
    entryId:          UUID
    connectionId:     UUID
    businessId:       ObjectId
    provider:         string
    operationType:    'inbound_sync' | 'outbound_sync' | 'webhook'
    rawPayload:       object      ← el payload original completo
    failedAt:         DateTime
    attempts:         integer
    lastError:        string
    errorCode:        string
    resolution:       string?
    resolvedAt:       DateTime?
    resolvedBy:       string?    — 'system' | 'platform_admin' | 'business_owner'
}
```

**El rawPayload es crítico:**
Si hay un bug en el Normalizer que causa el fallo, corregir el bug permite reprocesar el rawPayload sin volver a consultar el sistema externo.

**Resolución de Dead Letter entries:**

```
Opciones disponibles en la UI de Platform Admin:
  1. Retry now — reintentar con la lógica actual
  2. Retry with fix — se aplica un patch al normalizer y se reintentan
  3. Discard — descartar sin procesar
  4. Manual resolve — registrar qué acción manual se tomó
```

---

## Idempotencia en integraciones

El mismo evento externo puede llegar múltiples veces (retry del proveedor, polling duplicado). La idempotencia garantiza que el sistema lo procesa exactamente una vez.

### Inbound Idempotency Key

```
Idempotency Key = hash(provider + connectionId + externalEventId + eventType)

Proceso:
  1. Calcular el Idempotency Key del evento entrante
  2. ¿Existe ya en el IdempotencyStore?
     SÍ → responder 200 al proveedor pero no procesar
     NO → procesar y registrar en IdempotencyStore con TTL de 24h
```

### Outbound Idempotency Key

```
Para operaciones outbound (ej: crear Invoice en Xero):
  Si la llamada falla y se reintenta, puede que la primera llamada
  haya llegado pero la respuesta se perdió.

Solución: Idempotency Key en el header de la request al proveedor:
  POST https://api.xero.com/api.xro/2.0/ManualJournals
  Idempotency-Key: hash(journalEntryId + xeroConnectionId)

Si el proveedor soporta Idempotency Keys (Stripe, Xero sí):
  → El proveedor retorna el mismo resultado para requests idénticos
Si el proveedor NO soporta:
  → El Integration Hub consulta antes de crear: ¿ya existe este recurso externo?
```

---

## Sync Status y Observabilidad

### SyncStatus por conexión

```
IntegrationConnectionSyncStatus {
    connectionId:           UUID
    businessId:             ObjectId
    provider:               string
    lastSuccessfulSyncAt:   DateTime
    lastAttemptAt:          DateTime
    consecutiveFailures:    integer
    circuitBreakerState:    'closed' | 'open' | 'half_open'
    itemsImportedTotal:     integer
    itemsFailedTotal:       integer
    healthStatus:           'healthy' | 'degraded' | 'critical'
}
```

### Alertas automáticas

| Condición | Alerta |
|---|---|
| `consecutiveFailures > 3` | Integration Hub alerta al Business Owner |
| `consecutiveFailures > 10` | Platform Admin alerta adicional |
| `lastSuccessfulSyncAt > 24h` | Alerta de sync retrasado |
| `circuitBreakerState == 'open'` | Alerta inmediata al Platform Admin |
| `needs_reauth` | Alerta al Business Owner con instrucciones para reconectar |

---

## Evolución de la resiliencia a 10 años

### Año 1-2 — Baseline
- Circuit Breaker básico
- Retry con backoff exponencial
- Dead Letter Queue con UI de revisión
- Rate Limiting proactivo para los 5 proveedores más críticos

### Año 3-4 — Adaptive
- Rate Limiting adaptativo (aprende los patrones de uso de cada proveedor)
- Detección automática de cambios de API en proveedores (API version detection)
- Chaos testing automático de las integraciones

### Año 5+ — Predictive
- Predicción de outages de proveedores basada en historial
- Pre-staging de datos para proveedores con downtime programado
- Multi-region failover para conexiones críticas

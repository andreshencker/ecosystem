# Architecture Cross-Project Audit

**Versión:** 1.0 | **Fecha:** 2026-07-07 | **Alcance:** Backend + Frontend + Business Intelligence + Analytics

---

## 1. Documentación revisada

| Documento | Estado |
|---|---|
| `docs/architecture/12-business-intelligence-architecture.md` | ✅ Leído — define separación BI vs Analytics |
| `docs/architecture/14-bi-gateway.md` | ✅ Leído — define el flujo Frontend → Backend → BI |
| `docs/architecture/09-architecture-principles.md` | ✅ Leído — principios no negociables |
| `docs/architecture/communication-architecture.md` | ✅ Revisado (sprint anterior) |
| `docs/architecture/architecture-final-review.md` | ✅ Revisado (sprint anterior) |
| `docs/domain/analytics/` (9 documentos) | ✅ Catálogo KPI, Read Models, contratos |
| `docs/domain/business-intelligence/` (9 documentos) | ✅ Modelo dimensional, datasets, API contracts |
| `docs/engineering/12-definition-of-done.md` | ✅ DoD vigente |
| `business-intelligence/app/main.py` | ✅ Auditado |
| `business-intelligence/app/core/security.py` | ✅ Auditado |
| `business-intelligence/app/core/database.py` | ✅ Auditado |
| `business-intelligence/app/core/config.py` | ✅ Auditado |
| `backend/src/analytics/analytics.controller.ts` | ✅ Auditado |
| `backend/src/settings/bi-client/bi-client.service.ts` | ✅ Auditado |
| Frontend (todos los hooks y páginas) | ✅ Auditado |

---

## 2. Conflictos encontrados

| # | Conflicto | Documentos involucrados | Severidad |
|---|---|---|---|
| C-01 | `uvicorn main:app` en lugar de `uvicorn app.main:app` causa error de startup | README.md (correcto) vs práctica al ejecutar | **Alta** — servicio no inicia |
| C-02 | `BI_INTERNAL_SERVICE_TOKEN` vacío en `.env` → HTTP 500 en todos los endpoints `/internal/*` | `.env` vs código de `InternalAuthMiddleware` | **Alta** — BI inaccesible |
| C-03 | `BI_SERVICE_URL` y `BI_INTERNAL_SERVICE_TOKEN` ausentes en backend `.env` | `bi-client.service.ts` usa defaults | **Media** — backend apunta a BI sin token |
| C-04 | `AnalyticsController` en NestJS proxea a BI (Python/PostgreSQL), pero arquitectura final dice que operacional → Analytics BC-10 (MongoDB) | `docs/architecture/12-*.md` vs código | **Aceptable** — BC-10 no existe aún (Sprint 11) |

---

## 3. Conflictos corregidos

| # | Corrección aplicada |
|---|---|
| C-01 | README actualizado con advertencia explícita sobre el error y el comando correcto |
| C-02 | `BI_INTERNAL_SERVICE_TOKEN` configurado en `business-intelligence/.env` |
| C-03 | `BI_SERVICE_URL` y `BI_INTERNAL_SERVICE_TOKEN` agregados a `backend/.env` |
| C-04 | No se corrige código — es el estado correcto para Sprint 2 (BC-10 pendiente Sprint 11). Documentado en `docs/architecture/12-*.md §7` |

---

## 4. Estado del Backend

### Responsabilidad del Backend: ✅ Conforme

El Backend es responsable exclusivamente de:

| Responsabilidad | Estado |
|---|---|
| Reglas de negocio (Business Rules) | ✅ En Application Services y Domain models |
| Validaciones de entrada (DTOs) | ✅ class-validator en todos los endpoints |
| Domain Events + Outbox | ✅ CustomerCreated/Updated/Deactivated publicados |
| APIs REST | ✅ Todos los módulos actuales |
| Communications (notifyEvent) | ✅ Solo Auth/Invitations, correctamente |
| Gateway hacia BI | ✅ `BiClientService` + `AnalyticsController` |

### Lo que el Backend NO hace (verificado): ✅

| Prohibición | Estado |
|---|---|
| Calcular KPIs | ✅ No existe ningún cálculo en Application Services |
| Calcular métricas o aggregaciones | ✅ No existe |
| Generar dashboards | ✅ No existe |
| Queries analytics propios | ✅ No existe — todo va a BI |
| Acceso directo a PostgreSQL Neon | ✅ No existe — solo `BiClientService` |

### Módulos auditados

| Módulo | Cálculos propios | Responsabilidad correcta |
|---|---|---|
| `platform/auth` | ❌ Ninguno | ✅ |
| `platform/users` | ❌ Ninguno | ✅ |
| `platform/user-invitations` | ❌ Ninguno | ✅ |
| `platform/company` | ❌ Ninguno | ✅ |
| `customer` | ❌ Ninguno | ✅ |
| `mdm` | ❌ Ninguno (catálogo estático) | ✅ |
| `analytics` | ❌ Solo gateway HTTP | ✅ |
| `settings/bi-client` | ❌ Solo HTTP client | ✅ |
| `settings/communication-client` | ❌ Solo HTTP client | ✅ |

---

## 5. Estado del Frontend

### Responsabilidad del Frontend: ✅ Conforme

El Frontend es responsable exclusivamente de:

| Responsabilidad | Estado |
|---|---|
| Consumir APIs | ✅ Todo via `apiClient` |
| Mostrar tablas y formularios | ✅ DataGrid, formularios con react-hook-form |
| Mostrar toast/snackbar | ✅ Auditado en sprint anterior — todos los hooks tienen feedback |
| Capturar acciones del usuario | ✅ |

### Cálculos en el Frontend: ✅ Ninguno encontrado

Scan completo de todos los archivos `.tsx` y `.ts` del frontend. Ningún archivo realiza cálculos analíticos:

| Operación encontrada | Tipo | ¿Incumplimiento? |
|---|---|---|
| `data?.total` | Mostrar valor ya calculado del API | ✅ No — es presentación |
| `contacts.length` | Contar para mostrar badge UI | ✅ No — es UI, no analytics |
| `Math.min(invitations.length, 100)` | Calcular `pageSize` de DataGrid | ✅ No — es configuración UI |
| `.filter(Boolean).join(', ')` | Formatear string de dirección | ✅ No — es formateo de texto |
| `[a, b, c].filter(Boolean).join(' · ')` | Formatear string de contacto | ✅ No — es formateo de texto |

**Conclusión:** El Frontend no calcula. Toda información analítica llega desde el Backend o BI. ✅

### Toast/Snackbar: ✅ Corregido en sprint anterior

Todos los hooks de mutación tienen `pushSnack` en `onSuccess` y `onError`. El `MutationCache.onError` actúa como fallback global.

---

## 6. Estado de Business Intelligence

### Proyecto: `business-app/business-intelligence/`

| Componente | Estado | Notas |
|---|---|---|
| FastAPI application (`app/main.py`) | ✅ Implementado | Lifespan con validación de DB y migrations |
| `InternalAuthMiddleware` | ✅ Implementado | Protege todos los `/internal/*` endpoints |
| `config.py` (Settings) | ✅ Implementado | Pydantic BaseSettings + validación |
| `database.py` | ✅ Implementado | SQLAlchemy async + asyncpg + Neon SSL |
| PostgreSQL Neon connection | ✅ Conectado | PostgreSQL 18.4 |
| Alembic migrations | ✅ Aplicadas | Versión `32d1d2706e72` |
| `CustomerKpiService` | ✅ Implementado | Queries en `dim_customer` |
| `DashboardService` | ✅ Implementado | Dashboard summary |
| Endpoints `/internal/customers/summary` | ✅ Implementados | |
| Endpoints `/internal/dashboard/summary` | ✅ Implementados | |
| `BI_INTERNAL_SERVICE_TOKEN` | ✅ **Corregido** | Vacío → configurado |
| Ingestion service (ETL) | ⏳ Pendiente Sprint 11 | Sin datos en dim_* tables aún |
| Event bridge | ⏳ Pendiente Sprint 11 | |
| `dim_customer` data | ⏳ Vacío | Correcto — sin ingestion todavía |

### Causa raíz del error de startup

**Error:** `Error loading ASGI app. Could not import module "main"`

**Causa raíz:** Se ejecutaba `uvicorn main:app` desde el directorio `business-intelligence/`. El módulo principal está en `app/main.py`, no en `main.py` en el root. El comando correcto es `uvicorn app.main:app`.

**Causa secundaria (runtime):** `BI_INTERNAL_SERVICE_TOKEN` estaba vacío en `.env`. La middleware `InternalAuthMiddleware` retorna HTTP 500 cuando el token esperado no está configurado. Todos los endpoints `/internal/*` fallaban con 500 incluso después de iniciar correctamente.

**Correcciones aplicadas:**
1. README.md actualizado con advertencia explícita sobre el error y el comando correcto
2. `BI_INTERNAL_SERVICE_TOKEN` configurado en `business-intelligence/.env`
3. `BI_SERVICE_URL` y `BI_INTERNAL_SERVICE_TOKEN` agregados a `backend/.env`

**Verificación:** Startup correcto confirmado — DB conectada, migrations aplicadas, middleware operativa.

---

## 7. Estado de Analytics

### Analytics BC-10 (dentro de NestJS backend)

| Componente | Estado | Notas |
|---|---|---|
| `AnalyticsController` | ✅ Implementado como gateway | Proxea a BI Python |
| `AnalyticsModule` | ✅ Implementado | |
| Read Models (MongoDB) | ⏳ Pendiente Sprint 11 | Correcto — BC-10 se implementa en Sprint 11 |
| Event handlers | ⏳ Pendiente Sprint 11 | |
| Fact/Dimension collections (MongoDB) | ⏳ Pendiente Sprint 11 | |

**Estado esperado:** Analytics BC-10 es un bounded context incompleto. Su implementación plena es Sprint 11. El `AnalyticsController` actual actúa como proxy a BI mientras BC-10 no existe. Este comportamiento es correcto y documentado.

---

## 8. Separación BI vs Analytics — validación

La separación está documentada en `docs/architecture/12-business-intelligence-architecture.md` y es arquitectónicamente correcta:

| Dimensión | Analytics BC-10 (NestJS) | Business Intelligence (Python) |
|---|---|---|
| **Tipo de pregunta** | Operativa: "¿Qué facturas tengo pendientes?" | Estratégica: "¿Qué clientes tienen riesgo de pago tardío?" |
| **Latencia** | < 100ms (pre-calculado) | Segundos a minutos |
| **Base de datos** | MongoDB (mismo cluster) | PostgreSQL Neon (OLAP) |
| **Alimentación** | Event-driven (tiempo real) | ETL + Event bridge (batch) |
| **Tenant isolation** | Siempre por `businessId` | Per-tenant + cross-tenant (platform_admin) |
| **Herramientas externas** | No | Sí: Metabase, PowerBI, Tableau |
| **Estado actual** | Stub/gateway (Sprint 11) | Skeleton con endpoints básicos |

**Conclusión:** La separación es correcta y no tiene contradicciones. Los dos sistemas son complementarios, no redundantes.

---

## 9. Responsabilidades definitivas — 4 proyectos

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BACKEND                                     │
│                                                                      │
│  Responsabilidad: OPERAR EL NEGOCIO                                  │
│                                                                      │
│  ✅ Business Rules y Validaciones                                    │
│  ✅ Application Services                                             │
│  ✅ Domain Events + Outbox                                           │
│  ✅ APIs REST                                                        │
│  ✅ Communications (notifyEvent)                                     │
│  ✅ Gateway hacia BI (proxy autenticado)                             │
│                                                                      │
│  ❌ NO calcula KPIs                                                  │
│  ❌ NO genera dashboards                                             │
│  ❌ NO hace analytics propias                                        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND                                    │
│                                                                      │
│  Responsabilidad: PRESENTAR INFORMACIÓN                              │
│                                                                      │
│  ✅ Consumir APIs del Backend                                        │
│  ✅ Mostrar tablas, formularios, gráficos                            │
│  ✅ Toast/Snackbar en cada acción                                    │
│  ✅ Capturar acciones del usuario                                    │
│  ✅ Formateo de strings para UI                                      │
│                                                                      │
│  ❌ NO calcula KPIs, totales, porcentajes                           │
│  ❌ NO agrega, reduce, ni analiza datos                             │
│  ❌ NO llama a BI directamente                                       │
│  ❌ NO llama a Communications directamente                           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    BUSINESS INTELLIGENCE                             │
│                                                                      │
│  Responsabilidad: MODELAR INFORMACIÓN                                │
│                                                                      │
│  ✅ Modelo dimensional (dim_* + fact_*)                              │
│  ✅ KPIs estratégicos sobre datos históricos                         │
│  ✅ Queries complejos cross-dimensional                              │
│  ✅ Interfaz para Metabase/PowerBI/Tableau                           │
│  ✅ ML feature store (futuro)                                        │
│                                                                      │
│  ❌ NO gestiona autenticación de usuarios                            │
│  ❌ NO aplica Business Rules                                         │
│  ❌ NO modifica entidades operativas                                 │
│  ❌ NO accede a MongoDB de business-app directamente                 │
│  ❌ NO es accesible desde el Frontend (solo desde Backend)           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          ANALYTICS                                   │
│                                                                      │
│  Responsabilidad: RESPUESTAS OPERATIVAS EN TIEMPO REAL              │
│                                                                      │
│  ✅ Read Models pre-calculados desde Domain Events                   │
│  ✅ Dashboards operativos (< 100ms)                                  │
│  ✅ Tenant-scoped facts y dimensions (MongoDB)                       │
│  ✅ Alimentado por event-bus interno (tiempo real)                   │
│                                                                      │
│  ❌ NO reemplaza BI estratégico                                      │
│  ❌ NO es accesible desde el Frontend (solo desde Backend)           │
│  ❌ NO tiene datos cross-tenant (solo per-businessId)                │
│  ESTADO ACTUAL: Sprint 11 pendiente                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 10. Correcciones realizadas en esta auditoría

### Archivos corregidos

| Archivo | Corrección |
|---|---|
| `business-intelligence/.env` | `BI_INTERNAL_SERVICE_TOKEN` configurado con valor seguro |
| `backend/.env` | `BI_SERVICE_URL` y `BI_INTERNAL_SERVICE_TOKEN` agregados |
| `business-intelligence/README.md` | Advertencia explícita sobre el error de startup |

### No requirieron cambio de código

- `app/main.py` — correcto
- `app/core/security.py` — correcto
- `app/core/database.py` — correcto
- `AnalyticsController` — correcto para este sprint
- `BiClientService` — correcto
- Todos los Application Services del backend — correctos
- Frontend — correcto

---

## 11. Confirmación de alineación

### ✅ Backend opera el negocio

- Ningún Application Service calcula métricas, KPIs, ni aggregaciones
- Gateway hacia BI correctamente implementado con `x-internal-service-token`
- businessId siempre del JWT, nunca del request body

### ✅ Frontend solo presenta

- Cero cálculos analíticos encontrados en el scan completo
- Todo valor numérico proviene del API (backend o BI)
- Toast/Snackbar en todas las acciones de usuario

### ✅ Business Intelligence modela la información

- Proyecto Python/FastAPI con PostgreSQL Neon corriendo
- Modelo dimensional definido (`dim_customer`, `fact_invoice`, `fact_payment`, `fact_work_event`, `fact_customer_activity`)
- Endpoints `/internal/*` protegidos con `x-internal-service-token`
- Accesible únicamente desde Backend (nunca desde Frontend)
- Ingestion service pendiente Sprint 11 (correcto)

### ✅ Analytics mantiene sus responsabilidades

- `AnalyticsController` es gateway puro (no calcula)
- BC-10 pendiente Sprint 11 — comportamiento correcto para Sprint 2
- Sin solapamiento de responsabilidades con BI

---

## 12. Estándar para nuevos módulos — multi-proyecto

**Todo módulo nuevo debe implementarse en todos los proyectos desde el primer día.**

```
Nuevo módulo (ej. Billing)
         │
         ├── Backend
         │    ├── Application Service + Domain Model
         │    ├── Domain Events al Outbox
         │    ├── notifyEvent() si requiere canal externo
         │    └── API endpoints
         │
         ├── Frontend
         │    ├── Páginas + componentes (Desktop + Mobile)
         │    ├── Toast/Snackbar en todas las acciones
         │    └── Hooks con TanStack Query
         │
         └── Business Intelligence (preparación)
              ├── Definir qué fact_ tables alimentará
              ├── Definir qué dim_ tables actualiza
              ├── Documentar en docs/domain/business-intelligence/
              ├── Documentar contratos de eventos consumidos
              └── Documentar KPIs futuros
              (NO implementar código BI hasta Sprint 11)
```

**Regla:** El modelo de datos BI debe quedar definido el mismo día que se implementa el módulo en el Backend. No es necesario crear código Python en ese momento — pero el diseño dimensional sí.

**Principio:** Cuando en el futuro se solicite un dashboard, un reporte, o un KPI de ese módulo, la respuesta es "el modelo ya está definido, solo hay que construir la visualización."

---

## 13. Deudas técnicas identificadas

| Deuda | Impacto | Sprint sugerido |
|---|---|---|
| Analytics BC-10 (Read Models MongoDB) | Sin analytics operativos en tiempo real | Sprint 11 |
| Ingestion service BI (ETL) | `dim_*` y `fact_*` están vacíos | Sprint 11 |
| Event bridge BI (tiempo real) | BI no recibe eventos automáticamente | Post Sprint 11 |
| Modelo BI para módulo Billing | Sin diseño dimensional para facturas/pagos | Sprint 6 (antes de implementar Billing) |
| `seed-catalog.ts` Communication Catalog | Sin Business Events en catálogo | Sprint 6 |
| `SeedProvisioningService` | Sin seeding de Communications al configurar token | Sprint 6 |

---

## Conclusión

**La arquitectura de los 4 proyectos está alineada.**

El único problema real encontrado era de configuración (token vacío + comando incorrecto) — corregido. No había desalineación arquitectónica ni cálculos en capas incorrectas.

**Sprint 3 puede comenzar.** Los módulos futuros deben seguir el estándar de 3 capas simultáneas: Backend (operación) + Frontend (presentación) + diseño BI (modelo dimensional).

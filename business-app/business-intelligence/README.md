# Business Intelligence

Microservicio Python/FastAPI para análisis estratégico del ERP.  
Data Warehouse: **Neon PostgreSQL** (star schema, tablas `dim_*` y `fact_*`).

---

## Requisitos

- Python 3.11+
- Acceso a Neon PostgreSQL (ver `.env.example`)

## Instalación

```bash
pip install -r requirements.txt
```

## Configuración

```bash
cp .env.example .env
# Editar .env con los valores reales — nunca commitear .env
```

Variables requeridas en `.env`:

```
BI_DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require&channel_binding=require
BI_INTERNAL_SERVICE_TOKEN=<token-compartido-con-business-app>
PORT=8000
```

## Correr

```bash
# Ejecutar desde el directorio business-intelligence/
uvicorn app.main:app --reload
```

> **Error común:** `Could not import module "main"` ocurre cuando se corre `uvicorn main:app` en lugar de `uvicorn app.main:app`. El `main.py` vive en `app/main.py` — siempre usar el prefijo `app.`.

## Migrations (Alembic)

```bash
# Generar nueva migración
alembic revision --autogenerate -m "descripcion"

# Aplicar migraciones
alembic upgrade head
```

## Tests

```bash
pytest tests/ -v
```

## Endpoints

| Método | Ruta | Auth requerida | Descripción |
|--------|------|---------------|-------------|
| GET | `/health` | No | Estado del servicio y conexión a Neon |
| GET | `/internal/customers/summary` | `x-internal-service-token` | KPIs de customers |
| GET | `/internal/dashboard/summary` | `x-internal-service-token` | Dashboard summary |

## Seguridad

- Todos los endpoints `/internal/*` requieren el header `x-internal-service-token`.
- Este servicio **nunca** debe exponerse directamente al internet — solo Business App puede llamarlo.
- `BI_DATABASE_URL` nunca debe aparecer en logs, código ni commits.

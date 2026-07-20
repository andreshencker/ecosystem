# 14 — CI/CD y Validación

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial

---

## Principio

El pipeline de CI/CD es la última línea de defensa antes de merge. Ningún PR puede mergearse si el pipeline falla. Los comandos listados aquí son **obligatorios** — no opcionales.

---

## Backend (NestJS — business-app/backend)

```bash
# Desde: business-app/backend/

# 1. Typecheck (sin compilar)
npm run typecheck
# Alternativa si no existe el script:
npx tsc --noEmit

# 2. Lint
npm run lint

# 3. Tests unitarios e integración
npm test
# Todos deben pasar — 0 fallos, 0 skippeados sin comentario

# 4. Build (verifica que compila)
npm run build

# Criterio de CI: todos los comandos retornan exit code 0
```

**Verificaciones adicionales que el QA Agent debe ejecutar manualmente:**

```bash
# Verificar que no hay imports cruzados entre bounded contexts
npm test -- --testPathPattern="dependency-rule"

# Verificar aislamiento de tenant
npm test -- --testPathPattern="security"
```

---

## Frontend (Next.js — business-app/frontend)

```bash
# Desde: business-app/frontend/

# 1. Typecheck
npx tsc --noEmit

# 2. Build (incluye verificación de tipos en Next.js)
npm run build

# 3. Lint (si existe)
npm run lint

# 4. Tests (si existen)
npm test

# Verificación de gateway — OBLIGATORIA antes de merge de cualquier PR de frontend
# Verifica que no hay URLs directas a BI ni a servicios internos
grep -r "localhost:8000\|bi-service\|/internal/" app/ components/ hooks/ \
  && echo "ERROR: Frontend contiene URLs directas a servicios internos" \
  && exit 1 \
  || echo "OK: No hay llamadas directas a servicios internos"
```

---

## Business Intelligence (Python — business-app/business-intelligence/)

```bash
# Desde: business-app/business-intelligence/

# 1. Instalar dependencias
pip install -r requirements.txt

# 2. Verificar migraciones aplicadas
.venv/bin/alembic current
# Debe retornar: <revision_id> (head)
# Si no retorna (head): ejecutar alembic upgrade head primero

# 3. Aplicar migraciones (si hay nuevas)
.venv/bin/alembic upgrade head
# Debe retornar exit code 0 sin errores

# 4. Importar la app (verifica que no hay errores de import)
.venv/bin/python -c "from app.main import app; print('Import OK')"

# 5. Verificar modelos registrados en Base.metadata
.venv/bin/python -c "
from app.core.database import Base
import app.models
tables = list(Base.metadata.tables.keys())
print('Tablas:', sorted(tables))
expected = {
    'dim_business', 'dim_customer', 'dim_time', 'dim_user',
    'fact_invoice', 'fact_payment', 'fact_work_event', 'fact_customer_activity'
}
missing = expected - set(tables)
if missing:
    print('ERROR: tablas faltantes:', missing)
    exit(1)
print('OK: todas las tablas presentes')
"

# 6. Tests
.venv/bin/pytest tests/ -v
# Todos deben pasar

# 7. Arrancar servidor y verificar health
.venv/bin/uvicorn app.main:app --port 8100 &
sleep 8
curl -sf http://localhost:8100/health | python3 -m json.tool
# Debe retornar: {"status":"healthy", "migration_version":"<head>", ...}
kill %1

# 8. Verificar que no existe ninguna referencia a SQLite, MongoDB, psycopg2 en runtime
grep -r "sqlite\|psycopg2" app/ alembic/ requirements.txt \
  | grep -v "no psycopg2\|without psycopg2\|asyncpg" \
  && echo "ERROR: referencia prohibida encontrada" && exit 1 \
  || echo "OK"

grep -r "mongodb\|pymongo" app/ alembic/ requirements.txt \
  && echo "ERROR: referencia MongoDB encontrada" && exit 1 \
  || echo "OK"

# Criterio de CI: todos los comandos retornan exit code 0
# alembic current retorna (head)
# GET /health retorna status: healthy
```

---

## Documentación

```bash
# Verificar que docs/events/ está actualizado para nuevos eventos
# (manual — el DocumentationAgent lo verifica durante la sesión)

# Verificar consistencia Analytics vs BI
grep -r "Analytics" docs/domain/analytics/ | grep -i "bi\|warehouse\|neon\|python" \
  && echo "WARN: posible confusión Analytics/BI en docs" \
  || echo "OK: docs de Analytics no mencionan BI incorrectamente"
```

---

## Checklist de CI por tipo de cambio

### PR de backend (nuevo endpoint o dominio)

```
[ ] npm run typecheck → exit 0
[ ] npm run lint      → exit 0
[ ] npm test          → exit 0, 0 skipped
[ ] npm run build     → exit 0
[ ] QA: businessId viene del JWT en el controller
[ ] QA: ningún import directo entre dominios distintos
[ ] QA: Domain Event publicado si aplica
```

### PR de frontend

```
[ ] npx tsc --noEmit → exit 0
[ ] npm run build    → exit 0
[ ] QA: grep de URLs directas a BI → 0 resultados
[ ] QA: TanStack Query hooks apuntan a /api/* del backend
[ ] QA: DataGrid en desktop, cards en mobile
```

### PR de business-intelligence

```
[ ] pip install -r requirements.txt → exit 0
[ ] alembic upgrade head → exit 0
[ ] alembic current → retorna (head)
[ ] pytest tests/ → exit 0
[ ] python -c "from app.main import app" → exit 0
[ ] GET /health → {"status":"healthy"}
[ ] grep sqlite/psycopg2/mongodb → 0 resultados en app/ y alembic/
```

### PR de documentación

```
[ ] docs/events/ actualizado si hay nuevos eventos
[ ] docs/architecture/ actualizado si hay nuevos ADRs/DECs
[ ] Ningún doc describe Analytics con responsabilidades de BI
[ ] Ningún doc dice que el frontend puede llamar BI
```

---

## Pipeline de CI (GitHub Actions — por implementar)

```yaml
# .github/workflows/ci.yml
# (estructura objetivo — a implementar por InfrastructureAgent)

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd business-app/backend && npm ci && npm run typecheck && npm run lint && npm test && npm run build

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd business-app/frontend && npm ci && npx tsc --noEmit && npm run build

  business-intelligence:
    runs-on: ubuntu-latest
    env:
      BI_DATABASE_URL: ${{ secrets.BI_DATABASE_URL_CI }}
      BI_INTERNAL_SERVICE_TOKEN: ${{ secrets.BI_INTERNAL_SERVICE_TOKEN_CI }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: |
          cd business-app/business-intelligence
          pip install -r requirements.txt
          alembic upgrade head
          alembic current | grep "(head)"
          pytest tests/ -v
          python -c "from app.main import app"
```

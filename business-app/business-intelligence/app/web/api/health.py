from fastapi import APIRouter
from app.database.postgres import check_db_health, EXPECTED_SCHEMA

router = APIRouter()


@router.get("/health")
async def health():
    db = await check_db_health()

    body = {
        "status":            "healthy" if db.connected else "degraded",
        "version":           "0.1.0",
        "provider":          "Neon PostgreSQL",
        "server_version":    db.server_version or "unavailable",
        "warehouse":         "online" if db.connected else "offline",
        "database":          "connected" if db.connected else "unavailable",
        "schema":            db.schema or EXPECTED_SCHEMA,
        "migration_version": db.migration_version or "unknown",
    }
    if db.error:
        body["error"] = db.error
    return body

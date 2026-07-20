"""Administrative internal endpoints (protected by x-internal-service-token)."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.postgres import get_db
from app.database.seed_dim_time import seed_dim_time

router = APIRouter(prefix="/internal/admin", tags=["admin"])


class SeedDimTimeResponse(BaseModel):
    processed: int
    status: str


@router.post("/seed-dim-time", response_model=SeedDimTimeResponse)
async def seed_dim_time_endpoint(
    db: AsyncSession = Depends(get_db),
) -> SeedDimTimeResponse:
    try:
        processed = await seed_dim_time(db)
    except Exception as exc:
        raise HTTPException(500, f"seed_dim_time failed: {exc}")
    return SeedDimTimeResponse(processed=processed, status="ok")

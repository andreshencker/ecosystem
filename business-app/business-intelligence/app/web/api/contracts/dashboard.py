from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.postgres import get_db
from app.contracts.dashboard.service import DashboardService
from app.contracts.dashboard.schema import DashboardSummaryResponse

router = APIRouter(prefix="/internal/dashboard", tags=["dashboard"])


@router.get(
    "/summary",
    response_model=DashboardSummaryResponse,
    summary="Dashboard summary for a Business (internal — requires x-internal-service-token)",
)
async def get_dashboard_summary(
    businessId: str = Query(..., description="businessId of the tenant"),
    period: Optional[str] = Query(None, description="Period filter YYYY-MM"),
    db: AsyncSession = Depends(get_db),
) -> DashboardSummaryResponse:
    if not businessId or not businessId.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="businessId is required",
        )

    service = DashboardService(db)
    return await service.get_summary(businessId.strip(), period)

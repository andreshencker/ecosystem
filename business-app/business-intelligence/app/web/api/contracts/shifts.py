"""Shift Assignment API endpoints (internal — requires x-internal-service-token).

Endpoints:
  GET /internal/shifts/assignment/summary      — measures and KPIs
  GET /internal/shifts/assignment/pending      — paginated pending list
  GET /internal/shifts/assignment/pending/{id} — single pending detail
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.contracts.shifts.schema import (
    ShiftPendingAssignmentItem,
    ShiftPendingAssignmentListResponse,
    ShiftPendingSummaryResponse,
)
from app.contracts.shifts.service import ShiftAssignmentService
from app.database.postgres import get_db

router = APIRouter(prefix="/internal/shifts", tags=["shift-assignment"])


@router.get(
    "/assignment/summary",
    response_model=ShiftPendingSummaryResponse,
    summary="Shift assignment summary — measures and KPIs",
)
async def get_shift_assignment_summary(
    businessId: Optional[str] = Query(None, description="Tenant businessId. Omit for cross-tenant (Platform Admin)."),
    db: AsyncSession = Depends(get_db),
) -> ShiftPendingSummaryResponse:
    service = ShiftAssignmentService(db)
    return await service.get_summary(
        business_id=businessId.strip() if businessId else None,
    )


@router.get(
    "/assignment/pending",
    response_model=ShiftPendingAssignmentListResponse,
    summary="Paginated list of Shifts pending Contract assignment",
)
async def list_pending_shift_assignments(
    businessId: Optional[str] = Query(None),
    linkedCalendarId: Optional[str] = Query(None),
    dateFrom: Optional[str] = Query(None, description="ISO date YYYY-MM-DD"),
    dateTo: Optional[str] = Query(None, description="ISO date YYYY-MM-DD"),
    minAgeDays: Optional[int] = Query(None, description="Minimum task age in days", ge=0),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    sortBy: str = Query("source_created_at"),
    sortDir: str = Query("desc"),
    db: AsyncSession = Depends(get_db),
) -> ShiftPendingAssignmentListResponse:
    service = ShiftAssignmentService(db)
    return await service.list_pending(
        business_id=businessId.strip() if businessId else None,
        linked_calendar_id=linkedCalendarId,
        date_from=dateFrom,
        date_to=dateTo,
        min_age_days=minAgeDays,
        search=search.strip() if search else None,
        page=page,
        limit=limit,
        sort_by=sortBy,
        sort_dir=sortDir,
    )


@router.get(
    "/assignment/pending/{shiftId}",
    response_model=ShiftPendingAssignmentItem,
    summary="Detail for a single Shift pending Contract assignment",
)
async def get_pending_shift_assignment_detail(
    shiftId: str,
    businessId: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
) -> ShiftPendingAssignmentItem:
    service = ShiftAssignmentService(db)
    detail = await service.get_pending_detail(
        shift_id=shiftId,
        business_id=businessId.strip() if businessId else None,
    )
    if detail is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pending shift assignment {shiftId!r} not found.",
        )
    return detail

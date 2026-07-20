"""ShiftAssignmentService — query logic for the Shift Contract Assignment dataset.

Implements three queries:
  get_summary(business_id)             → ShiftPendingSummaryResponse
  list_pending(business_id, ...)       → ShiftPendingAssignmentListResponse
  get_pending_detail(shift_id, ...)    → ShiftPendingAssignmentItem | None

All KPI calculations (rates) are performed here once via _safe_rate().
No caller recalculates them.
"""
import datetime as dt
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.contracts.shifts.schema import (
    PENDING_TASK_CODE,
    ShiftPendingAssignmentItem,
    ShiftPendingAssignmentListResponse,
    ShiftPendingSummaryResponse,
)
from app.database.repositories.shift_repository import ShiftRepository
from app.models.shifts.fact_shift import FactShift


def _safe_rate(numerator: int, denominator: int) -> Optional[float]:
    """numerator / denominator in [0, 1], or None when denominator is zero."""
    if denominator == 0:
        return None
    return round(numerator / denominator, 4)


def _map_item(row: FactShift) -> ShiftPendingAssignmentItem:
    """Map a FactShift ORM row to the pending-assignment Pydantic schema."""
    task_age_days: Optional[int] = None
    if row.source_created_at:
        now = datetime.now(timezone.utc)
        created = row.source_created_at
        if created.tzinfo is None:
            from datetime import timezone as tz
            created = created.replace(tzinfo=tz.utc)
        task_age_days = max(0, (now - created).days)

    return ShiftPendingAssignmentItem(
        shiftId=row.source_id,
        businessId=row.business_id,
        shiftDate=row.shift_date,
        startTime=row.start_time,
        endTime=row.end_time,
        title=row.title,
        location=row.location,
        linkedCalendarId=row.linked_calendar_id,
        calendarName=row.calendar_name,
        calendarProvider=row.calendar_provider,
        calendarAccount=row.calendar_account,
        contractId=row.contract_id,
        contractAssigned=row.contract_assigned,
        taskCode=PENDING_TASK_CODE,
        taskAgeDays=task_age_days,
        syncStatus=row.sync_status,
        lastExternalUpdate=row.last_external_update,
        createdAt=row.source_created_at,
        updatedAt=row.source_updated_at,
    )


class ShiftAssignmentService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = ShiftRepository(db)

    async def get_summary(
        self,
        business_id: Optional[str] = None,
    ) -> ShiftPendingSummaryResponse:
        m = await self._repo.get_summary_counts(business_id)
        active = m["active_calendar"]
        return ShiftPendingSummaryResponse(
            businessId=business_id,
            totalShifts=m["total"],
            calendarImportedShifts=m["calendar_imported"],
            manualShifts=m["manual"],
            importedWithContract=m["imported_with_contract"],
            importedPendingContract=m["imported_pending_contract"],
            deletedImportedShifts=m["deleted_imported"],
            shiftContractAssignmentRate=_safe_rate(m["imported_with_contract"], active),
            pendingContractAssignmentRate=_safe_rate(m["imported_pending_contract"], active),
            # etlSyncedAt is max(fact_shift.synced_at) for this business.
            # None means the shift ETL has never run — zero counts are not reliable.
            etlSyncedAt=m["etl_synced_at"],
            calculatedAt=datetime.now(timezone.utc),
        )

    async def list_pending(
        self,
        business_id: Optional[str] = None,
        *,
        linked_calendar_id: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        min_age_days: Optional[int] = None,
        search: Optional[str] = None,
        page: int = 1,
        limit: int = 50,
        sort_by: str = "source_created_at",
        sort_dir: str = "desc",
    ) -> ShiftPendingAssignmentListResponse:
        filter_kwargs = dict(
            linked_calendar_id=linked_calendar_id,
            date_from=date_from,
            date_to=date_to,
            min_age_days=min_age_days,
            search=search,
        )
        rows = await self._repo.list_pending(
            business_id, page=page, limit=limit,
            sort_by=sort_by, sort_dir=sort_dir,
            **filter_kwargs,
        )
        total = await self._repo.count_pending(business_id, **filter_kwargs)
        return ShiftPendingAssignmentListResponse(
            businessId=business_id,
            items=[_map_item(r) for r in rows],
            total=total,
            page=page,
            limit=limit,
            calculatedAt=datetime.now(timezone.utc),
        )

    async def get_pending_detail(
        self,
        shift_id: str,
        business_id: Optional[str] = None,
    ) -> Optional[ShiftPendingAssignmentItem]:
        row = await self._repo.get_pending_by_id(shift_id, business_id)
        if row is None:
            return None
        return _map_item(row)

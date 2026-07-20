"""Pydantic schemas for the Shift Pending Contract Assignment dataset.

ShiftPendingAssignmentItem — one row in the pending list.
ShiftPendingSummaryResponse — aggregate measures and KPIs.
ShiftPendingAssignmentListResponse — paginated list.

Pending rule (source of truth — defined once here):
  created_from_calendar = True
  AND contract_assigned = False
  AND contract_id IS NULL
  AND sync_status != 'deleted'
"""
import datetime as dt
from typing import List, Optional

from pydantic import BaseModel

PENDING_TASK_CODE = "SHIFT_CONTRACT_ASSIGNMENT_REQUIRED"

PENDING_ISSUE = {
    "code": PENDING_TASK_CODE,
    "severity": "warning",
    "field": "contractId",
    "message": "This calendar-imported Shift requires a Contract assignment.",
}


class ShiftPendingAssignmentItem(BaseModel):
    shiftId: str
    businessId: str

    # Use 'shiftDate' to avoid shadowing the datetime.date type with a field
    # named 'date'. Serialised as 'shiftDate' in JSON responses.
    shiftDate: Optional[dt.date] = None
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    title: Optional[str] = None
    location: Optional[str] = None

    linkedCalendarId: Optional[str] = None
    calendarName: Optional[str] = None
    calendarProvider: Optional[str] = None
    calendarAccount: Optional[str] = None

    contractId: Optional[str] = None
    contractAssigned: bool = False

    taskCode: str = PENDING_TASK_CODE
    taskAgeDays: Optional[int] = None

    syncStatus: Optional[str] = None
    lastExternalUpdate: Optional[dt.datetime] = None
    createdAt: Optional[dt.datetime] = None
    updatedAt: Optional[dt.datetime] = None

    model_config = {"from_attributes": True}


class ShiftPendingAssignmentListResponse(BaseModel):
    businessId: Optional[str] = None
    items: List[ShiftPendingAssignmentItem]
    total: int
    page: int
    limit: int
    calculatedAt: dt.datetime


class ShiftPendingSummaryResponse(BaseModel):
    businessId: Optional[str] = None

    totalShifts: int
    calendarImportedShifts: int
    manualShifts: int
    importedWithContract: int
    importedPendingContract: int
    deletedImportedShifts: int

    # KPI ratios — None when denominator is zero
    shiftContractAssignmentRate: Optional[float] = None
    pendingContractAssignmentRate: Optional[float] = None

    # ETL freshness — when the fact_shift table was last populated for this business.
    # None means the shift ETL has never run: a zero importedPendingContract in that
    # case does NOT mean "all assigned" — it means "no data yet".
    etlSyncedAt: Optional[dt.datetime] = None

    calculatedAt: dt.datetime

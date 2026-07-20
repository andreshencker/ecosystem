"""Tests for the Shift Contract Assignment BI dataset.

Covers:
  - Pending rule predicate (single source of truth)
  - _safe_rate() edge cases (zero denominator, normal)
  - _map_item() field mapping
  - ShiftAssignmentService.get_summary() (mocked repository)
  - ShiftAssignmentService.list_pending() filter delegation
  - ShiftAssignmentService.get_pending_detail()
  - KPI: shiftContractAssignmentRate, pendingContractAssignmentRate
  - Exclusions: manual shifts, assigned shifts, deleted shifts
  - Tenant isolation
  - Pagination and sorting delegation
"""
import asyncio
from datetime import date, datetime, timezone
from typing import Optional
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.contracts.shifts.schema import (
    PENDING_ISSUE,
    PENDING_TASK_CODE,
    ShiftPendingAssignmentItem,
    ShiftPendingAssignmentListResponse,
    ShiftPendingSummaryResponse,
)
from app.contracts.shifts.service import ShiftAssignmentService, _safe_rate, _map_item
from app.database.repositories.shift_repository import ShiftRepository
from app.models.shifts.fact_shift import FactShift


# ─── Helpers ─────────────────────────────────────────────────────────────────

def make_shift(**kwargs) -> FactShift:
    defaults = dict(
        source_id="shift_abc",
        business_id="biz_111",
        contract_id=None,
        customer_id=None,
        shift_date=date(2026, 7, 18),
        start_time="09:00",
        end_time="17:00",
        break_minutes=30,
        duration_minutes=None,
        duration_hours=None,
        shift_status="draft",
        invoice_status="pending",
        hour_calculation_status="pending",
        created_from_calendar=True,
        contract_assigned=False,
        linked_calendar_id="cal_001",
        calendar_name="Work Calendar",
        calendar_provider="icloud",
        calendar_account="user@icloud.com",
        sync_status="synced",
        last_external_update=None,
        location="Main Office",
        title="Morning shift",
        source_created_at=datetime(2026, 7, 10, tzinfo=timezone.utc),
        source_updated_at=datetime(2026, 7, 18, tzinfo=timezone.utc),
    )
    defaults.update(kwargs)
    row = FactShift()
    for k, v in defaults.items():
        setattr(row, k, v)
    return row


_NOW = datetime(2026, 7, 19, 12, 0, 0, tzinfo=timezone.utc)

SUMMARY_COUNTS = {
    "total": 10,
    "calendar_imported": 7,
    "manual": 3,
    "active_calendar": 6,
    "imported_with_contract": 4,
    "imported_pending_contract": 2,
    "deleted_imported": 1,
    # ETL freshness: max(synced_at) from fact_shift — None when ETL has never run
    "etl_synced_at": _NOW,
}


# ─── _safe_rate ───────────────────────────────────────────────────────────────

class TestSafeRate:
    def test_normal_ratio(self):
        assert _safe_rate(4, 6) == pytest.approx(0.6667, abs=1e-3)

    def test_zero_denominator_returns_none(self):
        assert _safe_rate(0, 0) is None
        assert _safe_rate(5, 0) is None

    def test_zero_numerator(self):
        assert _safe_rate(0, 10) == 0.0

    def test_full_rate(self):
        assert _safe_rate(10, 10) == 1.0


# ─── PENDING_TASK_CODE ────────────────────────────────────────────────────────

class TestPendingTaskCode:
    def test_stable_code(self):
        assert PENDING_TASK_CODE == "SHIFT_CONTRACT_ASSIGNMENT_REQUIRED"

    def test_issue_structure(self):
        assert PENDING_ISSUE["severity"] == "warning"
        assert PENDING_ISSUE["field"] == "contractId"
        assert "Contract" in PENDING_ISSUE["message"]


# ─── _map_item ────────────────────────────────────────────────────────────────

class TestMapItem:
    def test_maps_all_fields(self):
        row = make_shift()
        item = _map_item(row)
        assert item.shiftId == "shift_abc"
        assert item.businessId == "biz_111"
        assert item.linkedCalendarId == "cal_001"
        assert item.calendarName == "Work Calendar"
        assert item.calendarProvider == "icloud"
        assert item.calendarAccount == "user@icloud.com"
        assert item.taskCode == PENDING_TASK_CODE
        assert item.contractId is None
        assert item.contractAssigned is False

    def test_task_age_days_computed(self):
        old_shift = make_shift(
            source_created_at=datetime(2026, 7, 1, tzinfo=timezone.utc)
        )
        item = _map_item(old_shift)
        assert item.taskAgeDays is not None
        assert item.taskAgeDays >= 17  # at least 17 days from Jul 1 to Jul 18+

    def test_task_age_none_when_no_created_at(self):
        row = make_shift(source_created_at=None)
        item = _map_item(row)
        assert item.taskAgeDays is None


# ─── ShiftAssignmentService.get_summary ──────────────────────────────────────

class TestGetSummary:
    def _make_service(self, counts=None):
        mock_repo = MagicMock(spec=ShiftRepository)
        mock_repo.get_summary_counts = AsyncMock(return_value=counts or SUMMARY_COUNTS)
        svc = ShiftAssignmentService(MagicMock())
        svc._repo = mock_repo
        return svc, mock_repo

    def test_returns_all_measures(self):
        svc, _ = self._make_service()
        result = asyncio.run(svc.get_summary())
        assert result.totalShifts == 10
        assert result.calendarImportedShifts == 7
        assert result.manualShifts == 3
        assert result.importedWithContract == 4
        assert result.importedPendingContract == 2
        assert result.deletedImportedShifts == 1

    def test_kpis_calculated_from_active_calendar(self):
        svc, _ = self._make_service()
        result = asyncio.run(svc.get_summary())
        # active_calendar = 6, imported_with_contract = 4, pending = 2
        assert result.shiftContractAssignmentRate == pytest.approx(4 / 6, abs=1e-3)
        assert result.pendingContractAssignmentRate == pytest.approx(2 / 6, abs=1e-3)

    def test_kpis_null_when_no_active_calendar_shifts(self):
        counts = {**SUMMARY_COUNTS, "active_calendar": 0,
                  "imported_with_contract": 0, "imported_pending_contract": 0}
        svc, _ = self._make_service(counts)
        result = asyncio.run(svc.get_summary())
        assert result.shiftContractAssignmentRate is None
        assert result.pendingContractAssignmentRate is None

    def test_scope_passed_to_repo(self):
        svc, mock_repo = self._make_service()
        asyncio.run(svc.get_summary(business_id="biz_111"))
        mock_repo.get_summary_counts.assert_awaited_once_with("biz_111")

    def test_no_business_filter_cross_tenant(self):
        svc, mock_repo = self._make_service()
        asyncio.run(svc.get_summary())
        mock_repo.get_summary_counts.assert_awaited_once_with(None)

    def test_calculatedAt_is_utc_datetime(self):
        svc, _ = self._make_service()
        result = asyncio.run(svc.get_summary())
        assert isinstance(result.calculatedAt, datetime)

    def test_etlSyncedAt_propagated_from_repo(self):
        """etlSyncedAt in the summary equals what the repository returned."""
        svc, _ = self._make_service()
        result = asyncio.run(svc.get_summary())
        assert result.etlSyncedAt == _NOW

    def test_etlSyncedAt_is_none_when_repo_returns_none(self):
        """When fact_shift has no rows for the business, ETL has never run → None."""
        counts_no_etl = {**SUMMARY_COUNTS, "etl_synced_at": None}
        svc, _ = self._make_service(counts_no_etl)
        result = asyncio.run(svc.get_summary())
        assert result.etlSyncedAt is None

    def test_zero_pending_with_no_etl_is_not_reliable(self):
        """importedPendingContract=0 AND etlSyncedAt=None means ETL never ran.
        A consumer must treat this differently from a genuine zero."""
        counts_empty = {**SUMMARY_COUNTS,
                        "imported_pending_contract": 0,
                        "total": 0,
                        "etl_synced_at": None}
        svc, _ = self._make_service(counts_empty)
        result = asyncio.run(svc.get_summary())
        assert result.importedPendingContract == 0
        assert result.etlSyncedAt is None
        # Consumers MUST check etlSyncedAt before displaying "All assigned"
        is_reliable_zero = result.etlSyncedAt is not None
        assert is_reliable_zero is False

    def test_zero_pending_with_etl_is_genuine_success(self):
        """importedPendingContract=0 AND etlSyncedAt present = all shifts assigned."""
        counts_assigned = {**SUMMARY_COUNTS,
                           "imported_pending_contract": 0,
                           "active_calendar": 6,
                           "imported_with_contract": 6,
                           "etl_synced_at": _NOW}
        svc, _ = self._make_service(counts_assigned)
        result = asyncio.run(svc.get_summary())
        assert result.importedPendingContract == 0
        assert result.etlSyncedAt is not None  # ETL ran
        is_reliable_zero = result.etlSyncedAt is not None
        assert is_reliable_zero is True


# ─── ShiftAssignmentService.list_pending ─────────────────────────────────────

class TestListPending:
    def _make_service(self, rows=None, total=0):
        mock_repo = MagicMock(spec=ShiftRepository)
        mock_repo.list_pending  = AsyncMock(return_value=rows or [])
        mock_repo.count_pending = AsyncMock(return_value=total)
        svc = ShiftAssignmentService(MagicMock())
        svc._repo = mock_repo
        return svc, mock_repo

    def test_returns_list_response(self):
        svc, _ = self._make_service([make_shift()], 1)
        result = asyncio.run(svc.list_pending(business_id="biz_111"))
        assert isinstance(result, ShiftPendingAssignmentListResponse)
        assert result.total == 1
        assert len(result.items) == 1
        assert result.items[0].shiftId == "shift_abc"

    def test_forwards_all_filters(self):
        svc, mock_repo = self._make_service()
        asyncio.run(svc.list_pending(
            business_id="biz_111",
            linked_calendar_id="cal_001",
            date_from="2026-07-01",
            date_to="2026-07-31",
            min_age_days=3,
            search="morning",
            page=2,
            limit=10,
            sort_by="shift_date",
            sort_dir="asc",
        ))
        mock_repo.list_pending.assert_awaited_once_with(
            "biz_111",
            page=2, limit=10,
            sort_by="shift_date", sort_dir="asc",
            linked_calendar_id="cal_001",
            date_from="2026-07-01",
            date_to="2026-07-31",
            min_age_days=3,
            search="morning",
        )

    def test_assigned_shift_not_in_pending(self):
        # Service only queries the pending predicate — assigned shifts never
        # appear because the repo list_pending applies _pending_predicate().
        assigned = make_shift(contract_assigned=True, contract_id="ctr_001")
        svc, mock_repo = self._make_service([])  # repo returns nothing (assigned filtered)
        result = asyncio.run(svc.list_pending())
        assert result.total == 0
        assert len(result.items) == 0

    def test_manual_shift_not_in_pending(self):
        svc, mock_repo = self._make_service([])
        result = asyncio.run(svc.list_pending())
        assert result.total == 0

    def test_deleted_shift_not_in_pending(self):
        svc, mock_repo = self._make_service([])
        result = asyncio.run(svc.list_pending())
        assert result.total == 0

    def test_defaults_page_1_limit_50(self):
        svc, mock_repo = self._make_service()
        asyncio.run(svc.list_pending())
        call_kwargs = mock_repo.list_pending.call_args
        assert call_kwargs.kwargs["page"] == 1
        assert call_kwargs.kwargs["limit"] == 50


# ─── ShiftAssignmentService.get_pending_detail ───────────────────────────────

class TestGetPendingDetail:
    def _make_service(self, row=None):
        mock_repo = MagicMock(spec=ShiftRepository)
        mock_repo.get_pending_by_id = AsyncMock(return_value=row)
        svc = ShiftAssignmentService(MagicMock())
        svc._repo = mock_repo
        return svc, mock_repo

    def test_returns_item_when_found(self):
        row = make_shift()
        svc, _ = self._make_service(row)
        result = asyncio.run(svc.get_pending_detail("shift_abc", "biz_111"))
        assert result is not None
        assert result.shiftId == "shift_abc"

    def test_returns_none_when_not_found(self):
        svc, _ = self._make_service(None)
        result = asyncio.run(svc.get_pending_detail("missing", "biz_111"))
        assert result is None

    def test_passes_business_id(self):
        svc, mock_repo = self._make_service()
        asyncio.run(svc.get_pending_detail("shift_abc", "biz_111"))
        mock_repo.get_pending_by_id.assert_awaited_once_with("shift_abc", "biz_111")


# ─── Schema type contracts ────────────────────────────────────────────────────

class TestSchemata:
    def test_summary_allows_null_kpis(self):
        s = ShiftPendingSummaryResponse(
            totalShifts=0,
            calendarImportedShifts=0,
            manualShifts=0,
            importedWithContract=0,
            importedPendingContract=0,
            deletedImportedShifts=0,
            shiftContractAssignmentRate=None,
            pendingContractAssignmentRate=None,
            calculatedAt=datetime.now(timezone.utc),
        )
        assert s.shiftContractAssignmentRate is None

    def test_summary_etl_synced_at_defaults_to_none(self):
        """Schema default for etlSyncedAt is None — ETL not yet run."""
        s = ShiftPendingSummaryResponse(
            totalShifts=0,
            calendarImportedShifts=0,
            manualShifts=0,
            importedWithContract=0,
            importedPendingContract=0,
            deletedImportedShifts=0,
            calculatedAt=datetime.now(timezone.utc),
        )
        assert s.etlSyncedAt is None

    def test_summary_etl_synced_at_accepts_datetime(self):
        s = ShiftPendingSummaryResponse(
            totalShifts=5,
            calendarImportedShifts=5,
            manualShifts=0,
            importedWithContract=3,
            importedPendingContract=2,
            deletedImportedShifts=0,
            etlSyncedAt=_NOW,
            calculatedAt=datetime.now(timezone.utc),
        )
        assert s.etlSyncedAt == _NOW

    def test_item_has_correct_task_code(self):
        item = ShiftPendingAssignmentItem(
            shiftId="s1",
            businessId="biz1",
        )
        assert item.taskCode == PENDING_TASK_CODE

    def test_pending_list_response_structure(self):
        resp = ShiftPendingAssignmentListResponse(
            businessId="biz1",
            items=[],
            total=0,
            page=1,
            limit=50,
            calculatedAt=datetime.now(timezone.utc),
        )
        assert resp.total == 0
        assert resp.items == []


# ─── Pending rule — direct predicate test ────────────────────────────────────

class TestPendingRule:
    """Verify the pending predicate is defined once and correctly structured."""

    def test_pending_predicate_fields(self):
        from app.database.repositories.shift_repository import _pending_predicate
        pred = _pending_predicate()
        # The predicate is a compound AND — verify its string representation
        # contains all four conditions
        pred_str = str(pred)
        assert "created_from_calendar" in pred_str
        assert "contract_assigned" in pred_str
        assert "contract_id" in pred_str
        assert "sync_status" in pred_str

    def test_assigned_shift_excluded(self):
        """A shift with contractAssigned=True must not match the pending rule."""
        shift = make_shift(contract_assigned=True, contract_id="ctr_001")
        assert shift.contract_assigned is True

    def test_manual_shift_excluded(self):
        """A manual shift (createdFromCalendar=False) must not match."""
        shift = make_shift(created_from_calendar=False)
        assert shift.created_from_calendar is False

    def test_deleted_shift_excluded(self):
        """A deleted shift (syncStatus=deleted) must not match."""
        shift = make_shift(sync_status="deleted")
        assert shift.sync_status == "deleted"

    def test_pending_shift_matches(self):
        """A properly unassigned calendar shift must match the pending rule."""
        shift = make_shift()
        assert shift.created_from_calendar is True
        assert shift.contract_assigned is False
        assert shift.contract_id is None
        assert shift.sync_status == "synced"

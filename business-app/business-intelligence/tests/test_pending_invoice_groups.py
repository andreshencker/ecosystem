"""Tests for PendingInvoiceGroupsService calculation logic.

Uses unittest.mock to avoid live MongoDB — all reads are intercepted.
"""
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.contracts.invoices.pending_groups.service import (
    PendingInvoiceGroupsService,
    _billing_period,
    _gross_hours,
    _group_id,
    _resolve_rate,
)


# ── Unit tests for pure helpers ────────────────────────────────────────────────


class TestGrossHours:
    def test_same_day(self):
        h, err = _gross_hours("2026-07-01", "09:00", None, "17:00")
        assert h == Decimal("8.00")
        assert err is None

    def test_overnight_no_end_date(self):
        h, err = _gross_hours("2026-07-01", "22:00", None, "06:00")
        assert h == Decimal("8.00")
        assert err is None

    def test_overnight_with_explicit_end_date(self):
        h, err = _gross_hours("2026-07-01", "23:00", "2026-07-02", "05:00")
        assert h == Decimal("6.00")
        assert err is None

    def test_missing_time_returns_error(self):
        h, err = _gross_hours("2026-07-01", None, None, "17:00")
        assert h == Decimal("0")
        assert err is not None

    def test_short_shift(self):
        h, err = _gross_hours("2026-07-01", "08:00", None, "08:30")
        assert h == Decimal("0.50")
        assert err is None


class TestResolveRate:
    def _fixed_rates(self, rate=25.0):
        return [{"days": ["all"], "startTime": None, "endTime": None, "hourlyRate": rate}]

    def _variable_rates(self):
        return [
            {"days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
             "startTime": None, "endTime": None, "hourlyRate": 25.0},
            {"days": ["saturday", "sunday"],
             "startTime": None, "endTime": None, "hourlyRate": 35.0},
        ]

    def test_fixed_rate(self):
        rate, err = _resolve_rate(date(2026, 7, 20), "09:00", "fixed", self._fixed_rates(25.0))
        assert rate == Decimal("25.00")
        assert err is None

    def test_variable_weekday(self):
        rate, err = _resolve_rate(date(2026, 7, 20), "09:00", "variable", self._variable_rates())
        assert rate == Decimal("25.00")
        assert err is None

    def test_variable_weekend(self):
        rate, err = _resolve_rate(date(2026, 7, 19), "09:00", "variable", self._variable_rates())
        assert rate == Decimal("35.00")
        assert err is None

    def test_variable_no_match(self):
        rate, err = _resolve_rate(date(2026, 7, 20), "09:00", "variable", [
            {"days": ["saturday"], "hourlyRate": 35.0}
        ])
        assert rate is None
        assert err is not None

    def test_variable_time_range_match(self):
        rates = [
            {"days": ["all"], "startTime": "06:00", "endTime": "18:00", "hourlyRate": 25.0},
            {"days": ["all"], "startTime": "18:00", "endTime": "06:00", "hourlyRate": 35.0},
        ]
        rate, err = _resolve_rate(date(2026, 7, 20), "09:00", "variable_time_range", rates)
        assert rate == Decimal("25.00")
        assert err is None

    def test_no_rates(self):
        rate, err = _resolve_rate(date(2026, 7, 20), "09:00", "fixed", [])
        assert rate is None
        assert err is not None

    def test_unknown_rate_type(self):
        rate, err = _resolve_rate(date(2026, 7, 20), "09:00", "future_type", [{"hourlyRate": 10}])
        assert rate is None
        assert err is not None


class TestBillingPeriod:
    def test_per_shift(self):
        d = date(2026, 7, 22)
        start, end = _billing_period(d, "per_shift", None)
        assert start == end == d

    def test_weekly(self):
        d = date(2026, 7, 22)  # Wednesday
        start, end = _billing_period(d, "weekly", None)
        assert start == date(2026, 7, 20)  # Monday
        assert end == date(2026, 7, 26)    # Sunday

    def test_monthly(self):
        d = date(2026, 7, 15)
        start, end = _billing_period(d, "monthly", None)
        assert start == date(2026, 7, 1)
        assert end == date(2026, 7, 31)

    def test_fortnightly(self):
        contract_start = date(2026, 7, 1)
        d = date(2026, 7, 16)  # day 15 → fortnight 1 (0-indexed)
        start, end = _billing_period(d, "fortnightly", contract_start)
        assert start == date(2026, 7, 15)
        assert end == date(2026, 7, 28)

    def test_fortnightly_first_period(self):
        contract_start = date(2026, 7, 1)
        d = date(2026, 7, 5)
        start, end = _billing_period(d, "fortnightly", contract_start)
        assert start == date(2026, 7, 1)
        assert end == date(2026, 7, 14)


class TestGroupId:
    def test_deterministic(self):
        g1 = _group_id("biz", "cust", "cont", "2026-07-01", "2026-07-07")
        g2 = _group_id("biz", "cust", "cont", "2026-07-01", "2026-07-07")
        assert g1 == g2

    def test_different_periods_differ(self):
        g1 = _group_id("biz", "cust", "cont", "2026-07-01", "2026-07-07")
        g2 = _group_id("biz", "cust", "cont", "2026-07-08", "2026-07-14")
        assert g1 != g2

    def test_is_hex_string(self):
        g = _group_id("biz", "cust", "cont", "2026-07-01", "2026-07-07")
        assert all(c in "0123456789abcdef" for c in g)


# ── Integration tests (mocked MongoDB) ────────────────────────────────────────


def _make_shift(**kwargs):
    defaults = {
        "_id": "shift001",
        "businessId": "biz001",
        "contractId": "cont001",
        "customerId": "cust001",
        "date": "2026-07-22",
        "startTime": "09:00",
        "endTime": "17:00",
        "endDate": None,
        "breakTaken": True,
        "status": "confirmed",
        "invoiceStatus": "pending",
        "description": "Tuesday shift",
    }
    defaults.update(kwargs)
    return defaults


def _make_contract(**kwargs):
    defaults = {
        "_id": "cont001",
        "businessId": "biz001",
        "customerId": "cust001",
        "positionName": "Registered Nurse",
        "billingCycle": "weekly",
        "rateType": "fixed",
        "currency": "AUD",
        "chargeGst": False,
        "gstRate": None,
        "defaultBreakMinutes": 30,
        "startDate": "2026-01-01",
        "rates": [{"days": ["all"], "hourlyRate": 50.0}],
    }
    defaults.update(kwargs)
    return defaults


def _make_customer(**kwargs):
    defaults = {"_id": "cust001", "name": "Acme Hospital"}
    defaults.update(kwargs)
    return defaults


def _mock_db(shifts, contracts, customers):
    """Return a mock Motor database object."""
    db = MagicMock()

    def collection_for(name):
        col = MagicMock()
        if name == "shifts":
            data = shifts
        elif name == "contracts":
            data = contracts
        elif name == "customers":
            data = customers
        else:
            data = []
        cursor = MagicMock()
        cursor.to_list = AsyncMock(return_value=data)
        col.find = MagicMock(return_value=cursor)
        return col

    db.__getitem__ = MagicMock(side_effect=collection_for)
    return db


@pytest.mark.asyncio
async def test_empty_shifts_returns_empty_groups():
    db = _mock_db([], [], [])
    with patch("app.contracts.invoices.pending_groups.service.get_database", return_value=db):
        svc = PendingInvoiceGroupsService()
        result = await svc.get_groups("biz001")
    assert result.totalGroups == 0
    assert result.groups == []


@pytest.mark.asyncio
async def test_single_shift_ready_group():
    shifts = [_make_shift()]
    contracts = [_make_contract()]
    customers = [_make_customer()]

    db = _mock_db(shifts, contracts, customers)
    with patch("app.contracts.invoices.pending_groups.service.get_database", return_value=db):
        svc = PendingInvoiceGroupsService()
        result = await svc.get_groups("biz001")

    assert result.totalGroups == 1
    g = result.groups[0]
    assert g.customerName == "Acme Hospital"
    assert g.contractTitle == "Registered Nurse"
    assert g.status == "ready"
    assert g.isApprovable is True
    assert g.shiftCount == 1

    row = g.shiftDetails[0]
    # 09:00 → 17:00 = 8h gross, breakTaken=True → 30 min deducted → 7.5h worked
    assert row.grossDurationHours == "8.00"
    assert row.appliedBreakMinutes == 30
    assert row.workedHours == "7.50"
    assert row.appliedRate == "50.00"
    assert row.amount == "375.00"
    assert row.calculationStatus == "ok"


@pytest.mark.asyncio
async def test_gst_applied_correctly():
    shifts = [_make_shift()]
    contracts = [_make_contract(chargeGst=True, gstRate=10)]
    customers = [_make_customer()]

    db = _mock_db(shifts, contracts, customers)
    with patch("app.contracts.invoices.pending_groups.service.get_database", return_value=db):
        svc = PendingInvoiceGroupsService()
        result = await svc.get_groups("biz001")

    g = result.groups[0]
    assert g.taxRate == "10.00"
    assert Decimal(g.taxAmount) == Decimal("37.50")
    assert Decimal(g.total) == Decimal("412.50")


@pytest.mark.asyncio
async def test_no_break_when_break_taken_false():
    shifts = [_make_shift(breakTaken=False)]
    contracts = [_make_contract()]
    customers = [_make_customer()]

    db = _mock_db(shifts, contracts, customers)
    with patch("app.contracts.invoices.pending_groups.service.get_database", return_value=db):
        svc = PendingInvoiceGroupsService()
        result = await svc.get_groups("biz001")

    row = result.groups[0].shiftDetails[0]
    assert row.appliedBreakMinutes == 0
    assert row.workedHours == "8.00"


@pytest.mark.asyncio
async def test_missing_contract_produces_blocked_group():
    shifts = [_make_shift(contractId=None)]
    db = _mock_db(shifts, [], [])
    with patch("app.contracts.invoices.pending_groups.service.get_database", return_value=db):
        svc = PendingInvoiceGroupsService()
        result = await svc.get_groups("biz001")

    assert result.totalGroups == 1
    g = result.groups[0]
    assert g.status == "blocked"
    assert g.isApprovable is False


@pytest.mark.asyncio
async def test_overnight_shift_gross_hours():
    shifts = [_make_shift(startTime="22:00", endTime="06:00")]
    contracts = [_make_contract(defaultBreakMinutes=0)]
    customers = [_make_customer()]

    db = _mock_db(shifts, contracts, customers)
    with patch("app.contracts.invoices.pending_groups.service.get_database", return_value=db):
        svc = PendingInvoiceGroupsService()
        result = await svc.get_groups("biz001")

    row = result.groups[0].shiftDetails[0]
    assert row.grossDurationHours == "8.00"
    assert row.workedHours == "8.00"


@pytest.mark.asyncio
async def test_weekly_grouping_two_shifts_same_week():
    # Both shifts in the week of 2026-07-20 → should merge into one group
    shifts = [
        _make_shift(_id="s1", date="2026-07-20"),
        _make_shift(_id="s2", date="2026-07-22"),
    ]
    contracts = [_make_contract()]
    customers = [_make_customer()]

    db = _mock_db(shifts, contracts, customers)
    with patch("app.contracts.invoices.pending_groups.service.get_database", return_value=db):
        svc = PendingInvoiceGroupsService()
        result = await svc.get_groups("biz001")

    assert result.totalGroups == 1
    assert result.groups[0].shiftCount == 2


@pytest.mark.asyncio
async def test_weekly_grouping_different_weeks_produce_two_groups():
    shifts = [
        _make_shift(_id="s1", date="2026-07-20"),
        _make_shift(_id="s2", date="2026-07-27"),
    ]
    contracts = [_make_contract()]
    customers = [_make_customer()]

    db = _mock_db(shifts, contracts, customers)
    with patch("app.contracts.invoices.pending_groups.service.get_database", return_value=db):
        svc = PendingInvoiceGroupsService()
        result = await svc.get_groups("biz001")

    assert result.totalGroups == 2
    assert result.approvableGroups == 2

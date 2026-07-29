"""Tests for ShiftTransformer."""
from datetime import date, datetime
from decimal import Decimal

import pytest

from app.etl.transformers.shift_transformer import (
    ShiftTransformer,
    _calc_net_minutes,
    _parse_hhmm,
)


def make_shift(**kwargs) -> dict:
    defaults = {
        "_id": "507f1f77bcf86cd799439041",
        "businessId": "507f1f77bcf86cd799439011",
        "customerId": "507f1f77bcf86cd799439021",
        "contractId": "507f1f77bcf86cd799439031",
        "date": "2026-01-15",
        "startTime": "09:00",
        "endTime": "17:00",
        "breakMinutes": 30,
        "status": "confirmed",
        "invoiceStatus": "pending",
        "hourCalculationStatus": "calculated",
        "createdFromCalendar": False,
        "contractAssigned": True,
        "location": "Sydney CBD",
        "createdAt": datetime(2026, 1, 15, 8, 0, 0),
        "updatedAt": datetime(2026, 1, 15, 20, 0, 0),
    }
    defaults.update(kwargs)
    return defaults


def test_transform_valid_shift():
    t = ShiftTransformer()
    record = t.transform(make_shift())
    assert record.source_id == "507f1f77bcf86cd799439041"
    assert record.business_id == "507f1f77bcf86cd799439011"
    assert record.contract_id == "507f1f77bcf86cd799439031"
    assert record.shift_date == date(2026, 1, 15)
    assert record.duration_minutes == Decimal("450.00")
    assert record.duration_hours == Decimal("7.50")
    assert record.shift_status == "confirmed"
    assert record.invoice_status == "pending"
    assert record.contract_assigned is True


def test_transform_missing_id_raises():
    t = ShiftTransformer()
    with pytest.raises(ValueError, match="_id"):
        t.transform({"businessId": "x"})


def test_transform_missing_business_id_raises():
    t = ShiftTransformer()
    with pytest.raises(ValueError, match="businessId"):
        t.transform({"_id": "abc"})


def test_transform_all_shift_statuses():
    t = ShiftTransformer()
    for status in ["draft", "confirmed", "cancelled"]:
        record = t.transform(make_shift(status=status))
        assert record.shift_status == status


def test_transform_defaults_status_when_missing():
    t = ShiftTransformer()
    record = t.transform(make_shift(status=None, invoiceStatus=None))
    assert record.shift_status == "draft"
    assert record.invoice_status == "pending"


def test_transform_invalid_times_yields_none_duration():
    t = ShiftTransformer()
    record = t.transform(make_shift(startTime=None, endTime=None))
    assert record.duration_minutes is None
    assert record.duration_hours is None


def test_transform_null_contract_id_ok():
    t = ShiftTransformer()
    record = t.transform(make_shift(contractId=None, customerId=None))
    assert record.contract_id is None
    assert record.customer_id is None


def test_parse_hhmm():
    assert _parse_hhmm("09:30") == 570
    assert _parse_hhmm(None) is None
    assert _parse_hhmm("bad") is None


def test_calc_net_minutes():
    assert _calc_net_minutes("09:00", "17:00", 30) == 450
    assert _calc_net_minutes("08:00", "08:00", 0) == 0
    assert _calc_net_minutes(None, "17:00", 0) is None
    assert _calc_net_minutes("09:00", "10:00", None) == 60


def test_calc_net_minutes_overnight():
    # 22:00 → 02:00 = 4 h gross, no break
    assert _calc_net_minutes("22:00", "02:00", 0) == 240
    # 23:00 → 07:00 = 8 h gross − 30 min break = 450 min
    assert _calc_net_minutes("23:00", "07:00", 30) == 450


def test_transform_populates_break_taken():
    t = ShiftTransformer()
    record = t.transform(make_shift(breakTaken=True))
    assert record.break_taken is True
    record_no_break = t.transform(make_shift(breakTaken=False))
    assert record_no_break.break_taken is False


def test_transform_populates_end_date():
    t = ShiftTransformer()
    record = t.transform(make_shift(endDate="2026-01-16"))
    assert record.end_date == date(2026, 1, 16)
    record_same_day = t.transform(make_shift(endDate=None))
    assert record_same_day.end_date is None


def test_transform_overnight_shift_duration():
    t = ShiftTransformer()
    # 22:00 → 06:00 overnight, no break minutes on the shift doc
    record = t.transform(make_shift(startTime="22:00", endTime="06:00", breakMinutes=0))
    assert record.duration_hours == Decimal("8.00")

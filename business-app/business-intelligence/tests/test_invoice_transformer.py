"""Tests for InvoiceTransformer and its helpers."""
import uuid
from datetime import date, datetime
from decimal import Decimal

import pytest

from app.etl.transformers.invoice_transformer import (
    InvoiceTransformer,
    _calc_duration_hours,
    _to_date,
)


def make_shift(**kwargs) -> dict:
    defaults = {
        "_id": str(uuid.uuid4()),
        "businessId": str(uuid.uuid4()),
        "customerId": str(uuid.uuid4()),
        "contractId": str(uuid.uuid4()),
        "date": "2026-01-15",
        "startTime": "09:00",
        "endTime": "17:00",
        "breakMinutes": 30,
        "status": "confirmed",
        "invoiceStatus": "invoiced",
        "updatedAt": datetime(2026, 1, 15, 12, 0, 0),
    }
    defaults.update(kwargs)
    return defaults


def test_transform_valid_shift():
    t = InvoiceTransformer()
    shift = make_shift()
    record = t.transform(shift)
    assert record.event_type == "invoiced"
    assert record.is_voided is False
    assert record.currency == "AUD"
    assert record.gross_amount == Decimal("0.00")
    assert record.subtotal == Decimal("0.00")
    assert record.tax_amount == Decimal("0.00")
    assert record.work_event_count == 1
    assert record.days_to_due == 0


def test_transform_missing_id_raises():
    t = InvoiceTransformer()
    with pytest.raises(ValueError, match="_id"):
        t.transform({"businessId": str(uuid.uuid4()), "date": "2026-01-01"})


def test_transform_missing_business_id_raises():
    t = InvoiceTransformer()
    with pytest.raises(ValueError):
        t.transform({"_id": str(uuid.uuid4()), "date": "2026-01-01"})


def test_transform_invalid_date_raises():
    t = InvoiceTransformer()
    shift = make_shift(date="not-a-date")
    with pytest.raises(ValueError, match="invalid date"):
        t.transform(shift)


def test_transform_cancelled_shift_is_voided():
    t = InvoiceTransformer()
    shift = make_shift(status="cancelled")
    record = t.transform(shift)
    assert record.is_voided is True


def test_transform_null_customer_is_none():
    t = InvoiceTransformer()
    shift = make_shift(customerId=None)
    record = t.transform(shift)
    assert record.customer_id is None


def test_calc_duration_hours():
    assert _calc_duration_hours("09:00", "17:00", 30) == Decimal("7.50")
    assert _calc_duration_hours("08:00", "08:00", 0) == Decimal("0.00")
    assert _calc_duration_hours(None, "17:00", 0) == Decimal("0")
    assert _calc_duration_hours("bad", "17:00", 0) == Decimal("0")


def test_calc_duration_break_none():
    assert _calc_duration_hours("09:00", "10:00", None) == Decimal("1.00")


def test_to_date():
    assert _to_date("2026-01-15") == date(2026, 1, 15)
    assert _to_date(None) is None
    assert _to_date("bad") is None
    assert _to_date("") is None

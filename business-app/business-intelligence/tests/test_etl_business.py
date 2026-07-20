"""Tests for BusinessTransformer."""
import uuid
from datetime import datetime

import pytest

from app.etl.transformers.business_transformer import (
    BusinessTransformer,
    _to_uuid_from_objectid,
)


def make_business(**kwargs) -> dict:
    defaults = {
        "_id": "507f1f77bcf86cd799439011",  # a 24-char ObjectId hex
        "businessKey": "acme",
        "businessName": "Acme Pty Ltd",
        "defaultCurrency": "AUD",
        "isActive": True,
        "isPlatformCompany": False,
        "createdAt": datetime(2026, 1, 1),
        "updatedAt": datetime(2026, 6, 1),
    }
    defaults.update(kwargs)
    return defaults


def test_transform_valid_business():
    t = BusinessTransformer()
    record = t.transform(make_business())
    assert record.business_name == "Acme Pty Ltd"
    assert record.company_key == "acme"
    assert record.currency == "AUD"
    assert record.is_active is True
    assert record.is_platform is False


def test_transform_missing_id_raises():
    t = BusinessTransformer()
    with pytest.raises(ValueError, match="_id"):
        t.transform({"businessName": "x"})


def test_transform_deterministic_uuid():
    t = BusinessTransformer()
    a = t.transform(make_business())
    b = t.transform(make_business())
    assert a.business_id == b.business_id


def test_transform_defaults_currency_to_aud_when_missing():
    t = BusinessTransformer()
    record = t.transform(make_business(defaultCurrency=None))
    assert record.currency == "AUD"


def test_uuid_from_objectid_stable():
    a = _to_uuid_from_objectid("507f1f77bcf86cd799439011")
    b = _to_uuid_from_objectid("507f1f77bcf86cd799439011")
    assert a == b
    assert isinstance(a, uuid.UUID)


def test_uuid_from_objectid_different_inputs_differ():
    a = _to_uuid_from_objectid("507f1f77bcf86cd799439011")
    b = _to_uuid_from_objectid("507f1f77bcf86cd799439012")
    assert a != b

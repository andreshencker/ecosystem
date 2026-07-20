"""Tests for ContractTransformer — all fields and configuration health."""
from datetime import date, datetime
from decimal import Decimal

import pytest

from app.etl.transformers.contract_transformer import (
    ContractTransformer,
    compute_health,
)


# ─── Fixtures ─────────────────────────────────────────────────────────────────

def make_contract(**kwargs) -> dict:
    defaults = {
        "_id": "507f1f77bcf86cd799439031",
        "businessId": "507f1f77bcf86cd799439011",
        "customerId": "507f1f77bcf86cd799439021",
        "startDate": datetime(2026, 1, 1),
        "endDate": datetime(2026, 12, 31),
        "positionName": "Cleaner",
        "invoiceDescription": "Weekly cleaning services",
        "workType": "casual",
        "status": "active",
        "billingCycle": "weekly",
        "paymentTermsDays": 14,
        "scheduledPaymentEnabled": False,
        "scheduledPaymentDay": None,
        "rateType": "variable",
        "minimumHours": 4,
        "defaultBreakMinutes": 30,
        "rates": [
            {"days": ["monday"], "hourlyRate": 45.5},
            {"days": ["saturday"], "hourlyRate": 60},
        ],
        "currency": "AUD",
        "chargeGst": False,
        "gstRate": None,
        "holidayRules": {
            "enabled": False,
            "calendarId": None,
            "calendarName": None,
            "behaviour": "normal_rate",
        },
        "superannuationRules": {
            "enabled": False,
            "rate": None,
            "paymentFrequency": None,
        },
        "paymentCalendarEnabled": False,
        "paymentCalendarSubscriptionId": None,
        "createdAt": datetime(2026, 1, 1),
        "updatedAt": datetime(2026, 6, 1),
    }
    defaults.update(kwargs)
    return defaults


# ─── Core field mapping ───────────────────────────────────────────────────────

def test_transform_maps_all_core_fields():
    t = ContractTransformer()
    raw = make_contract()
    r = t.transform(raw)

    assert r.source_id == "507f1f77bcf86cd799439031"
    assert r.business_id == "507f1f77bcf86cd799439011"
    assert r.customer_id == "507f1f77bcf86cd799439021"
    assert r.status == "active"
    assert r.position_name == "Cleaner"
    assert r.invoice_description == "Weekly cleaning services"
    assert r.work_type == "casual"
    assert r.billing_cycle == "weekly"
    assert r.payment_terms_days == 14
    assert r.scheduled_payment_enabled is False
    assert r.scheduled_payment_day is None
    assert r.rate_type == "variable"
    assert r.minimum_hours == Decimal("4")
    assert r.default_break_minutes == 30
    assert r.max_hourly_rate == Decimal("60")
    assert r.min_hourly_rate == Decimal("45.5")
    assert r.currency == "AUD"
    assert r.charge_gst is False
    assert r.gst_rate is None
    assert r.start_date == date(2026, 1, 1)
    assert r.end_date == date(2026, 12, 31)


def test_transform_missing_id_raises():
    t = ContractTransformer()
    with pytest.raises(ValueError, match="_id"):
        t.transform({"businessId": "x"})


def test_transform_missing_business_id_raises():
    t = ContractTransformer()
    with pytest.raises(ValueError, match="businessId"):
        t.transform({"_id": "abc"})


def test_transform_empty_rates_yields_none():
    t = ContractTransformer()
    r = t.transform(make_contract(rates=[]))
    assert r.max_hourly_rate is None
    assert r.min_hourly_rate is None


def test_transform_null_customer_id_ok():
    t = ContractTransformer()
    r = t.transform(make_contract(customerId=None))
    assert r.customer_id is None


def test_transform_defaults_status_and_billing_cycle():
    t = ContractTransformer()
    r = t.transform(make_contract(status=None, billingCycle=None, rateType=None))
    assert r.status == "draft"
    assert r.billing_cycle == "per_shift"
    assert r.rate_type == "fixed"


# ─── New admin field mapping ───────────────────────────────────────────────────

def test_transform_maps_work_type():
    t = ContractTransformer()
    r = t.transform(make_contract(workType="contractor"))
    assert r.work_type == "contractor"


def test_transform_work_type_defaults_to_contractor():
    t = ContractTransformer()
    r = t.transform(make_contract(workType=None))
    assert r.work_type == "contractor"


def test_transform_maps_invoice_description():
    t = ContractTransformer()
    r = t.transform(make_contract(invoiceDescription="Tech services"))
    assert r.invoice_description == "Tech services"


def test_transform_maps_currency():
    t = ContractTransformer()
    r = t.transform(make_contract(currency="USD"))
    assert r.currency == "USD"


def test_transform_maps_gst():
    t = ContractTransformer()
    r = t.transform(make_contract(chargeGst=True, gstRate=10))
    assert r.charge_gst is True
    assert r.gst_rate == Decimal("10")


def test_transform_gst_rate_null_when_gst_disabled():
    t = ContractTransformer()
    r = t.transform(make_contract(chargeGst=False, gstRate=10))
    assert r.charge_gst is False
    assert r.gst_rate is None


def test_transform_maps_scheduled_payment():
    t = ContractTransformer()
    r = t.transform(make_contract(
        scheduledPaymentEnabled=True,
        scheduledPaymentDay="friday",
        paymentTermsDays=None,
    ))
    assert r.scheduled_payment_enabled is True
    assert r.scheduled_payment_day == "friday"


def test_transform_maps_holiday_rules():
    t = ContractTransformer()
    raw = make_contract(holidayRules={
        "enabled": True,
        "calendarId": "cal123",
        "calendarName": "AU Holidays",
        "behaviour": "multiplier",
    })
    r = t.transform(raw)
    assert r.holiday_rules_enabled is True
    assert r.holiday_calendar_id == "cal123"
    assert r.holiday_calendar_name == "AU Holidays"
    assert r.holiday_behaviour == "multiplier"


def test_transform_maps_payment_calendar():
    t = ContractTransformer()
    raw = make_contract(
        paymentCalendarEnabled=True,
        paymentCalendarSubscriptionId="paycal999",
    )
    r = t.transform(raw)
    assert r.payment_calendar_enabled is True
    assert r.payment_calendar_id == "paycal999"


def test_transform_maps_superannuation():
    t = ContractTransformer()
    raw = make_contract(superannuationRules={
        "enabled": True,
        "rate": 12.5,
        "paymentFrequency": "quarterly",
    })
    r = t.transform(raw)
    assert r.super_enabled is True
    assert r.super_rate == Decimal("12.5")
    assert r.super_payment_frequency == "quarterly"


def test_transform_super_fields_null_when_disabled():
    t = ContractTransformer()
    raw = make_contract(superannuationRules={"enabled": False, "rate": 12, "paymentFrequency": "quarterly"})
    r = t.transform(raw)
    assert r.super_enabled is False
    assert r.super_rate is None


def test_transform_accepts_biz_name_and_cust_name():
    t = ContractTransformer()
    r = t.transform(make_contract(), biz_name="Acme Corp", cust_name="John Doe")
    assert r.business_name == "Acme Corp"
    assert r.customer_name == "John Doe"


def test_transform_defaults_names_to_none():
    t = ContractTransformer()
    r = t.transform(make_contract())
    assert r.business_name is None
    assert r.customer_name is None


# ─── Configuration health — complete ─────────────────────────────────────────

def test_complete_contract_has_no_issues():
    status, issues = compute_health(make_contract(), has_rate=True)
    assert status == "complete"
    assert issues == []


# ─── Configuration health — invalid rules ────────────────────────────────────

def test_missing_business_is_invalid():
    raw = make_contract(businessId=None)
    del raw["businessId"]
    status, issues = compute_health(raw, has_rate=True)
    assert status == "invalid"
    assert "CONTRACT_MISSING_BUSINESS" in issues


def test_missing_customer_is_invalid():
    status, issues = compute_health(make_contract(customerId=None), has_rate=True)
    assert status == "invalid"
    assert "CONTRACT_MISSING_CUSTOMER" in issues


def test_missing_rate_is_invalid():
    status, issues = compute_health(make_contract(), has_rate=False)
    assert status == "invalid"
    assert "CONTRACT_MISSING_RATE_CONFIGURATION" in issues


def test_end_date_before_start_is_invalid():
    raw = make_contract(
        startDate=datetime(2026, 6, 1),
        endDate=datetime(2026, 1, 1),
    )
    status, issues = compute_health(raw, has_rate=True)
    assert status == "invalid"
    assert "CONTRACT_INVALID_END_DATE" in issues


def test_scheduled_payment_without_day_is_invalid():
    raw = make_contract(scheduledPaymentEnabled=True, scheduledPaymentDay=None)
    status, issues = compute_health(raw, has_rate=True)
    assert status == "invalid"
    assert "CONTRACT_MISSING_PAYMENT_DAY" in issues


def test_gst_enabled_without_rate_is_invalid():
    raw = make_contract(chargeGst=True, gstRate=None)
    status, issues = compute_health(raw, has_rate=True)
    assert status == "invalid"
    assert "CONTRACT_INVALID_GST_RATE" in issues


def test_gst_enabled_with_zero_rate_is_invalid():
    raw = make_contract(chargeGst=True, gstRate=0)
    status, issues = compute_health(raw, has_rate=True)
    assert status == "invalid"
    assert "CONTRACT_INVALID_GST_RATE" in issues


def test_gst_disabled_with_rate_present_is_ok():
    raw = make_contract(chargeGst=False, gstRate=10)
    status, issues = compute_health(raw, has_rate=True)
    assert status == "complete"
    assert "CONTRACT_INVALID_GST_RATE" not in issues


def test_super_enabled_without_rate_is_invalid():
    raw = make_contract(superannuationRules={"enabled": True, "rate": None, "paymentFrequency": "quarterly"})
    status, issues = compute_health(raw, has_rate=True)
    assert status == "invalid"
    assert "CONTRACT_INVALID_SUPER_RATE" in issues


def test_super_enabled_with_zero_rate_is_invalid():
    raw = make_contract(superannuationRules={"enabled": True, "rate": 0, "paymentFrequency": "quarterly"})
    status, issues = compute_health(raw, has_rate=True)
    assert status == "invalid"
    assert "CONTRACT_INVALID_SUPER_RATE" in issues


def test_super_disabled_is_ok():
    raw = make_contract(superannuationRules={"enabled": False, "rate": None, "paymentFrequency": None})
    status, issues = compute_health(raw, has_rate=True)
    assert "CONTRACT_INVALID_SUPER_RATE" not in issues


def test_holiday_rules_without_calendar_is_invalid():
    raw = make_contract(holidayRules={"enabled": True, "calendarId": None, "calendarName": None, "behaviour": "normal_rate"})
    status, issues = compute_health(raw, has_rate=True)
    assert status == "invalid"
    assert "CONTRACT_MISSING_HOLIDAY_CALENDAR" in issues


def test_payment_calendar_without_reference_is_invalid():
    raw = make_contract(paymentCalendarEnabled=True, paymentCalendarSubscriptionId=None)
    status, issues = compute_health(raw, has_rate=True)
    assert status == "invalid"
    assert "CONTRACT_MISSING_PAYMENT_CALENDAR" in issues


# ─── Configuration health — warning rules ────────────────────────────────────

def test_holiday_calendar_reference_present_is_warning_phase1():
    raw = make_contract(holidayRules={
        "enabled": True,
        "calendarId": "cal123",
        "calendarName": "AU Holidays",
        "behaviour": "normal_rate",
    })
    status, issues = compute_health(raw, has_rate=True)
    assert status == "warning"
    assert "CONTRACT_INACTIVE_HOLIDAY_CALENDAR" in issues
    assert "CONTRACT_MISSING_HOLIDAY_CALENDAR" not in issues


def test_payment_calendar_reference_present_is_warning_phase1():
    raw = make_contract(paymentCalendarEnabled=True, paymentCalendarSubscriptionId="paycal999")
    status, issues = compute_health(raw, has_rate=True)
    assert status == "warning"
    assert "CONTRACT_INACTIVE_PAYMENT_CALENDAR" in issues
    assert "CONTRACT_MISSING_PAYMENT_CALENDAR" not in issues


# ─── Configuration health — precedence ───────────────────────────────────────

def test_invalid_overrides_warning():
    raw = make_contract(
        chargeGst=True, gstRate=None,         # invalid
        paymentCalendarEnabled=True, paymentCalendarSubscriptionId="cal",  # warning
    )
    status, issues = compute_health(raw, has_rate=True)
    assert status == "invalid"
    assert "CONTRACT_INVALID_GST_RATE" in issues
    assert "CONTRACT_INACTIVE_PAYMENT_CALENDAR" in issues


def test_multiple_issues_collected():
    raw = make_contract(
        customerId=None,
        chargeGst=True, gstRate=None,
        scheduledPaymentEnabled=True, scheduledPaymentDay=None,
    )
    status, issues = compute_health(raw, has_rate=False)
    assert status == "invalid"
    assert len(issues) >= 4
    assert "CONTRACT_MISSING_CUSTOMER" in issues
    assert "CONTRACT_MISSING_RATE_CONFIGURATION" in issues
    assert "CONTRACT_INVALID_GST_RATE" in issues
    assert "CONTRACT_MISSING_PAYMENT_DAY" in issues


# ─── Transformer health integration ──────────────────────────────────────────

def test_transformer_sets_configuration_status():
    t = ContractTransformer()
    r = t.transform(make_contract())
    assert r.configuration_status == "complete"
    assert r.support_issue_count == 0
    assert r.support_issues is None


def test_transformer_sets_invalid_status():
    t = ContractTransformer()
    r = t.transform(make_contract(rates=[]))
    assert r.configuration_status == "invalid"
    assert "CONTRACT_MISSING_RATE_CONFIGURATION" in (r.support_issues or [])
    assert r.support_issue_count >= 1


def test_transformer_sets_warning_status():
    t = ContractTransformer()
    raw = make_contract(paymentCalendarEnabled=True, paymentCalendarSubscriptionId="cal99")
    r = t.transform(raw)
    assert r.configuration_status == "warning"
    assert r.support_issue_count == 1

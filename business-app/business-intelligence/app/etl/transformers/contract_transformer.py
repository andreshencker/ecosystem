"""Transformer: raw MongoDB contract document → FactContract.

Maps all Contract fields required for the Platform Admin Contract dataset.
Computes configuration_status and support_issues at transform time so no
caller ever needs to re-derive them.

Support issue codes (stable, machine-readable):
  CONTRACT_MISSING_BUSINESS         — businessId absent
  CONTRACT_MISSING_CUSTOMER         — customerId absent
  CONTRACT_MISSING_RATE_CONFIGURATION — no rate rules
  CONTRACT_INVALID_END_DATE         — endDate < startDate
  CONTRACT_MISSING_PAYMENT_DAY      — scheduledPayment on, day absent
  CONTRACT_INVALID_GST_RATE         — GST on, rate missing/zero
  CONTRACT_INVALID_SUPER_RATE       — super on, rate missing/zero
  CONTRACT_MISSING_HOLIDAY_CALENDAR — holiday rules on, calendarId absent
  CONTRACT_MISSING_PAYMENT_CALENDAR — payment calendar on, ref absent
  CONTRACT_INACTIVE_HOLIDAY_CALENDAR — holiday calendar status unknown (Phase 1 warning)
  CONTRACT_INACTIVE_PAYMENT_CALENDAR — payment calendar status unknown (Phase 1 warning)

Severity:
  invalid — CONTRACT_MISSING_*, CONTRACT_INVALID_*
  warning — CONTRACT_INACTIVE_*

Configuration status precedence: invalid > warning > complete
"""
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from app.etl.transformers.base import AbstractTransformer
from app.models.contracts.analytical_model import FactContract

# ─── Issue severity map ───────────────────────────────────────────────────────

_INVALID_CODES = frozenset({
    "CONTRACT_MISSING_BUSINESS",
    "CONTRACT_MISSING_CUSTOMER",
    "CONTRACT_MISSING_RATE_CONFIGURATION",
    "CONTRACT_INVALID_END_DATE",
    "CONTRACT_MISSING_PAYMENT_DAY",
    "CONTRACT_INVALID_GST_RATE",
    "CONTRACT_INVALID_SUPER_RATE",
    "CONTRACT_MISSING_HOLIDAY_CALENDAR",
    "CONTRACT_MISSING_PAYMENT_CALENDAR",
})

_WARNING_CODES = frozenset({
    "CONTRACT_INACTIVE_HOLIDAY_CALENDAR",
    "CONTRACT_INACTIVE_PAYMENT_CALENDAR",
})

# ─── Helpers ──────────────────────────────────────────────────────────────────


def _to_date(value: Any) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return datetime.strptime(str(value)[:10], "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


def _to_decimal(value: Any) -> Optional[Decimal]:
    if value is None:
        return None
    try:
        return Decimal(str(value))
    except (ValueError, TypeError):
        return None


# ─── Configuration health computation ────────────────────────────────────────


def compute_health(raw: dict, has_rate: bool) -> Tuple[str, List[str]]:
    """Return (configuration_status, issue_code_list) from a raw contract doc.

    Rules are evaluated independently; worst severity wins.
    'invalid' overrides 'warning'; 'warning' overrides 'complete'.
    """
    issues: List[str] = []

    business_id = raw.get("businessId")
    customer_id = raw.get("customerId")
    hr = raw.get("holidayRules") or {}
    sr = raw.get("superannuationRules") or {}

    # R-01: Missing business
    if not business_id:
        issues.append("CONTRACT_MISSING_BUSINESS")

    # R-02: Missing customer
    if not customer_id:
        issues.append("CONTRACT_MISSING_CUSTOMER")

    # R-03: Missing rate configuration
    if not has_rate:
        issues.append("CONTRACT_MISSING_RATE_CONFIGURATION")

    # R-04: End date before start date
    start_d = _to_date(raw.get("startDate"))
    end_d = _to_date(raw.get("endDate"))
    if start_d and end_d and end_d < start_d:
        issues.append("CONTRACT_INVALID_END_DATE")

    # R-05: Scheduled payment enabled without day
    if raw.get("scheduledPaymentEnabled") and not raw.get("scheduledPaymentDay"):
        issues.append("CONTRACT_MISSING_PAYMENT_DAY")

    # R-06: GST enabled without valid rate
    if raw.get("chargeGst"):
        gst = _to_decimal(raw.get("gstRate"))
        if gst is None or gst <= 0:
            issues.append("CONTRACT_INVALID_GST_RATE")

    # R-07: Superannuation enabled without valid rate
    if sr.get("enabled"):
        super_rate = _to_decimal(sr.get("rate"))
        if super_rate is None or super_rate <= 0:
            issues.append("CONTRACT_INVALID_SUPER_RATE")

    # R-08: Holiday rules enabled without calendar reference
    if hr.get("enabled"):
        if not hr.get("calendarId"):
            issues.append("CONTRACT_MISSING_HOLIDAY_CALENDAR")
        else:
            # Phase 1: calendar reference present but status unknown → warning
            issues.append("CONTRACT_INACTIVE_HOLIDAY_CALENDAR")

    # R-09: Payment calendar enabled without reference
    if raw.get("paymentCalendarEnabled"):
        if not raw.get("paymentCalendarSubscriptionId"):
            issues.append("CONTRACT_MISSING_PAYMENT_CALENDAR")
        else:
            # Phase 1: calendar reference present but status unknown → warning
            issues.append("CONTRACT_INACTIVE_PAYMENT_CALENDAR")

    # Determine overall status (worst wins)
    if any(c in _INVALID_CODES for c in issues):
        status = "invalid"
    elif any(c in _WARNING_CODES for c in issues):
        status = "warning"
    else:
        status = "complete"

    return status, issues


# ─── Transformer ─────────────────────────────────────────────────────────────


class ContractTransformer(AbstractTransformer[dict, FactContract]):
    """Convert a raw MongoDB contract document into a FactContract row.

    Optional biz_name / cust_name are passed in by the pipeline after a
    batch lookup — the transformer itself never hits the database.
    """

    def transform(
        self,
        raw: dict,
        biz_name: Optional[str] = None,
        cust_name: Optional[str] = None,
    ) -> FactContract:
        source_id = raw.get("_id")
        business_id = raw.get("businessId")
        if not source_id:
            raise ValueError("Contract document has no _id field")
        if not business_id:
            raise ValueError(f"Contract {source_id} has no businessId")

        # ── Rates ──────────────────────────────────────────────────────────────
        rates = raw.get("rates") or []
        hourly_rates: list = []
        for rate in rates:
            hr_val = rate.get("hourlyRate") if isinstance(rate, dict) else None
            dec = _to_decimal(hr_val)
            if dec is not None:
                hourly_rates.append(dec)

        max_rate = max(hourly_rates) if hourly_rates else None
        min_rate = min(hourly_rates) if hourly_rates else None
        has_rate = bool(hourly_rates)

        # ── Holiday rules ──────────────────────────────────────────────────────
        hr = raw.get("holidayRules") or {}
        holiday_enabled = bool(hr.get("enabled", False))

        # ── Superannuation ──────────────────────────────────────────────────────
        sr = raw.get("superannuationRules") or {}
        super_enabled = bool(sr.get("enabled", False))

        # ── Configuration health ────────────────────────────────────────────────
        config_status, issues = compute_health(raw, has_rate)

        customer_id = raw.get("customerId")

        return FactContract(
            source_id=str(source_id),
            business_id=str(business_id),
            customer_id=str(customer_id) if customer_id else None,
            status=raw.get("status") or "draft",
            position_name=raw.get("positionName") or "",
            invoice_description=raw.get("invoiceDescription") or None,
            work_type=raw.get("workType") or "contractor",
            billing_cycle=raw.get("billingCycle") or "per_shift",
            payment_terms_days=raw.get("paymentTermsDays"),
            scheduled_payment_enabled=bool(raw.get("scheduledPaymentEnabled", False)),
            scheduled_payment_day=raw.get("scheduledPaymentDay") or None,
            minimum_hours=_to_decimal(raw.get("minimumHours")),
            default_break_minutes=raw.get("defaultBreakMinutes"),
            rate_type=raw.get("rateType") or "fixed",
            max_hourly_rate=max_rate,
            min_hourly_rate=min_rate,
            currency=raw.get("currency") or "AUD",
            charge_gst=bool(raw.get("chargeGst", False)),
            gst_rate=_to_decimal(raw.get("gstRate")) if raw.get("chargeGst") else None,
            start_date=_to_date(raw.get("startDate")),
            end_date=_to_date(raw.get("endDate")),
            holiday_rules_enabled=holiday_enabled,
            holiday_calendar_id=hr.get("calendarId") or None,
            holiday_calendar_name=hr.get("calendarName") or None,
            holiday_behaviour=hr.get("behaviour") or None,
            payment_calendar_enabled=bool(raw.get("paymentCalendarEnabled", False)),
            payment_calendar_id=raw.get("paymentCalendarSubscriptionId") or None,
            super_enabled=super_enabled,
            super_rate=_to_decimal(sr.get("rate")) if super_enabled else None,
            super_payment_frequency=sr.get("paymentFrequency") or None,
            business_name=biz_name,
            customer_name=cust_name,
            configuration_status=config_status,
            support_issue_count=len(issues),
            support_issues=issues if issues else None,
            source_created_at=raw.get("createdAt"),
            source_updated_at=raw.get("updatedAt"),
        )

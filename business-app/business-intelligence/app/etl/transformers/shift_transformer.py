"""Transformer: raw MongoDB shift document → FactShift.

Parses HH:mm start/end times and computes net worked minutes/hours after
subtracting the break. Uses string source IDs (no UUID conversion).
"""
from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Optional

from app.etl.transformers.base import AbstractTransformer
from app.models.shifts.fact_shift import FactShift

TWO_PLACES = Decimal("0.01")


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


def _parse_hhmm(value: Any) -> Optional[int]:
    if not value:
        return None
    try:
        parts = str(value).split(":")
        if len(parts) < 2:
            return None
        return int(parts[0]) * 60 + int(parts[1])
    except (ValueError, AttributeError):
        return None


def _calc_net_minutes(start: Any, end: Any, break_min: Any) -> Optional[int]:
    start_min = _parse_hhmm(start)
    end_min = _parse_hhmm(end)
    if start_min is None or end_min is None:
        return None
    gross = end_min - start_min
    try:
        break_val = int(break_min or 0)
    except (ValueError, TypeError):
        break_val = 0
    return max(0, gross - break_val)


class ShiftTransformer(AbstractTransformer[dict, FactShift]):
    """Convert a raw MongoDB shift document into a FactShift row."""

    def transform(self, raw: dict) -> FactShift:
        source_id = raw.get("_id")
        business_id = raw.get("businessId")
        if not source_id:
            raise ValueError("Shift document has no _id field")
        if not business_id:
            raise ValueError(f"Shift {source_id} has no businessId")

        net_min = _calc_net_minutes(
            raw.get("startTime"),
            raw.get("endTime"),
            raw.get("breakMinutes"),
        )

        duration_minutes: Optional[Decimal] = None
        duration_hours: Optional[Decimal] = None
        if net_min is not None:
            duration_minutes = Decimal(net_min).quantize(
                TWO_PLACES, rounding=ROUND_HALF_UP
            )
            duration_hours = (Decimal(net_min) / Decimal(60)).quantize(
                TWO_PLACES, rounding=ROUND_HALF_UP
            )

        contract_id = raw.get("contractId")
        customer_id = raw.get("customerId")

        linked_calendar_id = raw.get("linkedCalendarId")
        last_external_update = raw.get("lastExternalUpdate")

        return FactShift(
            source_id=str(source_id),
            business_id=str(business_id),
            contract_id=str(contract_id) if contract_id else None,
            customer_id=str(customer_id) if customer_id else None,
            shift_date=_to_date(raw.get("date")),
            start_time=raw.get("startTime"),
            end_time=raw.get("endTime"),
            break_minutes=raw.get("breakMinutes"),
            duration_minutes=duration_minutes,
            duration_hours=duration_hours,
            shift_status=raw.get("status") or "draft",
            invoice_status=raw.get("invoiceStatus") or "pending",
            hour_calculation_status=raw.get("hourCalculationStatus"),
            created_from_calendar=bool(raw.get("createdFromCalendar", False)),
            contract_assigned=bool(raw.get("contractAssigned", False)),
            linked_calendar_id=str(linked_calendar_id) if linked_calendar_id else None,
            calendar_name=raw.get("calendarName"),
            calendar_provider=raw.get("calendarProvider"),
            calendar_account=raw.get("calendarAccount"),
            sync_status=raw.get("syncStatus"),
            last_external_update=last_external_update if isinstance(last_external_update, datetime) else None,
            location=raw.get("location"),
            title=raw.get("title"),
            source_created_at=raw.get("createdAt"),
            source_updated_at=raw.get("updatedAt"),
        )

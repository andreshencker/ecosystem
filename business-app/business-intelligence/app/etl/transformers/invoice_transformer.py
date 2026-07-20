"""Transformer: raw MongoDB shift document -> FactInvoice analytical record.

The Business App currently has no standalone Invoice collection. Each
invoiced shift is mapped 1:1 to a FactInvoice row using the shift's _id
as the event_id (idempotency key). Monetary amounts are set to
Decimal('0.00') because hourly rates live in the Contract document
(not the Shift) and rate calculation is a future sprint.
"""
import logging
import uuid
from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Optional

from app.etl.transformers.base import AbstractTransformer
from app.models.invoices.analytical_model import FactInvoice

logger = logging.getLogger(__name__)

TWO_PLACES = Decimal("0.01")


def _to_uuid(value: Any) -> Optional[uuid.UUID]:
    if value is None:
        return None
    try:
        return uuid.UUID(str(value))
    except (ValueError, AttributeError):
        return None


def _to_date(value: Any) -> Optional[date]:
    """Parse YYYY-MM-DD string to Python date. Returns None on failure."""
    if not value:
        return None
    try:
        return datetime.strptime(str(value)[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


def _parse_hhmm(value: Any) -> Optional[int]:
    """Return total minutes for HH:mm string. Returns None on failure."""
    if not value:
        return None
    try:
        h, m = str(value).split(":")
        return int(h) * 60 + int(m)
    except (ValueError, AttributeError):
        return None


def _calc_duration_hours(start: Any, end: Any, break_min: Any) -> Decimal:
    """Calculate net hours worked. Returns Decimal('0') on invalid input."""
    start_min = _parse_hhmm(start)
    end_min = _parse_hhmm(end)
    if start_min is None or end_min is None:
        return Decimal("0")
    net_min = max(0, end_min - start_min - int(break_min or 0))
    return (Decimal(net_min) / Decimal(60)).quantize(
        TWO_PLACES, rounding=ROUND_HALF_UP
    )


class InvoiceTransformer(AbstractTransformer[dict, FactInvoice]):
    """
    Converts a raw MongoDB Shift document (invoiceStatus='invoiced') into
    a FactInvoice analytical record.

    Monetary amounts are set to Decimal('0.00') because hourly rates live
    in the Contract document (not the Shift). Rate calculation is a
    future sprint (hourCalculationStatus='calculated' will carry the amount).
    When the Business App adds amount fields to Shift, update the amount
    logic below.

    Raises ValueError for records missing required fields (_id, businessId,
    or a parseable date).
    """

    def transform(self, raw: dict) -> FactInvoice:
        source_id = raw.get("_id")
        if source_id is None:
            raise ValueError("Shift document has no _id field")

        business_id = raw.get("businessId")
        if not business_id:
            raise ValueError(f"Shift {source_id} missing businessId")

        shift_date = _to_date(raw.get("date"))
        if shift_date is None:
            raise ValueError(
                f"Shift {source_id} has invalid date: {raw.get('date')!r}"
            )

        # Duration (informational — not used for monetary amounts yet)
        _duration_h = _calc_duration_hours(
            raw.get("startTime"),
            raw.get("endTime"),
            raw.get("breakMinutes"),
        )

        # Monetary amounts — zero until rate calculation is implemented.
        # Contract rates are in a separate MongoDB collection.
        gross_amount = Decimal("0.00")

        # Due date: shift date + 0 days (no contract paymentTermsDays
        # available without a Contract join). Future work.
        due_date = shift_date

        # Normalise IDs
        try:
            event_uuid = uuid.UUID(str(source_id))
        except (ValueError, AttributeError):
            raise ValueError(f"Cannot parse _id as UUID: {source_id!r}")

        try:
            business_uuid = uuid.UUID(str(business_id))
        except (ValueError, AttributeError):
            raise ValueError(f"Cannot parse businessId as UUID: {business_id!r}")

        customer_id = _to_uuid(raw.get("customerId"))

        return FactInvoice(
            event_id=event_uuid,
            business_id=business_uuid,
            customer_id=customer_id,
            issue_date_key=shift_date,
            due_date_key=due_date,
            invoice_id=event_uuid,
            invoice_number=None,
            subtotal=gross_amount,
            tax_amount=Decimal("0.00"),
            gross_amount=gross_amount,
            currency="AUD",
            event_type="invoiced",
            is_voided=(raw.get("status") == "cancelled"),
            work_event_count=1,
            days_to_due=0,
        )

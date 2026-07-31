"""Pending invoice groups calculation service.

Reads confirmed/pending shifts and their contracts directly from MongoDB so
the calculation is always fresh and uses the full rate-rule array (which is
not fully replicated in the PostgreSQL warehouse).

Architecture notes:
- BI never modifies operational data — all reads are read-only.
- No ETL dependency: this is a real-time query, not a pre-aggregated view.
- Monetary arithmetic uses Decimal throughout; never float.
- Rate resolution matches Contract.rates[] by day-of-week and time range.
- Billing period boundaries come from the contract's billingCycle and startDate.
"""
import calendar
import hashlib
import logging
from datetime import date, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import Any, Dict, List, Optional, Tuple

from app.database.mongo import get_database

from .schema import (
    PendingGroupStatus,
    PendingInvoiceGroup,
    PendingInvoiceGroupsResponse,
    PendingShiftCalculation,
    ShiftCalcStatus,
)

logger = logging.getLogger(__name__)

TWO = Decimal("0.01")

_DAY_MAP = {
    0: "monday",
    1: "tuesday",
    2: "wednesday",
    3: "thursday",
    4: "friday",
    5: "saturday",
    6: "sunday",
}


# ── Helpers ───────────────────────────────────────────────────────────────────


def _d2(v: Decimal) -> str:
    return str(v.quantize(TWO, rounding=ROUND_HALF_UP))


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


def _gross_hours(
    shift_date_str: str,
    start_time: str,
    end_date_str: Optional[str],
    end_time: str,
) -> Tuple[Decimal, Optional[str]]:
    """Return (gross_hours, error_note).

    Overnight-safe: if endDate is null and end_time < start_time, we add 1 day.
    """
    start_min = _parse_hhmm(start_time)
    end_min = _parse_hhmm(end_time)
    if start_min is None or end_min is None:
        return Decimal("0"), "Missing start or end time"

    if end_date_str:
        # Explicit end date — compute calendar difference
        try:
            sd = datetime.strptime(shift_date_str, "%Y-%m-%d")
            ed = datetime.strptime(end_date_str, "%Y-%m-%d")
            day_diff = (ed - sd).days
        except ValueError:
            day_diff = 0
        gross_min = day_diff * 1440 + end_min - start_min
    else:
        gross_min = end_min - start_min
        if gross_min < 0:
            gross_min += 1440  # overnight: cross midnight

    if gross_min < 0:
        return Decimal("0"), f"Negative gross duration ({gross_min} min)"

    gross_h = (Decimal(gross_min) / Decimal(60)).quantize(TWO, rounding=ROUND_HALF_UP)
    return gross_h, None


def _resolve_rate(
    shift_date: date,
    start_time: Optional[str],
    rate_type: str,
    rates: List[Dict],
) -> Tuple[Optional[Decimal], Optional[str]]:
    """Return (hourly_rate, error_note). None rate = unresolvable."""
    if not rates:
        return None, "No rate rules configured on contract"

    day_name = _DAY_MAP[shift_date.weekday()]

    if rate_type == "fixed":
        # Single rate — take the first entry
        try:
            return Decimal(str(rates[0]["hourlyRate"])), None
        except (KeyError, ValueError, TypeError):
            return None, "Invalid fixed rate value"

    elif rate_type == "variable":
        for rule in rates:
            days = rule.get("days", [])
            if "all" in days or day_name in days:
                try:
                    return Decimal(str(rule["hourlyRate"])), None
                except (KeyError, ValueError, TypeError):
                    continue
        return None, f"No variable rate found for {day_name}"

    elif rate_type == "variable_time_range":
        start_min = _parse_hhmm(start_time)
        for rule in rates:
            days = rule.get("days", [])
            if "all" not in days and day_name not in days:
                continue
            rule_start = _parse_hhmm(rule.get("startTime"))
            rule_end = _parse_hhmm(rule.get("endTime"))
            if rule_start is None and rule_end is None:
                # No time restriction — matches all
                try:
                    return Decimal(str(rule["hourlyRate"])), None
                except (KeyError, ValueError, TypeError):
                    continue
            if start_min is not None and rule_start is not None and rule_end is not None:
                if rule_start <= start_min < rule_end:
                    try:
                        return Decimal(str(rule["hourlyRate"])), None
                    except (KeyError, ValueError, TypeError):
                        continue
        return None, f"No time-range rate found for {day_name} at {start_time}"

    return None, f"Unknown rateType: {rate_type}"


def _billing_period(
    shift_date: date,
    billing_cycle: str,
    contract_start: Optional[date],
) -> Tuple[date, date]:
    """Return (period_start, period_end) for the shift given the billing cycle."""
    if billing_cycle in ("per_shift", "daily") or billing_cycle is None:
        return shift_date, shift_date

    if billing_cycle == "weekly":
        monday = shift_date - timedelta(days=shift_date.weekday())
        sunday = monday + timedelta(days=6)
        return monday, sunday

    if billing_cycle == "fortnightly":
        base = contract_start or date(2020, 1, 1)
        delta_days = (shift_date - base).days
        if delta_days < 0:
            delta_days = 0
        fortnight_num = delta_days // 14
        period_start = base + timedelta(days=fortnight_num * 14)
        period_end = period_start + timedelta(days=13)
        return period_start, period_end

    if billing_cycle == "monthly":
        first = shift_date.replace(day=1)
        last_day = calendar.monthrange(shift_date.year, shift_date.month)[1]
        last = shift_date.replace(day=last_day)
        return first, last

    return shift_date, shift_date


def _group_id(
    company_id: str,
    customer_id: str,
    contract_id: str,
    period_start: str,
    period_end: str,
) -> str:
    key = f"{company_id}{customer_id}{contract_id}{period_start}{period_end}"
    return hashlib.sha256(key.encode()).hexdigest()


# ── Service ───────────────────────────────────────────────────────────────────


class PendingInvoiceGroupsService:
    """Compute pending-invoice groups from live MongoDB data."""

    async def get_groups(self, business_id: str) -> PendingInvoiceGroupsResponse:
        db = get_database()
        now_iso = datetime.utcnow().isoformat() + "Z"

        # ── 1. Fetch confirmed/pending shifts ──────────────────────────────────
        shifts_raw = await db["shifts"].find(
            {
                "businessId": business_id,
                "status": "confirmed",
                "invoiceStatus": "pending",
            }
        ).to_list(length=None)

        if not shifts_raw:
            return PendingInvoiceGroupsResponse(
                companyId=business_id,
                groups=[],
                totalGroups=0,
                approvableGroups=0,
                calculatedAt=now_iso,
            )

        # ── 2. Fetch contracts and customers in batch ──────────────────────────
        contract_ids = list({
            str(s["contractId"]) for s in shifts_raw if s.get("contractId")
        })
        customer_ids = list({
            str(s["customerId"]) for s in shifts_raw if s.get("customerId")
        })

        contracts_raw = await db["contracts"].find(
            {"_id": {"$in": contract_ids}}
        ).to_list(length=None)
        contracts_by_id: Dict[str, dict] = {str(c["_id"]): c for c in contracts_raw}

        customers_raw = await db["customers"].find(
            {"_id": {"$in": customer_ids}}
        ).to_list(length=None)
        customers_by_id: Dict[str, str] = {
            str(c["_id"]): c.get("name") or c.get("companyName") or "Unknown Customer"
            for c in customers_raw
        }

        # ── 3. Build group buckets ─────────────────────────────────────────────
        # Key: (customerId, contractId, periodStart, periodEnd)
        buckets: Dict[Tuple, List[PendingShiftCalculation]] = {}
        bucket_meta: Dict[Tuple, dict] = {}

        for s in shifts_raw:
            shift_id = str(s["_id"])
            contract_id = str(s.get("contractId") or "")
            customer_id = str(s.get("customerId") or "")
            shift_date_str = s.get("date") or ""
            start_time = s.get("startTime")
            end_time = s.get("endTime") or ""
            end_date_str = s.get("endDate")
            break_taken = bool(s.get("breakTaken", False))

            # Validate basics
            if not contract_id:
                row = _make_error_shift(shift_id, shift_date_str, start_time, end_time,
                                        "Shift has no contract assigned")
                _add_to_bucket(buckets, bucket_meta, (customer_id, "", shift_date_str, shift_date_str),
                               row, business_id, customer_id, "", "—", "per_shift",
                               shift_date_str, shift_date_str, "AUD")
                continue

            contract = contracts_by_id.get(contract_id)
            if not contract:
                row = _make_error_shift(shift_id, shift_date_str, start_time, end_time,
                                        "Contract not found in database")
                _add_to_bucket(buckets, bucket_meta, (customer_id, contract_id, shift_date_str, shift_date_str),
                               row, business_id, customer_id, contract_id, "—", "per_shift",
                               shift_date_str, shift_date_str, "AUD")
                continue

            billing_cycle = contract.get("billingCycle") or "per_shift"
            rate_type = contract.get("rateType") or "fixed"
            currency = contract.get("currency") or "AUD"
            contract_start = _to_date(contract.get("startDate"))
            default_break_min = int(contract.get("defaultBreakMinutes") or 0)
            rates = contract.get("rates") or []
            position_name = contract.get("positionName") or "—"
            charge_gst = bool(contract.get("chargeGst", False))
            gst_rate_val = contract.get("gstRate")

            # Billing period
            shift_date = _to_date(shift_date_str)
            if shift_date is None:
                row = _make_error_shift(shift_id, shift_date_str, start_time, end_time,
                                        "Invalid shift date")
                _add_to_bucket(buckets, bucket_meta,
                               (customer_id, contract_id, shift_date_str, shift_date_str),
                               row, business_id, customer_id, contract_id, position_name,
                               billing_cycle, shift_date_str, shift_date_str, currency)
                continue

            period_start, period_end = _billing_period(shift_date, billing_cycle, contract_start)
            period_start_str = period_start.isoformat()
            period_end_str = period_end.isoformat()
            bucket_key = (customer_id, contract_id, period_start_str, period_end_str)

            # Gross duration
            gross_h, gross_err = _gross_hours(shift_date_str, start_time, end_date_str, end_time)

            # Applied break
            applied_break = default_break_min if break_taken else 0
            worked_h = max(
                Decimal("0"),
                gross_h - Decimal(applied_break) / Decimal(60),
            ).quantize(TWO, rounding=ROUND_HALF_UP)

            # Rate resolution
            rate, rate_err = _resolve_rate(shift_date, start_time, rate_type, rates)

            # Determine calculation status + note
            notes = []
            calc_status: ShiftCalcStatus = "ok"
            if gross_err:
                notes.append(gross_err)
                calc_status = "error"
            if rate_err:
                notes.append(rate_err)
                calc_status = "error"

            if rate is not None and worked_h < Decimal("0"):
                notes.append("Negative worked hours after break deduction")
                calc_status = "error"

            amount = (
                (worked_h * rate).quantize(TWO, rounding=ROUND_HALF_UP)
                if rate is not None and calc_status != "error"
                else Decimal("0")
            )

            row = PendingShiftCalculation(
                shiftId=shift_id,
                workDate=shift_date_str,
                description=s.get("description") or s.get("title"),
                startTime=start_time,
                endTime=end_time,
                endDate=end_date_str,
                grossDurationHours=_d2(gross_h),
                breakTaken=break_taken,
                appliedBreakMinutes=applied_break,
                workedHours=_d2(worked_h),
                rateType=rate_type,
                appliedRate=_d2(rate) if rate is not None else "0.00",
                currency=currency,
                amount=_d2(amount),
                calculationStatus=calc_status,
                calculationNote="; ".join(notes) if notes else None,
            )

            # Store GST metadata per bucket
            _add_to_bucket(
                buckets, bucket_meta, bucket_key, row,
                business_id, customer_id, contract_id, position_name,
                billing_cycle, period_start_str, period_end_str, currency,
                charge_gst=charge_gst, gst_rate=gst_rate_val,
            )

        # ── 4. Aggregate groups ────────────────────────────────────────────────
        groups: List[PendingInvoiceGroup] = []

        for bucket_key, rows in buckets.items():
            customer_id, contract_id, period_start_str, period_end_str = bucket_key
            meta = bucket_meta[bucket_key]

            total_worked = sum(
                Decimal(r.workedHours) for r in rows
            ).quantize(TWO, rounding=ROUND_HALF_UP)

            subtotal = sum(
                Decimal(r.amount) for r in rows
            ).quantize(TWO, rounding=ROUND_HALF_UP)

            charge_gst = meta.get("charge_gst", False)
            gst_rate_pct = meta.get("gst_rate")
            tax_rate_str: Optional[str] = None
            tax_amount = Decimal("0")
            if charge_gst and gst_rate_pct:
                try:
                    tax_rate = Decimal(str(gst_rate_pct)) / Decimal(100)
                    tax_amount = (subtotal * tax_rate).quantize(TWO, rounding=ROUND_HALF_UP)
                    tax_rate_str = str(Decimal(str(gst_rate_pct)).quantize(TWO))
                except (ValueError, TypeError):
                    pass

            total = (subtotal + tax_amount).quantize(TWO, rounding=ROUND_HALF_UP)

            errors: List[str] = [
                r.calculationNote
                for r in rows
                if r.calculationStatus == "error" and r.calculationNote
            ]
            warnings_list: List[str] = [
                r.calculationNote
                for r in rows
                if r.calculationStatus == "warning" and r.calculationNote
            ]

            if errors:
                group_status: PendingGroupStatus = "blocked"
            elif warnings_list:
                group_status = "warning"
            else:
                group_status = "ready"

            currency_set = {r.currency for r in rows}
            if len(currency_set) > 1:
                errors.append(f"Mixed currencies within billing group: {', '.join(sorted(currency_set))}")
                group_status = "blocked"

            is_approvable = group_status != "blocked"

            group_id = _group_id(
                meta["company_id"], customer_id, contract_id,
                period_start_str, period_end_str,
            )

            groups.append(PendingInvoiceGroup(
                groupId=group_id,
                companyId=meta["company_id"],
                customerId=customer_id,
                customerName=customers_by_id.get(customer_id, "Unknown Customer"),
                contractId=contract_id,
                contractTitle=meta["contract_title"],
                billingCycle=meta["billing_cycle"],
                periodStart=period_start_str,
                periodEnd=period_end_str,
                currency=meta["currency"],
                shiftCount=len(rows),
                totalWorkedHours=_d2(total_worked),
                subtotal=_d2(subtotal),
                taxRate=tax_rate_str,
                taxAmount=_d2(tax_amount),
                total=_d2(total),
                status=group_status,
                warnings=warnings_list,
                errors=errors,
                isApprovable=is_approvable,
                shiftDetails=rows,
                calculatedAt=now_iso,
            ))

        approvable = sum(1 for g in groups if g.isApprovable)

        return PendingInvoiceGroupsResponse(
            companyId=business_id,
            groups=groups,
            totalGroups=len(groups),
            approvableGroups=approvable,
            calculatedAt=now_iso,
        )


# ── Private helpers ───────────────────────────────────────────────────────────


def _make_error_shift(
    shift_id: str,
    work_date: str,
    start_time: Optional[str],
    end_time: Optional[str],
    note: str,
) -> PendingShiftCalculation:
    return PendingShiftCalculation(
        shiftId=shift_id,
        workDate=work_date,
        startTime=start_time,
        endTime=end_time,
        grossDurationHours="0.00",
        breakTaken=False,
        appliedBreakMinutes=0,
        workedHours="0.00",
        rateType="fixed",
        appliedRate="0.00",
        currency="AUD",
        amount="0.00",
        calculationStatus="error",
        calculationNote=note,
    )


def _add_to_bucket(
    buckets: Dict,
    bucket_meta: Dict,
    key: Tuple,
    row: PendingShiftCalculation,
    company_id: str,
    customer_id: str,
    contract_id: str,
    contract_title: str,
    billing_cycle: str,
    period_start: str,
    period_end: str,
    currency: str,
    charge_gst: bool = False,
    gst_rate: Any = None,
) -> None:
    if key not in buckets:
        buckets[key] = []
        bucket_meta[key] = {
            "company_id": company_id,
            "customer_id": customer_id,
            "contract_id": contract_id,
            "contract_title": contract_title,
            "billing_cycle": billing_cycle,
            "period_start": period_start,
            "period_end": period_end,
            "currency": currency,
            "charge_gst": charge_gst,
            "gst_rate": gst_rate,
        }
    buckets[key].append(row)

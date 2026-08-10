from collections import defaultdict
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Optional

from bson import ObjectId
from pydantic import BaseModel

from app.database.mongo import get_database


class CashFlowPoint(BaseModel):
    label: str
    received: str
    expected: str
    projected: str


class CustomerPaymentBehavior(BaseModel):
    customerId: str
    customerName: str
    paidInvoices: int
    averagePaymentDays: Optional[str]
    averageDelayDays: Optional[str]
    maximumDelayDays: Optional[int]
    onTimeRate: Optional[str]
    paymentFrequencyDays: Optional[str]
    outstanding: str
    overdue: str
    risk: str


class CashFlowResponse(BaseModel):
    currency: str
    received: str
    expectedNext7Days: str
    expectedNext15Days: str
    expectedNext30Days: str
    outstanding: str
    overdue: str
    timeline: list[CashFlowPoint]
    customers: list[CustomerPaymentBehavior]
    calculatedAt: str


def _as_date(value) -> Optional[date]:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10]) if value else None
    except (TypeError, ValueError):
        return None


def _money(value: Decimal) -> str:
    return str(value.quantize(Decimal("0.01")))


async def get_cash_flow(
    business_id: str,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    customer_id: Optional[str] = None,
) -> CashFlowResponse:
    db = get_database()
    invoices = await db["invoices"].find({"businessId": business_id}).to_list(length=None)
    ids = {str(item.get("customerId")) for item in invoices if item.get("customerId")}
    keys = list(ids) + [ObjectId(value) for value in ids if ObjectId.is_valid(value)]
    customer_docs = await db["customers"].find({"companyId": business_id, "_id": {"$in": keys}}).to_list(length=None)
    names = {str(item["_id"]): str(item.get("displayName") or "Unknown customer") for item in customer_docs}

    selected = [item for item in invoices if not customer_id or str(item.get("customerId") or "") == customer_id]
    paid_history = defaultdict(list)
    balances = defaultdict(lambda: [Decimal("0"), Decimal("0")])
    today = date.today()
    currency = "AUD"

    for item in selected:
        currency = str(item.get("currency") or currency)
        cid = str(item.get("customerId") or "")
        status = str(item.get("status") or "approved")
        total = Decimal(str(item.get("total") or "0"))
        balance = Decimal(str(item.get("balance") or total))
        due = _as_date(item.get("dueDate"))
        paid = _as_date(item.get("paidAt"))
        sent = _as_date(item.get("sentAt")) or _as_date(item.get("invoiceDate")) or _as_date(item.get("createdAt"))
        if status == "paid" and paid and sent:
            paid_history[cid].append((paid, (paid - sent).days, (paid - due).days if due else 0, total))
        if status not in ("paid", "voided") and balance > 0:
            balances[cid][0] += balance
            if due and due < today:
                balances[cid][1] += balance

    average_delay = {}
    for cid, history in paid_history.items():
        average_delay[cid] = sum(row[2] for row in history) / len(history)

    received = Decimal("0")
    next7 = Decimal("0")
    next15 = Decimal("0")
    next30 = Decimal("0")
    outstanding = Decimal("0")
    overdue = Decimal("0")
    timeline = defaultdict(lambda: [Decimal("0"), Decimal("0"), Decimal("0")])

    for item in selected:
        status = str(item.get("status") or "approved")
        cid = str(item.get("customerId") or "")
        total = Decimal(str(item.get("total") or "0"))
        balance = Decimal(str(item.get("balance") or total))
        paid = _as_date(item.get("paidAt"))
        due = _as_date(item.get("dueDate"))
        if status == "paid" and paid:
            if (not date_from or paid.isoformat() >= date_from) and (not date_to or paid.isoformat() <= date_to):
                received += Decimal(str(item.get("amountPaid") or total))
                timeline[paid.strftime("%Y-%m")][0] += Decimal(str(item.get("amountPaid") or total))
        if status in ("paid", "voided") or balance <= 0:
            continue
        outstanding += balance
        if due:
            if due < today:
                overdue += balance
            days = (due - today).days
            if 0 <= days <= 7:
                next7 += balance
            if 0 <= days <= 15:
                next15 += balance
            if 0 <= days <= 30:
                next30 += balance
            if (not date_from or due.isoformat() >= date_from) and (not date_to or due.isoformat() <= date_to):
                timeline[due.strftime("%Y-%m")][1] += balance
            projected = due + timedelta(days=max(0, round(average_delay.get(cid, 0))))
            if (not date_from or projected.isoformat() >= date_from) and (not date_to or projected.isoformat() <= date_to):
                timeline[projected.strftime("%Y-%m")][2] += balance

    behaviors = []
    all_customer_ids = set(balances) | set(paid_history)
    for cid in all_customer_ids:
        history = sorted(paid_history.get(cid, []), key=lambda row: row[0])
        payment_days = [row[1] for row in history]
        delays = [row[2] for row in history]
        frequencies = [(history[index][0] - history[index - 1][0]).days for index in range(1, len(history))]
        avg_delay = (sum(delays) / len(delays)) if delays else None
        on_time = (sum(1 for value in delays if value <= 0) / len(delays) * 100) if delays else None
        current_outstanding, current_overdue = balances[cid]
        risk = "unknown"
        if delays:
            risk = "high" if current_overdue > 0 or (avg_delay or 0) > 14 else ("medium" if (avg_delay or 0) > 0 or (on_time or 0) < 80 else "low")
        elif current_overdue > 0:
            risk = "high"
        behaviors.append(CustomerPaymentBehavior(
            customerId=cid,
            customerName=names.get(cid, "Unknown customer"),
            paidInvoices=len(history),
            averagePaymentDays=_money(Decimal(str(sum(payment_days) / len(payment_days)))) if payment_days else None,
            averageDelayDays=_money(Decimal(str(avg_delay))) if avg_delay is not None else None,
            maximumDelayDays=max(delays) if delays else None,
            onTimeRate=_money(Decimal(str(on_time))) if on_time is not None else None,
            paymentFrequencyDays=_money(Decimal(str(sum(frequencies) / len(frequencies)))) if frequencies else None,
            outstanding=_money(current_outstanding),
            overdue=_money(current_overdue),
            risk=risk,
        ))

    return CashFlowResponse(
        currency=currency,
        received=_money(received),
        expectedNext7Days=_money(next7),
        expectedNext15Days=_money(next15),
        expectedNext30Days=_money(next30),
        outstanding=_money(outstanding),
        overdue=_money(overdue),
        timeline=[CashFlowPoint(label=label, received=_money(values[0]), expected=_money(values[1]), projected=_money(values[2])) for label, values in sorted(timeline.items())],
        customers=sorted(behaviors, key=lambda item: (item.risk != "high", Decimal(item.overdue) * -1, item.customerName)),
        calculatedAt=datetime.utcnow().isoformat() + "Z",
    )

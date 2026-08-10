from collections import defaultdict
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from bson import ObjectId
from pydantic import BaseModel

from app.database.mongo import get_database


class ChartPoint(BaseModel):
    label: str
    totalIncome: str
    paid: str
    outstanding: str


class BreakdownPoint(BaseModel):
    label: str
    value: str
    count: int


class CustomerPoint(BaseModel):
    label: str
    totalIncome: str
    paid: str
    outstanding: str
    overdue: str
    count: int


class PaymentPoint(BaseModel):
    label: str
    paid: str
    count: int


class CustomerTimelinePoint(BaseModel):
    label: str
    customer: str
    totalIncome: str
    paid: str
    outstanding: str
    share: str


class CustomerGrowthPoint(BaseModel):
    label: str
    current: str
    previous: str
    growthRate: str


class ReceivablesSummary(BaseModel):
    currency: str
    totalIncome: str
    outstanding: str
    paid: str
    invoiceCount: int
    trend: list[ChartPoint]
    statuses: list[BreakdownPoint]
    customers: list[CustomerPoint]
    aging: list[BreakdownPoint]
    paymentTrend: list[PaymentPoint]
    overdue: str
    overdueCount: int
    collectionRate: str
    customerTimeline: list[CustomerTimelinePoint]
    customerGrowth: list[CustomerGrowthPoint]


def _money(value: Decimal) -> str:
    return str(value.quantize(Decimal("0.01")))


async def get_receivables_summary(
    business_id: str,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    customer_id: Optional[str] = None,
    invoice_status: Optional[str] = None,
    search: Optional[str] = None,
) -> ReceivablesSummary:
    db = get_database()
    invoices = await db["invoices"].find({"businessId": business_id}).to_list(length=None)
    customer_ids = {str(item.get("customerId")) for item in invoices if item.get("customerId")}
    customer_keys = list(customer_ids) + [ObjectId(value) for value in customer_ids if ObjectId.is_valid(value)]
    customer_docs = await db["customers"].find({
        "companyId": business_id,
        "_id": {"$in": customer_keys},
    }).to_list(length=None)
    customer_names = {str(item["_id"]): str(item.get("displayName") or "Unknown customer") for item in customer_docs}
    today = date.today().isoformat()
    needle = (search or "").strip().lower()
    selected = []

    for invoice in invoices:
        period_start = str(invoice.get("periodStart") or "")[:10]
        period_end = str(invoice.get("periodEnd") or period_start)[:10]
        if date_from and period_end < date_from:
            continue
        if date_to and period_start > date_to:
            continue
        if customer_id and str(invoice.get("customerId") or "") != customer_id:
            continue
        customer_name = str(invoice.get("customerName") or customer_names.get(str(invoice.get("customerId") or ""), "Unknown customer"))
        if needle and needle not in str(invoice.get("invoiceNumber") or "").lower() and needle not in customer_name.lower():
            continue

        status = str(invoice.get("status") or "approved")
        balance = Decimal(str(invoice.get("balance") or invoice.get("total") or "0"))
        effective_status = "overdue" if status == "sent" and balance > 0 and str(invoice.get("dueDate") or "")[:10] < today else ("approved" if status == "outstanding" else status)
        if invoice_status and effective_status != invoice_status:
            continue
        selected.append((invoice, effective_status, customer_name))

    total_income = Decimal("0")
    paid = Decimal("0")
    outstanding = Decimal("0")
    trend = defaultdict(lambda: [Decimal("0"), Decimal("0"), Decimal("0")])
    statuses = defaultdict(lambda: [Decimal("0"), 0])
    customers = defaultdict(lambda: [Decimal("0"), Decimal("0"), Decimal("0"), Decimal("0"), 0])
    aging = {
        "Current": [Decimal("0"), 0],
        "1–30 days": [Decimal("0"), 0],
        "31–60 days": [Decimal("0"), 0],
        "61–90 days": [Decimal("0"), 0],
        "90+ days": [Decimal("0"), 0],
    }
    payment_trend = defaultdict(lambda: [Decimal("0"), 0])
    customer_timeline = defaultdict(lambda: [Decimal("0"), Decimal("0"), Decimal("0")])
    month_totals = defaultdict(lambda: Decimal("0"))
    overdue_total = Decimal("0")
    overdue_count = 0
    currency = "AUD"

    for invoice, effective_status, customer_name in selected:
        currency = str(invoice.get("currency") or currency)
        total = Decimal(str(invoice.get("total") or "0"))
        amount_paid = Decimal(str(invoice.get("amountPaid") or "0"))
        balance = Decimal(str(invoice.get("balance") or total))
        active_total = Decimal("0") if effective_status == "voided" else total
        active_paid = Decimal("0") if effective_status == "voided" else amount_paid
        active_balance = Decimal("0") if effective_status == "voided" else balance
        total_income += active_total
        paid += active_paid
        outstanding += active_balance

        month = str(invoice.get("periodStart") or invoice.get("invoiceDate") or "Unknown")[:7]
        trend[month][0] += active_total
        trend[month][1] += active_paid
        trend[month][2] += active_balance
        statuses[effective_status][0] += active_total
        statuses[effective_status][1] += 1
        customers[customer_name][0] += active_total
        customers[customer_name][1] += active_paid
        customers[customer_name][2] += active_balance
        customers[customer_name][4] += 1
        customer_timeline[(month, customer_name)][0] += active_total
        customer_timeline[(month, customer_name)][1] += active_paid
        customer_timeline[(month, customer_name)][2] += active_balance
        month_totals[month] += active_total

        if active_paid > 0:
            paid_raw = invoice.get("paidAt")
            payment_month = (paid_raw.date().isoformat() if isinstance(paid_raw, datetime) else str(paid_raw or month))[:7]
            payment_trend[payment_month][0] += active_paid
            payment_trend[payment_month][1] += 1

        if active_balance > 0:
            due_raw = str(invoice.get("dueDate") or "")[:10]
            try:
                due_date = date.fromisoformat(due_raw) if due_raw else None
            except ValueError:
                due_date = None
            days_overdue = (date.today() - due_date).days if due_date else 0
            bucket = "Current"
            if days_overdue > 90:
                bucket = "90+ days"
            elif days_overdue > 60:
                bucket = "61–90 days"
            elif days_overdue > 30:
                bucket = "31–60 days"
            elif days_overdue > 0:
                bucket = "1–30 days"
            aging[bucket][0] += active_balance
            aging[bucket][1] += 1
            if days_overdue > 0:
                overdue_total += active_balance
                overdue_count += 1
                customers[customer_name][3] += active_balance

    customer_periods = defaultdict(dict)
    for (month, customer_name), values in customer_timeline.items():
        customer_periods[customer_name][month] = values[0]
    growth = []
    for customer_name, periods in customer_periods.items():
        ordered = sorted(periods.items())
        current = ordered[-1][1]
        previous = ordered[-2][1] if len(ordered) > 1 else Decimal("0")
        rate = ((current - previous) / previous * Decimal("100")) if previous else Decimal("0")
        growth.append(CustomerGrowthPoint(label=customer_name, current=_money(current), previous=_money(previous), growthRate=_money(rate)))

    return ReceivablesSummary(
        currency=currency,
        totalIncome=_money(total_income),
        outstanding=_money(outstanding),
        paid=_money(paid),
        invoiceCount=len(selected),
        trend=[ChartPoint(label=key, totalIncome=_money(values[0]), paid=_money(values[1]), outstanding=_money(values[2])) for key, values in sorted(trend.items())],
        statuses=[BreakdownPoint(label=key.replace("_", " ").title(), value=_money(values[0]), count=values[1]) for key, values in sorted(statuses.items())],
        customers=[CustomerPoint(label=key, totalIncome=_money(values[0]), paid=_money(values[1]), outstanding=_money(values[2]), overdue=_money(values[3]), count=values[4]) for key, values in sorted(customers.items(), key=lambda item: item[1][0], reverse=True)[:8]],
        aging=[BreakdownPoint(label=key, value=_money(values[0]), count=values[1]) for key, values in aging.items()],
        paymentTrend=[PaymentPoint(label=key, paid=_money(values[0]), count=values[1]) for key, values in sorted(payment_trend.items())],
        overdue=_money(overdue_total),
        overdueCount=overdue_count,
        collectionRate=_money((paid / total_income * Decimal("100")) if total_income else Decimal("0")),
        customerTimeline=[CustomerTimelinePoint(label=month, customer=customer_name, totalIncome=_money(values[0]), paid=_money(values[1]), outstanding=_money(values[2]), share=_money((values[0] / month_totals[month] * Decimal("100")) if month_totals[month] else Decimal("0"))) for (month, customer_name), values in sorted(customer_timeline.items())],
        customerGrowth=sorted(growth, key=lambda item: Decimal(item.current), reverse=True)[:8],
    )

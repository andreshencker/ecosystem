from datetime import date, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.contracts.invoices.cash_flow import get_cash_flow


def _db(invoices, customers):
    db = MagicMock()

    def collection(name):
        rows = invoices if name == "invoices" else customers
        cursor = MagicMock()
        cursor.to_list = AsyncMock(return_value=rows)
        result = MagicMock()
        result.find.return_value = cursor
        return result

    db.__getitem__ = MagicMock(side_effect=collection)
    return db


@pytest.mark.asyncio
async def test_cash_flow_received_forecast_and_customer_behavior():
    today = date.today()
    customer_id = "507f1f77bcf86cd799439011"
    invoices = [
        {
            "businessId": "biz", "customerId": customer_id, "customerName": "Acme",
            "currency": "AUD", "status": "paid", "total": "100.00", "amountPaid": "100.00", "balance": "0.00",
            "sentAt": datetime.combine(today - timedelta(days=10), datetime.min.time()),
            "dueDate": (today - timedelta(days=3)).isoformat(),
            "paidAt": datetime.combine(today - timedelta(days=1), datetime.min.time()),
        },
        {
            "businessId": "biz", "customerId": customer_id, "customerName": "Acme",
            "currency": "AUD", "status": "sent", "total": "250.00", "balance": "250.00",
            "dueDate": (today + timedelta(days=5)).isoformat(),
        },
        {
            "businessId": "biz", "customerId": customer_id, "customerName": "Acme",
            "currency": "AUD", "status": "sent", "total": "80.00", "balance": "80.00",
            "dueDate": (today - timedelta(days=2)).isoformat(),
        },
    ]
    customers = [{"_id": customer_id, "displayName": "Acme"}]

    with patch("app.contracts.invoices.cash_flow.get_database", return_value=_db(invoices, customers)):
        result = await get_cash_flow("biz", (today - timedelta(days=30)).isoformat(), (today + timedelta(days=30)).isoformat())

    assert result.received == "100.00"
    assert result.expectedNext7Days == "250.00"
    assert result.outstanding == "330.00"
    assert result.overdue == "80.00"
    assert len(result.customers) == 1
    assert result.customers[0].averagePaymentDays == "9.00"
    assert result.customers[0].averageDelayDays == "2.00"
    assert result.customers[0].risk == "high"

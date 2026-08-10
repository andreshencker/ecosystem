from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.contracts.invoices.document import get_invoice_document


def _collection(find_one=None, rows=None):
    collection = MagicMock()
    collection.find_one = AsyncMock(return_value=find_one)
    cursor = MagicMock()
    cursor.to_list = AsyncMock(return_value=rows or [])
    collection.find.return_value = cursor
    return collection


@pytest.mark.asyncio
async def test_builds_live_document_from_approved_invoice():
    collections = {
        "invoices": _collection(find_one={
            "_id": "invoice1", "businessId": "biz1", "customerId": "customer1",
            "contractId": "contract1", "invoiceNumber": "12", "createdAt": "2026-08-09",
            "dueDate": "2026-08-23", "currency": "AUD", "status": "approved",
            "shiftIds": ["shift1"], "additionalConcepts": [], "subtotal": "400.00",
            "taxAmount": "0.00", "total": "400.00",
        }),
        "contracts": _collection(find_one={
            "_id": "contract1", "businessId": "biz1", "positionName": "Technician",
            "invoiceDescription": "Technical services", "rateType": "fixed",
            "rates": [{"days": ["all"], "hourlyRate": 50}], "minimumHours": 4,
            "defaultBreakMinutes": 0, "chargeGst": False, "paymentTermsDays": 14,
        }),
        "customers": _collection(find_one={
            "_id": "customer1", "companyId": "biz1", "displayName": "Customer",
            "contact": {"email": "billing@example.com"},
        }),
        "businesses": _collection(find_one={
            "_id": "biz1", "businessName": "Supplier", "abn": "12345678901",
            "depositAccount": {"bsb": "062000", "accountNumber": "123456"},
        }),
        "shifts": _collection(rows=[{
            "_id": "shift1", "businessId": "biz1", "date": "2026-08-03",
            "startTime": "09:00", "endTime": "17:00", "breakTaken": False,
        }]),
    }
    database = MagicMock()
    database.__getitem__ = MagicMock(side_effect=lambda name: collections[name])

    with patch("app.contracts.invoices.document.get_database", return_value=database):
        result = await get_invoice_document("biz1", "invoice1")

    assert result["invoice"]["invoiceDate"] == "2026-08-09"
    assert result["workedHours"][0] == {
        "shiftId": "shift1", "workDate": "2026-08-03",
        "description": "Technical services", "startTime": "09:00", "endTime": "17:00",
        "workedHours": "8.00", "hourlyRate": "50.00", "amount": "400.00",
    }
    assert result["totals"]["total"] == "400.00"
    assert result["paymentInformation"]["bsb"] == "062000"

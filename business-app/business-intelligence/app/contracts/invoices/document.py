"""Live document payload for an approved shift invoice.

Reads operational MongoDB without writing. Invoice totals remain authoritative;
worked-hour rows are reconstructed with the same BI helpers used at approval.
"""
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, Optional

from fastapi import HTTPException, status

from app.database.mongo import get_database
from app.contracts.invoices.pending_groups.service import (
    _d2,
    _gross_hours,
    _mongo_id_candidates,
    _resolve_rate,
    _to_date,
)


def _address(value: Any) -> Optional[str]:
    if not isinstance(value, dict):
        return None
    parts = [
        value.get("line1"), value.get("line2"), value.get("city"),
        value.get("state"), value.get("postalCode"), value.get("country"),
    ]
    text = ", ".join(str(part).strip() for part in parts if part)
    return text or None


async def get_invoice_document(business_id: str, invoice_id: str) -> Dict[str, Any]:
    db = get_database()
    invoice = await db["invoices"].find_one({
        "businessId": business_id,
        "_id": {"$in": _mongo_id_candidates([invoice_id])},
    })
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    contract_id = str(invoice.get("contractId") or "")
    customer_id = str(invoice.get("customerId") or "")
    contract = await db["contracts"].find_one({
        "businessId": business_id,
        "_id": {"$in": _mongo_id_candidates([contract_id])},
    }) or {}
    customer = await db["customers"].find_one({
        "companyId": business_id,
        "_id": {"$in": _mongo_id_candidates([customer_id])},
    }) or {}
    business = await db["businesses"].find_one({
        "_id": {"$in": _mongo_id_candidates([business_id])},
    }) or {}

    shift_ids = [str(value) for value in invoice.get("shiftIds", [])]
    shifts = await db["shifts"].find({
        "businessId": business_id,
        "_id": {"$in": _mongo_id_candidates(shift_ids)},
    }).to_list(length=None)
    order = {value: index for index, value in enumerate(shift_ids)}
    shifts.sort(key=lambda row: order.get(str(row.get("_id")), len(order)))

    rate_type = contract.get("rateType") or "fixed"
    rates = contract.get("rates") or []
    break_minutes = int(contract.get("defaultBreakMinutes") or 0)
    minimum_hours = Decimal(str(contract.get("minimumHours") or 0))
    concept = contract.get("invoiceDescription") or contract.get("positionName") or "Services"
    line_items = []
    for shift in shifts:
        shift_date = str(shift.get("date") or "")[:10]
        gross, error = _gross_hours(
            shift_date,
            shift.get("startTime") or "",
            shift.get("endDate"),
            shift.get("endTime") or "",
        )
        worked = max(Decimal("0"), gross - (
            Decimal(break_minutes) / Decimal(60)
            if shift.get("breakTaken") else Decimal("0")
        ))
        billable = max(worked, minimum_hours)
        parsed_date = _to_date(shift_date)
        rate, rate_error = _resolve_rate(parsed_date, shift.get("startTime"), rate_type, rates) if parsed_date else (None, "Invalid date")
        if error or rate_error or rate is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Cannot build invoice line for shift {shift.get('_id')}: {error or rate_error}",
            )
        line_items.append({
            "shiftId": str(shift.get("_id")),
            "workDate": shift_date,
            "description": concept,
            "startTime": shift.get("startTime"),
            "endTime": shift.get("endTime"),
            "workedHours": _d2(billable),
            "hourlyRate": _d2(rate),
            "amount": _d2(billable * rate),
        })

    for index, item in enumerate(invoice.get("additionalConcepts") or []):
        line_items.append({
            "shiftId": f"concept-{index + 1}",
            "workDate": str(item.get("date") or "")[:10],
            "description": item.get("concept") or "Additional concept",
            "startTime": None,
            "endTime": None,
            "workedHours": "0.00",
            "hourlyRate": "0.00",
            "amount": str(item.get("amount") or "0.00"),
        })

    contact = customer.get("contact") or {}
    deposit = business.get("depositAccount") or {}
    invoice_date_value = invoice.get("invoiceDate") or invoice.get("createdAt")
    invoice_date = (
        invoice_date_value.date().isoformat()
        if isinstance(invoice_date_value, datetime)
        else str(invoice_date_value or "")[:10]
    )
    return {
        "company": {
            "businessId": business_id,
            "companyName": business.get("businessName") or "",
            "abn": business.get("abn"),
            "address": None,
            "email": None,
            "phone": None,
        },
        "customer": {
            "customerId": customer_id,
            "customerName": invoice.get("customerName") or customer.get("displayName") or "",
            "email": contact.get("email") or customer.get("email"),
            "phone": contact.get("phone") or customer.get("phone"),
            "address": _address(customer.get("address")),
        },
        "invoice": {
            "invoiceId": str(invoice.get("_id")),
            "invoiceNumber": str(invoice.get("invoiceNumber") or ""),
            "invoiceDate": invoice_date,
            "dueDate": str(invoice.get("dueDate"))[:10] if invoice.get("dueDate") else None,
            "currency": invoice.get("currency") or "AUD",
            "status": invoice.get("status") or "approved",
            "contractId": contract_id,
            "contractTitle": contract.get("positionName"),
        },
        "workedHours": line_items,
        "totals": {
            "subtotal": str(invoice.get("subtotal") or "0.00"),
            "taxRate": str(contract.get("gstRate")) if contract.get("chargeGst") and contract.get("gstRate") is not None else None,
            "taxAmount": str(invoice.get("taxAmount") or "0.00"),
            "total": str(invoice.get("total") or "0.00"),
            "chargeGst": bool(contract.get("chargeGst")),
            "currency": invoice.get("currency") or "AUD",
        },
        "paymentInformation": {
            "bankName": None,
            "accountName": business.get("businessName"),
            "bsb": deposit.get("bsb"),
            "accountNumber": deposit.get("accountNumber"),
            "paymentReference": str(invoice.get("invoiceNumber") or ""),
            "paymentTermsDays": contract.get("paymentTermsDays"),
            "paymentDueDate": str(invoice.get("dueDate"))[:10] if invoice.get("dueDate") else None,
        },
        "notes": {"invoiceNotes": None, "paymentNotes": None, "terms": None},
        "metadata": {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "contractVersion": "2.0",
            "source": "bi-live-invoice-document",
        },
    }

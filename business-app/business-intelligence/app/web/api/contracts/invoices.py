"""FastAPI router for the invoice-summary information contract."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.contracts.invoices.schema import InvoiceSummaryResponse
from app.contracts.invoices.service import InvoiceAnalyticsService
from app.database.postgres import get_db

router = APIRouter(prefix="/internal/invoices", tags=["invoices"])


@router.get(
    "/summary",
    response_model=InvoiceSummaryResponse,
    summary="Invoice analytics summary (internal — requires x-internal-service-token)",
)
async def get_invoice_summary(
    businessId: str = Query(..., description="businessId of the tenant"),
    dateFrom: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    dateTo: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    currency: str = Query("AUD", description="ISO 4217 currency filter"),
    customerId: Optional[str] = Query(None, description="Filter by customer"),
    db: AsyncSession = Depends(get_db),
) -> InvoiceSummaryResponse:
    if not businessId.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="businessId is required",
        )

    service = InvoiceAnalyticsService(db)
    return await service.get_summary(
        business_id=businessId.strip(),
        date_from=dateFrom,
        date_to=dateTo,
        currency=currency,
        customer_id=customerId,
    )

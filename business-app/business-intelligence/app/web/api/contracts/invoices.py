"""FastAPI router for invoice information contracts."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.contracts.invoices.schema import InvoiceSummaryResponse
from app.contracts.invoices.service import InvoiceAnalyticsService
from app.contracts.invoices.pending_groups.schema import PendingInvoiceGroupsResponse
from app.contracts.invoices.pending_groups.service import PendingInvoiceGroupsService
from app.database.postgres import get_db
from app.contracts.invoices.receivables import ReceivablesSummary, get_receivables_summary
from app.contracts.invoices.cash_flow import CashFlowResponse, get_cash_flow
from app.contracts.invoices.document import get_invoice_document

router = APIRouter(prefix="/internal/invoices", tags=["invoices"])


@router.get("/cash-flow", response_model=CashFlowResponse)
async def cash_flow(
    businessId: str = Query(...),
    dateFrom: Optional[str] = Query(None),
    dateTo: Optional[str] = Query(None),
    customerId: Optional[str] = Query(None),
) -> CashFlowResponse:
    return await get_cash_flow(businessId.strip(), dateFrom, dateTo, customerId)


@router.get("/receivables-summary", response_model=ReceivablesSummary)
async def receivables_summary(
    businessId: str = Query(...),
    dateFrom: Optional[str] = Query(None),
    dateTo: Optional[str] = Query(None),
    customerId: Optional[str] = Query(None),
    invoiceStatus: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
) -> ReceivablesSummary:
    return await get_receivables_summary(
        businessId.strip(), dateFrom, dateTo, customerId, invoiceStatus, search
    )


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


@router.get(
    "/pending-groups",
    response_model=PendingInvoiceGroupsResponse,
    summary="Pending invoice groups — real-time BI calculation (requires x-internal-service-token)",
    description=(
        "Returns confirmed shifts with invoiceStatus=pending grouped by "
        "customer × contract × billing period. All monetary amounts, worked "
        "hours, and rate resolutions are computed fresh from MongoDB. "
        "The frontend uses this data to let the user review and approve invoices."
    ),
)
async def get_pending_invoice_groups(
    businessId: str = Query(..., description="businessId of the tenant"),
) -> PendingInvoiceGroupsResponse:
    if not businessId.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="businessId is required",
        )

    service = PendingInvoiceGroupsService()
    return await service.get_groups(business_id=businessId.strip())


@router.get("/{invoice_id}/document")
async def invoice_document(invoice_id: str, businessId: str = Query(...)):
    return await get_invoice_document(businessId.strip(), invoice_id.strip())

"""Customer contract API endpoints (internal — requires x-internal-service-token).

Exposes three endpoints:
  GET /internal/customers/summary   — existing KPI summary (unchanged)
  GET /internal/customers           — paginated list with filters and search
  GET /internal/customers/{id}      — full customer detail profile
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.contracts.customers.platform_admin_schema import (
    CustomerDetailResponse,
    CustomerListResponse,
)
from app.contracts.customers.schema import CustomerSummaryResponse
from app.contracts.customers.service import CustomerDetailService, CustomerKpiService
from app.database.postgres import get_db

router = APIRouter(prefix="/internal/customers", tags=["customers"])


@router.get(
    "/summary",
    response_model=CustomerSummaryResponse,
    summary="Customer KPI summary for a Business",
)
async def get_customer_summary(
    businessId: str = Query(..., description="businessId of the tenant"),
    period: Optional[str] = Query(None, description="Period filter YYYY-MM"),
    db: AsyncSession = Depends(get_db),
) -> CustomerSummaryResponse:
    if not businessId or not businessId.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="businessId is required",
        )
    service = CustomerKpiService(db)
    return await service.get_summary(businessId.strip(), period)


@router.get(
    "",
    response_model=CustomerListResponse,
    summary="Paginated customer list with filters — for Platform Admin",
)
async def list_customers(
    businessId: Optional[str] = Query(None, description="Filter by tenant businessId. Omit to list across all businesses."),
    page: int = Query(1, ge=1, description="1-based page number"),
    limit: int = Query(50, ge=1, le=200, description="Page size"),
    search: Optional[str] = Query(None, description="Search by name, ABN, contact name, or contact email"),
    isActive: Optional[bool] = Query(None, description="Filter by active status"),
    customerType: Optional[str] = Query(None, description="Filter by type: company | individual"),
    hasContacts: Optional[bool] = Query(None, description="Filter by whether contacts are configured"),
    hasLocations: Optional[bool] = Query(None, description="Filter by whether locations are configured"),
    hasCommunicationConfiguration: Optional[bool] = Query(None, description="Filter by whether communication purposes are configured"),
    hasDataQualityIssues: Optional[bool] = Query(None, description="Filter by whether data quality issues exist"),
    db: AsyncSession = Depends(get_db),
) -> CustomerListResponse:
    service = CustomerDetailService(db)
    return await service.list_customers(
        business_id=businessId.strip() if businessId else None,
        page=page,
        limit=limit,
        search=search.strip() if search else None,
        is_active=isActive,
        customer_type=customerType,
        has_contacts=hasContacts,
        has_locations=hasLocations,
        has_communication_configuration=hasCommunicationConfiguration,
        has_data_quality_issues=hasDataQualityIssues,
    )


@router.get(
    "/{customerId}",
    response_model=CustomerDetailResponse,
    summary="Full customer analytical profile — for Platform Admin",
)
async def get_customer_detail(
    customerId: str,
    businessId: Optional[str] = Query(None, description="businessId for tenant isolation. Recommended for security."),
    db: AsyncSession = Depends(get_db),
) -> CustomerDetailResponse:
    service = CustomerDetailService(db)
    detail = await service.get_detail(
        customer_id=customerId,
        business_id=businessId.strip() if businessId else None,
    )
    if detail is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer {customerId!r} not found",
        )
    return detail

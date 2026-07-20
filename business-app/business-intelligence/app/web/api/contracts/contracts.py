"""Contract Admin API endpoints (internal — requires x-internal-service-token).

Endpoints:
  GET /internal/contracts/admin/summary   — aggregate measures and KPIs
  GET /internal/contracts/admin           — paginated list with filters
  GET /internal/contracts/admin/{id}      — full contract detail
  GET /internal/contracts/admin/{id}/issues — support issues for one contract
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.contracts.contracts_admin.schema import (
    ContractAdminDetail,
    ContractAdminListResponse,
    ContractAdminSummaryResponse,
    ContractSupportIssueListResponse,
)
from app.contracts.contracts_admin.service import ContractAdminService
from app.database.postgres import get_db

router = APIRouter(prefix="/internal/contracts", tags=["contracts-admin"])


@router.get(
    "/admin/summary",
    response_model=ContractAdminSummaryResponse,
    summary="Contract admin summary — measures and KPIs",
)
async def get_contract_admin_summary(
    businessId: Optional[str] = Query(None, description="Tenant businessId. Omit to aggregate across all businesses (Platform Admin)."),
    status: Optional[str] = Query(None, description="Filter by status: active | inactive | finished | cancelled"),
    createdFrom: Optional[str] = Query(None, description="Created date range start (ISO date)"),
    createdTo: Optional[str] = Query(None, description="Created date range end (ISO date)"),
    db: AsyncSession = Depends(get_db),
) -> ContractAdminSummaryResponse:
    service = ContractAdminService(db)
    return await service.get_summary(
        business_id=businessId.strip() if businessId else None,
        status=status,
        created_from=createdFrom,
        created_to=createdTo,
    )


@router.get(
    "/admin",
    response_model=ContractAdminListResponse,
    summary="Paginated contract list with filters — for Platform Admin",
)
async def list_contracts_admin(
    businessId: Optional[str] = Query(None, description="Filter by tenant. Omit to list across all businesses."),
    customerId: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    workType: Optional[str] = Query(None),
    billingCycle: Optional[str] = Query(None),
    currency: Optional[str] = Query(None),
    chargeGst: Optional[bool] = Query(None),
    superEnabled: Optional[bool] = Query(None),
    holidayRulesEnabled: Optional[bool] = Query(None),
    paymentCalendarEnabled: Optional[bool] = Query(None),
    configurationStatus: Optional[str] = Query(None, description="complete | warning | invalid"),
    search: Optional[str] = Query(None, description="Search across position, description, business name, customer name"),
    startDateFrom: Optional[str] = Query(None),
    startDateTo: Optional[str] = Query(None),
    createdFrom: Optional[str] = Query(None),
    createdTo: Optional[str] = Query(None),
    updatedFrom: Optional[str] = Query(None),
    updatedTo: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    sortBy: str = Query("source_created_at"),
    sortDir: str = Query("desc"),
    db: AsyncSession = Depends(get_db),
) -> ContractAdminListResponse:
    service = ContractAdminService(db)
    return await service.list_contracts(
        business_id=businessId.strip() if businessId else None,
        page=page,
        limit=limit,
        search=search.strip() if search else None,
        customer_id=customerId,
        status=status,
        work_type=workType,
        billing_cycle=billingCycle,
        currency=currency,
        charge_gst=chargeGst,
        super_enabled=superEnabled,
        holiday_rules_enabled=holidayRulesEnabled,
        payment_calendar_enabled=paymentCalendarEnabled,
        configuration_status=configurationStatus,
        start_date_from=startDateFrom,
        start_date_to=startDateTo,
        created_from=createdFrom,
        created_to=createdTo,
        updated_from=updatedFrom,
        updated_to=updatedTo,
        sort_by=sortBy,
        sort_dir=sortDir,
    )


@router.get(
    "/admin/{contractId}",
    response_model=ContractAdminDetail,
    summary="Full contract admin detail — for Platform Admin",
)
async def get_contract_admin_detail(
    contractId: str,
    businessId: Optional[str] = Query(None, description="businessId for tenant isolation. Recommended for security."),
    db: AsyncSession = Depends(get_db),
) -> ContractAdminDetail:
    service = ContractAdminService(db)
    detail = await service.get_detail(
        contract_id=contractId,
        business_id=businessId.strip() if businessId else None,
    )
    if detail is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contract {contractId!r} not found",
        )
    return detail


@router.get(
    "/admin/{contractId}/issues",
    response_model=ContractSupportIssueListResponse,
    summary="Support issues for a single contract",
)
async def get_contract_support_issues(
    contractId: str,
    businessId: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
) -> ContractSupportIssueListResponse:
    service = ContractAdminService(db)
    result = await service.get_support_issues(
        contract_id=contractId,
        business_id=businessId.strip() if businessId else None,
    )
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contract {contractId!r} not found",
        )
    return result

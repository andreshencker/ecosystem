"""ContractAdminService — query logic for the Contract Admin dataset.

Implements four queries:
  get_summary(business_id, ...)    → ContractAdminSummaryResponse
  list_contracts(business_id, ...) → ContractAdminListResponse
  get_detail(contract_id, ...)     → ContractAdminDetail | None
  get_support_issues(contract_id)  → ContractSupportIssueListResponse | None

All calculations are performed here once. No caller recalculates them.
"""
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.contracts.contracts_admin.schema import (
    ContractAdminDetail,
    ContractAdminListItem,
    ContractAdminListResponse,
    ContractAdminSummaryResponse,
    ContractSupportIssue,
    ContractSupportIssueListResponse,
    expand_issue,
)
from app.database.repositories.contract_repository import ContractRepository
from app.models.contracts.analytical_model import FactContract


def _safe_rate(numerator: int, denominator: int) -> Optional[float]:
    """Return numerator / denominator as a float in [0, 1], or None if denominator is 0."""
    if denominator == 0:
        return None
    return round(numerator / denominator, 4)


def _map_list_item(row: FactContract) -> ContractAdminListItem:
    codes = list(row.support_issues or [])
    return ContractAdminListItem(
        contractId=row.source_id,
        businessId=row.business_id,
        businessName=row.business_name,
        customerId=row.customer_id,
        customerName=row.customer_name,
        positionName=row.position_name,
        invoiceDescription=row.invoice_description,
        workType=row.work_type,
        status=row.status,
        startDate=row.start_date,
        endDate=row.end_date,
        isOpenEnded=(row.end_date is None),
        billingCycle=row.billing_cycle,
        paymentScheduleMode="scheduled" if row.scheduled_payment_enabled else "terms",
        paymentTermsDays=row.payment_terms_days,
        scheduledPaymentDay=row.scheduled_payment_day,
        rateType=row.rate_type,
        minHourlyRate=row.min_hourly_rate,
        maxHourlyRate=row.max_hourly_rate,
        minimumHours=row.minimum_hours,
        defaultBreakMinutes=row.default_break_minutes,
        currency=row.currency,
        chargeGst=row.charge_gst,
        gstRate=row.gst_rate,
        holidayRulesEnabled=row.holiday_rules_enabled,
        holidayCalendarId=row.holiday_calendar_id,
        holidayCalendarName=row.holiday_calendar_name,
        holidayBehaviour=row.holiday_behaviour,
        holidayCalendarStatus="unknown",   # Phase 1: no dim_linked_calendar
        paymentCalendarEnabled=row.payment_calendar_enabled,
        paymentCalendarId=row.payment_calendar_id,
        paymentCalendarStatus="unknown",   # Phase 1: no dim_linked_calendar
        superannuationEnabled=row.super_enabled,
        superannuationRate=row.super_rate,
        superannuationPaymentFrequency=row.super_payment_frequency,
        configurationStatus=row.configuration_status,
        supportIssueCount=row.support_issue_count,
        supportIssueCodes=codes,
        sourceCreatedAt=row.source_created_at,
        sourceUpdatedAt=row.source_updated_at,
        syncedAt=row.synced_at,
    )


def _map_detail(row: FactContract) -> ContractAdminDetail:
    codes = list(row.support_issues or [])
    issues = [expand_issue(c) for c in codes]
    base = _map_list_item(row)
    return ContractAdminDetail(**base.model_dump(), supportIssues=issues)


class ContractAdminService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = ContractRepository(db)

    async def get_summary(
        self,
        business_id: Optional[str] = None,
        status: Optional[str] = None,
        created_from: Optional[str] = None,
        created_to: Optional[str] = None,
    ) -> ContractAdminSummaryResponse:
        """Return aggregate measures and KPIs for the given scope."""
        m = await self._repo.get_admin_summary(
            business_id,
            status=status,
            created_from=created_from,
            created_to=created_to,
        )
        total = m["total"]
        holiday = m["holiday"]
        payment_cal = m["payment_cal"]

        return ContractAdminSummaryResponse(
            businessId=business_id,
            totalContracts=total,
            activeContracts=m["active"],
            inactiveContracts=m["inactive"],
            finishedContracts=m["finished"],
            cancelledContracts=m["cancelled"],
            openEndedContracts=m["open_ended"],
            contractsWithEndDate=m["dated"],
            contractsWithGst=m["gst"],
            contractsWithSuperannuation=m["super"],
            contractsWithHolidayRules=holiday,
            contractsWithPaymentCalendar=payment_cal,
            contractsMissingCustomer=m["missing_customer"],
            contractsMissingRateConfig=m["missing_rate"],
            completeContracts=m["complete"],
            warningContracts=m["warnings"],
            invalidContracts=m["invalid"],
            # KPI rates
            activeContractRate=_safe_rate(m["active"], total),
            openEndedContractRate=_safe_rate(m["open_ended"], total),
            configurationCompletionRate=_safe_rate(m["complete"], total),
            configurationWarningRate=_safe_rate(m["warnings"], total),
            configurationInvalidRate=_safe_rate(m["invalid"], total),
            holidayCalendarCoverage=_safe_rate(m["holiday_with_cal"], holiday),
            paymentCalendarCoverage=_safe_rate(m["payment_cal_with_ref"], payment_cal),
            gstConfigurationValidity=_safe_rate(m["valid_gst"], total),
            superannuationConfigurationValidity=_safe_rate(m["valid_super"], total),
            calculatedAt=datetime.now(timezone.utc),
        )

    async def list_contracts(
        self,
        business_id: Optional[str] = None,
        *,
        page: int = 1,
        limit: int = 50,
        search: Optional[str] = None,
        customer_id: Optional[str] = None,
        status: Optional[str] = None,
        work_type: Optional[str] = None,
        billing_cycle: Optional[str] = None,
        currency: Optional[str] = None,
        charge_gst: Optional[bool] = None,
        super_enabled: Optional[bool] = None,
        holiday_rules_enabled: Optional[bool] = None,
        payment_calendar_enabled: Optional[bool] = None,
        configuration_status: Optional[str] = None,
        start_date_from: Optional[str] = None,
        start_date_to: Optional[str] = None,
        created_from: Optional[str] = None,
        created_to: Optional[str] = None,
        updated_from: Optional[str] = None,
        updated_to: Optional[str] = None,
        sort_by: str = "source_created_at",
        sort_dir: str = "desc",
    ) -> ContractAdminListResponse:
        filter_kwargs = dict(
            search=search,
            customer_id=customer_id,
            status=status,
            work_type=work_type,
            billing_cycle=billing_cycle,
            currency=currency,
            charge_gst=charge_gst,
            super_enabled=super_enabled,
            holiday_rules_enabled=holiday_rules_enabled,
            payment_calendar_enabled=payment_calendar_enabled,
            configuration_status=configuration_status,
            start_date_from=start_date_from,
            start_date_to=start_date_to,
            created_from=created_from,
            created_to=created_to,
            updated_from=updated_from,
            updated_to=updated_to,
        )

        rows = await self._repo.list_admin(
            business_id, page=page, limit=limit, sort_by=sort_by, sort_dir=sort_dir,
            **filter_kwargs,
        )
        total = await self._repo.count_admin(business_id, **filter_kwargs)

        return ContractAdminListResponse(
            businessId=business_id,
            items=[_map_list_item(r) for r in rows],
            total=total,
            page=page,
            limit=limit,
            calculatedAt=datetime.now(timezone.utc),
        )

    async def get_detail(
        self,
        contract_id: str,
        business_id: Optional[str] = None,
    ) -> Optional[ContractAdminDetail]:
        row = await self._repo.get_admin_by_id(contract_id, business_id=business_id)
        if row is None:
            return None
        return _map_detail(row)

    async def get_support_issues(
        self,
        contract_id: str,
        business_id: Optional[str] = None,
    ) -> Optional[ContractSupportIssueListResponse]:
        row = await self._repo.get_admin_by_id(contract_id, business_id=business_id)
        if row is None:
            return None
        codes = list(row.support_issues or [])
        return ContractSupportIssueListResponse(
            contractId=row.source_id,
            configurationStatus=row.configuration_status,
            supportIssueCount=row.support_issue_count,
            supportIssues=[expand_issue(c) for c in codes],
            calculatedAt=datetime.now(timezone.utc),
        )

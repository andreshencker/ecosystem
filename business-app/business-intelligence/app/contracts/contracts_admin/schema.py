"""Pydantic response schemas for the Contract Admin dataset.

ContractSupportIssue — structured representation of a single issue code.
ContractAdminListItem  — one row in the paginated contract list.
ContractAdminDetail    — full contract administrative view.
ContractAdminListResponse — paginated list wrapper.
ContractAdminSummaryResponse — aggregate metrics and KPIs.
ContractSupportIssueListResponse — issues for a single contract.

Issue codes are stable machine-readable strings. Messages and field references
are resolved here so callers never embed display logic.
"""
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel

# ─── Issue registry ───────────────────────────────────────────────────────────
# Maps stable code → {severity, field, message}.
# Severity: 'invalid' or 'warning'.

ISSUE_REGISTRY: dict = {
    "CONTRACT_MISSING_BUSINESS": {
        "severity": "invalid",
        "field": "businessId",
        "message": "Contract has no associated Business.",
    },
    "CONTRACT_MISSING_CUSTOMER": {
        "severity": "invalid",
        "field": "customerId",
        "message": "Contract has no associated Customer.",
    },
    "CONTRACT_MISSING_RATE_CONFIGURATION": {
        "severity": "invalid",
        "field": "rates",
        "message": "No rate rules are configured — at least one rate rule is required.",
    },
    "CONTRACT_INVALID_END_DATE": {
        "severity": "invalid",
        "field": "endDate",
        "message": "End date is earlier than the start date.",
    },
    "CONTRACT_MISSING_PAYMENT_DAY": {
        "severity": "invalid",
        "field": "scheduledPaymentDay",
        "message": "Scheduled payment is enabled but no payment weekday is configured.",
    },
    "CONTRACT_INVALID_GST_RATE": {
        "severity": "invalid",
        "field": "gstRate",
        "message": "GST is enabled but the GST rate is missing or zero.",
    },
    "CONTRACT_INVALID_SUPER_RATE": {
        "severity": "invalid",
        "field": "superannuationRules.rate",
        "message": "Superannuation is enabled but the rate is missing or zero.",
    },
    "CONTRACT_MISSING_HOLIDAY_CALENDAR": {
        "severity": "invalid",
        "field": "holidayRules.calendarId",
        "message": "Holiday rules are enabled but no holiday calendar is referenced.",
    },
    "CONTRACT_MISSING_PAYMENT_CALENDAR": {
        "severity": "invalid",
        "field": "paymentCalendarSubscriptionId",
        "message": "Payment calendar is enabled but no calendar reference is set.",
    },
    "CONTRACT_INACTIVE_HOLIDAY_CALENDAR": {
        "severity": "warning",
        "field": "holidayRules.calendarId",
        "message": "The referenced holiday calendar status cannot be verified (Phase 1 — no calendar dimension available).",
    },
    "CONTRACT_INACTIVE_PAYMENT_CALENDAR": {
        "severity": "warning",
        "field": "paymentCalendarSubscriptionId",
        "message": "The referenced payment calendar status cannot be verified (Phase 1 — no calendar dimension available).",
    },
}


def expand_issue(code: str) -> "ContractSupportIssue":
    """Expand a stored issue code into a structured ContractSupportIssue."""
    meta = ISSUE_REGISTRY.get(code, {
        "severity": "warning",
        "field": "unknown",
        "message": f"Unknown issue code: {code}",
    })
    return ContractSupportIssue(
        code=code,
        severity=meta["severity"],
        field=meta["field"],
        message=meta["message"],
    )


# ─── Models ───────────────────────────────────────────────────────────────────


class ContractSupportIssue(BaseModel):
    code: str
    severity: str          # 'invalid' | 'warning'
    field: str             # Dot-notation field reference
    message: str           # Human-readable description


class ContractAdminListItem(BaseModel):
    contractId: str
    businessId: str
    businessName: Optional[str] = None
    customerId: Optional[str] = None
    customerName: Optional[str] = None

    positionName: str
    invoiceDescription: Optional[str] = None
    workType: Optional[str] = None
    status: str

    startDate: Optional[date] = None
    endDate: Optional[date] = None
    isOpenEnded: bool

    billingCycle: str
    paymentScheduleMode: str             # 'terms' | 'scheduled'
    paymentTermsDays: Optional[int] = None
    scheduledPaymentDay: Optional[str] = None

    rateType: str
    minHourlyRate: Optional[Decimal] = None
    maxHourlyRate: Optional[Decimal] = None
    minimumHours: Optional[Decimal] = None
    defaultBreakMinutes: Optional[int] = None

    currency: Optional[str] = None
    chargeGst: bool
    gstRate: Optional[Decimal] = None

    holidayRulesEnabled: bool
    holidayCalendarId: Optional[str] = None
    holidayCalendarName: Optional[str] = None
    holidayBehaviour: Optional[str] = None
    holidayCalendarStatus: str           # 'unknown' in Phase 1

    paymentCalendarEnabled: bool
    paymentCalendarId: Optional[str] = None
    paymentCalendarStatus: str           # 'unknown' in Phase 1

    superannuationEnabled: bool
    superannuationRate: Optional[Decimal] = None
    superannuationPaymentFrequency: Optional[str] = None

    configurationStatus: str             # 'complete' | 'warning' | 'invalid'
    supportIssueCount: int
    supportIssueCodes: List[str]

    sourceCreatedAt: Optional[datetime] = None
    sourceUpdatedAt: Optional[datetime] = None
    syncedAt: Optional[datetime] = None


class ContractAdminDetail(ContractAdminListItem):
    """Full Contract admin view — includes expanded issue objects."""
    supportIssues: List[ContractSupportIssue]


class ContractAdminListResponse(BaseModel):
    businessId: Optional[str] = None
    items: List[ContractAdminListItem]
    total: int
    page: int
    limit: int
    datasetVersion: str = "1.0"
    calculatedAt: datetime


class ContractAdminSummaryResponse(BaseModel):
    businessId: Optional[str] = None

    # Counts
    totalContracts: int
    activeContracts: int
    inactiveContracts: int
    finishedContracts: int
    cancelledContracts: int
    openEndedContracts: int
    contractsWithEndDate: int
    contractsWithGst: int
    contractsWithSuperannuation: int
    contractsWithHolidayRules: int
    contractsWithPaymentCalendar: int
    contractsMissingCustomer: int
    contractsMissingRateConfig: int

    # Configuration health counts
    completeContracts: int
    warningContracts: int
    invalidContracts: int

    # KPI rates (null when denominator is zero)
    activeContractRate: Optional[float] = None
    openEndedContractRate: Optional[float] = None
    configurationCompletionRate: Optional[float] = None
    configurationWarningRate: Optional[float] = None
    configurationInvalidRate: Optional[float] = None
    holidayCalendarCoverage: Optional[float] = None
    paymentCalendarCoverage: Optional[float] = None
    gstConfigurationValidity: Optional[float] = None
    superannuationConfigurationValidity: Optional[float] = None

    datasetVersion: str = "1.0"
    calculatedAt: datetime


class ContractSupportIssueListResponse(BaseModel):
    contractId: str
    configurationStatus: str
    supportIssueCount: int
    supportIssues: List[ContractSupportIssue]
    calculatedAt: datetime

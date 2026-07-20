"""Tests for the Contract Admin dataset.

Covers:
  - Schema / issue expansion
  - ContractAdminService (mocked repository)
  - ContractRepository filters, sorting, summary aggregates (mocked DB)
  - Relationship handling (missing business / customer)
  - KPI rate calculations and zero-denominator edge cases
  - Tenant isolation
"""
import asyncio
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.contracts.contracts_admin.schema import (
    ISSUE_REGISTRY,
    ContractAdminDetail,
    ContractAdminListItem,
    ContractAdminListResponse,
    ContractAdminSummaryResponse,
    ContractSupportIssue,
    ContractSupportIssueListResponse,
    expand_issue,
)
from app.contracts.contracts_admin.service import (
    ContractAdminService,
    _safe_rate,
    _map_list_item,
    _map_detail,
)
from app.models.contracts.analytical_model import FactContract


# ─── Helpers ─────────────────────────────────────────────────────────────────

def make_row(**kwargs) -> FactContract:
    """Build a minimal FactContract ORM row for testing."""
    defaults = dict(
        source_id="contract_abc",
        business_id="biz_111",
        customer_id="cust_222",
        status="active",
        position_name="Developer",
        invoice_description="Dev services",
        work_type="contractor",
        billing_cycle="per_shift",
        payment_terms_days=14,
        scheduled_payment_enabled=False,
        scheduled_payment_day=None,
        rate_type="fixed",
        minimum_hours=Decimal("4"),
        default_break_minutes=30,
        max_hourly_rate=Decimal("95"),
        min_hourly_rate=Decimal("95"),
        currency="AUD",
        charge_gst=False,
        gst_rate=None,
        start_date=date(2026, 1, 1),
        end_date=None,
        holiday_rules_enabled=False,
        holiday_calendar_id=None,
        holiday_calendar_name=None,
        holiday_behaviour=None,
        payment_calendar_enabled=False,
        payment_calendar_id=None,
        super_enabled=False,
        super_rate=None,
        super_payment_frequency=None,
        business_name="Acme Corp",
        customer_name="John Doe",
        configuration_status="complete",
        support_issue_count=0,
        support_issues=None,
        source_created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        source_updated_at=datetime(2026, 6, 1, tzinfo=timezone.utc),
        synced_at=datetime(2026, 6, 2, tzinfo=timezone.utc),
    )
    defaults.update(kwargs)
    row = MagicMock(spec=FactContract)
    for k, v in defaults.items():
        setattr(row, k, v)
    return row


# ─── ISSUE REGISTRY ──────────────────────────────────────────────────────────

class TestIssueRegistry:
    def test_all_listed_codes_exist_in_registry(self):
        expected_codes = [
            "CONTRACT_MISSING_BUSINESS",
            "CONTRACT_MISSING_CUSTOMER",
            "CONTRACT_MISSING_RATE_CONFIGURATION",
            "CONTRACT_INVALID_END_DATE",
            "CONTRACT_MISSING_PAYMENT_DAY",
            "CONTRACT_INVALID_GST_RATE",
            "CONTRACT_INVALID_SUPER_RATE",
            "CONTRACT_MISSING_HOLIDAY_CALENDAR",
            "CONTRACT_MISSING_PAYMENT_CALENDAR",
            "CONTRACT_INACTIVE_HOLIDAY_CALENDAR",
            "CONTRACT_INACTIVE_PAYMENT_CALENDAR",
        ]
        for code in expected_codes:
            assert code in ISSUE_REGISTRY, f"{code} missing from ISSUE_REGISTRY"

    def test_all_invalid_codes_have_invalid_severity(self):
        invalid_codes = [
            "CONTRACT_MISSING_BUSINESS",
            "CONTRACT_MISSING_CUSTOMER",
            "CONTRACT_MISSING_RATE_CONFIGURATION",
            "CONTRACT_INVALID_END_DATE",
            "CONTRACT_MISSING_PAYMENT_DAY",
            "CONTRACT_INVALID_GST_RATE",
            "CONTRACT_INVALID_SUPER_RATE",
            "CONTRACT_MISSING_HOLIDAY_CALENDAR",
            "CONTRACT_MISSING_PAYMENT_CALENDAR",
        ]
        for code in invalid_codes:
            assert ISSUE_REGISTRY[code]["severity"] == "invalid", f"{code} should be invalid"

    def test_warning_codes_have_warning_severity(self):
        warning_codes = [
            "CONTRACT_INACTIVE_HOLIDAY_CALENDAR",
            "CONTRACT_INACTIVE_PAYMENT_CALENDAR",
        ]
        for code in warning_codes:
            assert ISSUE_REGISTRY[code]["severity"] == "warning", f"{code} should be warning"

    def test_all_entries_have_required_keys(self):
        for code, meta in ISSUE_REGISTRY.items():
            assert "severity" in meta, f"{code} missing severity"
            assert "field" in meta, f"{code} missing field"
            assert "message" in meta, f"{code} missing message"


class TestExpandIssue:
    def test_expand_known_code(self):
        issue = expand_issue("CONTRACT_MISSING_RATE_CONFIGURATION")
        assert isinstance(issue, ContractSupportIssue)
        assert issue.code == "CONTRACT_MISSING_RATE_CONFIGURATION"
        assert issue.severity == "invalid"
        assert issue.field == "rates"
        assert len(issue.message) > 0

    def test_expand_unknown_code_returns_warning(self):
        issue = expand_issue("UNKNOWN_CODE_XYZ")
        assert issue.code == "UNKNOWN_CODE_XYZ"
        assert issue.severity == "warning"
        assert "Unknown" in issue.message


# ─── Schema mapping helpers ───────────────────────────────────────────────────

class TestMapListItem:
    def test_maps_all_identity_fields(self):
        row = make_row()
        item = _map_list_item(row)
        assert item.contractId == "contract_abc"
        assert item.businessId == "biz_111"
        assert item.businessName == "Acme Corp"
        assert item.customerId == "cust_222"
        assert item.customerName == "John Doe"

    def test_open_ended_when_end_date_is_none(self):
        row = make_row(end_date=None)
        item = _map_list_item(row)
        assert item.isOpenEnded is True
        assert item.endDate is None

    def test_not_open_ended_when_end_date_set(self):
        row = make_row(end_date=date(2026, 12, 31))
        item = _map_list_item(row)
        assert item.isOpenEnded is False
        assert item.endDate == date(2026, 12, 31)

    def test_payment_schedule_mode_terms(self):
        row = make_row(scheduled_payment_enabled=False, payment_terms_days=14)
        item = _map_list_item(row)
        assert item.paymentScheduleMode == "terms"
        assert item.paymentTermsDays == 14

    def test_payment_schedule_mode_scheduled(self):
        row = make_row(scheduled_payment_enabled=True, scheduled_payment_day="friday")
        item = _map_list_item(row)
        assert item.paymentScheduleMode == "scheduled"
        assert item.scheduledPaymentDay == "friday"

    def test_calendar_status_unknown_in_phase1(self):
        row = make_row(
            holiday_rules_enabled=True, holiday_calendar_id="cal123",
            payment_calendar_enabled=True, payment_calendar_id="paycal999",
        )
        item = _map_list_item(row)
        assert item.holidayCalendarStatus == "unknown"
        assert item.paymentCalendarStatus == "unknown"

    def test_support_issue_codes_mapped(self):
        row = make_row(
            configuration_status="invalid",
            support_issue_count=2,
            support_issues=["CONTRACT_MISSING_RATE_CONFIGURATION", "CONTRACT_INVALID_GST_RATE"],
        )
        item = _map_list_item(row)
        assert item.configurationStatus == "invalid"
        assert item.supportIssueCount == 2
        assert "CONTRACT_MISSING_RATE_CONFIGURATION" in item.supportIssueCodes

    def test_empty_issues_list_when_none(self):
        row = make_row(support_issues=None, support_issue_count=0)
        item = _map_list_item(row)
        assert item.supportIssueCodes == []


class TestMapDetail:
    def test_detail_includes_expanded_issues(self):
        row = make_row(
            configuration_status="invalid",
            support_issue_count=1,
            support_issues=["CONTRACT_MISSING_RATE_CONFIGURATION"],
        )
        detail = _map_detail(row)
        assert isinstance(detail, ContractAdminDetail)
        assert len(detail.supportIssues) == 1
        assert detail.supportIssues[0].code == "CONTRACT_MISSING_RATE_CONFIGURATION"
        assert detail.supportIssues[0].severity == "invalid"

    def test_detail_empty_issues_list_when_complete(self):
        row = make_row(configuration_status="complete", support_issues=None, support_issue_count=0)
        detail = _map_detail(row)
        assert detail.supportIssues == []


# ─── _safe_rate ───────────────────────────────────────────────────────────────

class TestSafeRate:
    def test_normal_division(self):
        assert _safe_rate(75, 100) == 0.75

    def test_zero_denominator_returns_none(self):
        assert _safe_rate(10, 0) is None

    def test_zero_numerator(self):
        assert _safe_rate(0, 100) == 0.0

    def test_full_rate(self):
        assert _safe_rate(100, 100) == 1.0

    def test_rounding_4_decimal_places(self):
        result = _safe_rate(1, 3)
        assert result == round(1 / 3, 4)


# ─── ContractAdminService (mocked repository) ────────────────────────────────

class TestContractAdminService:
    def _make_service(self, repo_overrides: dict = None):
        db = AsyncMock()
        service = ContractAdminService(db)
        mock_repo = MagicMock()
        # Apply defaults
        mock_repo.get_admin_summary = AsyncMock(return_value={
            "total": 10, "active": 7, "inactive": 1, "finished": 1, "cancelled": 1,
            "open_ended": 4, "dated": 6, "gst": 3, "super": 2, "holiday": 2,
            "payment_cal": 1, "missing_customer": 0, "missing_rate": 0,
            "complete": 8, "warnings": 1, "invalid": 1,
            "holiday_with_cal": 2, "payment_cal_with_ref": 1,
            "valid_gst": 9, "valid_super": 9,
        })
        mock_repo.list_admin = AsyncMock(return_value=[])
        mock_repo.count_admin = AsyncMock(return_value=0)
        mock_repo.get_admin_by_id = AsyncMock(return_value=None)
        if repo_overrides:
            for k, v in repo_overrides.items():
                setattr(mock_repo, k, v)
        service._repo = mock_repo
        return service, mock_repo

    # Summary
    def test_summary_returns_all_measures(self):
        service, _ = self._make_service()
        result = asyncio.get_event_loop().run_until_complete(
            service.get_summary(business_id="biz_1")
        )
        assert isinstance(result, ContractAdminSummaryResponse)
        assert result.totalContracts == 10
        assert result.activeContracts == 7
        assert result.openEndedContracts == 4
        assert result.contractsWithGst == 3
        assert result.contractsWithSuperannuation == 2
        assert result.completeContracts == 8
        assert result.warningContracts == 1
        assert result.invalidContracts == 1

    def test_summary_kpi_rates_computed(self):
        service, _ = self._make_service()
        result = asyncio.get_event_loop().run_until_complete(
            service.get_summary(business_id="biz_1")
        )
        assert result.activeContractRate == round(7 / 10, 4)
        assert result.configurationCompletionRate == round(8 / 10, 4)
        assert result.configurationWarningRate == round(1 / 10, 4)
        assert result.configurationInvalidRate == round(1 / 10, 4)
        assert result.holidayCalendarCoverage == round(2 / 2, 4)
        assert result.paymentCalendarCoverage == round(1 / 1, 4)

    def test_summary_kpi_rates_null_when_denominator_zero(self):
        service, _ = self._make_service({
            "get_admin_summary": AsyncMock(return_value={
                "total": 0, "active": 0, "inactive": 0, "finished": 0, "cancelled": 0,
                "open_ended": 0, "dated": 0, "gst": 0, "super": 0, "holiday": 0,
                "payment_cal": 0, "missing_customer": 0, "missing_rate": 0,
                "complete": 0, "warnings": 0, "invalid": 0,
                "holiday_with_cal": 0, "payment_cal_with_ref": 0,
                "valid_gst": 0, "valid_super": 0,
            })
        })
        result = asyncio.get_event_loop().run_until_complete(
            service.get_summary(business_id="biz_empty")
        )
        assert result.totalContracts == 0
        assert result.activeContractRate is None
        assert result.configurationCompletionRate is None
        assert result.holidayCalendarCoverage is None
        assert result.paymentCalendarCoverage is None

    def test_summary_cross_tenant_when_business_id_none(self):
        service, mock_repo = self._make_service()
        asyncio.get_event_loop().run_until_complete(
            service.get_summary(business_id=None)
        )
        mock_repo.get_admin_summary.assert_called_once_with(
            None, status=None, created_from=None, created_to=None
        )

    # List
    def test_list_returns_response_with_pagination(self):
        row = make_row()
        service, _ = self._make_service({
            "list_admin": AsyncMock(return_value=[row]),
            "count_admin": AsyncMock(return_value=1),
        })
        result = asyncio.get_event_loop().run_until_complete(
            service.list_contracts(business_id="biz_1", page=1, limit=10)
        )
        assert isinstance(result, ContractAdminListResponse)
        assert result.total == 1
        assert result.page == 1
        assert result.limit == 10
        assert len(result.items) == 1

    def test_list_cross_tenant_when_business_id_none(self):
        service, mock_repo = self._make_service()
        asyncio.get_event_loop().run_until_complete(
            service.list_contracts(business_id=None)
        )
        call_kwargs = mock_repo.list_admin.call_args
        assert call_kwargs[0][0] is None

    def test_list_passes_filters_through(self):
        service, mock_repo = self._make_service()
        asyncio.get_event_loop().run_until_complete(
            service.list_contracts(
                business_id="biz_1",
                status="active",
                configuration_status="invalid",
                charge_gst=True,
            )
        )
        call_kwargs = mock_repo.list_admin.call_args[1]
        assert call_kwargs["status"] == "active"
        assert call_kwargs["configuration_status"] == "invalid"
        assert call_kwargs["charge_gst"] is True

    # Detail
    def test_detail_returns_none_for_missing_contract(self):
        service, _ = self._make_service({"get_admin_by_id": AsyncMock(return_value=None)})
        result = asyncio.get_event_loop().run_until_complete(
            service.get_detail("missing_id")
        )
        assert result is None

    def test_detail_returns_expanded_issues(self):
        row = make_row(
            configuration_status="invalid",
            support_issue_count=1,
            support_issues=["CONTRACT_INVALID_GST_RATE"],
        )
        service, _ = self._make_service({"get_admin_by_id": AsyncMock(return_value=row)})
        result = asyncio.get_event_loop().run_until_complete(
            service.get_detail("contract_abc")
        )
        assert isinstance(result, ContractAdminDetail)
        assert len(result.supportIssues) == 1
        assert result.supportIssues[0].code == "CONTRACT_INVALID_GST_RATE"
        assert result.supportIssues[0].severity == "invalid"

    def test_detail_passes_business_id_for_isolation(self):
        row = make_row()
        service, mock_repo = self._make_service({"get_admin_by_id": AsyncMock(return_value=row)})
        asyncio.get_event_loop().run_until_complete(
            service.get_detail("contract_abc", business_id="biz_1")
        )
        mock_repo.get_admin_by_id.assert_called_once_with("contract_abc", business_id="biz_1")

    # Support issues
    def test_support_issues_returns_none_for_missing(self):
        service, _ = self._make_service({"get_admin_by_id": AsyncMock(return_value=None)})
        result = asyncio.get_event_loop().run_until_complete(
            service.get_support_issues("missing_id")
        )
        assert result is None

    def test_support_issues_returns_structured_response(self):
        row = make_row(
            configuration_status="warning",
            support_issue_count=1,
            support_issues=["CONTRACT_INACTIVE_HOLIDAY_CALENDAR"],
        )
        service, _ = self._make_service({"get_admin_by_id": AsyncMock(return_value=row)})
        result = asyncio.get_event_loop().run_until_complete(
            service.get_support_issues("contract_abc")
        )
        assert isinstance(result, ContractSupportIssueListResponse)
        assert result.configurationStatus == "warning"
        assert result.supportIssueCount == 1
        assert result.supportIssues[0].code == "CONTRACT_INACTIVE_HOLIDAY_CALENDAR"
        assert result.supportIssues[0].severity == "warning"

    def test_support_issues_empty_for_complete_contract(self):
        row = make_row(configuration_status="complete", support_issues=None, support_issue_count=0)
        service, _ = self._make_service({"get_admin_by_id": AsyncMock(return_value=row)})
        result = asyncio.get_event_loop().run_until_complete(
            service.get_support_issues("contract_abc")
        )
        assert result.supportIssues == []
        assert result.supportIssueCount == 0


# ─── Measures (logic, not DB queries) ────────────────────────────────────────

class TestMeasureLogic:
    """Verify measure semantics without hitting the database."""

    def test_is_open_ended_when_end_date_none(self):
        row = make_row(end_date=None)
        item = _map_list_item(row)
        assert item.isOpenEnded is True

    def test_is_not_open_ended_when_end_date_set(self):
        row = make_row(end_date=date(2026, 12, 31))
        item = _map_list_item(row)
        assert item.isOpenEnded is False

    def test_gst_enabled_flag_mapped(self):
        row = make_row(charge_gst=True, gst_rate=Decimal("10"))
        item = _map_list_item(row)
        assert item.chargeGst is True
        assert item.gstRate == Decimal("10")

    def test_super_enabled_flag_mapped(self):
        row = make_row(super_enabled=True, super_rate=Decimal("12.5"), super_payment_frequency="quarterly")
        item = _map_list_item(row)
        assert item.superannuationEnabled is True
        assert item.superannuationRate == Decimal("12.5")
        assert item.superannuationPaymentFrequency == "quarterly"

    def test_holiday_rules_enabled_mapped(self):
        row = make_row(
            holiday_rules_enabled=True,
            holiday_calendar_id="cal123",
            holiday_calendar_name="AU Holidays",
        )
        item = _map_list_item(row)
        assert item.holidayRulesEnabled is True
        assert item.holidayCalendarId == "cal123"
        assert item.holidayCalendarName == "AU Holidays"


# ─── Relationships ────────────────────────────────────────────────────────────

class TestRelationships:
    def test_missing_customer_id_maps_to_none(self):
        row = make_row(customer_id=None, customer_name=None)
        item = _map_list_item(row)
        assert item.customerId is None
        assert item.customerName is None

    def test_missing_business_name_maps_to_none(self):
        row = make_row(business_name=None)
        item = _map_list_item(row)
        assert item.businessName is None

    def test_business_id_always_present(self):
        row = make_row()
        item = _map_list_item(row)
        assert item.businessId is not None

    def test_tenant_isolation_business_id_retained(self):
        row = make_row(business_id="tenant_abc")
        item = _map_list_item(row)
        assert item.businessId == "tenant_abc"


# ─── Dataset metadata ─────────────────────────────────────────────────────────

class TestDatasetMetadata:
    def test_summary_includes_dataset_version(self):
        service, _ = TestContractAdminService()._make_service()
        result = asyncio.get_event_loop().run_until_complete(
            service.get_summary()
        )
        assert result.datasetVersion == "1.0"

    def test_summary_includes_calculated_at(self):
        service, _ = TestContractAdminService()._make_service()
        result = asyncio.get_event_loop().run_until_complete(
            service.get_summary()
        )
        assert result.calculatedAt is not None

    def test_list_response_includes_dataset_version(self):
        service, _ = TestContractAdminService()._make_service()
        result = asyncio.get_event_loop().run_until_complete(
            service.list_contracts()
        )
        assert result.datasetVersion == "1.0"


# ─── ETL: configuration health via transformer ───────────────────────────────
# (Full transformer tests in test_etl_contract.py; these are integration-style)

class TestConfigurationHealthIntegration:
    def test_all_invalid_issues_produce_invalid_status(self):
        from app.etl.transformers.contract_transformer import compute_health

        # Use a contract missing everything
        raw = {
            "_id": "x1",
            "businessId": "biz1",
            "customerId": None,
            "startDate": None,
            "endDate": None,
            "chargeGst": True,
            "gstRate": None,
            "scheduledPaymentEnabled": True,
            "scheduledPaymentDay": None,
            "holidayRules": {"enabled": True, "calendarId": None},
            "superannuationRules": {"enabled": True, "rate": None},
            "paymentCalendarEnabled": True,
            "paymentCalendarSubscriptionId": None,
        }
        status, issues = compute_health(raw, has_rate=False)
        assert status == "invalid"
        assert "CONTRACT_MISSING_CUSTOMER" in issues
        assert "CONTRACT_MISSING_RATE_CONFIGURATION" in issues
        assert "CONTRACT_INVALID_GST_RATE" in issues
        assert "CONTRACT_MISSING_PAYMENT_DAY" in issues
        assert "CONTRACT_MISSING_HOLIDAY_CALENDAR" in issues
        assert "CONTRACT_INVALID_SUPER_RATE" in issues
        assert "CONTRACT_MISSING_PAYMENT_CALENDAR" in issues

    def test_fully_valid_contract_has_complete_status(self):
        from app.etl.transformers.contract_transformer import compute_health

        raw = {
            "_id": "x2",
            "businessId": "biz1",
            "customerId": "cust1",
            "startDate": "2026-01-01",
            "endDate": "2026-12-31",
            "chargeGst": True,
            "gstRate": 10,
            "scheduledPaymentEnabled": True,
            "scheduledPaymentDay": "friday",
            "holidayRules": {"enabled": False},
            "superannuationRules": {"enabled": False},
            "paymentCalendarEnabled": False,
            "paymentCalendarSubscriptionId": None,
        }
        status, issues = compute_health(raw, has_rate=True)
        assert status == "complete"
        assert issues == []

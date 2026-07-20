"""Tests for the Invoice information contract."""
import os
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

TOKEN = "test-secret-token"


@pytest.fixture
def client():
    with patch.dict(os.environ, {"BI_INTERNAL_SERVICE_TOKEN": TOKEN}):
        from app.main import app

        # raise_server_exceptions=False so 5xx from missing DB doesn't crash
        yield TestClient(app, raise_server_exceptions=False)


def test_invoice_summary_requires_token(client):
    resp = client.get(
        "/internal/invoices/summary", params={"businessId": "x"}
    )
    assert resp.status_code == 401


def test_invoice_summary_wrong_token_is_401(client):
    resp = client.get(
        "/internal/invoices/summary",
        params={"businessId": "x"},
        headers={"x-internal-service-token": "wrong"},
    )
    assert resp.status_code == 401


def test_invoice_summary_correct_token_passes_middleware(client):
    """Correct token passes middleware. Endpoint may 5xx (no DB) but NOT 401."""
    resp = client.get(
        "/internal/invoices/summary",
        params={"businessId": "abc"},
        headers={"x-internal-service-token": TOKEN},
    )
    assert resp.status_code != 401


def test_invoice_summary_contract_structure():
    """Test the response schema structure directly."""
    from datetime import datetime, timezone

    from app.contracts.invoices.schema import (
        InvoiceScope,
        InvoiceSummaryResponse,
        InvoiceSummaryStats,
    )

    stats = InvoiceSummaryStats(
        invoiceCount=5,
        totalInvoiced="1000.00",
        totalSubtotal="900.00",
        totalTax="100.00",
        averageInvoiceValue="200.00",
        averageDaysToPayment="30.00",
    )
    resp = InvoiceSummaryResponse(
        scope=InvoiceScope(companyId="company-1", currency="AUD"),
        generatedAt=datetime.now(timezone.utc),
        summary=stats,
        statusBreakdown=[],
        metadata={
            "source": "postgresql",
            "lastSyncedAt": None,
            "currencyGroupingApplied": False,
        },
    )
    assert resp.contract == "invoice-summary"
    assert resp.version == "1.0"
    assert resp.summary.invoiceCount == 5


def test_invoice_summary_stats_from_repo():
    from app.contracts.invoices.schema import InvoiceSummaryStats

    stats = {
        "invoice_count": 3,
        "total_gross": Decimal("750.00"),
        "total_subtotal": Decimal("700.00"),
        "total_tax": Decimal("50.00"),
        "avg_gross": Decimal("250.00"),
        "avg_days_to_due": Decimal("14.00"),
        "currency": "AUD",
    }
    result = InvoiceSummaryStats.from_repo(stats)
    assert result.invoiceCount == 3
    assert result.totalInvoiced == "750.00"
    assert result.averageInvoiceValue == "250.00"


def test_invoice_summary_stats_zero_defaults():
    from app.contracts.invoices.schema import InvoiceSummaryStats

    result = InvoiceSummaryStats.from_repo({"invoice_count": 0})
    assert result.invoiceCount == 0
    assert result.totalInvoiced == "0.00"
    assert result.totalTax == "0.00"
    assert result.averageDaysToPayment == "0.00"

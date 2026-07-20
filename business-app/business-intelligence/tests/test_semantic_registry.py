"""Tests for SemanticRegistry invoice domain registration."""
import pytest


def test_bootstrap_registers_invoices():
    from app.semantic.registry.semantic_registry import SemanticRegistry

    SemanticRegistry.bootstrap()
    assert "invoices" in SemanticRegistry.all_domains()


def test_bootstrap_registers_shifts():
    from app.semantic.registry.semantic_registry import SemanticRegistry

    SemanticRegistry.bootstrap()
    assert "shifts" in SemanticRegistry.all_domains()


def test_invoice_domain_has_expected_keys():
    from app.semantic.registry.semantic_registry import SemanticRegistry

    SemanticRegistry.bootstrap()
    domain = SemanticRegistry.get_domain("invoices")
    assert "dimensions" in domain
    assert "measures" in domain
    assert "kpis" in domain
    assert "invoice_count" in domain["measures"]
    assert "total_invoiced" in domain["kpis"]


def test_missing_domain_raises():
    from app.semantic.registry.semantic_registry import SemanticRegistry

    with pytest.raises(KeyError):
        SemanticRegistry.get_domain("nonexistent_domain_xyz")


def test_invoice_dimensions_include_company():
    from app.models.invoices.dimensions import INVOICE_DIMENSIONS

    assert "company_id" in INVOICE_DIMENSIONS
    assert INVOICE_DIMENSIONS["company_id"]["column"] == "business_id"


def test_invoice_kpis_define_average_calc():
    from app.models.invoices.kpis import INVOICE_KPIS

    assert "average_invoice_value" in INVOICE_KPIS
    kpi = INVOICE_KPIS["average_invoice_value"]
    assert "denominator" in kpi
    assert kpi["denominator"] == "invoice_count"


def test_invoice_measures_use_correct_columns():
    from app.models.invoices.measures import INVOICE_MEASURES

    assert INVOICE_MEASURES["gross_amount"]["column"] == "gross_amount"
    assert INVOICE_MEASURES["invoice_count"]["column"] == "fact_id"

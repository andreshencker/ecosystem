"""Tests for the SemanticRegistry + AggregationEngine query building."""
import pytest

from app.semantic.aggregation_engine import AggregationEngine
from app.semantic.registry.semantic_registry import SemanticRegistry


@pytest.fixture(autouse=True)
def bootstrap_registry():
    SemanticRegistry.bootstrap()


def test_registry_has_all_domains():
    domains = SemanticRegistry.all_domains()
    for d in ("businesses", "users", "customers", "contracts", "shifts", "invoices"):
        assert d in domains


def test_domain_has_model_class():
    d = SemanticRegistry.get_domain("shifts")
    assert d["model_cls"] is not None
    assert d["model_cls"].__name__ == "FactShift"


def test_get_model_returns_class():
    model_cls = SemanticRegistry.get_model("invoices")
    assert model_cls.__name__ == "FactInvoice"


def test_aggregation_engine_builds_simple_query():
    agg = AggregationEngine()
    stmt, labels = agg.build_query(
        domain="invoices",
        business_id="00000000-0000-0000-0000-000000000000",
        measures=["invoice_count"],
        filters={},
        group_by=[],
    )
    assert labels == ["invoice_count"]
    sql = str(stmt.compile(compile_kwargs={"literal_binds": False}))
    assert "count" in sql.lower()
    assert "fact_invoice" in sql.lower()


def test_aggregation_engine_with_group_by():
    agg = AggregationEngine()
    stmt, labels = agg.build_query(
        domain="shifts",
        business_id="bid",
        measures=["shift_count"],
        filters={},
        group_by=["shift_status"],
    )
    assert labels == ["shift_status", "shift_count"]


def test_aggregation_engine_unknown_measure_raises():
    agg = AggregationEngine()
    with pytest.raises(ValueError, match="Unknown measure"):
        agg.build_query(
            domain="invoices",
            business_id="bid",
            measures=["nonexistent_measure"],
            filters={},
            group_by=[],
        )


def test_aggregation_engine_unknown_group_by_raises():
    agg = AggregationEngine()
    with pytest.raises(ValueError, match="Unknown dimension for group_by"):
        agg.build_query(
            domain="shifts",
            business_id="bid",
            measures=["shift_count"],
            filters={},
            group_by=["not_a_dim"],
        )


def test_aggregation_engine_unknown_filter_raises():
    agg = AggregationEngine()
    with pytest.raises(ValueError, match="Unknown dimension for filter"):
        agg.build_query(
            domain="shifts",
            business_id="bid",
            measures=["shift_count"],
            filters={"not_a_dim": "x"},
            group_by=[],
        )


def test_aggregation_engine_requires_measure_or_group_by():
    agg = AggregationEngine()
    with pytest.raises(ValueError):
        agg.build_query(
            domain="shifts",
            business_id="bid",
            measures=[],
            filters={},
            group_by=[],
        )


def test_measure_with_filter_uses_conditional_aggregation():
    """Measures with a filter should apply CASE WHEN — FactShift uses string IDs so
    literal binds are safe here.
    """
    agg = AggregationEngine()
    stmt, labels = agg.build_query(
        domain="shifts",
        business_id="bid",
        measures=["invoiced_shift_count"],
        filters={},
        group_by=[],
    )
    sql = str(stmt.compile(compile_kwargs={"literal_binds": True}))
    assert "case" in sql.lower()
    assert "invoiced" in sql.lower()


def test_isolation_filter_present():
    """Every semantic query must be scoped to a business_id."""
    agg = AggregationEngine()
    stmt, _ = agg.build_query(
        domain="invoices",
        business_id="00000000-0000-0000-0000-000000000000",
        measures=["invoice_count"],
        filters={},
        group_by=[],
    )
    sql = str(stmt.compile(compile_kwargs={"literal_binds": False}))
    assert "business_id" in sql.lower()

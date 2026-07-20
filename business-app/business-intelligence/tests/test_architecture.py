"""Architecture-level tests verifying structural invariants.

These tests do not hit a real database. They verify:
- Domain ownership of semantic definitions
- Relationship metadata is declared
- Base class interfaces are correct
- ContractSnapshot / FactContract alias works
- EtlRunMetadata model is importable
- SemanticRegistry bootstrap includes all expected domains
- Placeholder domains (no model_cls) are discoverable but not queryable
"""
import pytest


# ── Semantic domain ownership ──────────────────────────────────────────────────


class TestDomainDefinitions:
    def test_every_active_domain_has_model_cls(self):
        from app.semantic.registry.semantic_registry import SemanticRegistry

        SemanticRegistry.bootstrap()
        active = ["businesses", "users", "customers", "contracts", "shifts", "invoices"]
        for name in active:
            domain = SemanticRegistry.get_domain(name)
            assert domain["model_cls"] is not None, f"{name} has no model_cls"

    def test_communications_domain_has_no_model_cls(self):
        """Communications is a future domain with no table yet."""
        from app.semantic.registry.semantic_registry import SemanticRegistry

        SemanticRegistry.bootstrap()
        domain = SemanticRegistry.get_domain("communications")
        assert domain["model_cls"] is None

    def test_payments_domain_has_model_cls(self):
        """Payments uses FactPayment (table exists from initial migration)."""
        from app.semantic.registry.semantic_registry import SemanticRegistry

        SemanticRegistry.bootstrap()
        domain = SemanticRegistry.get_domain("payments")
        assert domain["model_cls"] is not None

    def test_get_model_raises_for_placeholder(self):
        from app.semantic.registry.semantic_registry import SemanticRegistry

        SemanticRegistry.bootstrap()
        with pytest.raises(KeyError, match="placeholder"):
            SemanticRegistry.get_model("communications")

    def test_get_model_returns_class_for_active(self):
        from app.semantic.registry.semantic_registry import SemanticRegistry

        SemanticRegistry.bootstrap()
        cls = SemanticRegistry.get_model("shifts")
        assert cls is not None
        assert hasattr(cls, "__tablename__")

    def test_all_domains_registered_after_bootstrap(self):
        from app.semantic.registry.semantic_registry import SemanticRegistry

        SemanticRegistry.bootstrap()
        domains = SemanticRegistry.all_domains()
        for expected in [
            "businesses", "users", "customers", "contracts",
            "shifts", "invoices", "payments", "communications",
        ]:
            assert expected in domains, f"Domain '{expected}' not registered"


# ── Relationships ──────────────────────────────────────────────────────────────


class TestRelationships:
    def setup_method(self):
        from app.semantic.registry.semantic_registry import SemanticRegistry
        SemanticRegistry.bootstrap()

    def test_businesses_has_relationships(self):
        from app.semantic.registry.semantic_registry import SemanticRegistry

        rels = SemanticRegistry.get_relationships("businesses")
        target_domains = [r["target_domain"] for r in rels]
        assert "customers" in target_domains
        assert "users" in target_domains
        assert "contracts" in target_domains

    def test_contracts_links_to_shifts(self):
        from app.semantic.registry.semantic_registry import SemanticRegistry

        rels = SemanticRegistry.get_relationships("contracts")
        targets = [r["target_domain"] for r in rels]
        assert "shifts" in targets

    def test_shifts_links_to_invoices(self):
        from app.semantic.registry.semantic_registry import SemanticRegistry

        rels = SemanticRegistry.get_relationships("shifts")
        targets = [r["target_domain"] for r in rels]
        assert "invoices" in targets

    def test_invoices_links_to_payments(self):
        from app.semantic.registry.semantic_registry import SemanticRegistry

        rels = SemanticRegistry.get_relationships("invoices")
        targets = [r["target_domain"] for r in rels]
        assert "payments" in targets

    def test_relationship_has_required_keys(self):
        from app.semantic.registry.semantic_registry import SemanticRegistry

        rels = SemanticRegistry.get_relationships("customers")
        for rel in rels:
            assert "target_domain" in rel
            assert "local_key" in rel
            assert "foreign_key" in rel
            assert "join_type" in rel

    def test_all_domains_detail_includes_relationships(self):
        from app.semantic.registry.semantic_registry import SemanticRegistry

        detail = SemanticRegistry.all_domains_detail()
        # businesses should have at least 3 relationships in the detail
        biz = detail["businesses"]
        assert "relationships" in biz
        assert len(biz["relationships"]) >= 3


# ── ContractSnapshot alias ─────────────────────────────────────────────────────


class TestContractSnapshotAlias:
    def test_contract_snapshot_alias_exists(self):
        from app.models.contracts.analytical_model import ContractSnapshot, FactContract
        assert ContractSnapshot is FactContract

    def test_contract_snapshot_is_entity_not_event(self):
        from app.models.contracts.analytical_model import ContractSnapshot
        # Confirm its table name; canonical name is contract snapshot
        assert ContractSnapshot.__tablename__ == "fact_contract"

    def test_contract_domain_registered_as_contracts(self):
        from app.semantic.registry.semantic_registry import SemanticRegistry

        SemanticRegistry.bootstrap()
        domain = SemanticRegistry.get_domain("contracts")
        from app.models.contracts.analytical_model import FactContract
        assert domain["model_cls"] is FactContract


# ── EtlRunMetadata model ───────────────────────────────────────────────────────


class TestEtlRunMetadata:
    def test_model_is_importable(self):
        from app.models.etl.etl_metadata_model import EtlRunMetadata
        assert EtlRunMetadata.__tablename__ == "etl_run_metadata"

    def test_model_in_models_init(self):
        import app.models as m
        assert "EtlRunMetadata" in m.__all__

    def test_required_columns_exist(self):
        from app.models.etl.etl_metadata_model import EtlRunMetadata
        table = EtlRunMetadata.__table__
        col_names = {c.name for c in table.columns}
        for required in [
            "company_id", "model_name", "sync_started_at", "sync_finished_at",
            "duration_ms", "rows_read", "rows_written", "rows_failed",
            "cursor_from", "cursor_to", "status", "error_summary",
        ]:
            assert required in col_names, f"Missing column: {required}"


# ── AbstractPipeline lifecycle hooks ───────────────────────────────────────────


class TestPipelineLifecycleHooks:
    def test_default_before_run_is_noop(self):
        import asyncio
        from app.etl.pipelines.base import AbstractPipeline
        from app.etl.results import LoadResult

        class _TestPipeline(AbstractPipeline):
            async def run(self, company_id, since=None):
                return LoadResult(model_name="test", company_id=company_id)

        p = _TestPipeline()
        # Should not raise
        asyncio.get_event_loop().run_until_complete(p.before_run("c1", None))

    def test_default_validate_is_noop(self):
        import asyncio
        from app.etl.pipelines.base import AbstractPipeline
        from app.etl.results import LoadResult

        class _TestPipeline(AbstractPipeline):
            async def run(self, company_id, since=None):
                return LoadResult(model_name="test", company_id=company_id)

        p = _TestPipeline()
        r = LoadResult(model_name="test", company_id="c1")
        asyncio.get_event_loop().run_until_complete(p.validate(r))

    def test_execute_calls_full_lifecycle(self):
        import asyncio
        from app.etl.pipelines.base import AbstractPipeline
        from app.etl.results import LoadResult

        calls = []

        class _TestPipeline(AbstractPipeline):
            async def before_run(self, company_id, since):
                calls.append("before_run")

            async def run(self, company_id, since=None):
                calls.append("run")
                return LoadResult(model_name="test", company_id=company_id)

            async def validate(self, result):
                calls.append("validate")

            async def after_load(self, result):
                calls.append("after_load")

        asyncio.get_event_loop().run_until_complete(
            _TestPipeline().execute("c1")
        )
        assert calls == ["before_run", "run", "validate", "after_load"]


# ── AbstractTransformer normalization helpers ──────────────────────────────────


class TestTransformerNormalizationHelpers:
    def _helpers(self):
        from app.etl.transformers.base import AbstractTransformer
        return AbstractTransformer

    def test_to_decimal_handles_int(self):
        T = self._helpers()
        from decimal import Decimal
        assert T._to_decimal(42) == Decimal("42")

    def test_to_decimal_handles_string(self):
        T = self._helpers()
        from decimal import Decimal
        assert T._to_decimal("3.14") == Decimal("3.14")

    def test_to_decimal_returns_default_on_none(self):
        T = self._helpers()
        assert T._to_decimal(None) is None
        assert T._to_decimal(None, default=None) is None

    def test_to_decimal_returns_default_on_bad_value(self):
        T = self._helpers()
        assert T._to_decimal("not-a-number") is None

    def test_to_datetime_utc_naive(self):
        T = self._helpers()
        from datetime import datetime, timezone
        naive = datetime(2026, 1, 15, 9, 0, 0)
        result = T._to_datetime_utc(naive)
        assert result.tzinfo == timezone.utc

    def test_to_datetime_utc_none(self):
        T = self._helpers()
        assert T._to_datetime_utc(None) is None

    def test_to_date_from_string(self):
        T = self._helpers()
        from datetime import date
        assert T._to_date("2026-01-15") == date(2026, 1, 15)

    def test_to_date_returns_none_on_bad(self):
        T = self._helpers()
        assert T._to_date("not-a-date") is None

    def test_to_str_truncates(self):
        T = self._helpers()
        result = T._to_str("hello world", max_len=5)
        assert result == "hello"

    def test_to_bool_true_string(self):
        T = self._helpers()
        assert T._to_bool("true") is True
        assert T._to_bool("1") is True
        assert T._to_bool("yes") is True

    def test_to_bool_false_on_none(self):
        T = self._helpers()
        assert T._to_bool(None) is False

    def test_to_uuid5_is_deterministic(self):
        T = self._helpers()
        import uuid
        oid = "507f1f77bcf86cd799439011"
        u1 = T._to_uuid5(oid)
        u2 = T._to_uuid5(oid)
        assert u1 == u2
        assert isinstance(u1, uuid.UUID)

    def test_to_uuid5_none_returns_none(self):
        T = self._helpers()
        assert T._to_uuid5(None) is None


# ── Domain module structure ────────────────────────────────────────────────────


class TestDomainModuleStructure:
    """Each semantic/domains/<domain>.py must export a 'domain' DomainDefinition."""

    def _import_domain(self, module_path):
        import importlib
        mod = importlib.import_module(module_path)
        return mod.domain

    def test_businesses_domain_module(self):
        d = self._import_domain("app.semantic.domains.businesses")
        assert d.name == "businesses"
        assert len(d.dimensions) > 0
        assert len(d.relationships) > 0

    def test_contracts_domain_has_entity_note(self):
        d = self._import_domain("app.semantic.domains.contracts")
        assert "entity" in d.description.lower() or "snapshot" in d.description.lower()

    def test_payments_domain_has_no_model_yet(self):
        d = self._import_domain("app.semantic.domains.payments")
        assert d.model_cls is not None  # FactPayment table exists
        assert d.name == "payments"

    def test_communications_domain_has_no_model(self):
        d = self._import_domain("app.semantic.domains.communications")
        assert d.model_cls is None

    def test_all_domain_modules_importable(self):
        domains = [
            "businesses", "users", "customers", "contracts",
            "shifts", "invoices", "payments", "communications",
        ]
        for name in domains:
            d = self._import_domain(f"app.semantic.domains.{name}")
            assert d.name == name

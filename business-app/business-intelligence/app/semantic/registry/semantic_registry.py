"""Semantic registry — aggregates domain-owned analytical definitions.

Each domain owns its semantic metadata in ``app/semantic/domains/<domain>.py``
and exposes a ``DomainDefinition`` instance.  This registry collects them at
startup and provides a lookup interface to the query layer.

Per-domain stored keys:
    model_cls     — SQLAlchemy model class (None for future/placeholder domains)
    dimensions    — groupable / filterable column definitions
    measures      — aggregatable numeric field definitions
    kpis          — named business metric formulas
    relationships — links to other domains (used by QueryEngine for joins)
"""
from typing import Any, Dict, List, Optional


class SemanticRegistry:
    """Aggregated catalogue of all registered analytical domains."""

    _domains: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def register_domain(
        cls,
        name: str,
        model_cls: Optional[type],
        dimensions: dict,
        measures: dict,
        kpis: dict,
        relationships: Optional[List[dict]] = None,
    ) -> None:
        """Register a domain's semantic metadata and model class."""
        cls._domains[name] = {
            "model_cls": model_cls,
            "dimensions": dimensions,
            "measures": measures,
            "kpis": kpis,
            "relationships": relationships or [],
        }

    @classmethod
    def get_domain(cls, name: str) -> Dict[str, Any]:
        """Return the full semantic metadata dict for a domain.

        Raises:
            KeyError: if the domain is not registered.
        """
        if name not in cls._domains:
            raise KeyError(
                f"Domain '{name}' not registered in SemanticRegistry. "
                f"Available domains: {cls.all_domains()}"
            )
        return cls._domains[name]

    @classmethod
    def get_model(cls, name: str) -> type:
        """Return the SQLAlchemy model class for the domain.

        Raises:
            KeyError: if the domain has no model_cls (placeholder domain).
        """
        domain = cls.get_domain(name)
        model_cls = domain.get("model_cls")
        if model_cls is None:
            raise KeyError(
                f"Domain '{name}' has no SQLAlchemy model registered "
                "(placeholder domain — ETL not yet implemented)."
            )
        return model_cls

    @classmethod
    def get_relationships(cls, name: str) -> List[dict]:
        """Return the relationship list for a domain."""
        return cls.get_domain(name).get("relationships", [])

    @classmethod
    def all_domains(cls) -> List[str]:
        """Return all registered domain names."""
        return list(cls._domains.keys())

    @classmethod
    def all_domains_detail(cls) -> Dict[str, Dict[str, Any]]:
        """Lightweight summary suitable for the semantic metadata API endpoint."""
        return {
            name: {
                "dimensions": list(d["dimensions"].keys()),
                "measures": list(d["measures"].keys()),
                "kpis": list(d["kpis"].keys()),
                "relationships": [
                    {
                        "target_domain": r["target_domain"],
                        "join_type": r.get("join_type", "left"),
                        "description": r.get("description", ""),
                    }
                    for r in d.get("relationships", [])
                ],
                "has_model": d.get("model_cls") is not None,
            }
            for name, d in cls._domains.items()
        }

    @classmethod
    def bootstrap(cls) -> None:
        """Register all known analytical domains.

        Each domain module in ``app/semantic/domains/`` owns its definition.
        ``bootstrap()`` calls ``domain.register()`` for each one.
        Placeholder domains (model_cls=None) are registered for discovery
        but excluded from runtime query execution.
        """
        from app.semantic.domains.businesses import domain as businesses_domain
        from app.semantic.domains.users import domain as users_domain
        from app.semantic.domains.customers import domain as customers_domain
        from app.semantic.domains.contracts import domain as contracts_domain
        from app.semantic.domains.shifts import domain as shifts_domain
        from app.semantic.domains.invoices import domain as invoices_domain
        from app.semantic.domains.payments import domain as payments_domain
        from app.semantic.domains.communications import domain as communications_domain

        # Active domains (SQLAlchemy model + ETL implemented)
        for d in (
            businesses_domain,
            users_domain,
            customers_domain,
            contracts_domain,
            shifts_domain,
            invoices_domain,
        ):
            d.register()

        # Skeleton / future domains (registered for discovery only)
        for d in (payments_domain, communications_domain):
            d.register()

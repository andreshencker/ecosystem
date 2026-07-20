"""Base type for a semantic domain definition.

Each domain module under ``app/semantic/domains/`` exports a single
``DomainDefinition`` instance. The global SemanticRegistry aggregates them
by calling each domain's ``register()`` method.

A ``DomainDefinition`` bundles:
- model_cls    — the SQLAlchemy model class backing the domain
- dimensions   — groupable / filterable fields
- measures     — aggregatable numeric fields
- kpis         — named business metrics
- relationships — links to other domains (used by QueryEngine for joins)
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Type


@dataclass
class DomainRelationship:
    """Describes how one domain relates to another.

    Attributes:
        target_domain:  Name of the related domain (e.g. ``"customers"``).
        local_key:      Column name on the *current* domain's model.
        foreign_key:    Column name on the *target* domain's model.
        join_type:      ``"inner"`` or ``"left"`` (default ``"left"``).
        description:    Human-readable description of the relationship.
    """

    target_domain: str
    local_key: str
    foreign_key: str
    join_type: str = "left"
    description: str = ""


@dataclass
class DomainDefinition:
    """Complete semantic definition for one analytical domain.

    Create one of these in each ``app/semantic/domains/<domain>.py`` module
    and export it as ``domain``.  The global registry discovers it via
    ``register()``.
    """

    name: str
    model_cls: Optional[Type[Any]]
    dimensions: Dict[str, Any] = field(default_factory=dict)
    measures: Dict[str, Any] = field(default_factory=dict)
    kpis: Dict[str, Any] = field(default_factory=dict)
    relationships: List[DomainRelationship] = field(default_factory=list)
    description: str = ""

    def register(self) -> None:
        """Register this domain in the global SemanticRegistry."""
        from app.semantic.registry.semantic_registry import SemanticRegistry

        SemanticRegistry.register_domain(
            name=self.name,
            model_cls=self.model_cls,
            dimensions=self.dimensions,
            measures=self.measures,
            kpis=self.kpis,
            relationships=[
                {
                    "target_domain": r.target_domain,
                    "local_key": r.local_key,
                    "foreign_key": r.foreign_key,
                    "join_type": r.join_type,
                    "description": r.description,
                }
                for r in self.relationships
            ],
        )

"""Semantic domain definition for Contracts (ContractSnapshot / FactContract).

Architectural note: contracts are entities (dimensions/snapshots), not events.
The underlying table is ``fact_contract`` for historical reasons.
"""
from app.models.contracts.analytical_model import FactContract
from app.models.contracts.dimensions import CONTRACT_DIMENSIONS
from app.models.contracts.kpis import CONTRACT_KPIS
from app.models.contracts.measures import CONTRACT_MEASURES
from app.semantic.domains.base import DomainDefinition, DomainRelationship

domain = DomainDefinition(
    name="contracts",
    description=(
        "Contract snapshots — rate, billing cycle, and status at the "
        "time of the last sync. Entities, not events."
    ),
    model_cls=FactContract,
    dimensions=CONTRACT_DIMENSIONS,
    measures=CONTRACT_MEASURES,
    kpis=CONTRACT_KPIS,
    relationships=[
        DomainRelationship(
            target_domain="businesses",
            local_key="business_id",
            foreign_key="business_id",
            join_type="inner",
            description="A contract belongs to one business.",
        ),
        DomainRelationship(
            target_domain="customers",
            local_key="customer_id",
            foreign_key="customer_id",
            join_type="left",
            description="A contract belongs to one customer.",
        ),
        DomainRelationship(
            target_domain="shifts",
            local_key="source_id",
            foreign_key="contract_id",
            join_type="left",
            description="A contract produces many shifts.",
        ),
    ],
)

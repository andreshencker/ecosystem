"""Semantic domain definition for Shifts (FactShift)."""
from app.models.shifts.fact_shift import FactShift
from app.models.shifts.dimensions import SHIFT_DIMENSIONS
from app.models.shifts.kpis import SHIFT_KPIS
from app.models.shifts.measures import SHIFT_MEASURES
from app.semantic.domains.base import DomainDefinition, DomainRelationship

domain = DomainDefinition(
    name="shifts",
    description=(
        "Work events performed under a contract. "
        "Duration, status, and invoice state are the core analytical attributes."
    ),
    model_cls=FactShift,
    dimensions=SHIFT_DIMENSIONS,
    measures=SHIFT_MEASURES,
    kpis=SHIFT_KPIS,
    relationships=[
        DomainRelationship(
            target_domain="businesses",
            local_key="business_id",
            foreign_key="business_id",
            join_type="inner",
            description="A shift belongs to one business.",
        ),
        DomainRelationship(
            target_domain="customers",
            local_key="customer_id",
            foreign_key="customer_id",
            join_type="left",
            description="A shift is linked to a customer via its contract.",
        ),
        DomainRelationship(
            target_domain="contracts",
            local_key="contract_id",
            foreign_key="source_id",
            join_type="left",
            description="A shift is worked under a contract.",
        ),
        DomainRelationship(
            target_domain="invoices",
            local_key="source_id",
            foreign_key="invoice_id",
            join_type="left",
            description="An invoiced shift may appear on an invoice.",
        ),
    ],
)

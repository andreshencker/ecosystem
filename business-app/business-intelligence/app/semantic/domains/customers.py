"""Semantic domain definition for Customers (DimCustomer).

Owns:
- dimensions, measures, KPIs from app/models/customers/
- relationships to parent (businesses) and child (contracts) domains
"""
from app.models.customers.analytical_model import DimCustomer
from app.models.customers.dimensions import CUSTOMER_DIMENSIONS
from app.models.customers.kpis import CUSTOMER_KPIS
from app.models.customers.measures import CUSTOMER_MEASURES
from app.semantic.domains.base import DomainDefinition, DomainRelationship

domain = DomainDefinition(
    name="customers",
    description=(
        "Customers belonging to a business. "
        "Includes location, contact, and communication-purpose profiles. "
        "Parent of contracts."
    ),
    model_cls=DimCustomer,
    dimensions=CUSTOMER_DIMENSIONS,
    measures=CUSTOMER_MEASURES,
    kpis=CUSTOMER_KPIS,
    relationships=[
        DomainRelationship(
            target_domain="businesses",
            local_key="business_id",
            foreign_key="business_id",
            join_type="inner",
            description="A customer belongs to one business.",
        ),
        DomainRelationship(
            target_domain="contracts",
            local_key="customer_id",
            foreign_key="customer_id",
            join_type="left",
            description="A customer may have many contracts.",
        ),
    ],
)

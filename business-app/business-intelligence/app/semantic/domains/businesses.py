"""Semantic domain definition for Businesses (DimBusiness).

Owns:
- dimensions, measures, KPIs from app/models/companies/
- relationships to child domains
"""
from app.models.companies.analytical_model import DimBusiness
from app.models.companies.dimensions import BUSINESS_DIMENSIONS
from app.models.companies.kpis import BUSINESS_KPIS
from app.models.companies.measures import BUSINESS_MEASURES
from app.semantic.domains.base import DomainDefinition, DomainRelationship

domain = DomainDefinition(
    name="businesses",
    description="Top-level tenant entities. Root of the ownership hierarchy.",
    model_cls=DimBusiness,
    dimensions=BUSINESS_DIMENSIONS,
    measures=BUSINESS_MEASURES,
    kpis=BUSINESS_KPIS,
    relationships=[
        DomainRelationship(
            target_domain="customers",
            local_key="business_id",
            foreign_key="business_id",
            join_type="left",
            description="A business owns many customers.",
        ),
        DomainRelationship(
            target_domain="users",
            local_key="business_id",
            foreign_key="business_id",
            join_type="left",
            description="A business has many users.",
        ),
        DomainRelationship(
            target_domain="contracts",
            local_key="business_id",
            foreign_key="business_id",
            join_type="left",
            description="A business owns many contracts.",
        ),
    ],
)

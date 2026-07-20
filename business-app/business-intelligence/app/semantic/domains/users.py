"""Semantic domain definition for Users (DimUser)."""
from app.models.users.analytical_model import DimUser
from app.models.users.dimensions import USER_DIMENSIONS
from app.models.users.kpis import USER_KPIS
from app.models.users.measures import USER_MEASURES
from app.semantic.domains.base import DomainDefinition, DomainRelationship

domain = DomainDefinition(
    name="users",
    description="Platform and business users. Belong to one business.",
    model_cls=DimUser,
    dimensions=USER_DIMENSIONS,
    measures=USER_MEASURES,
    kpis=USER_KPIS,
    relationships=[
        DomainRelationship(
            target_domain="businesses",
            local_key="business_id",
            foreign_key="business_id",
            join_type="inner",
            description="A user belongs to one business.",
        ),
    ],
)

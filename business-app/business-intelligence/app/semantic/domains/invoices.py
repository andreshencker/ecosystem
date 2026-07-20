"""Semantic domain definition for Invoices (FactInvoice).

Current ETL note: invoices are currently sourced from confirmed+invoiced shifts
(no standalone Invoice collection exists yet in Business App). When a real
Invoice collection is added, the ETL source changes but this semantic
definition stays stable.
"""
from app.models.invoices.analytical_model import FactInvoice
from app.models.invoices.dimensions import INVOICE_DIMENSIONS
from app.models.invoices.kpis import INVOICE_KPIS
from app.models.invoices.measures import INVOICE_MEASURES
from app.semantic.domains.base import DomainDefinition, DomainRelationship

domain = DomainDefinition(
    name="invoices",
    description=(
        "Invoice events: each row represents one invoiced work event. "
        "Currently derived from shifts; will transition to real Invoice "
        "documents when the Invoice module is implemented."
    ),
    model_cls=FactInvoice,
    dimensions=INVOICE_DIMENSIONS,
    measures=INVOICE_MEASURES,
    kpis=INVOICE_KPIS,
    relationships=[
        DomainRelationship(
            target_domain="businesses",
            local_key="business_id",
            foreign_key="business_id",
            join_type="inner",
            description="An invoice belongs to one business.",
        ),
        DomainRelationship(
            target_domain="customers",
            local_key="customer_id",
            foreign_key="customer_id",
            join_type="left",
            description="An invoice is addressed to one customer.",
        ),
        DomainRelationship(
            target_domain="payments",
            local_key="invoice_id",
            foreign_key="invoice_id",
            join_type="left",
            description="An invoice may have many payment events.",
        ),
    ],
)

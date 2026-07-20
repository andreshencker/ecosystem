"""Semantic domain definition for Payments (FactPayment).

Status: skeleton — no ETL implemented yet.
Source: future ``payments`` MongoDB collection in Business App.
Table:  ``fact_payment`` (already exists in PostgreSQL via initial migration).

This domain will track individual payment events against invoices.
"""
from app.models.invoices.payment_model import FactPayment
from app.semantic.domains.base import DomainDefinition, DomainRelationship

PAYMENT_DIMENSIONS: dict = {
    "company_id": {
        "type": "string",
        "description": "Tenant identifier",
        "column": "business_id",
    },
    "customer_id": {
        "type": "string",
        "description": "Customer who made the payment",
        "column": "customer_id",
    },
    "invoice_id": {
        "type": "string",
        "description": "Invoice this payment is applied to",
        "column": "invoice_id",
    },
    "payment_date": {
        "type": "date",
        "description": "Date the payment was received",
        "column": "payment_date_key",
    },
    "currency": {
        "type": "string",
        "description": "ISO 4217 currency code",
        "column": "currency",
    },
    "is_reversed": {
        "type": "boolean",
        "description": "Whether the payment was reversed",
        "column": "is_reversed",
    },
}

PAYMENT_MEASURES: dict = {
    "payment_count": {
        "type": "count",
        "description": "Number of payment events",
        "column": "fact_id",
        "aggregations": ["count"],
        "format": "integer",
    },
    "paid_amount": {
        "type": "currency",
        "description": "Total amount received",
        "column": "amount",
        "aggregations": ["sum", "avg"],
        "format": "currency",
        "currency_column": "currency",
    },
}

PAYMENT_KPIS: dict = {
    "total_collected": {
        "description": "Sum of all non-reversed payment amounts",
        "base_measure": "paid_amount",
        "aggregation": "sum",
        "filter": {"is_reversed": False},
        "format": "currency",
    },
    "payment_count": {
        "description": "Total number of payment events",
        "base_measure": "payment_count",
        "aggregation": "count",
        "format": "integer",
    },
}

domain = DomainDefinition(
    name="payments",
    description=(
        "Payment events. Skeleton domain — ETL not yet implemented. "
        "Requires a Payments collection in Business App."
    ),
    model_cls=FactPayment,
    dimensions=PAYMENT_DIMENSIONS,
    measures=PAYMENT_MEASURES,
    kpis=PAYMENT_KPIS,
    relationships=[
        DomainRelationship(
            target_domain="invoices",
            local_key="invoice_id",
            foreign_key="invoice_id",
            join_type="inner",
            description="A payment is applied to one invoice.",
        ),
        DomainRelationship(
            target_domain="customers",
            local_key="customer_id",
            foreign_key="customer_id",
            join_type="left",
            description="A payment comes from one customer.",
        ),
    ],
)

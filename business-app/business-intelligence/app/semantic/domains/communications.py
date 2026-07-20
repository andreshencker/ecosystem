"""Semantic domain definition for Communications.

Status: placeholder — no analytical model or ETL implemented yet.
Source: future Communications App event log (separate service).

This domain will track notification delivery events, channel usage,
and engagement metrics once the Communications App exposes a
synchronization endpoint or webhook.

No SQLAlchemy model exists for this domain yet.
Register this domain in SemanticRegistry only when its model_cls is available.
"""
from app.semantic.domains.base import DomainDefinition, DomainRelationship

COMMUNICATION_DIMENSIONS: dict = {
    "company_id": {
        "type": "string",
        "description": "Tenant identifier",
        "column": "business_id",
    },
    "channel": {
        "type": "enum",
        "description": "Delivery channel: email | sms | push",
        "column": "channel",
        "values": ["email", "sms", "push"],
    },
    "event_type": {
        "type": "string",
        "description": "Notification event key (e.g. shifts.shift_created)",
        "column": "event_type",
    },
    "status": {
        "type": "enum",
        "description": "Delivery status: sent | failed | bounced | opened",
        "column": "status",
        "values": ["sent", "failed", "bounced", "opened"],
    },
}

COMMUNICATION_MEASURES: dict = {
    "notification_count": {
        "type": "count",
        "description": "Total notification events",
        "column": "id",
        "aggregations": ["count"],
        "format": "integer",
    },
    "delivered_count": {
        "type": "count",
        "description": "Successfully delivered notifications",
        "column": "id",
        "filter": {"status": "sent"},
        "aggregations": ["count"],
        "format": "integer",
    },
}

COMMUNICATION_KPIS: dict = {
    "delivery_rate": {
        "description": "Percentage of notifications successfully delivered",
        "numerator": "delivered_count",
        "denominator": "notification_count",
        "format": "percentage",
        "zero_division": "0.00",
    },
}

# model_cls is None — no PostgreSQL table exists yet.
# This domain is intentionally not bootstrapped until its ETL is implemented.
domain = DomainDefinition(
    name="communications",
    description=(
        "Notification delivery events from the Communications App. "
        "Placeholder — no ETL or analytical model implemented yet."
    ),
    model_cls=None,   # No table yet
    dimensions=COMMUNICATION_DIMENSIONS,
    measures=COMMUNICATION_MEASURES,
    kpis=COMMUNICATION_KPIS,
    relationships=[
        DomainRelationship(
            target_domain="businesses",
            local_key="business_id",
            foreign_key="business_id",
            join_type="inner",
            description="Notifications are scoped to one business.",
        ),
    ],
)

"""Semantic measure definitions for the Customers (DimCustomer) domain."""

CUSTOMER_MEASURES: dict = {
    # ---- Customer volume ----
    "customer_count": {
        "type": "count",
        "description": "Total number of customer records",
        "column": "customer_id",
        "aggregations": ["count"],
        "format": "integer",
    },
    "active_customer_count": {
        "type": "count",
        "description": "Number of active customer records",
        "column": "customer_id",
        "filter": {"is_active": True},
        "aggregations": ["count"],
        "format": "integer",
    },
    "inactive_customer_count": {
        "type": "count",
        "description": "Number of inactive customer records",
        "column": "customer_id",
        "filter": {"is_active": False},
        "aggregations": ["count"],
        "format": "integer",
    },

    # ---- Customer type breakdown ----
    "company_customer_count": {
        "type": "count",
        "description": "Number of customers of type 'company'",
        "column": "customer_id",
        "filter": {"customer_type": "company"},
        "aggregations": ["count"],
        "format": "integer",
    },
    "individual_customer_count": {
        "type": "count",
        "description": "Number of customers of type 'individual'",
        "column": "customer_id",
        "filter": {"customer_type": "individual"},
        "aggregations": ["count"],
        "format": "integer",
    },

    # ---- ABN coverage ----
    "customer_with_abn_count": {
        "type": "count",
        "description": "Number of customers that have an ABN on record",
        "column": "customer_id",
        "filter": {"has_abn": True},
        "aggregations": ["count"],
        "format": "integer",
    },
    "customer_without_abn_count": {
        "type": "count",
        "description": "Number of customers missing an ABN",
        "column": "customer_id",
        "filter": {"has_abn": False},
        "aggregations": ["count"],
        "format": "integer",
    },

    # ---- Collection aggregates (sum of per-customer counts) ----
    "location_count": {
        "type": "sum",
        "description": "Total number of customer locations across all customers",
        "column": "location_count",
        "aggregations": ["sum"],
        "format": "integer",
    },
    "contact_count": {
        "type": "sum",
        "description": "Total number of customer contacts across all customers",
        "column": "contact_count",
        "aggregations": ["sum"],
        "format": "integer",
    },
    "communication_purpose_count": {
        "type": "sum",
        "description": "Total number of communication purposes configured across all customers",
        "column": "communication_purpose_count",
        "aggregations": ["sum"],
        "format": "integer",
    },
    # NOTE: email and SMS recipients are kept separate because they have different
    # semantics (email has recipientType to/cc/bcc; SMS has none). Use both
    # measures when you need the combined total.
    "email_recipient_count": {
        "type": "sum",
        "description": "Total number of email communication recipients across all customers",
        "column": "email_recipient_count",
        "aggregations": ["sum"],
        "format": "integer",
    },
    "sms_recipient_count": {
        "type": "sum",
        "description": "Total number of SMS communication recipients across all customers",
        "column": "sms_recipient_count",
        "aggregations": ["sum"],
        "format": "integer",
    },

    # ---- Data quality ----
    "data_quality_issue_count": {
        "type": "sum",
        "description": "Total number of data-quality issues across all customers",
        "column": "data_quality_issue_count",
        "aggregations": ["sum"],
        "format": "integer",
    },
}

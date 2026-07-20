"""Semantic dimension definitions for the Contracts (FactContract) domain."""

CONTRACT_DIMENSIONS: dict = {
    "company_id": {
        "type": "string",
        "description": "Tenant identifier — isolates data per business",
        "column": "business_id",
    },
    "customer_id": {
        "type": "string",
        "description": "Customer the contract belongs to",
        "column": "customer_id",
    },
    "status": {
        "type": "enum",
        "description": "Contract lifecycle status",
        "column": "status",
        "values": ["draft", "active", "inactive", "finished", "cancelled"],
    },
    "work_type": {
        "type": "enum",
        "description": "Commercial relationship type",
        "column": "work_type",
        "values": ["casual", "contractor", "subcontractor", "service_agreement", "project_based", "other"],
    },
    "billing_cycle": {
        "type": "enum",
        "description": "Invoice generation frequency",
        "column": "billing_cycle",
        "values": ["per_shift", "daily", "weekly", "fortnightly", "monthly"],
    },
    "rate_type": {
        "type": "enum",
        "description": "Rate calculation mode",
        "column": "rate_type",
        "values": ["fixed", "variable", "variable_time_range"],
    },
    "currency": {
        "type": "enum",
        "description": "Billing currency",
        "column": "currency",
        "values": ["AUD", "USD", "NZD", "GBP", "EUR", "COP"],
    },
    "charge_gst": {
        "type": "boolean",
        "description": "Whether GST is applied to invoices",
        "column": "charge_gst",
    },
    "holiday_rules_enabled": {
        "type": "boolean",
        "description": "Whether holiday detection is active",
        "column": "holiday_rules_enabled",
    },
    "payment_calendar_enabled": {
        "type": "boolean",
        "description": "Whether expected payment dates are tracked in a calendar",
        "column": "payment_calendar_enabled",
    },
    "super_enabled": {
        "type": "boolean",
        "description": "Whether superannuation is configured",
        "column": "super_enabled",
    },
    "configuration_status": {
        "type": "enum",
        "description": "Pre-computed configuration health: complete | warning | invalid",
        "column": "configuration_status",
        "values": ["complete", "warning", "invalid"],
    },
    "start_date": {
        "type": "date",
        "description": "Contract start date",
        "column": "start_date",
    },
    "end_date": {
        "type": "date",
        "description": "Contract end date (null for open-ended contracts)",
        "column": "end_date",
    },
}

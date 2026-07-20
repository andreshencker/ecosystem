"""Semantic dimension definitions for the Invoice domain.

Plain-dict definitions consumed by the SemanticRegistry and query engine.
"""

INVOICE_DIMENSIONS: dict = {
    "company_id": {
        "type": "string",
        "description": "Tenant identifier — isolates data per business",
        "column": "business_id",
    },
    "customer_id": {
        "type": "string",
        "description": "Customer this invoice belongs to",
        "column": "customer_id",
    },
    "currency": {
        "type": "enum",
        "description": "ISO 4217 currency code",
        "column": "currency",
    },
    "invoice_status": {
        "type": "enum",
        "description": "State of the invoice: invoiced | voided",
        "column": "event_type",
        "values": ["invoiced", "voided"],
    },
    "issue_date": {
        "type": "date",
        "description": "Date the invoice was issued",
        "column": "issue_date_key",
    },
    "due_date": {
        "type": "date",
        "description": "Date the invoice is due",
        "column": "due_date_key",
    },
    "is_voided": {
        "type": "boolean",
        "description": "True if the invoice has been voided/cancelled",
        "column": "is_voided",
    },
}

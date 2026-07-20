"""Semantic measure definitions for the Invoice domain."""

INVOICE_MEASURES: dict = {
    "invoice_count": {
        "type": "count",
        "description": "Number of invoice records",
        "column": "fact_id",
        "aggregations": ["count"],
        "format": "integer",
    },
    "subtotal": {
        "type": "currency",
        "description": "Pre-tax invoice subtotal",
        "column": "subtotal",
        "aggregations": ["sum", "avg"],
        "format": "currency",
        "currency_column": "currency",
    },
    "tax_amount": {
        "type": "currency",
        "description": "Tax charged on the invoice",
        "column": "tax_amount",
        "aggregations": ["sum"],
        "format": "currency",
        "currency_column": "currency",
    },
    "gross_amount": {
        "type": "currency",
        "description": "Total gross amount including tax",
        "column": "gross_amount",
        "aggregations": ["sum", "avg", "min", "max"],
        "format": "currency",
        "currency_column": "currency",
    },
    "days_to_due": {
        "type": "numeric",
        "description": "Days between issue date and due date",
        "column": "days_to_due",
        "aggregations": ["avg"],
        "format": "days",
    },
}

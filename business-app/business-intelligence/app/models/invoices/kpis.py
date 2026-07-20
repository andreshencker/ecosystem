"""KPI definitions for the Invoice domain.

All calculations are resolved through the SemanticRegistry — no
duplicate aggregation logic in the service layer.
"""

INVOICE_KPIS: dict = {
    "total_invoiced": {
        "description": "Sum of all gross invoice amounts",
        "base_measure": "gross_amount",
        "aggregation": "sum",
        "filter": {"is_voided": False},
        "format": "currency",
    },
    "invoice_count": {
        "description": "Total number of non-voided invoices",
        "base_measure": "invoice_count",
        "aggregation": "count",
        "filter": {"is_voided": False},
        "format": "integer",
    },
    "voided_count": {
        "description": "Number of voided invoices",
        "base_measure": "invoice_count",
        "aggregation": "count",
        "filter": {"is_voided": True},
        "format": "integer",
    },
    "average_invoice_value": {
        "description": "Average gross amount per non-voided invoice",
        "numerator": "total_invoiced",
        "denominator": "invoice_count",
        "format": "currency",
        "zero_division": "0",
    },
}

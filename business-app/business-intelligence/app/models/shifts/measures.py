"""Semantic measure definitions for the Shifts (FactShift) domain."""

SHIFT_MEASURES: dict = {
    "shift_count": {
        "type": "count",
        "description": "Number of shift records",
        "column": "id",
        "aggregations": ["count"],
        "format": "integer",
    },
    "duration_minutes": {
        "type": "numeric",
        "description": "Net worked minutes per shift",
        "column": "duration_minutes",
        "aggregations": ["sum", "avg", "min", "max"],
        "format": "minutes",
    },
    "duration_hours": {
        "type": "numeric",
        "description": "Net worked hours per shift",
        "column": "duration_hours",
        "aggregations": ["sum", "avg", "min", "max"],
        "format": "hours",
    },
    "invoiced_shift_count": {
        "type": "count",
        "description": "Number of shifts marked invoiced",
        "column": "id",
        "filter": {"invoice_status": "invoiced"},
        "aggregations": ["count"],
        "format": "integer",
    },
    "invoiced_hours": {
        "type": "numeric",
        "description": "Total hours across invoiced shifts",
        "column": "duration_hours",
        "filter": {"invoice_status": "invoiced"},
        "aggregations": ["sum"],
        "format": "hours",
    },
}

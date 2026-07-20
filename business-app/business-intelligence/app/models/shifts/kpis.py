"""KPI definitions for the Shifts (FactShift) domain."""

SHIFT_KPIS: dict = {
    "total_hours_worked": {
        "description": "Sum of net hours across all shifts",
        "base_measure": "duration_hours",
        "aggregation": "sum",
        "format": "hours",
    },
    "invoiced_hours": {
        "description": "Sum of hours across invoiced shifts",
        "base_measure": "invoiced_hours",
        "aggregation": "sum",
        "format": "hours",
    },
    "shift_count": {
        "description": "Total shift count",
        "base_measure": "shift_count",
        "aggregation": "count",
        "format": "integer",
    },
    "invoiced_shift_count": {
        "description": "Number of invoiced shifts",
        "base_measure": "invoiced_shift_count",
        "aggregation": "count",
        "format": "integer",
    },
    "average_shift_duration": {
        "description": "Mean net hours per shift",
        "base_measure": "duration_hours",
        "aggregation": "avg",
        "format": "hours",
    },
}

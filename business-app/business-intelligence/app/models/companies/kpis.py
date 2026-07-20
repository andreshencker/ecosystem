"""KPI definitions for the Businesses (DimBusiness) domain."""

BUSINESS_KPIS: dict = {
    "total_businesses": {
        "description": "Total number of businesses",
        "base_measure": "business_count",
        "aggregation": "count",
        "format": "integer",
    },
    "active_businesses": {
        "description": "Number of active businesses",
        "base_measure": "active_business_count",
        "aggregation": "count",
        "format": "integer",
    },
}

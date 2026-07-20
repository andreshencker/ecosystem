"""Semantic measure definitions for the Businesses (DimBusiness) domain."""

BUSINESS_MEASURES: dict = {
    "business_count": {
        "type": "count",
        "description": "Number of businesses",
        "column": "business_id",
        "aggregations": ["count"],
        "format": "integer",
    },
    "active_business_count": {
        "type": "count",
        "description": "Number of active businesses",
        "column": "business_id",
        "filter": {"is_active": True},
        "aggregations": ["count"],
        "format": "integer",
    },
}

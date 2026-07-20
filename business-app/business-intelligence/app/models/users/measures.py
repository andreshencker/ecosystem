"""Semantic measure definitions for the Users (DimUser) domain."""

USER_MEASURES: dict = {
    "user_count": {
        "type": "count",
        "description": "Number of users",
        "column": "user_id",
        "aggregations": ["count"],
        "format": "integer",
    },
    "active_user_count": {
        "type": "count",
        "description": "Number of active users",
        "column": "user_id",
        "filter": {"is_active": True},
        "aggregations": ["count"],
        "format": "integer",
    },
}

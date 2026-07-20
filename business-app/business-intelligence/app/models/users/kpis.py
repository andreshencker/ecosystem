"""KPI definitions for the Users (DimUser) domain."""

USER_KPIS: dict = {
    "total_users": {
        "description": "Total number of users",
        "base_measure": "user_count",
        "aggregation": "count",
        "format": "integer",
    },
    "active_users": {
        "description": "Number of active users",
        "base_measure": "active_user_count",
        "aggregation": "count",
        "format": "integer",
    },
}

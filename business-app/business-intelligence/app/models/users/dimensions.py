"""Semantic dimension definitions for the Users (DimUser) domain."""

USER_DIMENSIONS: dict = {
    "company_id": {
        "type": "string",
        "description": "Tenant identifier — isolates data per business",
        "column": "business_id",
    },
    "user_id": {
        "type": "string",
        "description": "User primary key",
        "column": "user_id",
    },
    "role": {
        "type": "enum",
        "description": "User role",
        "column": "role",
    },
    "scope": {
        "type": "enum",
        "description": "User scope: global | company",
        "column": "scope",
        "values": ["global", "company"],
    },
    "is_active": {
        "type": "boolean",
        "description": "Whether the user account is active",
        "column": "is_active",
    },
}

"""Semantic dimension definitions for the Businesses (DimBusiness) domain."""

BUSINESS_DIMENSIONS: dict = {
    "company_id": {
        "type": "string",
        "description": "Tenant identifier (self-reference for isolation)",
        "column": "business_id",
    },
    "business_id": {
        "type": "string",
        "description": "Business primary key",
        "column": "business_id",
    },
    "company_key": {
        "type": "string",
        "description": "Human-readable business key (URL slug)",
        "column": "company_key",
    },
    "currency": {
        "type": "string",
        "description": "Default currency (ISO 4217)",
        "column": "currency",
    },
    "is_active": {
        "type": "boolean",
        "description": "Whether the business is active",
        "column": "is_active",
    },
    "is_platform": {
        "type": "boolean",
        "description": "Whether this is the platform base company",
        "column": "is_platform",
    },
}

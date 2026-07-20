"""KPI definitions for the Customers (DimCustomer) domain."""

CUSTOMER_KPIS: dict = {
    # ---- Volume ----
    "total_customers": {
        "description": "Total number of customer records",
        "base_measure": "customer_count",
        "aggregation": "count",
        "format": "integer",
    },
    "active_customers": {
        "description": "Number of active customers",
        "base_measure": "active_customer_count",
        "aggregation": "count",
        "format": "integer",
    },
    "inactive_customers": {
        "description": "Number of inactive customers",
        "base_measure": "inactive_customer_count",
        "aggregation": "count",
        "format": "integer",
    },

    # ---- Type breakdown ----
    "company_customers": {
        "description": "Number of customers classified as companies",
        "base_measure": "company_customer_count",
        "aggregation": "count",
        "format": "integer",
    },
    "individual_customers": {
        "description": "Number of customers classified as individuals",
        "base_measure": "individual_customer_count",
        "aggregation": "count",
        "format": "integer",
    },

    # ---- ABN coverage ----
    "customers_with_abn": {
        "description": "Number of customers that have an ABN on record",
        "base_measure": "customer_with_abn_count",
        "aggregation": "count",
        "format": "integer",
    },
    "customers_without_abn": {
        "description": "Number of customers missing an ABN",
        "base_measure": "customer_without_abn_count",
        "aggregation": "count",
        "format": "integer",
    },

    # ---- Profile completeness ----
    "customer_profile_completeness_rate": {
        "description": (
            "Percentage of customers that have all three profile essentials: "
            "ABN, at least one contact, and at least one location"
        ),
        "formula": "customers_with_abn AND has_contacts AND has_locations / total_customers * 100",
        "aggregation": "ratio",
        "format": "percentage",
        "base_measure": "customer_count",
    },
    "customers_without_contacts": {
        "description": "Number of customers that have no contacts recorded",
        "base_measure": "customer_count",
        "aggregation": "count",
        "filter": {"has_contacts": False},
        "format": "integer",
    },
    "customers_without_locations": {
        "description": "Number of customers that have no locations recorded",
        "base_measure": "customer_count",
        "aggregation": "count",
        "filter": {"has_locations": False},
        "format": "integer",
    },
    "customers_without_communication_configuration": {
        "description": "Number of customers with no communication purposes configured",
        "base_measure": "customer_count",
        "aggregation": "count",
        "filter": {"has_communication_configuration": False},
        "format": "integer",
    },

    # ---- Data quality ----
    "customers_with_data_quality_issues": {
        "description": "Number of customers that have at least one data-quality issue",
        "base_measure": "customer_count",
        "aggregation": "count",
        "filter": {"data_quality_issue_count__gt": 0},
        "format": "integer",
    },
}

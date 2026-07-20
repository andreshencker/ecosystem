"""Semantic dimension definitions for the Customers (DimCustomer) domain.

Dimensions marked with a `table` key refer to a bridge/child table rather than
dim_customer itself.  The semantic query engine uses this to determine which
table to join when building analytic queries.
"""

CUSTOMER_DIMENSIONS: dict = {
    # ---- Core identity ----
    "customer_id": {
        "type": "string",
        "description": "Customer primary key",
        "column": "customer_id",
    },
    "business_id": {
        "type": "string",
        "description": "Tenant business identifier",
        "column": "business_id",
    },
    "customer_name": {
        "type": "string",
        "description": "Customer display name",
        "column": "display_name",
    },
    "customer_type": {
        "type": "enum",
        "description": "Customer type: company | individual",
        "column": "customer_type",
        "values": ["company", "individual"],
    },
    "status": {
        "type": "boolean",
        "description": "Customer status flag — true = active, false = inactive. Map to 'Active'/'Inactive' in the UI.",
        "column": "is_active",
    },
    "is_active": {
        "type": "boolean",
        "description": "Whether the customer record is active",
        "column": "is_active",
    },

    # ---- Profile-completeness flags ----
    "has_abn": {
        "type": "boolean",
        "description": "Whether the customer has an ABN on record",
        "column": "has_abn",
    },
    "has_contacts": {
        "type": "boolean",
        "description": "Whether the customer has at least one contact",
        "column": "has_contacts",
    },
    "has_locations": {
        "type": "boolean",
        "description": "Whether the customer has at least one location",
        "column": "has_locations",
    },
    "has_communication_configuration": {
        "type": "boolean",
        "description": "Whether the customer has communication purposes configured",
        "column": "has_communication_configuration",
    },
    "has_primary_contact": {
        "type": "boolean",
        "description": "Whether the customer has a designated primary contact",
        "column": "has_primary_contact",
    },

    # ---- Data quality ----
    "data_quality_issue_count": {
        "type": "integer",
        "description": "Number of distinct data-quality issues detected for this customer",
        "column": "data_quality_issue_count",
    },

    # ---- Bridge: location dimensions ----
    "location_tag": {
        "type": "string",
        "description": "Human-readable label for a customer location",
        "column": "tag",
        "table": "bridge_customer_location",
    },
    "country": {
        "type": "string",
        "description": "Country of a customer location",
        "column": "country",
        "table": "bridge_customer_location",
    },
    "city": {
        "type": "string",
        "description": "City of a customer location",
        "column": "city",
        "table": "bridge_customer_location",
    },
    "postcode": {
        "type": "string",
        "description": "Postcode of a customer location",
        "column": "postcode",
        "table": "bridge_customer_location",
    },
    "is_valid_address": {
        "type": "boolean",
        "description": "Whether the location has all required address fields",
        "column": "is_valid_address",
        "table": "bridge_customer_location",
    },

    # ---- Bridge: contact dimensions ----
    "contact_name": {
        "type": "string",
        "description": "Full name of a customer contact",
        "column": "contact_name",
        "table": "bridge_customer_contact",
    },
    "contact_role": {
        "type": "string",
        "description": "Role or position of a customer contact",
        "column": "role_or_position",
        "table": "bridge_customer_contact",
    },
    "contact_email": {
        "type": "string",
        "description": "Email address of a customer contact",
        "column": "email",
        "table": "bridge_customer_contact",
    },
    "is_primary_contact": {
        "type": "boolean",
        "description": "Whether the contact is designated as primary",
        "column": "is_primary",
        "table": "bridge_customer_contact",
    },

    # ---- Bridge: communication purpose dimensions ----
    "communication_domain_id": {
        "type": "string",
        "description": "Communication domain identifier for a configured purpose",
        "column": "communication_domain_id",
        "table": "bridge_customer_communication_purpose",
    },

    # ---- Bridge: recipient dimensions ----
    "channel": {
        "type": "enum",
        "description": "Notification channel: email | sms",
        "column": "channel",
        "table": "bridge_customer_communication_recipient",
        "values": ["email", "sms"],
    },
    "recipient_type": {
        "type": "enum",
        "description": "Email recipient type: to | cc | bcc (null for SMS)",
        "column": "recipient_type",
        "table": "bridge_customer_communication_recipient",
        "values": ["to", "cc", "bcc"],
    },

    # ---- Time dimensions ----
    "created_date": {
        "type": "date",
        "description": "Date the customer record was created in the source system",
        "column": "source_created_at",
    },
    "updated_date": {
        "type": "date",
        "description": "Date the customer record was last updated in the source system",
        "column": "source_updated_at",
    },
    "synced_date": {
        "type": "date",
        "description": "Date the customer record was last synced into the data warehouse",
        "column": "synced_at",
    },
}

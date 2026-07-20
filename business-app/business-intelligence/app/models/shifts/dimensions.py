"""Semantic dimension definitions for the Shifts (FactShift) domain.

These plain-dict entries describe FactShift columns for the semantic engine.
"""

SHIFT_DIMENSIONS: dict = {
    "company_id": {
        "type": "string",
        "description": "Tenant identifier — isolates data per business",
        "column": "business_id",
    },
    "business_id": {
        "type": "string",
        "description": "Tenant identifier (alias of company_id)",
        "column": "business_id",
    },
    "customer_id": {
        "type": "string",
        "description": "Customer assigned via the shift's contract",
        "column": "customer_id",
    },
    "contract_id": {
        "type": "string",
        "description": "Contract under which the shift was worked",
        "column": "contract_id",
    },
    "shift_date": {
        "type": "date",
        "description": "Date the shift was worked",
        "column": "shift_date",
    },
    "shift_status": {
        "type": "enum",
        "description": "Shift status: draft | confirmed | cancelled",
        "column": "shift_status",
        "values": ["draft", "confirmed", "cancelled"],
    },
    "invoice_status": {
        "type": "enum",
        "description": "Invoice status: pending | invoiced",
        "column": "invoice_status",
        "values": ["pending", "invoiced"],
    },
    "hour_calculation_status": {
        "type": "enum",
        "description": "Hour calculation status: pending | ready | calculated",
        "column": "hour_calculation_status",
        "values": ["pending", "ready", "calculated"],
    },
    "created_from_calendar": {
        "type": "boolean",
        "description": "Whether the shift originated from a calendar import",
        "column": "created_from_calendar",
    },
    "contract_assigned": {
        "type": "boolean",
        "description": "Whether the shift has a contract assigned",
        "column": "contract_assigned",
    },
}

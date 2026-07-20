"""KPI definitions for the Contracts (FactContract) domain.

All KPIs are ratios of two measures. Division-by-zero returns null (not 0 or 1).
The service layer must handle null KPI values gracefully.
"""

CONTRACT_KPIS: dict = {
    # ── Totals ────────────────────────────────────────────────────────────────
    "total_contracts": {
        "description": "Total number of contracts",
        "base_measure": "contract_count",
        "aggregation": "count",
        "format": "integer",
    },
    "active_contracts": {
        "description": "Number of active contracts",
        "base_measure": "active_contract_count",
        "aggregation": "count",
        "format": "integer",
    },
    "average_payment_terms": {
        "description": "Average payment terms in days",
        "base_measure": "avg_payment_terms_days",
        "aggregation": "avg",
        "format": "days",
    },
    # ── Rate KPIs (ratios) ────────────────────────────────────────────────────
    "active_contract_rate": {
        "description": "Active contracts / Total contracts",
        "numerator_measure": "active_contract_count",
        "denominator_measure": "contract_count",
        "format": "percent",
        "division_by_zero": None,
    },
    "open_ended_contract_rate": {
        "description": "Open-ended contracts / Total contracts",
        "numerator_measure": "open_ended_contract_count",
        "denominator_measure": "contract_count",
        "format": "percent",
        "division_by_zero": None,
    },
    # ── Configuration health KPIs ─────────────────────────────────────────────
    "configuration_completion_rate": {
        "description": "Contracts with configurationStatus=complete / Total contracts",
        "numerator_measure": "complete_contract_count",
        "denominator_measure": "contract_count",
        "format": "percent",
        "division_by_zero": None,
    },
    "configuration_warning_rate": {
        "description": "Contracts with configurationStatus=warning / Total contracts",
        "numerator_measure": "warning_contract_count",
        "denominator_measure": "contract_count",
        "format": "percent",
        "division_by_zero": None,
    },
    "configuration_invalid_rate": {
        "description": "Contracts with configurationStatus=invalid / Total contracts",
        "numerator_measure": "invalid_contract_count",
        "denominator_measure": "contract_count",
        "format": "percent",
        "division_by_zero": None,
    },
    # ── Feature coverage KPIs ─────────────────────────────────────────────────
    "holiday_calendar_coverage": {
        "description": (
            "Contracts with holiday rules enabled and a calendar reference / "
            "Contracts with holiday rules enabled. "
            "Phase 1: denominator is holiday_rules_contract_count; "
            "numerator is those with holiday_calendar_id IS NOT NULL."
        ),
        "numerator_measure": "holiday_rules_contract_count",
        "denominator_measure": "holiday_rules_contract_count",
        "note": "Resolved in service layer: count(holiday_rules_enabled AND holiday_calendar_id IS NOT NULL) / count(holiday_rules_enabled)",
        "format": "percent",
        "division_by_zero": None,
    },
    "payment_calendar_coverage": {
        "description": (
            "Contracts with payment calendar enabled and a calendar reference / "
            "Contracts with payment calendar enabled."
        ),
        "note": "Resolved in service layer: count(payment_calendar_enabled AND payment_calendar_id IS NOT NULL) / count(payment_calendar_enabled)",
        "format": "percent",
        "division_by_zero": None,
    },
    "gst_configuration_validity": {
        "description": (
            "(Contracts with GST disabled + Contracts with GST enabled and valid rate) / "
            "Total contracts"
        ),
        "note": "Resolved in service layer as (no_gst_count + valid_gst_count) / total",
        "format": "percent",
        "division_by_zero": None,
    },
    "superannuation_configuration_validity": {
        "description": (
            "(Contracts with super disabled + Contracts with super enabled and valid rate) / "
            "Total contracts"
        ),
        "note": "Resolved in service layer",
        "format": "percent",
        "division_by_zero": None,
    },
}

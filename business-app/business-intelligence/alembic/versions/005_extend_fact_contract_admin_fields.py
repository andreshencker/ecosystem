"""Extend fact_contract with Contract admin fields.

Revision ID: 005_fact_contract_admin
Revises: 004_customer_full_model
Create Date: 2026-07-18

Adds:
    Administrative snapshot columns (invoice_description, work_type, currency,
    GST, scheduled-payment, holiday-rules, payment-calendar, superannuation)
    plus pre-computed configuration health fields so admin queries never need
    to re-derive them at query time.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "005_fact_contract_admin"
down_revision = "004_customer_full_model"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Administrative snapshot columns ───────────────────────────────────────
    op.add_column("fact_contract", sa.Column("invoice_description", sa.Text(), nullable=True))
    op.add_column("fact_contract", sa.Column("work_type", sa.String(30), nullable=True, server_default="contractor"))
    op.add_column("fact_contract", sa.Column("currency", sa.String(3), nullable=True, server_default="AUD"))

    # GST
    op.add_column("fact_contract", sa.Column("charge_gst", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("fact_contract", sa.Column("gst_rate", sa.Numeric(6, 2), nullable=True))

    # Scheduled payment (mutually exclusive with payment_terms_days)
    op.add_column("fact_contract", sa.Column("scheduled_payment_enabled", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("fact_contract", sa.Column("scheduled_payment_day", sa.String(20), nullable=True))

    # Holiday rules
    op.add_column("fact_contract", sa.Column("holiday_rules_enabled", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("fact_contract", sa.Column("holiday_calendar_id", sa.String(50), nullable=True))
    op.add_column("fact_contract", sa.Column("holiday_calendar_name", sa.String(200), nullable=True))
    op.add_column("fact_contract", sa.Column("holiday_behaviour", sa.String(30), nullable=True))

    # Payment calendar
    op.add_column("fact_contract", sa.Column("payment_calendar_enabled", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("fact_contract", sa.Column("payment_calendar_id", sa.String(50), nullable=True))

    # Superannuation
    op.add_column("fact_contract", sa.Column("super_enabled", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("fact_contract", sa.Column("super_rate", sa.Numeric(5, 2), nullable=True))
    op.add_column("fact_contract", sa.Column("super_payment_frequency", sa.String(30), nullable=True))

    # Business / customer display name snapshots (denormalized for fast admin queries)
    op.add_column("fact_contract", sa.Column("business_name", sa.String(200), nullable=True))
    op.add_column("fact_contract", sa.Column("customer_name", sa.String(200), nullable=True))

    # ── Configuration health (computed at ETL transform time) ─────────────────
    op.add_column(
        "fact_contract",
        sa.Column(
            "configuration_status",
            sa.String(10),
            nullable=False,
            server_default="complete",
        ),
    )
    op.add_column(
        "fact_contract",
        sa.Column("support_issue_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "fact_contract",
        sa.Column("support_issues", postgresql.ARRAY(sa.Text()), nullable=True),
    )

    # ── Indexes for common admin filter columns ───────────────────────────────
    op.create_index("ix_fact_contract_work_type", "fact_contract", ["work_type"])
    op.create_index("ix_fact_contract_currency", "fact_contract", ["currency"])
    op.create_index("ix_fact_contract_charge_gst", "fact_contract", ["charge_gst"])
    op.create_index("ix_fact_contract_holiday_rules_enabled", "fact_contract", ["holiday_rules_enabled"])
    op.create_index("ix_fact_contract_payment_calendar_enabled", "fact_contract", ["payment_calendar_enabled"])
    op.create_index("ix_fact_contract_super_enabled", "fact_contract", ["super_enabled"])
    op.create_index("ix_fact_contract_configuration_status", "fact_contract", ["configuration_status"])
    op.create_index("ix_fact_contract_source_created_at", "fact_contract", ["source_created_at"])
    op.create_index("ix_fact_contract_source_updated_at", "fact_contract", ["source_updated_at"])


def downgrade() -> None:
    op.drop_index("ix_fact_contract_source_updated_at", table_name="fact_contract")
    op.drop_index("ix_fact_contract_source_created_at", table_name="fact_contract")
    op.drop_index("ix_fact_contract_configuration_status", table_name="fact_contract")
    op.drop_index("ix_fact_contract_super_enabled", table_name="fact_contract")
    op.drop_index("ix_fact_contract_payment_calendar_enabled", table_name="fact_contract")
    op.drop_index("ix_fact_contract_holiday_rules_enabled", table_name="fact_contract")
    op.drop_index("ix_fact_contract_charge_gst", table_name="fact_contract")
    op.drop_index("ix_fact_contract_currency", table_name="fact_contract")
    op.drop_index("ix_fact_contract_work_type", table_name="fact_contract")

    for col in [
        "support_issues", "support_issue_count", "configuration_status",
        "customer_name", "business_name",
        "super_payment_frequency", "super_rate", "super_enabled",
        "payment_calendar_id", "payment_calendar_enabled",
        "holiday_behaviour", "holiday_calendar_name", "holiday_calendar_id", "holiday_rules_enabled",
        "scheduled_payment_day", "scheduled_payment_enabled",
        "gst_rate", "charge_gst",
        "currency", "work_type", "invoice_description",
    ]:
        op.drop_column("fact_contract", col)

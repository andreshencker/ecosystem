"""add fact_contract and fact_shift tables

Revision ID: 002_fact_contract_shift
Revises: 001_etl_sync_state
Create Date: 2026-07-12

Adds:
    fact_contract  — denormalized contract analytical rows (string source_id)
    fact_shift     — denormalized shift analytical rows (string source_id)

Both tables use plain String IDs (no FK constraints) so ETL can populate them
without pre-loading dim_business / dim_customer.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "002_fact_contract_shift"
down_revision = "001_etl_sync_state"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── fact_contract ─────────────────────────────────────────────────────────
    op.create_table(
        "fact_contract",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("source_id", sa.String(50), nullable=False),
        sa.Column("business_id", sa.String(50), nullable=False),
        sa.Column("customer_id", sa.String(50), nullable=True),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("position_name", sa.String(200), nullable=False),
        sa.Column("billing_cycle", sa.String(30), nullable=False),
        sa.Column("payment_terms_days", sa.Integer(), nullable=True),
        sa.Column("rate_type", sa.String(30), nullable=False),
        sa.Column("minimum_hours", sa.Numeric(8, 2), nullable=True),
        sa.Column("default_break_minutes", sa.Integer(), nullable=True),
        sa.Column("max_hourly_rate", sa.Numeric(18, 2), nullable=True),
        sa.Column("min_hourly_rate", sa.Numeric(18, 2), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("source_created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "synced_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("source_id", name="uq_fact_contract_source_id"),
    )
    op.create_index("ix_fact_contract_source_id", "fact_contract", ["source_id"])
    op.create_index("ix_fact_contract_business_id", "fact_contract", ["business_id"])
    op.create_index("ix_fact_contract_customer_id", "fact_contract", ["customer_id"])
    op.create_index("ix_fact_contract_status", "fact_contract", ["status"])

    # ── fact_shift ────────────────────────────────────────────────────────────
    op.create_table(
        "fact_shift",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("source_id", sa.String(50), nullable=False),
        sa.Column("business_id", sa.String(50), nullable=False),
        sa.Column("contract_id", sa.String(50), nullable=True),
        sa.Column("customer_id", sa.String(50), nullable=True),
        sa.Column("shift_date", sa.Date(), nullable=True),
        sa.Column("start_time", sa.String(10), nullable=True),
        sa.Column("end_time", sa.String(10), nullable=True),
        sa.Column("break_minutes", sa.Integer(), nullable=True),
        sa.Column("duration_minutes", sa.Numeric(10, 2), nullable=True),
        sa.Column("duration_hours", sa.Numeric(8, 2), nullable=True),
        sa.Column("shift_status", sa.String(20), nullable=False),
        sa.Column("invoice_status", sa.String(20), nullable=False),
        sa.Column("hour_calculation_status", sa.String(20), nullable=True),
        sa.Column(
            "created_from_calendar",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "contract_assigned",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("location", sa.String(500), nullable=True),
        sa.Column("title", sa.String(500), nullable=True),
        sa.Column("source_created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "synced_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("source_id", name="uq_fact_shift_source_id"),
    )
    op.create_index("ix_fact_shift_source_id", "fact_shift", ["source_id"])
    op.create_index("ix_fact_shift_business_id", "fact_shift", ["business_id"])
    op.create_index("ix_fact_shift_contract_id", "fact_shift", ["contract_id"])
    op.create_index("ix_fact_shift_customer_id", "fact_shift", ["customer_id"])
    op.create_index("ix_fact_shift_shift_date", "fact_shift", ["shift_date"])
    op.create_index("ix_fact_shift_shift_status", "fact_shift", ["shift_status"])
    op.create_index("ix_fact_shift_invoice_status", "fact_shift", ["invoice_status"])


def downgrade() -> None:
    op.drop_index("ix_fact_shift_invoice_status", table_name="fact_shift")
    op.drop_index("ix_fact_shift_shift_status", table_name="fact_shift")
    op.drop_index("ix_fact_shift_shift_date", table_name="fact_shift")
    op.drop_index("ix_fact_shift_customer_id", table_name="fact_shift")
    op.drop_index("ix_fact_shift_contract_id", table_name="fact_shift")
    op.drop_index("ix_fact_shift_business_id", table_name="fact_shift")
    op.drop_index("ix_fact_shift_source_id", table_name="fact_shift")
    op.drop_table("fact_shift")

    op.drop_index("ix_fact_contract_status", table_name="fact_contract")
    op.drop_index("ix_fact_contract_customer_id", table_name="fact_contract")
    op.drop_index("ix_fact_contract_business_id", table_name="fact_contract")
    op.drop_index("ix_fact_contract_source_id", table_name="fact_contract")
    op.drop_table("fact_contract")

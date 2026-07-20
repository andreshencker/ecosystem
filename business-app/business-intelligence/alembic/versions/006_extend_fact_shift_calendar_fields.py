"""Extend fact_shift with calendar-tracking and pending-assignment fields.

Revision ID: 006_fact_shift_calendar
Revises: 005_fact_contract_admin
Create Date: 2026-07-18

Adds:
    Calendar traceability (linked_calendar_id, calendar_name, calendar_provider,
    calendar_account, sync_status, last_external_update) so BI can report which
    source calendar produced each Shift.

    These fields mirror the Shift MongoDB document and are set by the ETL
    transformer — never calculated by callers.
"""
from alembic import op
import sqlalchemy as sa


revision = "006_fact_shift_calendar"
down_revision = "005_fact_contract_admin"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # New columns — not present in migration 002
    op.add_column("fact_shift", sa.Column("linked_calendar_id",   sa.String(100), nullable=True))
    op.add_column("fact_shift", sa.Column("calendar_name",        sa.String(200), nullable=True))
    op.add_column("fact_shift", sa.Column("calendar_provider",    sa.String(50),  nullable=True))
    op.add_column("fact_shift", sa.Column("calendar_account",     sa.String(200), nullable=True))
    op.add_column("fact_shift", sa.Column("sync_status",          sa.String(20),  nullable=True))
    op.add_column("fact_shift", sa.Column("last_external_update", sa.DateTime(timezone=True), nullable=True))

    # New indexes only — business_id, contract_id, shift_date were already created in 002
    op.create_index("ix_fact_shift_linked_calendar_id",    "fact_shift", ["linked_calendar_id"])
    op.create_index("ix_fact_shift_contract_assigned",     "fact_shift", ["contract_assigned"])
    op.create_index("ix_fact_shift_created_from_calendar", "fact_shift", ["created_from_calendar"])
    op.create_index("ix_fact_shift_sync_status",           "fact_shift", ["sync_status"])


def downgrade() -> None:
    for idx in [
        "ix_fact_shift_sync_status",
        "ix_fact_shift_created_from_calendar",
        "ix_fact_shift_contract_assigned",
        "ix_fact_shift_linked_calendar_id",
    ]:
        op.drop_index(idx, table_name="fact_shift")
    for col in ["last_external_update", "sync_status", "calendar_account",
                "calendar_provider", "calendar_name", "linked_calendar_id"]:
        op.drop_column("fact_shift", col)

"""Extend fact_shift with invoice-calculation support fields.

Revision ID: 007_fact_shift_invoice
Revises: 006_fact_shift_calendar
Create Date: 2026-07-24

Adds:
    break_taken (Boolean) — mirrors Shift.breakTaken; used by BI pending-
    invoice calculation to determine which contract defaultBreakMinutes to
    apply per shift.

    end_date (Date) — mirrors Shift.endDate; stores the local end date for
    overnight shifts (null = same-day shift). Used alongside end_time for
    accurate gross-duration computation.

The ETL shift_transformer was also fixed in this sprint to handle overnight
shifts correctly (gross_minutes += 1440 when end_time < start_time).
"""
from alembic import op
import sqlalchemy as sa


revision = "007_fact_shift_invoice"
down_revision = "006_fact_shift_calendar"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("fact_shift", sa.Column("break_taken", sa.Boolean, nullable=True))
    op.add_column("fact_shift", sa.Column("end_date", sa.Date, nullable=True))


def downgrade() -> None:
    op.drop_column("fact_shift", "end_date")
    op.drop_column("fact_shift", "break_taken")

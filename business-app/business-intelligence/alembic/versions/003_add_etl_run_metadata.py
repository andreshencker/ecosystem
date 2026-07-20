"""add etl_run_metadata table

Revision ID: 003_etl_run_metadata
Revises: 002_add_fact_contract_and_fact_shift
Create Date: 2026-07-12

Adds an append-only audit log for every ETL pipeline run.
Distinct from etl_sync_state (which stores the latest cursor per model);
etl_run_metadata is an immutable history of all past runs.
"""
from alembic import op
import sqlalchemy as sa

revision = "003_etl_run_metadata"
down_revision = "002_fact_contract_shift"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "etl_run_metadata",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("company_id", sa.String(50), nullable=False),
        sa.Column("model_name", sa.String(50), nullable=False),
        sa.Column("sync_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sync_finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("rows_read", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rows_written", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rows_failed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rows_skipped", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cursor_from", sa.String(100), nullable=True),
        sa.Column("cursor_to", sa.String(100), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="running"),
        sa.Column("error_summary", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_etl_run_metadata_company_id", "etl_run_metadata", ["company_id"])
    op.create_index("ix_etl_run_metadata_model_name", "etl_run_metadata", ["model_name"])
    op.create_index("ix_etl_run_metadata_sync_started_at", "etl_run_metadata", ["sync_started_at"])
    op.create_index("ix_etl_run_metadata_status", "etl_run_metadata", ["status"])


def downgrade() -> None:
    op.drop_index("ix_etl_run_metadata_status", table_name="etl_run_metadata")
    op.drop_index("ix_etl_run_metadata_sync_started_at", table_name="etl_run_metadata")
    op.drop_index("ix_etl_run_metadata_model_name", table_name="etl_run_metadata")
    op.drop_index("ix_etl_run_metadata_company_id", table_name="etl_run_metadata")
    op.drop_table("etl_run_metadata")

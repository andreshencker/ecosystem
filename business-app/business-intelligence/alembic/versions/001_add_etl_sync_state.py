"""add etl_sync_state table

Revision ID: 001_etl_sync_state
Revises: 32d1d2706e72
Create Date: 2026-07-11

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "001_etl_sync_state"
down_revision = "32d1d2706e72"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "etl_sync_state",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("company_id", sa.String(50), nullable=False),
        sa.Column("model_name", sa.String(50), nullable=False),
        sa.Column("last_cursor", sa.String(100), nullable=True),
        sa.Column("last_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "last_status",
            sa.String(20),
            nullable=False,
            server_default="never",
        ),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column(
            "records_processed",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "company_id",
            "model_name",
            name="uq_sync_state_company_model",
        ),
    )
    op.create_index(
        "ix_etl_sync_state_company_id",
        "etl_sync_state",
        ["company_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_etl_sync_state_company_id", table_name="etl_sync_state")
    op.drop_table("etl_sync_state")

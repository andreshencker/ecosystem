"""Customer full analytical model — bridge tables and extended dim_customer columns.

Revision ID: 004_customer_full_model
Revises: 003_etl_run_metadata
Create Date: 2026-07-15

Extends dim_customer with enrichment columns (contact/location/communication
aggregates, data-quality flags, timestamps) and creates four bridge tables that
capture the child collections from the operational MongoDB Customer document.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "004_customer_full_model"
down_revision = "003_etl_run_metadata"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # ALTER dim_customer — add enrichment columns
    # ------------------------------------------------------------------
    op.add_column("dim_customer", sa.Column("notes", sa.Text(), nullable=True))
    op.add_column("dim_customer", sa.Column("contact_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("dim_customer", sa.Column("location_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("dim_customer", sa.Column("communication_purpose_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("dim_customer", sa.Column("email_recipient_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("dim_customer", sa.Column("sms_recipient_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("dim_customer", sa.Column("has_primary_contact", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("dim_customer", sa.Column("has_abn", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("dim_customer", sa.Column("has_locations", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("dim_customer", sa.Column("has_contacts", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("dim_customer", sa.Column("has_communication_configuration", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("dim_customer", sa.Column("data_quality_issue_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("dim_customer", sa.Column("data_quality_issues", postgresql.ARRAY(sa.Text()), nullable=True))
    op.add_column("dim_customer", sa.Column("source_created_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("dim_customer", sa.Column("source_updated_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("dim_customer", sa.Column("synced_at", sa.DateTime(timezone=True), nullable=True))

    # Indexes on dim_customer
    op.create_index("ix_dim_customer_customer_type", "dim_customer", ["customer_type"])
    op.create_index("ix_dim_customer_is_active", "dim_customer", ["is_active"])
    op.create_index("ix_dim_customer_source_updated_at", "dim_customer", ["source_updated_at"])

    # ------------------------------------------------------------------
    # CREATE bridge_customer_location
    # ------------------------------------------------------------------
    op.create_table(
        "bridge_customer_location",
        sa.Column("customer_location_key", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "customer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("dim_customer.customer_id"),
            nullable=False,
        ),
        sa.Column(
            "business_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("dim_business.business_id"),
            nullable=False,
        ),
        sa.Column("source_location_id", sa.String(100), nullable=True),
        sa.Column("tag", sa.String(100), nullable=True),
        sa.Column("country", sa.String(100), nullable=True),
        sa.Column("address_line_1", sa.String(200), nullable=True),
        sa.Column("address_line_2", sa.String(200), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("postcode", sa.String(20), nullable=True),
        sa.Column("state", sa.String(100), nullable=True),
        sa.Column("full_address", sa.Text(), nullable=True),
        sa.Column("is_valid_address", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_legacy", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "synced_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_bridge_customer_location_customer_id", "bridge_customer_location", ["customer_id"])
    op.create_index("ix_bridge_customer_location_business_id", "bridge_customer_location", ["business_id"])

    # ------------------------------------------------------------------
    # CREATE bridge_customer_contact
    # ------------------------------------------------------------------
    op.create_table(
        "bridge_customer_contact",
        sa.Column("customer_contact_key", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "customer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("dim_customer.customer_id"),
            nullable=False,
        ),
        sa.Column(
            "business_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("dim_business.business_id"),
            nullable=False,
        ),
        sa.Column("source_contact_id", sa.String(100), nullable=True),
        sa.Column("contact_name", sa.String(200), nullable=True),
        sa.Column("role_or_position", sa.String(100), nullable=True),
        sa.Column("email", sa.String(254), nullable=True),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column("location_id", sa.String(100), nullable=True),
        sa.Column("location_tag", sa.String(100), nullable=True),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("has_email", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("has_phone", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("has_location", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "synced_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_bridge_customer_contact_customer_id", "bridge_customer_contact", ["customer_id"])
    op.create_index("ix_bridge_customer_contact_business_id", "bridge_customer_contact", ["business_id"])
    op.create_index("ix_bridge_customer_contact_email", "bridge_customer_contact", ["email"])

    # ------------------------------------------------------------------
    # CREATE bridge_customer_communication_purpose
    # ------------------------------------------------------------------
    op.create_table(
        "bridge_customer_communication_purpose",
        sa.Column("customer_communication_purpose_key", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "customer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("dim_customer.customer_id"),
            nullable=False,
        ),
        sa.Column(
            "business_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("dim_business.business_id"),
            nullable=False,
        ),
        sa.Column("communication_domain_id", sa.String(100), nullable=False),
        sa.Column("configured_channel_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("email_recipient_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("sms_recipient_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("has_email_channel", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("has_sms_channel", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "synced_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_bridge_customer_comm_purpose_customer_id",
        "bridge_customer_communication_purpose",
        ["customer_id"],
    )
    op.create_index(
        "ix_bridge_customer_comm_purpose_business_id",
        "bridge_customer_communication_purpose",
        ["business_id"],
    )
    op.create_index(
        "ix_bridge_customer_comm_purpose_domain_id",
        "bridge_customer_communication_purpose",
        ["communication_domain_id"],
    )

    # ------------------------------------------------------------------
    # CREATE bridge_customer_communication_recipient
    # ------------------------------------------------------------------
    op.create_table(
        "bridge_customer_communication_recipient",
        sa.Column("customer_recipient_key", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "customer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("dim_customer.customer_id"),
            nullable=False,
        ),
        sa.Column(
            "business_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("dim_business.business_id"),
            nullable=False,
        ),
        sa.Column("communication_domain_id", sa.String(100), nullable=False),
        sa.Column("channel", sa.String(20), nullable=False),
        sa.Column("destination", sa.String(254), nullable=True),
        sa.Column("recipient_type", sa.String(10), nullable=True),
        sa.Column("destination_normalized", sa.String(254), nullable=True),
        sa.Column("is_valid_destination", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "synced_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_bridge_customer_comm_recipient_customer_id",
        "bridge_customer_communication_recipient",
        ["customer_id"],
    )
    op.create_index(
        "ix_bridge_customer_comm_recipient_business_id",
        "bridge_customer_communication_recipient",
        ["business_id"],
    )
    op.create_index(
        "ix_bridge_customer_comm_recipient_channel",
        "bridge_customer_communication_recipient",
        ["channel"],
    )
    op.create_index(
        "ix_bridge_customer_comm_recipient_destination_normalized",
        "bridge_customer_communication_recipient",
        ["destination_normalized"],
    )


def downgrade() -> None:
    # Drop bridge tables in reverse dependency order
    op.drop_index("ix_bridge_customer_comm_recipient_destination_normalized", table_name="bridge_customer_communication_recipient")
    op.drop_index("ix_bridge_customer_comm_recipient_channel", table_name="bridge_customer_communication_recipient")
    op.drop_index("ix_bridge_customer_comm_recipient_business_id", table_name="bridge_customer_communication_recipient")
    op.drop_index("ix_bridge_customer_comm_recipient_customer_id", table_name="bridge_customer_communication_recipient")
    op.drop_table("bridge_customer_communication_recipient")

    op.drop_index("ix_bridge_customer_comm_purpose_domain_id", table_name="bridge_customer_communication_purpose")
    op.drop_index("ix_bridge_customer_comm_purpose_business_id", table_name="bridge_customer_communication_purpose")
    op.drop_index("ix_bridge_customer_comm_purpose_customer_id", table_name="bridge_customer_communication_purpose")
    op.drop_table("bridge_customer_communication_purpose")

    op.drop_index("ix_bridge_customer_contact_email", table_name="bridge_customer_contact")
    op.drop_index("ix_bridge_customer_contact_business_id", table_name="bridge_customer_contact")
    op.drop_index("ix_bridge_customer_contact_customer_id", table_name="bridge_customer_contact")
    op.drop_table("bridge_customer_contact")

    op.drop_index("ix_bridge_customer_location_business_id", table_name="bridge_customer_location")
    op.drop_index("ix_bridge_customer_location_customer_id", table_name="bridge_customer_location")
    op.drop_table("bridge_customer_location")

    # Remove indexes from dim_customer
    op.drop_index("ix_dim_customer_source_updated_at", table_name="dim_customer")
    op.drop_index("ix_dim_customer_is_active", table_name="dim_customer")
    op.drop_index("ix_dim_customer_customer_type", table_name="dim_customer")

    # Drop added columns from dim_customer
    op.drop_column("dim_customer", "synced_at")
    op.drop_column("dim_customer", "source_updated_at")
    op.drop_column("dim_customer", "source_created_at")
    op.drop_column("dim_customer", "data_quality_issues")
    op.drop_column("dim_customer", "data_quality_issue_count")
    op.drop_column("dim_customer", "has_communication_configuration")
    op.drop_column("dim_customer", "has_contacts")
    op.drop_column("dim_customer", "has_locations")
    op.drop_column("dim_customer", "has_abn")
    op.drop_column("dim_customer", "has_primary_contact")
    op.drop_column("dim_customer", "sms_recipient_count")
    op.drop_column("dim_customer", "email_recipient_count")
    op.drop_column("dim_customer", "communication_purpose_count")
    op.drop_column("dim_customer", "location_count")
    op.drop_column("dim_customer", "contact_count")
    op.drop_column("dim_customer", "notes")

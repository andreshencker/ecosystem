"""SQLAlchemy model for the dim_customer dimension table."""
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID

from app.database.postgres import Base


class DimCustomer(Base):
    __tablename__ = "dim_customer"

    # Primary key / foreign keys
    customer_id = Column(UUID(as_uuid=True), primary_key=True)
    business_id = Column(
        UUID(as_uuid=True),
        ForeignKey("dim_business.business_id"),
        nullable=False,
        index=True,
    )

    # Core identity
    display_name = Column(String(200), nullable=False)
    customer_type = Column(String(20), nullable=False)  # 'company' | 'individual'
    abn = Column(String(11), nullable=True)
    email = Column(String(254), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    notes = Column(Text, nullable=True)

    # Aggregate counts (denormalised from child collections)
    contact_count = Column(Integer, nullable=False, default=0)
    location_count = Column(Integer, nullable=False, default=0)
    communication_purpose_count = Column(Integer, nullable=False, default=0)
    email_recipient_count = Column(Integer, nullable=False, default=0)
    sms_recipient_count = Column(Integer, nullable=False, default=0)

    # Profile-completeness flags
    has_primary_contact = Column(Boolean, nullable=False, default=False)
    has_abn = Column(Boolean, nullable=False, default=False)
    has_locations = Column(Boolean, nullable=False, default=False)
    has_contacts = Column(Boolean, nullable=False, default=False)
    has_communication_configuration = Column(Boolean, nullable=False, default=False)

    # Data quality
    data_quality_issue_count = Column(Integer, nullable=False, default=0)
    data_quality_issues = Column(ARRAY(Text), nullable=True)

    # Timestamps (operational source)
    source_created_at = Column(DateTime(timezone=True), nullable=True)
    source_updated_at = Column(DateTime(timezone=True), nullable=True)
    synced_at = Column(DateTime(timezone=True), nullable=True)

    # Legacy timestamps kept for backward compatibility with existing queries
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)

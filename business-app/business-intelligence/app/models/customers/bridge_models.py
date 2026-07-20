"""SQLAlchemy bridge models for the Customer domain child collections.

Four tables mirror the child arrays from the operational MongoDB Customer document:
  - BridgeCustomerLocation       → customers[].locations[]
  - BridgeCustomerContact        → customers[].contacts[]
  - BridgeCustomerCommunicationPurpose  → customers[].communicationPurposes[]
  - BridgeCustomerCommunicationRecipient → customers[].communicationPurposes[].channels[].recipients[]

All bridge tables use deterministic UUIDs as primary keys so that a full
replace-by-customer-id cycle is idempotent.
"""
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database.postgres import Base


class BridgeCustomerLocation(Base):
    __tablename__ = "bridge_customer_location"

    customer_location_key = Column(UUID(as_uuid=True), primary_key=True)
    customer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("dim_customer.customer_id"),
        nullable=False,
        index=True,
    )
    business_id = Column(
        UUID(as_uuid=True),
        ForeignKey("dim_business.business_id"),
        nullable=False,
        index=True,
    )
    source_location_id = Column(String(100), nullable=True)
    tag = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    address_line_1 = Column(String(200), nullable=True)
    address_line_2 = Column(String(200), nullable=True)
    city = Column(String(100), nullable=True)
    postcode = Column(String(20), nullable=True)
    state = Column(String(100), nullable=True)
    # Derived: "line1, line2, city, postcode, state, country"
    full_address = Column(Text, nullable=True)
    # True if has country AND line1 AND city AND postcode
    is_valid_address = Column(Boolean, nullable=False, default=False)
    # True if synthesized from legacy flat address field
    is_legacy = Column(Boolean, nullable=False, default=False)
    synced_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class BridgeCustomerContact(Base):
    __tablename__ = "bridge_customer_contact"

    customer_contact_key = Column(UUID(as_uuid=True), primary_key=True)
    customer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("dim_customer.customer_id"),
        nullable=False,
        index=True,
    )
    business_id = Column(
        UUID(as_uuid=True),
        ForeignKey("dim_business.business_id"),
        nullable=False,
        index=True,
    )
    source_contact_id = Column(String(100), nullable=True)
    contact_name = Column(String(200), nullable=True)
    role_or_position = Column(String(100), nullable=True)
    email = Column(String(254), nullable=True, index=True)
    phone = Column(String(30), nullable=True)
    # Source locationId field for cross-referencing
    location_id = Column(String(100), nullable=True)
    # Denormalized display tag looked up from BridgeCustomerLocation
    location_tag = Column(String(100), nullable=True)
    is_primary = Column(Boolean, nullable=False, default=False)
    has_email = Column(Boolean, nullable=False, default=False)
    has_phone = Column(Boolean, nullable=False, default=False)
    has_location = Column(Boolean, nullable=False, default=False)
    synced_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class BridgeCustomerCommunicationPurpose(Base):
    __tablename__ = "bridge_customer_communication_purpose"

    customer_communication_purpose_key = Column(UUID(as_uuid=True), primary_key=True)
    customer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("dim_customer.customer_id"),
        nullable=False,
        index=True,
    )
    business_id = Column(
        UUID(as_uuid=True),
        ForeignKey("dim_business.business_id"),
        nullable=False,
        index=True,
    )
    communication_domain_id = Column(String(100), nullable=False, index=True)
    configured_channel_count = Column(Integer, nullable=False, default=0)
    email_recipient_count = Column(Integer, nullable=False, default=0)
    sms_recipient_count = Column(Integer, nullable=False, default=0)
    has_email_channel = Column(Boolean, nullable=False, default=False)
    has_sms_channel = Column(Boolean, nullable=False, default=False)
    synced_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class BridgeCustomerCommunicationRecipient(Base):
    __tablename__ = "bridge_customer_communication_recipient"

    customer_recipient_key = Column(UUID(as_uuid=True), primary_key=True)
    customer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("dim_customer.customer_id"),
        nullable=False,
        index=True,
    )
    business_id = Column(
        UUID(as_uuid=True),
        ForeignKey("dim_business.business_id"),
        nullable=False,
        index=True,
    )
    communication_domain_id = Column(String(100), nullable=False)
    # 'email' | 'sms'
    channel = Column(String(20), nullable=False, index=True)
    destination = Column(String(254), nullable=True)
    # 'to' | 'cc' | 'bcc' | None (for SMS)
    recipient_type = Column(String(10), nullable=True)
    destination_normalized = Column(String(254), nullable=True, index=True)
    is_valid_destination = Column(Boolean, nullable=False, default=False)
    synced_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

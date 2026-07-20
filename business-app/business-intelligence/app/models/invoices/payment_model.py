from sqlalchemy import Column, String, Numeric, Boolean, Integer, DateTime, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database.postgres import Base


class FactPayment(Base):
    __tablename__ = "fact_payment"

    fact_id          = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    event_id         = Column(UUID(as_uuid=True), nullable=False, unique=True)

    # FKs
    business_id      = Column(UUID(as_uuid=True), ForeignKey("dim_business.business_id"), nullable=False, index=True)
    customer_id      = Column(UUID(as_uuid=True), ForeignKey("dim_customer.customer_id"))
    payment_date_key = Column(Date, ForeignKey("dim_time.date_key"))

    # Operational identity
    payment_id       = Column(UUID(as_uuid=True), nullable=False)
    invoice_id       = Column(UUID(as_uuid=True), nullable=False)

    # Amounts
    amount           = Column(Numeric(18, 2), nullable=False)
    currency         = Column(String(3), default="AUD", nullable=False)
    payment_method   = Column(String(50))

    # State
    is_reversed      = Column(Boolean, default=False)

    # Derived
    days_to_payment  = Column(Integer)   # payment_date - invoice_issue_date

    ingested_at      = Column(DateTime(timezone=True), server_default=func.now())

from sqlalchemy import Column, String, Numeric, DateTime, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database.postgres import Base


class FactCustomerActivity(Base):
    __tablename__ = "fact_customer_activity"

    fact_id           = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    event_id          = Column(UUID(as_uuid=True), nullable=False, unique=True)

    # FKs
    business_id       = Column(UUID(as_uuid=True), ForeignKey("dim_business.business_id"), nullable=False, index=True)
    customer_id       = Column(UUID(as_uuid=True), ForeignKey("dim_customer.customer_id"), nullable=False)
    activity_date_key = Column(Date, ForeignKey("dim_time.date_key"), nullable=False)

    # Activity
    activity_type     = Column(String(50), nullable=False)
    # 'customer_created' | 'customer_deactivated' | 'first_invoice_sent' | 'first_payment_received'

    # Optional context
    reference_id      = Column(UUID(as_uuid=True))
    amount            = Column(Numeric(18, 2))
    currency          = Column(String(3))

    ingested_at       = Column(DateTime(timezone=True), server_default=func.now())

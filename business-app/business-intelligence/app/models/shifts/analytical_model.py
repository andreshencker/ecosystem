from sqlalchemy import Column, String, Numeric, Boolean, DateTime, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database.postgres import Base


class FactWorkEvent(Base):
    __tablename__ = "fact_work_event"

    fact_id           = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    event_id          = Column(UUID(as_uuid=True), nullable=False, unique=True)

    # FKs
    business_id       = Column(UUID(as_uuid=True), ForeignKey("dim_business.business_id"), nullable=False, index=True)
    customer_id       = Column(UUID(as_uuid=True), ForeignKey("dim_customer.customer_id"))
    user_id           = Column(UUID(as_uuid=True), ForeignKey("dim_user.user_id"))
    work_date_key     = Column(Date, ForeignKey("dim_time.date_key"))

    # Operational identity
    work_event_id     = Column(UUID(as_uuid=True), nullable=False)
    contract_id       = Column(UUID(as_uuid=True))

    # Metrics
    duration_minutes  = Column(Numeric(10, 2), nullable=False)
    duration_hours    = Column(Numeric(8, 2), nullable=False)
    calculated_amount = Column(Numeric(18, 2))
    currency          = Column(String(3), default="AUD")
    rate_type         = Column(String(30))   # 'standard'|'overtime'|'weekend'|'night'
    billable          = Column(Boolean, default=True)

    # State
    is_voided         = Column(Boolean, default=False)
    source            = Column(String(20))   # 'manual'|'calendar'

    ingested_at       = Column(DateTime(timezone=True), server_default=func.now())

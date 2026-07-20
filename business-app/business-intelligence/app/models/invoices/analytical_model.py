from sqlalchemy import Column, String, Numeric, Boolean, Integer, DateTime, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database.postgres import Base


class FactInvoice(Base):
    __tablename__ = "fact_invoice"

    fact_id          = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    event_id         = Column(UUID(as_uuid=True), nullable=False, unique=True)

    # FKs
    business_id      = Column(UUID(as_uuid=True), ForeignKey("dim_business.business_id"), nullable=False, index=True)
    customer_id      = Column(UUID(as_uuid=True), ForeignKey("dim_customer.customer_id"))
    issue_date_key   = Column(Date, ForeignKey("dim_time.date_key"))
    due_date_key     = Column(Date, ForeignKey("dim_time.date_key"))

    # Operational identity
    invoice_id       = Column(UUID(as_uuid=True), nullable=False)
    invoice_number   = Column(String(50))

    # Amounts
    subtotal         = Column(Numeric(18, 2), default=0)
    tax_amount       = Column(Numeric(18, 2), default=0)
    gross_amount     = Column(Numeric(18, 2), nullable=False)
    currency         = Column(String(3), default="AUD", nullable=False)

    # State at event time
    event_type       = Column(String(30), nullable=False)   # 'sent'|'paid'|'voided'|'overdue'
    is_voided        = Column(Boolean, default=False)

    # Derived metrics
    work_event_count = Column(Integer, default=0)
    days_to_due      = Column(Integer)

    ingested_at      = Column(DateTime(timezone=True), server_default=func.now())

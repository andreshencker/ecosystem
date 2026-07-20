"""ContractSnapshot — administrative snapshot of a Contract entity.

Architectural note: Contracts are entities (dimensions), not events (facts).
This table is named ``fact_contract`` for historical reasons; semantically it
acts as a slowly-changing snapshot of the operational Contract document.

Design decisions:
- Uses String source IDs (MongoDB ObjectId hex) — no FK constraints.
- ETL can populate this table independently of dim_business/dim_customer.
- Idempotency key: source_id (raw ObjectId hex).
- Configuration health (configuration_status, support_issues) is computed
  at ETL transform time — never recalculated by callers.
- ``ContractSnapshot`` is the canonical name; ``FactContract`` is kept as an
  alias so all existing imports remain valid without change.
"""
from sqlalchemy import Boolean, Column, Integer, Numeric, String, Text, DateTime, Date
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.sql import func

from app.database.postgres import Base


class FactContract(Base):
    __tablename__ = "fact_contract"

    # ── Primary key and idempotency ───────────────────────────────────────────
    id = Column(Integer, primary_key=True, autoincrement=True)
    source_id = Column(String(50), nullable=False, unique=True, index=True)

    # ── Tenant and relationships ──────────────────────────────────────────────
    business_id = Column(String(50), nullable=False, index=True)
    customer_id = Column(String(50), nullable=True, index=True)

    # ── Core contract fields ──────────────────────────────────────────────────
    status = Column(String(30), nullable=False, index=True)
    position_name = Column(String(200), nullable=False)
    invoice_description = Column(Text, nullable=True)
    work_type = Column(String(30), nullable=True)

    # ── Billing ───────────────────────────────────────────────────────────────
    billing_cycle = Column(String(30), nullable=False)
    payment_terms_days = Column(Integer, nullable=True)
    scheduled_payment_enabled = Column(Boolean, nullable=False, default=False)
    scheduled_payment_day = Column(String(20), nullable=True)

    # ── Working rules ─────────────────────────────────────────────────────────
    minimum_hours = Column(Numeric(8, 2), nullable=True)
    default_break_minutes = Column(Integer, nullable=True)

    # ── Rate configuration ────────────────────────────────────────────────────
    rate_type = Column(String(30), nullable=False)
    max_hourly_rate = Column(Numeric(18, 2), nullable=True)
    min_hourly_rate = Column(Numeric(18, 2), nullable=True)

    # ── Currency and GST ──────────────────────────────────────────────────────
    currency = Column(String(3), nullable=True)
    charge_gst = Column(Boolean, nullable=False, default=False)
    gst_rate = Column(Numeric(6, 2), nullable=True)

    # ── Dates ─────────────────────────────────────────────────────────────────
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)

    # ── Holiday rules ─────────────────────────────────────────────────────────
    holiday_rules_enabled = Column(Boolean, nullable=False, default=False)
    holiday_calendar_id = Column(String(50), nullable=True)
    holiday_calendar_name = Column(String(200), nullable=True)
    holiday_behaviour = Column(String(30), nullable=True)

    # ── Payment calendar ──────────────────────────────────────────────────────
    payment_calendar_enabled = Column(Boolean, nullable=False, default=False)
    payment_calendar_id = Column(String(50), nullable=True)

    # ── Superannuation ────────────────────────────────────────────────────────
    super_enabled = Column(Boolean, nullable=False, default=False)
    super_rate = Column(Numeric(5, 2), nullable=True)
    super_payment_frequency = Column(String(30), nullable=True)

    # ── Display name snapshots (denormalized, updated on each sync) ───────────
    business_name = Column(String(200), nullable=True)
    customer_name = Column(String(200), nullable=True)

    # ── Configuration health (computed at ETL transform time) ─────────────────
    # Possible values: 'complete' | 'warning' | 'invalid'
    configuration_status = Column(String(10), nullable=False, default="complete")
    support_issue_count = Column(Integer, nullable=False, default=0)
    # Array of stable issue codes, e.g. ['CONTRACT_MISSING_RATE_CONFIGURATION']
    support_issues = Column(ARRAY(Text), nullable=True)

    # ── ETL timestamps ────────────────────────────────────────────────────────
    source_created_at = Column(DateTime(timezone=True), nullable=True)
    source_updated_at = Column(DateTime(timezone=True), nullable=True)
    synced_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


# Canonical alias — use ContractSnapshot in new code.
# FactContract is kept for backward compatibility with existing ETL imports.
ContractSnapshot = FactContract

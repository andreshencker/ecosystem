"""FactShift — denormalized shift analytical record using string IDs (no FK constraints).

Separate from FactWorkEvent (which uses UUID FKs) — this model lets the ETL run
without pre-populated dim_business / dim_customer / dim_user rows. Idempotency
key: source_id.

Calendar fields (linked_calendar_id, calendar_name, calendar_provider,
calendar_account, sync_status, last_external_update) added in migration 006.
"""
from sqlalchemy import Boolean, Column, Date, DateTime, Integer, Numeric, String
from sqlalchemy.sql import func

from app.database.postgres import Base


class FactShift(Base):
    __tablename__ = "fact_shift"

    # ── Primary key and idempotency ───────────────────────────────────────────
    id = Column(Integer, primary_key=True, autoincrement=True)
    source_id = Column(String(50), nullable=False, unique=True, index=True)

    # ── Tenant and relationships ──────────────────────────────────────────────
    business_id = Column(String(50), nullable=False, index=True)
    contract_id = Column(String(50), nullable=True, index=True)
    customer_id = Column(String(50), nullable=True, index=True)

    # ── Schedule ──────────────────────────────────────────────────────────────
    shift_date = Column(Date, nullable=True, index=True)
    start_time = Column(String(10), nullable=True)
    end_time = Column(String(10), nullable=True)
    break_minutes = Column(Integer, nullable=True)
    duration_minutes = Column(Numeric(10, 2), nullable=True)
    duration_hours = Column(Numeric(8, 2), nullable=True)

    # ── Status ────────────────────────────────────────────────────────────────
    shift_status = Column(String(20), nullable=False, index=True)
    invoice_status = Column(String(20), nullable=False, index=True)
    hour_calculation_status = Column(String(20), nullable=True)

    # ── Calendar import tracking ──────────────────────────────────────────────
    created_from_calendar = Column(Boolean, nullable=False, default=False, index=True)
    contract_assigned = Column(Boolean, nullable=False, default=False, index=True)
    linked_calendar_id = Column(String(100), nullable=True, index=True)
    calendar_name = Column(String(200), nullable=True)
    calendar_provider = Column(String(50), nullable=True)
    calendar_account = Column(String(200), nullable=True)
    sync_status = Column(String(20), nullable=True, index=True)
    last_external_update = Column(DateTime(timezone=True), nullable=True)

    # ── Invoice-calculation support ───────────────────────────────────────────
    break_taken = Column(Boolean, nullable=True)
    end_date = Column(Date, nullable=True)

    # ── Detail ────────────────────────────────────────────────────────────────
    location = Column(String(500), nullable=True)
    title = Column(String(500), nullable=True)

    # ── Timestamps ────────────────────────────────────────────────────────────
    source_created_at = Column(DateTime(timezone=True), nullable=True)
    source_updated_at = Column(DateTime(timezone=True), nullable=True)
    synced_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

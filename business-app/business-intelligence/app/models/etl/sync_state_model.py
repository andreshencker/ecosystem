"""SQLAlchemy model for persisting ETL sync state.

One row per (company_id, model_name). The row records the last
successful cursor and the outcome of the most recent run.
"""
from sqlalchemy import Column, DateTime, Integer, String, Text, UniqueConstraint
from sqlalchemy.sql import func

from app.database.postgres import Base


class SyncStateRecord(Base):
    __tablename__ = "etl_sync_state"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(String(50), nullable=False, index=True)
    model_name = Column(String(50), nullable=False)
    last_cursor = Column(String(100), nullable=True)  # ISO timestamp cursor
    last_started_at = Column(DateTime(timezone=True), nullable=True)
    last_completed_at = Column(DateTime(timezone=True), nullable=True)
    last_status = Column(
        String(20), nullable=False, default="never"
    )  # never|running|success|failed
    last_error = Column(Text, nullable=True)
    records_processed = Column(Integer, nullable=False, default=0)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "model_name",
            name="uq_sync_state_company_model",
        ),
    )

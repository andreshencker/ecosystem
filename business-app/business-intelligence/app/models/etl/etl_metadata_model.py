"""EtlRunMetadata — append-only log of every ETL pipeline run.

One row is appended per pipeline execution, regardless of outcome.
This is distinct from ``etl_sync_state`` (which stores the latest cursor
per model) — it is an immutable audit trail of all historical runs.

Useful for:
- Dashboards showing sync frequency and latency
- Alerting on repeated failures
- Debugging extraction/transformation errors
- Tracking data freshness per model per company
"""
from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func

from app.database.postgres import Base


class EtlRunMetadata(Base):
    """Append-only audit log: one row per ETL pipeline execution."""

    __tablename__ = "etl_run_metadata"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Tenant + model scope
    company_id = Column(String(50), nullable=False, index=True)
    model_name = Column(String(50), nullable=False, index=True)

    # Timing
    sync_started_at = Column(DateTime(timezone=True), nullable=True, index=True)
    sync_finished_at = Column(DateTime(timezone=True), nullable=True)
    duration_ms = Column(Integer, nullable=True)

    # Counts
    rows_read = Column(Integer, nullable=False, default=0)
    rows_written = Column(Integer, nullable=False, default=0)
    rows_failed = Column(Integer, nullable=False, default=0)
    rows_skipped = Column(Integer, nullable=False, default=0)

    # Cursor used for this run (None = full sync)
    cursor_from = Column(String(100), nullable=True)
    # Cursor produced by this run (new high-water mark)
    cursor_to = Column(String(100), nullable=True)

    # Outcome
    status = Column(
        String(20),
        nullable=False,
        default="running",
        index=True,
    )  # running | success | failed | partial
    error_summary = Column(Text, nullable=True)

    # Metadata row creation timestamp
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

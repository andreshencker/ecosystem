"""Shift Summary contract service — stub implementation."""
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.contracts.shift_summary.schema import ShiftSummaryResponse


class ShiftSummaryService:
    """
    Aggregates shift KPIs from FactWorkEvent.

    TODO: Implement once ETL pipelines are populating fact_work_event.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_summary(
        self,
        business_id: str,
        period: Optional[str] = None,
    ) -> ShiftSummaryResponse:
        raise NotImplementedError(
            "ShiftSummaryService.get_summary() is not yet implemented. "
            "Requires FactWorkEvent ETL pipeline."
        )

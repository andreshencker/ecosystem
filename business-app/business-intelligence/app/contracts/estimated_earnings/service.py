"""Estimated Earnings contract service — stub implementation."""
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.contracts.estimated_earnings.schema import EstimatedEarningsResponse


class EstimatedEarningsService:
    """
    Computes estimated revenue from shift data and active contracts.

    TODO: Implement using FactWorkEvent and FactContract once ETL is running.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_summary(
        self,
        business_id: str,
        period: Optional[str] = None,
    ) -> EstimatedEarningsResponse:
        raise NotImplementedError(
            "EstimatedEarningsService.get_summary() is not yet implemented. "
            "Requires FactWorkEvent and FactContract ETL pipelines."
        )

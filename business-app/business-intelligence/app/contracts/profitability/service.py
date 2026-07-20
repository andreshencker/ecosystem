"""Profitability contract service — stub implementation."""
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.contracts.profitability.schema import ProfitabilityResponse


class ProfitabilityService:
    """
    Computes profitability metrics by joining invoice revenue with shift costs.

    TODO: Implement once FactInvoice, FactPayment, and FactWorkEvent ETL is running.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_summary(
        self,
        business_id: str,
        period: Optional[str] = None,
    ) -> ProfitabilityResponse:
        raise NotImplementedError(
            "ProfitabilityService.get_summary() is not yet implemented. "
            "Requires cross-domain ETL pipelines for revenue and cost."
        )

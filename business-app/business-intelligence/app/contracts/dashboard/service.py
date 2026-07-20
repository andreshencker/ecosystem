from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customers.analytical_model import DimCustomer
from app.contracts.dashboard.schema import DashboardSummaryResponse, CustomerStats


class DashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_summary(
        self,
        business_id: str,
        period: Optional[str] = None,
    ) -> DashboardSummaryResponse:
        # Total and active customers
        stmt = (
            select(
                func.count().label("total"),
                func.sum(
                    func.cast(DimCustomer.is_active, func.Integer())
                ).label("active"),
            )
            .where(DimCustomer.business_id == business_id)
        )
        result = await self.db.execute(stmt)
        row = result.one()
        total = row.total or 0
        active = int(row.active or 0)

        # New customers this period (if period provided, else last 30 days)
        new_stmt = select(func.count()).where(DimCustomer.business_id == business_id)
        if period:
            # period format: 'YYYY-MM'
            try:
                year, month = period.split("-")
                from sqlalchemy import extract
                new_stmt = new_stmt.where(
                    extract("year",  DimCustomer.created_at) == int(year),
                    extract("month", DimCustomer.created_at) == int(month),
                )
            except (ValueError, AttributeError):
                pass  # ignore malformed period — return 0

        new_result = await self.db.execute(new_stmt)
        new_this_period = new_result.scalar() or 0

        return DashboardSummaryResponse(
            businessId=str(business_id),
            period=period,
            customers=CustomerStats(
                total=total,
                active=active,
                newThisPeriod=int(new_this_period),
            ),
            calculatedAt=datetime.now(timezone.utc),
        )

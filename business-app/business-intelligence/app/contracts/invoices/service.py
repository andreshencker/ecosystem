"""Invoice Analytics contract service — queries PostgreSQL via InvoiceRepository."""
import logging
from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.contracts.invoices.schema import (
    InvoiceContractMetadata,
    InvoiceScope,
    InvoiceSummaryResponse,
    InvoiceSummaryStats,
    StatusBreakdownItem,
)
from app.database.repositories.invoice_repository import InvoiceRepository

logger = logging.getLogger(__name__)


def _parse_date(value: Optional[str]) -> Optional[date]:
    if not value:
        return None
    try:
        return datetime.strptime(value[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


class InvoiceAnalyticsService:
    """
    Resolves the invoice-summary information contract.

    Queries are performed against PostgreSQL (fact_invoice table). All
    aggregation logic lives in InvoiceRepository — the service is a
    thin adapter that shapes results into the contract schema.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = InvoiceRepository(db)

    async def get_summary(
        self,
        business_id: str,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        currency: str = "AUD",
        customer_id: Optional[str] = None,
    ) -> InvoiceSummaryResponse:
        scope = InvoiceScope(
            companyId=business_id,
            dateFrom=date_from,
            dateTo=date_to,
            currency=currency,
            customerId=customer_id,
        )

        df = _parse_date(date_from)
        dt = _parse_date(date_to)

        stats = await self._repo.get_summary_stats(
            business_id=business_id,
            date_from=df,
            date_to=dt,
            currency=currency,
            customer_id=customer_id,
        )
        breakdown_rows = await self._repo.get_status_breakdown(
            business_id=business_id,
            date_from=df,
            date_to=dt,
            currency=currency,
        )

        summary = InvoiceSummaryStats.from_repo(stats)
        breakdown = [
            StatusBreakdownItem(
                status=r["status"],
                count=r["count"],
                total=str(r["total"]),
            )
            for r in breakdown_rows
        ]

        return InvoiceSummaryResponse(
            scope=scope,
            generatedAt=datetime.now(timezone.utc),
            summary=summary,
            statusBreakdown=breakdown,
            metadata=InvoiceContractMetadata(),
        )

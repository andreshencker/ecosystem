"""Repository for FactInvoice analytical queries."""
import uuid
from datetime import date
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.repositories.base import AbstractRepository
from app.models.invoices.analytical_model import FactInvoice


class InvoiceRepository(AbstractRepository[FactInvoice]):
    """Typed read access to the fact_invoice table."""

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(db)

    async def get_by_id(self, entity_id: str) -> Optional[FactInvoice]:
        try:
            uid = uuid.UUID(entity_id)
        except ValueError:
            return None
        stmt = select(FactInvoice).where(FactInvoice.fact_id == uid)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_business_id(
        self, business_id: str
    ) -> List[FactInvoice]:
        try:
            uid = uuid.UUID(business_id)
        except ValueError:
            return []
        stmt = select(FactInvoice).where(FactInvoice.business_id == uid)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_summary_stats(
        self,
        business_id: str,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        currency: str = "AUD",
        customer_id: Optional[str] = None,
    ) -> dict:
        """
        Return aggregated invoice KPIs for a business.
        All monetary values returned as Decimal.
        """
        try:
            biz_uuid = uuid.UUID(business_id)
        except ValueError:
            return self._empty_stats(currency)

        filters = [
            FactInvoice.business_id == biz_uuid,
            FactInvoice.currency == currency,
            FactInvoice.is_voided.is_(False),
        ]
        if date_from:
            filters.append(FactInvoice.issue_date_key >= date_from)
        if date_to:
            filters.append(FactInvoice.issue_date_key <= date_to)
        if customer_id:
            try:
                filters.append(
                    FactInvoice.customer_id == uuid.UUID(customer_id)
                )
            except ValueError:
                pass

        stmt = select(
            func.count(FactInvoice.fact_id).label("invoice_count"),
            func.coalesce(func.sum(FactInvoice.subtotal), 0).label(
                "total_subtotal"
            ),
            func.coalesce(func.sum(FactInvoice.tax_amount), 0).label(
                "total_tax"
            ),
            func.coalesce(func.sum(FactInvoice.gross_amount), 0).label(
                "total_gross"
            ),
            func.coalesce(func.avg(FactInvoice.gross_amount), 0).label(
                "avg_gross"
            ),
            func.coalesce(func.avg(FactInvoice.days_to_due), 0).label(
                "avg_days_to_due"
            ),
        ).where(and_(*filters))

        row = (await self.db.execute(stmt)).one()
        return {
            "invoice_count": int(row.invoice_count or 0),
            "total_subtotal": Decimal(str(row.total_subtotal or 0)),
            "total_tax": Decimal(str(row.total_tax or 0)),
            "total_gross": Decimal(str(row.total_gross or 0)),
            "avg_gross": Decimal(str(row.avg_gross or 0)),
            "avg_days_to_due": Decimal(str(row.avg_days_to_due or 0)),
            "currency": currency,
        }

    async def get_status_breakdown(
        self,
        business_id: str,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        currency: str = "AUD",
    ) -> List[dict]:
        """Count invoices grouped by event_type/status."""
        try:
            biz_uuid = uuid.UUID(business_id)
        except ValueError:
            return []

        filters = [
            FactInvoice.business_id == biz_uuid,
            FactInvoice.currency == currency,
        ]
        if date_from:
            filters.append(FactInvoice.issue_date_key >= date_from)
        if date_to:
            filters.append(FactInvoice.issue_date_key <= date_to)

        stmt = (
            select(
                FactInvoice.event_type,
                func.count(FactInvoice.fact_id).label("count"),
                func.coalesce(func.sum(FactInvoice.gross_amount), 0).label(
                    "total"
                ),
            )
            .where(and_(*filters))
            .group_by(FactInvoice.event_type)
        )
        rows = (await self.db.execute(stmt)).all()
        return [
            {
                "status": r.event_type,
                "count": int(r.count),
                "total": Decimal(str(r.total)),
            }
            for r in rows
        ]

    @staticmethod
    def _empty_stats(currency: str) -> dict:
        z = Decimal("0.00")
        return {
            "invoice_count": 0,
            "total_subtotal": z,
            "total_tax": z,
            "total_gross": z,
            "avg_gross": z,
            "avg_days_to_due": z,
            "currency": currency,
        }

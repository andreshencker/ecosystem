"""Repository for FactContract analytical model — admin queries."""
from typing import Dict, List, Optional

from sqlalchemy import func, or_, select

from app.database.repositories.base import AbstractRepository
from app.models.contracts.analytical_model import FactContract


class ContractRepository(AbstractRepository[FactContract]):
    """Read-only access to the fact_contract table for admin analysis."""

    # ── AbstractRepository interface ──────────────────────────────────────────

    async def get_by_id(self, entity_id: str) -> Optional[FactContract]:
        stmt = select(FactContract).where(FactContract.source_id == entity_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_business_id(self, business_id: str) -> List[FactContract]:
        stmt = select(FactContract).where(FactContract.business_id == business_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # ── Admin detail ──────────────────────────────────────────────────────────

    async def get_admin_by_id(
        self,
        source_id: str,
        business_id: Optional[str] = None,
    ) -> Optional[FactContract]:
        """Fetch a single contract by source_id (MongoDB ObjectId).

        business_id is optional but recommended for tenant isolation verification.
        """
        stmt = select(FactContract).where(FactContract.source_id == source_id)
        if business_id:
            stmt = stmt.where(FactContract.business_id == business_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    # ── Admin list with filters ────────────────────────────────────────────────

    async def list_admin(
        self,
        business_id: Optional[str] = None,
        *,
        page: int = 1,
        limit: int = 50,
        search: Optional[str] = None,
        customer_id: Optional[str] = None,
        status: Optional[str] = None,
        work_type: Optional[str] = None,
        billing_cycle: Optional[str] = None,
        currency: Optional[str] = None,
        charge_gst: Optional[bool] = None,
        super_enabled: Optional[bool] = None,
        holiday_rules_enabled: Optional[bool] = None,
        payment_calendar_enabled: Optional[bool] = None,
        configuration_status: Optional[str] = None,
        start_date_from: Optional[str] = None,
        start_date_to: Optional[str] = None,
        created_from: Optional[str] = None,
        created_to: Optional[str] = None,
        updated_from: Optional[str] = None,
        updated_to: Optional[str] = None,
        sort_by: str = "source_created_at",
        sort_dir: str = "desc",
    ) -> List[FactContract]:
        """Return contracts with filters and pagination.

        business_id=None → cross-tenant (Platform Admin).
        """
        stmt = select(FactContract)
        stmt = _apply_scope(stmt, business_id)
        stmt = _apply_filters(
            stmt,
            customer_id=customer_id,
            status=status,
            work_type=work_type,
            billing_cycle=billing_cycle,
            currency=currency,
            charge_gst=charge_gst,
            super_enabled=super_enabled,
            holiday_rules_enabled=holiday_rules_enabled,
            payment_calendar_enabled=payment_calendar_enabled,
            configuration_status=configuration_status,
            start_date_from=start_date_from,
            start_date_to=start_date_to,
            created_from=created_from,
            created_to=created_to,
            updated_from=updated_from,
            updated_to=updated_to,
        )
        if search:
            stmt = _apply_search(stmt, search)

        stmt = _apply_sort(stmt, sort_by, sort_dir)
        offset = (page - 1) * limit
        stmt = stmt.offset(offset).limit(limit)

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_admin(
        self,
        business_id: Optional[str] = None,
        *,
        search: Optional[str] = None,
        customer_id: Optional[str] = None,
        status: Optional[str] = None,
        work_type: Optional[str] = None,
        billing_cycle: Optional[str] = None,
        currency: Optional[str] = None,
        charge_gst: Optional[bool] = None,
        super_enabled: Optional[bool] = None,
        holiday_rules_enabled: Optional[bool] = None,
        payment_calendar_enabled: Optional[bool] = None,
        configuration_status: Optional[str] = None,
        start_date_from: Optional[str] = None,
        start_date_to: Optional[str] = None,
        created_from: Optional[str] = None,
        created_to: Optional[str] = None,
        updated_from: Optional[str] = None,
        updated_to: Optional[str] = None,
    ) -> int:
        stmt = select(func.count()).select_from(FactContract)
        stmt = _apply_scope(stmt, business_id)
        stmt = _apply_filters(
            stmt,
            customer_id=customer_id,
            status=status,
            work_type=work_type,
            billing_cycle=billing_cycle,
            currency=currency,
            charge_gst=charge_gst,
            super_enabled=super_enabled,
            holiday_rules_enabled=holiday_rules_enabled,
            payment_calendar_enabled=payment_calendar_enabled,
            configuration_status=configuration_status,
            start_date_from=start_date_from,
            start_date_to=start_date_to,
            created_from=created_from,
            created_to=created_to,
            updated_from=updated_from,
            updated_to=updated_to,
        )
        if search:
            stmt = _apply_search(stmt, search)
        result = await self.db.execute(stmt)
        return result.scalar_one() or 0

    # ── Admin summary aggregates ───────────────────────────────────────────────

    async def get_admin_summary(
        self,
        business_id: Optional[str] = None,
        *,
        status: Optional[str] = None,
        created_from: Optional[str] = None,
        created_to: Optional[str] = None,
    ) -> Dict[str, int]:
        """Return a dict of measure_name → count for the summary endpoint.

        Returns zeroes for every measure even when no rows exist.
        """
        stmt = (
            select(
                func.count().label("total"),
                func.sum(_bool_case(FactContract.status == "active")).label("active"),
                func.sum(_bool_case(FactContract.status == "inactive")).label("inactive"),
                func.sum(_bool_case(FactContract.status == "finished")).label("finished"),
                func.sum(_bool_case(FactContract.status == "cancelled")).label("cancelled"),
                func.sum(_bool_case(FactContract.end_date.is_(None))).label("open_ended"),
                func.sum(_bool_case(FactContract.end_date.isnot(None))).label("dated"),
                func.sum(_bool_case(FactContract.charge_gst.is_(True))).label("gst"),
                func.sum(_bool_case(FactContract.super_enabled.is_(True))).label("super"),
                func.sum(_bool_case(FactContract.holiday_rules_enabled.is_(True))).label("holiday"),
                func.sum(_bool_case(FactContract.payment_calendar_enabled.is_(True))).label("payment_cal"),
                func.sum(_bool_case(FactContract.customer_id.is_(None))).label("missing_customer"),
                func.sum(_bool_case(FactContract.min_hourly_rate.is_(None))).label("missing_rate"),
                func.sum(_bool_case(FactContract.configuration_status == "warning")).label("warnings"),
                func.sum(_bool_case(FactContract.configuration_status == "invalid")).label("invalid"),
                func.sum(_bool_case(FactContract.configuration_status == "complete")).label("complete"),
                func.sum(_bool_case(
                    FactContract.holiday_rules_enabled.is_(True) &
                    FactContract.holiday_calendar_id.isnot(None)
                )).label("holiday_with_cal"),
                func.sum(_bool_case(
                    FactContract.payment_calendar_enabled.is_(True) &
                    FactContract.payment_calendar_id.isnot(None)
                )).label("payment_cal_with_ref"),
                func.sum(_bool_case(
                    FactContract.charge_gst.is_(False) | (
                        FactContract.charge_gst.is_(True) &
                        FactContract.gst_rate.isnot(None) &
                        (FactContract.gst_rate > 0)
                    )
                )).label("valid_gst"),
                func.sum(_bool_case(
                    FactContract.super_enabled.is_(False) | (
                        FactContract.super_enabled.is_(True) &
                        FactContract.super_rate.isnot(None) &
                        (FactContract.super_rate > 0)
                    )
                )).label("valid_super"),
            )
            .select_from(FactContract)
        )

        stmt = _apply_scope(stmt, business_id)
        if status:
            stmt = stmt.where(FactContract.status == status)
        if created_from:
            stmt = stmt.where(FactContract.source_created_at >= created_from)
        if created_to:
            stmt = stmt.where(FactContract.source_created_at <= created_to)

        result = await self.db.execute(stmt)
        row = result.one()

        return {
            "total": row.total or 0,
            "active": row.active or 0,
            "inactive": row.inactive or 0,
            "finished": row.finished or 0,
            "cancelled": row.cancelled or 0,
            "open_ended": row.open_ended or 0,
            "dated": row.dated or 0,
            "gst": row.gst or 0,
            "super": row.super or 0,
            "holiday": row.holiday or 0,
            "payment_cal": row.payment_cal or 0,
            "missing_customer": row.missing_customer or 0,
            "missing_rate": row.missing_rate or 0,
            "warnings": row.warnings or 0,
            "invalid": row.invalid or 0,
            "complete": row.complete or 0,
            "holiday_with_cal": row.holiday_with_cal or 0,
            "payment_cal_with_ref": row.payment_cal_with_ref or 0,
            "valid_gst": row.valid_gst or 0,
            "valid_super": row.valid_super or 0,
        }


# ── Private helpers ───────────────────────────────────────────────────────────

def _bool_case(condition):
    """Return a CASE WHEN condition THEN 1 ELSE 0 END expression for SUM-based counting."""
    from sqlalchemy import case
    return case((condition, 1), else_=0)


def _apply_scope(stmt, business_id: Optional[str]):
    if business_id is not None:
        stmt = stmt.where(FactContract.business_id == business_id)
    return stmt


def _apply_filters(
    stmt,
    customer_id: Optional[str] = None,
    status: Optional[str] = None,
    work_type: Optional[str] = None,
    billing_cycle: Optional[str] = None,
    currency: Optional[str] = None,
    charge_gst: Optional[bool] = None,
    super_enabled: Optional[bool] = None,
    holiday_rules_enabled: Optional[bool] = None,
    payment_calendar_enabled: Optional[bool] = None,
    configuration_status: Optional[str] = None,
    start_date_from: Optional[str] = None,
    start_date_to: Optional[str] = None,
    created_from: Optional[str] = None,
    created_to: Optional[str] = None,
    updated_from: Optional[str] = None,
    updated_to: Optional[str] = None,
):
    if customer_id is not None:
        stmt = stmt.where(FactContract.customer_id == customer_id)
    if status is not None:
        stmt = stmt.where(FactContract.status == status)
    if work_type is not None:
        stmt = stmt.where(FactContract.work_type == work_type)
    if billing_cycle is not None:
        stmt = stmt.where(FactContract.billing_cycle == billing_cycle)
    if currency is not None:
        stmt = stmt.where(FactContract.currency == currency)
    if charge_gst is not None:
        stmt = stmt.where(FactContract.charge_gst == charge_gst)
    if super_enabled is not None:
        stmt = stmt.where(FactContract.super_enabled == super_enabled)
    if holiday_rules_enabled is not None:
        stmt = stmt.where(FactContract.holiday_rules_enabled == holiday_rules_enabled)
    if payment_calendar_enabled is not None:
        stmt = stmt.where(FactContract.payment_calendar_enabled == payment_calendar_enabled)
    if configuration_status is not None:
        stmt = stmt.where(FactContract.configuration_status == configuration_status)
    if start_date_from:
        stmt = stmt.where(FactContract.start_date >= start_date_from)
    if start_date_to:
        stmt = stmt.where(FactContract.start_date <= start_date_to)
    if created_from:
        stmt = stmt.where(FactContract.source_created_at >= created_from)
    if created_to:
        stmt = stmt.where(FactContract.source_created_at <= created_to)
    if updated_from:
        stmt = stmt.where(FactContract.source_updated_at >= updated_from)
    if updated_to:
        stmt = stmt.where(FactContract.source_updated_at <= updated_to)
    return stmt


def _apply_search(stmt, search: str):
    """Search across position_name, invoice_description, business_name, customer_name."""
    pattern = f"%{search}%"
    return stmt.where(
        or_(
            FactContract.position_name.ilike(pattern),
            FactContract.invoice_description.ilike(pattern),
            FactContract.business_name.ilike(pattern),
            FactContract.customer_name.ilike(pattern),
        )
    )


_SORT_COLUMNS = {
    "source_created_at": FactContract.source_created_at,
    "source_updated_at": FactContract.source_updated_at,
    "position_name": FactContract.position_name,
    "status": FactContract.status,
    "start_date": FactContract.start_date,
    "configuration_status": FactContract.configuration_status,
}


def _apply_sort(stmt, sort_by: str, sort_dir: str):
    col = _SORT_COLUMNS.get(sort_by, FactContract.source_created_at)
    if sort_dir == "asc":
        return stmt.order_by(col.asc().nullslast())
    return stmt.order_by(col.desc().nullslast())

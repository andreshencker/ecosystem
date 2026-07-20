"""Repository for FactShift — pending-assignment and summary queries.

Pending rule (single source of truth):
  created_from_calendar = True
  AND contract_assigned = False
  AND contract_id IS NULL
  AND sync_status != 'deleted'

All queries that consume the pending rule call _pending_predicate() — it is
defined once here and never duplicated.
"""
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Optional

from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.repositories.base import AbstractRepository
from app.models.shifts.fact_shift import FactShift


# ── Pending rule predicate ────────────────────────────────────────────────────

def _pending_predicate():
    """SQLAlchemy WHERE clause implementing the pending-assignment rule."""
    return and_(
        FactShift.created_from_calendar == True,
        FactShift.contract_assigned == False,
        FactShift.contract_id == None,
        FactShift.sync_status != "deleted",
    )


# ── Scope and filter helpers ──────────────────────────────────────────────────

def _scope(stmt, business_id: Optional[str]):
    if business_id:
        return stmt.where(FactShift.business_id == business_id)
    return stmt


def _apply_calendar_filter(stmt, linked_calendar_id: Optional[str]):
    if linked_calendar_id:
        return stmt.where(FactShift.linked_calendar_id == linked_calendar_id)
    return stmt


def _apply_date_range(stmt, date_from: Optional[str], date_to: Optional[str]):
    if date_from:
        try:
            stmt = stmt.where(FactShift.shift_date >= date.fromisoformat(date_from))
        except ValueError:
            pass
    if date_to:
        try:
            stmt = stmt.where(FactShift.shift_date <= date.fromisoformat(date_to))
        except ValueError:
            pass
    return stmt


def _apply_search(stmt, search: Optional[str]):
    if search and search.strip():
        pat = f"%{search.strip()}%"
        return stmt.where(
            or_(
                FactShift.title.ilike(pat),
                FactShift.location.ilike(pat),
                FactShift.calendar_name.ilike(pat),
            )
        )
    return stmt


def _apply_task_age(stmt, min_age_days: Optional[int]):
    """Restrict to shifts pending for at least N days."""
    if min_age_days is not None and min_age_days > 0:
        cutoff = datetime.now(timezone.utc) - timedelta(days=min_age_days)
        stmt = stmt.where(FactShift.source_created_at <= cutoff)
    return stmt


_SORT_COLUMNS = {
    "shift_date":        FactShift.shift_date,
    "source_created_at": FactShift.source_created_at,
    "source_updated_at": FactShift.source_updated_at,
    "calendar_name":     FactShift.calendar_name,
}


def _apply_sort(stmt, sort_by: str, sort_dir: str):
    col = _SORT_COLUMNS.get(sort_by, FactShift.source_created_at)
    return stmt.order_by(col.desc() if sort_dir == "desc" else col.asc())


# ── Repository ────────────────────────────────────────────────────────────────

class ShiftRepository(AbstractRepository[FactShift]):
    """Read-only access to fact_shift for pending-assignment support analysis."""

    # ── AbstractRepository interface ──────────────────────────────────────────

    async def get_by_id(self, entity_id: str) -> Optional[FactShift]:
        stmt = select(FactShift).where(FactShift.source_id == entity_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_business_id(self, business_id: str) -> List[FactShift]:
        stmt = select(FactShift).where(FactShift.business_id == business_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # ── Summary aggregates ────────────────────────────────────────────────────

    async def get_summary_counts(
        self,
        business_id: Optional[str] = None,
    ) -> Dict:
        """Return raw measure counts plus ETL freshness for the shift assignment summary.

        `etl_synced_at` is the server-managed `synced_at` timestamp of the most recently
        upserted row for this business. None means fact_shift has no rows for this business
        — the shift ETL has never run — and a zero `imported_pending_contract` must NOT be
        presented as "all imported Shifts have a Contract".
        """
        stmt = select(
            func.count().label("total"),
            func.sum(
                case((FactShift.created_from_calendar == True, 1), else_=0)
            ).label("calendar_imported"),
            func.sum(
                case((FactShift.created_from_calendar == False, 1), else_=0)
            ).label("manual"),
            func.sum(
                case(
                    (and_(FactShift.created_from_calendar == True,
                          FactShift.sync_status != "deleted"), 1),
                    else_=0,
                )
            ).label("active_calendar"),
            func.sum(
                case(
                    (and_(FactShift.created_from_calendar == True,
                          FactShift.contract_assigned == True,
                          FactShift.sync_status != "deleted"), 1),
                    else_=0,
                )
            ).label("imported_with_contract"),
            func.sum(
                case((_pending_predicate(), 1), else_=0)
            ).label("imported_pending_contract"),
            func.sum(
                case(
                    (and_(FactShift.created_from_calendar == True,
                          FactShift.sync_status == "deleted"), 1),
                    else_=0,
                )
            ).label("deleted_imported"),
            # ETL freshness: max synced_at across rows for this business.
            # server_default=func.now() means this is the PostgreSQL insertion/update time.
            func.max(FactShift.synced_at).label("etl_synced_at"),
        )
        stmt = _scope(stmt, business_id)
        result = await self.db.execute(stmt)
        row = result.one()
        return {
            "total":                     int(row.total or 0),
            "calendar_imported":         int(row.calendar_imported or 0),
            "manual":                    int(row.manual or 0),
            "active_calendar":           int(row.active_calendar or 0),
            "imported_with_contract":    int(row.imported_with_contract or 0),
            "imported_pending_contract": int(row.imported_pending_contract or 0),
            "deleted_imported":          int(row.deleted_imported or 0),
            "etl_synced_at":             row.etl_synced_at,  # datetime or None
        }

    # ── Pending list ──────────────────────────────────────────────────────────

    async def list_pending(
        self,
        business_id: Optional[str] = None,
        *,
        linked_calendar_id: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        min_age_days: Optional[int] = None,
        search: Optional[str] = None,
        page: int = 1,
        limit: int = 50,
        sort_by: str = "source_created_at",
        sort_dir: str = "desc",
    ) -> List[FactShift]:
        stmt = select(FactShift).where(_pending_predicate())
        stmt = _scope(stmt, business_id)
        stmt = _apply_calendar_filter(stmt, linked_calendar_id)
        stmt = _apply_date_range(stmt, date_from, date_to)
        stmt = _apply_task_age(stmt, min_age_days)
        stmt = _apply_search(stmt, search)
        stmt = _apply_sort(stmt, sort_by, sort_dir)
        stmt = stmt.offset((page - 1) * limit).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_pending(
        self,
        business_id: Optional[str] = None,
        *,
        linked_calendar_id: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        min_age_days: Optional[int] = None,
        search: Optional[str] = None,
    ) -> int:
        stmt = select(func.count()).where(_pending_predicate())
        stmt = _scope(stmt, business_id)
        stmt = _apply_calendar_filter(stmt, linked_calendar_id)
        stmt = _apply_date_range(stmt, date_from, date_to)
        stmt = _apply_task_age(stmt, min_age_days)
        stmt = _apply_search(stmt, search)
        result = await self.db.execute(stmt)
        return int(result.scalar() or 0)

    async def get_pending_by_id(
        self,
        source_id: str,
        business_id: Optional[str] = None,
    ) -> Optional[FactShift]:
        stmt = select(FactShift).where(
            FactShift.source_id == source_id,
            _pending_predicate(),
        )
        if business_id:
            stmt = stmt.where(FactShift.business_id == business_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

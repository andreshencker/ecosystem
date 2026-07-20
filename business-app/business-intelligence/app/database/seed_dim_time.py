"""Seed dim_time with dates from 2020-01-01 to 2030-12-31.

Idempotent — uses INSERT ... ON CONFLICT (date_key) DO NOTHING. Safe to run
multiple times.
"""
import logging
from datetime import date, timedelta
from typing import List

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.postgres import AsyncSessionLocal
from app.models.shared.dim_time import DimTime

logger = logging.getLogger(__name__)

START = date(2020, 1, 1)
END = date(2030, 12, 31)
BATCH_SIZE = 1000


def generate_dim_time_rows() -> List[dict]:
    """Generate one dict per day in the range [START, END]."""
    rows: List[dict] = []
    current = START
    while current <= END:
        month = current.month
        year = current.year
        rows.append(
            {
                "date_key": current,
                "year": year,
                "quarter": (month - 1) // 3 + 1,
                "month": month,
                "month_name": current.strftime("%B"),
                "week_of_year": current.isocalendar()[1],
                # 1=Mon..7=Sun to match the existing column comment
                "day_of_week": current.weekday() + 1,
                "is_weekend": current.weekday() >= 5,
                "fiscal_year": year if month >= 7 else year - 1,
                "fiscal_quarter": ((month - 7) % 12) // 3 + 1,
                "is_au_public_holiday": False,
            }
        )
        current += timedelta(days=1)
    return rows


async def seed_dim_time(session: AsyncSession) -> int:
    """Insert dim_time rows using ON CONFLICT DO NOTHING.

    Returns the number of rows attempted (not necessarily inserted).
    """
    rows = generate_dim_time_rows()
    total = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        stmt = pg_insert(DimTime).values(batch)
        stmt = stmt.on_conflict_do_nothing(index_elements=["date_key"])
        await session.execute(stmt)
        total += len(batch)
    await session.commit()
    logger.info("[seed_dim_time] processed %d rows", total)
    return total


async def seed_dim_time_standalone() -> int:
    """Convenience wrapper that opens its own session."""
    if AsyncSessionLocal is None:
        raise RuntimeError(
            "AsyncSessionLocal not configured — set BI_DATABASE_URL"
        )
    async with AsyncSessionLocal() as session:
        return await seed_dim_time(session)

"""Shift ETL pipeline — extracts shifts → FactShift rows.

Full-sync invariant: after upserting all current MongoDB shifts, delete any
fact_shift rows for this business whose source_id no longer exists in MongoDB.
This prevents orphaned rows (from deleted shifts) from appearing as pending
indefinitely in the BI pending-assignment queries.
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import and_, delete

from app.database.postgres import AsyncSessionLocal
from app.etl.extractors.shift_extractor import ShiftExtractor
from app.etl.loaders.postgres_loader import PostgresLoader
from app.etl.pipelines.base import AbstractPipeline
from app.etl.results import LoadResult
from app.etl.transformers.shift_transformer import ShiftTransformer
from app.models.shifts.fact_shift import FactShift

logger = logging.getLogger(__name__)

MODEL_NAME = "shift"
IDEMPOTENCY_COLUMN = "source_id"


class ShiftPipeline(AbstractPipeline):
    def __init__(self) -> None:
        self._extractor = ShiftExtractor()
        self._transformer = ShiftTransformer()
        self._loader = PostgresLoader()

    async def run(
        self,
        company_id: str,
        since: Optional[datetime] = None,
    ) -> LoadResult:
        result = LoadResult(
            model_name=MODEL_NAME,
            company_id=company_id,
            started_at=datetime.now(timezone.utc),
        )

        records: list = []
        transform_errors: list = []
        last_updated_at: Optional[str] = None

        async for raw in self._extractor.extract(company_id, since=since):
            result.extracted += 1
            try:
                record = self._transformer.transform(raw)
                records.append(record)
                updated_at = raw.get("updatedAt")
                if updated_at:
                    ts = (
                        updated_at.isoformat()
                        if isinstance(updated_at, datetime)
                        else str(updated_at)
                    )
                    if last_updated_at is None or ts > last_updated_at:
                        last_updated_at = ts
            except ValueError as exc:
                result.failed += 1
                transform_errors.append(f"shift {raw.get('_id')}: {exc}")
                logger.warning(
                    "[ShiftPipeline] transform failed for %s: %s",
                    raw.get("_id"),
                    exc,
                )

        result.transformed = len(records)

        if records:
            load_result = await self._loader.load_typed(
                records,
                MODEL_NAME,
                company_id,
                idempotency_column=IDEMPOTENCY_COLUMN,
            )
            result.inserted = load_result.inserted
            result.updated = load_result.updated
            result.failed += load_result.failed
            result.errors.extend(load_result.errors)

        # ── Full-sync orphan cleanup ──────────────────────────────────────────
        # When running without a cursor (full sync), remove fact_shift rows
        # whose source_id is no longer present in MongoDB.  This ensures that
        # shifts deleted from the operational database are not counted as
        # pending in BI indefinitely.
        orphans_deleted: int = 0
        if since is None and AsyncSessionLocal is not None:
            current_source_ids = [r.source_id for r in records]
            if current_source_ids:
                async with AsyncSessionLocal() as session:
                    stmt = delete(FactShift).where(
                        and_(
                            FactShift.business_id == company_id,
                            FactShift.source_id.not_in(current_source_ids),
                        )
                    )
                    del_result = await session.execute(stmt)
                    await session.commit()
                    orphans_deleted = del_result.rowcount or 0
                    if orphans_deleted:
                        logger.info(
                            "[ShiftPipeline] company=%s full-sync cleaned %d orphaned fact_shift rows",
                            company_id,
                            orphans_deleted,
                        )
            elif not current_source_ids:
                # No MongoDB shifts extracted → business has no shifts.
                # Delete ALL fact_shift rows for this company to avoid ghost data.
                async with AsyncSessionLocal() as session:
                    stmt = delete(FactShift).where(
                        FactShift.business_id == company_id
                    )
                    del_result = await session.execute(stmt)
                    await session.commit()
                    orphans_deleted = del_result.rowcount or 0
                    if orphans_deleted:
                        logger.info(
                            "[ShiftPipeline] company=%s full-sync removed all %d fact_shift rows (no MongoDB shifts)",
                            company_id,
                            orphans_deleted,
                        )

        result.cursor = last_updated_at
        result.finished_at = datetime.now(timezone.utc)
        result.duration_ms = int(
            (result.finished_at - result.started_at).total_seconds() * 1000
        )
        result.errors.extend(transform_errors)

        logger.info(
            "[ShiftPipeline] company=%s extracted=%d transformed=%d inserted=%d updated=%d failed=%d orphans_deleted=%d",
            company_id,
            result.extracted,
            result.transformed,
            result.inserted,
            result.updated,
            result.failed,
            orphans_deleted,
        )
        return result

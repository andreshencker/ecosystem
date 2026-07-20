"""Business ETL pipeline — extracts businesses → DimBusiness rows.

The extractor ignores company_id (businesses are the top-level tenant records).
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from app.etl.extractors.business_extractor import BusinessExtractor
from app.etl.loaders.postgres_loader import PostgresLoader
from app.etl.pipelines.base import AbstractPipeline
from app.etl.results import LoadResult
from app.etl.transformers.business_transformer import BusinessTransformer

logger = logging.getLogger(__name__)

MODEL_NAME = "business"
IDEMPOTENCY_COLUMN = "business_id"


class BusinessPipeline(AbstractPipeline):
    def __init__(self) -> None:
        self._extractor = BusinessExtractor()
        self._transformer = BusinessTransformer()
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
                transform_errors.append(f"business {raw.get('_id')}: {exc}")
                logger.warning(
                    "[BusinessPipeline] transform failed for %s: %s",
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

        result.cursor = last_updated_at
        result.finished_at = datetime.now(timezone.utc)
        result.duration_ms = int(
            (result.finished_at - result.started_at).total_seconds() * 1000
        )
        result.errors.extend(transform_errors)

        logger.info(
            "[BusinessPipeline] extracted=%d transformed=%d inserted=%d updated=%d failed=%d",
            result.extracted,
            result.transformed,
            result.inserted,
            result.updated,
            result.failed,
        )
        return result

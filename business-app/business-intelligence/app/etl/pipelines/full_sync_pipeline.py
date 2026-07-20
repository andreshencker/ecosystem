"""Full-sync pipeline — runs all domain pipelines in dependency order.

Execution order:
    1. BusinessPipeline
    2. UserPipeline
    3. CustomerPipeline
    4. ContractPipeline
    5. ShiftPipeline
    6. InvoicePipeline
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from app.etl.pipelines.base import AbstractPipeline
from app.etl.pipelines.business_pipeline import BusinessPipeline
from app.etl.pipelines.contract_pipeline import ContractPipeline
from app.etl.pipelines.customer_pipeline import CustomerPipeline
from app.etl.pipelines.invoice_pipeline import InvoicePipeline
from app.etl.pipelines.shift_pipeline import ShiftPipeline
from app.etl.pipelines.user_pipeline import UserPipeline
from app.etl.results import LoadResult

logger = logging.getLogger(__name__)

MODEL_NAME = "full"


class FullSyncPipeline(AbstractPipeline):
    """Executes all domain pipelines sequentially for a given business."""

    def __init__(self) -> None:
        self._stages = [
            ("business", BusinessPipeline),
            ("user", UserPipeline),
            ("customer", CustomerPipeline),
            ("contract", ContractPipeline),
            ("shift", ShiftPipeline),
            ("invoice", InvoicePipeline),
        ]

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

        for name, factory in self._stages:
            try:
                pipeline = factory()
                stage_result = await pipeline.run(company_id, since=since)
                result.extracted += stage_result.extracted
                result.transformed += stage_result.transformed
                result.inserted += stage_result.inserted
                result.updated += stage_result.updated
                result.failed += stage_result.failed
                if stage_result.errors:
                    result.errors.extend(
                        f"{name}: {err}" for err in stage_result.errors
                    )
            except Exception as exc:
                logger.error(
                    "[FullSyncPipeline] stage %s failed: %s", name, exc
                )
                result.failed += 1
                result.errors.append(f"{name}: {exc}")

        result.finished_at = datetime.now(timezone.utc)
        result.duration_ms = int(
            (result.finished_at - result.started_at).total_seconds() * 1000
        )

        logger.info(
            "[FullSyncPipeline] company=%s extracted=%d transformed=%d inserted=%d updated=%d failed=%d",
            company_id,
            result.extracted,
            result.transformed,
            result.inserted,
            result.updated,
            result.failed,
        )
        return result

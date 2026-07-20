"""Customer ETL pipeline.

Extracts customers from MongoDB, transforms each document into a
CustomerTransformResult (one DimCustomer + four bridge-table lists), then
writes to PostgreSQL using a delete-then-insert strategy for the child bridge
tables to guarantee referential freshness.

Every customer's children are replaced atomically within a single session
commit per batch.
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import delete

from app.database.postgres import AsyncSessionLocal
from app.etl.extractors.customer_extractor import CustomerExtractor
from app.etl.loaders.postgres_loader import PostgresLoader
from app.etl.pipelines.base import AbstractPipeline
from app.etl.results import LoadResult
from app.etl.transformers.customer_transformer import CustomerTransformResult, CustomerTransformer
from app.models.customers.analytical_model import DimCustomer
from app.models.customers.bridge_models import (
    BridgeCustomerCommunicationPurpose,
    BridgeCustomerCommunicationRecipient,
    BridgeCustomerContact,
    BridgeCustomerLocation,
)

logger = logging.getLogger(__name__)

MODEL_NAME = "customer"
IDEMPOTENCY_COLUMN = "customer_id"


class CustomerPipeline(AbstractPipeline):
    def __init__(self) -> None:
        self._extractor = CustomerExtractor()
        self._transformer = CustomerTransformer()
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

        transform_results: list[CustomerTransformResult] = []
        transform_errors: list[str] = []
        last_updated_at: Optional[str] = None

        # ----------------------------------------------------------------
        # Extract + Transform
        # ----------------------------------------------------------------
        async for raw in self._extractor.extract(company_id, since=since):
            result.extracted += 1
            try:
                tr = self._transformer.transform(raw)
                transform_results.append(tr)
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
                msg = f"customer {raw.get('_id')}: {exc}"
                transform_errors.append(msg)
                logger.warning("[CustomerPipeline] transform failed for %s: %s", raw.get("_id"), exc)

        result.transformed = len(transform_results)

        # ----------------------------------------------------------------
        # Load — upsert dim_customer then replace children per customer
        # ----------------------------------------------------------------
        if transform_results:
            if AsyncSessionLocal is None:
                err = "PostgreSQL not configured — set BI_DATABASE_URL"
                logger.error("[CustomerPipeline] %s", err)
                result.failed += len(transform_results)
                result.errors.append(err)
            else:
                try:
                    inserted, updated = await self._load_batch(transform_results, result)
                    result.inserted = inserted
                    result.updated = updated
                except Exception as exc:
                    logger.error("[CustomerPipeline] load batch failed: %s", exc)
                    result.failed += len(transform_results)
                    result.errors.append(str(exc))

        result.cursor = last_updated_at
        result.finished_at = datetime.now(timezone.utc)
        result.duration_ms = int(
            (result.finished_at - result.started_at).total_seconds() * 1000
        )
        result.errors.extend(transform_errors)

        logger.info(
            "[CustomerPipeline] company=%s extracted=%d transformed=%d "
            "inserted=%d updated=%d failed=%d",
            company_id,
            result.extracted,
            result.transformed,
            result.inserted,
            result.updated,
            result.failed,
        )
        return result

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    async def _load_batch(
        self,
        transform_results: list[CustomerTransformResult],
        result: LoadResult,
    ) -> tuple[int, int]:
        """Upsert dim_customer rows and replace all bridge-table children.

        Uses a single session for the full batch. Each customer's children
        are deleted and re-inserted atomically within the same transaction.

        Returns (inserted, updated) counts for dim_customer rows.
        """
        from sqlalchemy import select

        inserted = 0
        updated = 0

        async with AsyncSessionLocal() as session:
            try:
                for tr in transform_results:
                    customer_id_uuid = tr.dim_customer.customer_id

                    # Upsert dim_customer
                    stmt = select(DimCustomer).where(
                        DimCustomer.customer_id == customer_id_uuid
                    )
                    existing = (await session.execute(stmt)).scalar_one_or_none()

                    if existing is None:
                        session.add(tr.dim_customer)
                        inserted += 1
                    else:
                        _update_dim_customer(existing, tr.dim_customer)
                        updated += 1

                    # Replace bridge children
                    await self._replace_children(
                        session,
                        customer_id_uuid,
                        tr.locations,
                        tr.contacts,
                        tr.purposes,
                        tr.recipients,
                    )

                await session.commit()
            except Exception:
                await session.rollback()
                raise

        return inserted, updated

    async def _replace_children(
        self,
        session,
        customer_id_uuid,
        locations: list,
        contacts: list,
        purposes: list,
        recipients: list,
    ) -> None:
        """Delete all existing bridge rows for this customer then insert new ones."""
        await session.execute(
            delete(BridgeCustomerLocation).where(
                BridgeCustomerLocation.customer_id == customer_id_uuid
            )
        )
        await session.execute(
            delete(BridgeCustomerContact).where(
                BridgeCustomerContact.customer_id == customer_id_uuid
            )
        )
        await session.execute(
            delete(BridgeCustomerCommunicationPurpose).where(
                BridgeCustomerCommunicationPurpose.customer_id == customer_id_uuid
            )
        )
        await session.execute(
            delete(BridgeCustomerCommunicationRecipient).where(
                BridgeCustomerCommunicationRecipient.customer_id == customer_id_uuid
            )
        )

        if locations:
            session.add_all(locations)
        if contacts:
            session.add_all(contacts)
        if purposes:
            session.add_all(purposes)
        if recipients:
            session.add_all(recipients)


# ---------------------------------------------------------------------------
# Helper — copy mutable columns from a new DimCustomer onto an existing row
# ---------------------------------------------------------------------------

_IMMUTABLE_COLUMNS = {"customer_id"}


def _update_dim_customer(existing: DimCustomer, new: DimCustomer) -> None:
    for column in DimCustomer.__table__.columns:
        if column.name in _IMMUTABLE_COLUMNS:
            continue
        setattr(existing, column.name, getattr(new, column.name))

"""Contract ETL pipeline — extracts contracts → FactContract rows.

Two-pass design:
  Pass 1: collect all raw documents from MongoDB (streamed in batches).
  Name lookup: batch-fetch business and customer display names from dim_business
               and dim_customer so the transformer can snapshot them.
  Pass 2: transform each raw document into a FactContract row with names.
  Load: upsert all rows into PostgreSQL via PostgresLoader.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from sqlalchemy import select

from app.database.postgres import AsyncSessionLocal
from app.etl.extractors.contract_extractor import ContractExtractor
from app.etl.loaders.postgres_loader import PostgresLoader
from app.etl.pipelines.base import AbstractPipeline
from app.etl.results import LoadResult
from app.etl.transformers.contract_transformer import ContractTransformer
from app.models.companies.analytical_model import DimBusiness

logger = logging.getLogger(__name__)

MODEL_NAME = "contract"
IDEMPOTENCY_COLUMN = "source_id"

# Deterministic UUID5 conversion used by the business transformer.
# Must stay in sync with app.etl.transformers.business_transformer._to_uuid_from_objectid.
def _source_id_to_biz_uuid(source_id: str) -> uuid.UUID:
    return uuid.uuid5(uuid.NAMESPACE_OID, source_id)


async def _fetch_business_names(
    business_ids: set,
) -> Dict[str, Optional[str]]:
    """Return {source_id_str: business_name} for the given set of business_id strings."""
    if not business_ids or AsyncSessionLocal is None:
        return {}

    # Convert raw strings to UUID5 (same deterministic function as business transformer)
    id_to_uuid: Dict[str, uuid.UUID] = {
        bid: _source_id_to_biz_uuid(bid) for bid in business_ids
    }
    uuid_to_id: Dict[uuid.UUID, str] = {v: k for k, v in id_to_uuid.items()}

    async with AsyncSessionLocal() as session:
        stmt = select(DimBusiness.business_id, DimBusiness.business_name).where(
            DimBusiness.business_id.in_(list(id_to_uuid.values()))
        )
        rows = (await session.execute(stmt)).fetchall()

    result: Dict[str, Optional[str]] = {}
    for row in rows:
        src_id = uuid_to_id.get(row.business_id)
        if src_id:
            result[src_id] = row.business_name

    return result


async def _fetch_customer_names(
    customer_ids: set,
) -> Dict[str, Optional[str]]:
    """Return {source_id_str: customer_name} for the given set of customer_id strings.

    Customer IDs in NestJS are UUID strings; dim_customer.customer_id stores them
    as PostgreSQL UUIDs parsed directly from the string.
    """
    if not customer_ids or AsyncSessionLocal is None:
        return {}

    # Attempt to parse as UUID directly (NestJS generates UUID customer IDs).
    id_to_uuid: Dict[str, uuid.UUID] = {}
    for cid in customer_ids:
        try:
            id_to_uuid[cid] = uuid.UUID(cid)
        except (ValueError, AttributeError):
            # Fallback: derive via uuid5 (ObjectId-format IDs from legacy records)
            id_to_uuid[cid] = uuid.uuid5(uuid.NAMESPACE_OID, cid)

    uuid_to_id: Dict[uuid.UUID, str] = {v: k for k, v in id_to_uuid.items()}

    try:
        from app.models.customers.analytical_model import DimCustomer
    except ImportError:
        return {}

    async with AsyncSessionLocal() as session:
        stmt = select(DimCustomer.customer_id, DimCustomer.display_name).where(
            DimCustomer.customer_id.in_(list(id_to_uuid.values()))
        )
        rows = (await session.execute(stmt)).fetchall()

    result: Dict[str, Optional[str]] = {}
    for row in rows:
        src_id = uuid_to_id.get(row.customer_id)
        if src_id:
            result[src_id] = row.display_name

    return result


class ContractPipeline(AbstractPipeline):
    def __init__(self) -> None:
        self._extractor = ContractExtractor()
        self._transformer = ContractTransformer()
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

        # ── Pass 1: collect all raw documents ──────────────────────────────────
        raw_docs: List[dict] = []
        last_updated_at: Optional[str] = None

        async for raw in self._extractor.extract(company_id, since=since):
            result.extracted += 1
            raw_docs.append(raw)
            updated_at = raw.get("updatedAt")
            if updated_at:
                ts = (
                    updated_at.isoformat()
                    if isinstance(updated_at, datetime)
                    else str(updated_at)
                )
                if last_updated_at is None or ts > last_updated_at:
                    last_updated_at = ts

        # ── Name lookups (batch, single round-trip each) ───────────────────────
        biz_ids = {str(r.get("businessId")) for r in raw_docs if r.get("businessId")}
        cust_ids = {str(r.get("customerId")) for r in raw_docs if r.get("customerId")}

        biz_names = await _fetch_business_names(biz_ids)
        cust_names = await _fetch_customer_names(cust_ids)

        # ── Pass 2: transform with names ───────────────────────────────────────
        records: list = []
        transform_errors: list = []

        for raw in raw_docs:
            try:
                biz_name = biz_names.get(str(raw.get("businessId")))
                cust_name = cust_names.get(str(raw.get("customerId"))) if raw.get("customerId") else None
                record = self._transformer.transform(raw, biz_name=biz_name, cust_name=cust_name)
                records.append(record)
            except ValueError as exc:
                result.failed += 1
                transform_errors.append(f"contract {raw.get('_id')}: {exc}")
                logger.warning(
                    "[ContractPipeline] transform failed for %s: %s",
                    raw.get("_id"),
                    exc,
                )

        result.transformed = len(records)

        # ── Load ───────────────────────────────────────────────────────────────
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
            "[ContractPipeline] company=%s extracted=%d transformed=%d "
            "inserted=%d updated=%d failed=%d",
            company_id,
            result.extracted,
            result.transformed,
            result.inserted,
            result.updated,
            result.failed,
        )
        return result

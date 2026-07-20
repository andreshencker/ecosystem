"""Extractor for Customer (DimCustomer) records from MongoDB.

Source collection: business_app_db.customers
Filter: {companyId: business_id} — the customers collection uses `companyId`
for the tenant reference.
"""
import logging
from datetime import datetime
from typing import Any, AsyncIterator, Optional

from app.database.mongo import get_database
from app.etl.extractors.base import AbstractExtractor

logger = logging.getLogger(__name__)

COLLECTION = "customers"
BATCH_SIZE = 200


class CustomerExtractor(AbstractExtractor):
    """Yields raw Customer documents for a given business tenant."""

    async def extract(
        self,
        business_id: str,
        since: Optional[datetime] = None,
        **kwargs: Any,
    ) -> AsyncIterator[dict]:
        db = get_database()
        collection = db[COLLECTION]

        query: dict = {"companyId": business_id}
        if since is not None:
            query["updatedAt"] = {"$gt": since}

        logger.info(
            "[CustomerExtractor] business=%s since=%s",
            business_id,
            since.isoformat() if since else "full",
        )

        skip = 0
        total_yielded = 0

        while True:
            batch = (
                await collection.find(query)
                .sort("updatedAt", 1)
                .skip(skip)
                .limit(BATCH_SIZE)
                .to_list(BATCH_SIZE)
            )
            if not batch:
                break
            for doc in batch:
                yield doc
                total_yielded += 1
            skip += len(batch)
            if len(batch) < BATCH_SIZE:
                break

        logger.info(
            "[CustomerExtractor] business=%s extracted=%d",
            business_id,
            total_yielded,
        )

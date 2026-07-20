"""Extractor for Business (DimBusiness) records from MongoDB.

Source collection: business_app_db.businesses
Business documents are the top-level tenant records. The business_id argument
is accepted for interface compatibility but ignored — the extractor always
yields every business in the collection (optionally filtered by cursor).
"""
import logging
from datetime import datetime
from typing import Any, AsyncIterator, Optional

from app.database.mongo import get_database
from app.etl.extractors.base import AbstractExtractor

logger = logging.getLogger(__name__)

COLLECTION = "businesses"
BATCH_SIZE = 200


class BusinessExtractor(AbstractExtractor):
    """Yields raw Business documents from the operational MongoDB database."""

    async def extract(
        self,
        business_id: Optional[str] = None,
        since: Optional[datetime] = None,
        **kwargs: Any,
    ) -> AsyncIterator[dict]:
        db = get_database()
        collection = db[COLLECTION]

        query: dict = {}
        if since is not None:
            query["updatedAt"] = {"$gt": since}

        logger.info(
            "[BusinessExtractor] since=%s",
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

        logger.info("[BusinessExtractor] extracted=%d", total_yielded)

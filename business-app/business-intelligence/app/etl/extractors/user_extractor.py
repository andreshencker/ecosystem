"""Extractor for User (DimUser) records from MongoDB.

Source collection: business_app_db.users
Filter: {companyId: business_id} — the users collection uses `companyId` for
the tenant reference. Users with companyId=null (platform bootstrap admins)
are skipped.
"""
import logging
from datetime import datetime
from typing import Any, AsyncIterator, Optional

from app.database.mongo import get_database
from app.etl.extractors.base import AbstractExtractor

logger = logging.getLogger(__name__)

COLLECTION = "users"
BATCH_SIZE = 200


class UserExtractor(AbstractExtractor):
    """Yields raw User documents for a given business tenant."""

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
            "[UserExtractor] business=%s since=%s",
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
            "[UserExtractor] business=%s extracted=%d",
            business_id,
            total_yielded,
        )

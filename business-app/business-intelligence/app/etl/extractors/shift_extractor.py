"""Extractor for Shift (FactShift) records from MongoDB.

Source collection: business_app_db.shifts (the ERP's operational shifts).
Filter: {businessId: business_id}. All shift statuses are synced — the
FactShift model preserves the shift_status column for downstream filters.
"""
import logging
from datetime import datetime
from typing import Any, AsyncIterator, Optional

from app.database.mongo import get_database
from app.etl.extractors.base import AbstractExtractor

logger = logging.getLogger(__name__)

COLLECTION = "shifts"
BATCH_SIZE = 200


class ShiftExtractor(AbstractExtractor):
    """Yields raw Shift documents for a given business tenant."""

    async def extract(
        self,
        business_id: str,
        since: Optional[datetime] = None,
        **kwargs: Any,
    ) -> AsyncIterator[dict]:
        db = get_database()
        collection = db[COLLECTION]

        query: dict = {"businessId": business_id}
        if since is not None:
            query["updatedAt"] = {"$gt": since}

        logger.info(
            "[ShiftExtractor] business=%s since=%s",
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
            "[ShiftExtractor] business=%s extracted=%d",
            business_id,
            total_yielded,
        )

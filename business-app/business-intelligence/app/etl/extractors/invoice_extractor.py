"""Extractor for invoiced Shift records from MongoDB business_app_db.shifts.

Assumption: The Business App has NO standalone Invoice collection. Invoiced
shifts (status='confirmed' AND invoiceStatus='invoiced') are the operational
source for the fact_invoice analytical table. This is a documented
architectural assumption for the current implementation.
"""
import logging
from datetime import datetime
from typing import Any, AsyncIterator, Optional

from app.database.mongo import get_database
from app.etl.extractors.base import AbstractExtractor

logger = logging.getLogger(__name__)

# Source collection in the Business App operational database
COLLECTION = "shifts"
BATCH_SIZE = 200


class InvoiceExtractor(AbstractExtractor):
    """
    Reads confirmed+invoiced Shift documents from MongoDB.

    Source: business_app_db.shifts
    Filter: status='confirmed' AND invoiceStatus='invoiced'
    Supports full sync (no cursor) and incremental sync (since=datetime cursor
    on updatedAt).

    Yields one raw shift dict at a time.
    """

    async def extract(
        self,
        business_id: str,
        since: Optional[datetime] = None,
        **kwargs: Any,
    ) -> AsyncIterator[dict]:
        db = get_database()
        collection = db[COLLECTION]

        query: dict = {
            "businessId": business_id,
            "status": "confirmed",
            "invoiceStatus": "invoiced",
        }
        if since is not None:
            query["updatedAt"] = {"$gt": since}

        logger.info(
            "[InvoiceExtractor] business=%s since=%s",
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
            "[InvoiceExtractor] business=%s extracted=%d",
            business_id,
            total_yielded,
        )

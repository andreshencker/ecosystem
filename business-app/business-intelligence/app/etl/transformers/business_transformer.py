"""Transformer: raw MongoDB business document → DimBusiness."""
import uuid
from datetime import datetime, timezone
from typing import Any

from app.etl.transformers.base import AbstractTransformer
from app.models.companies.analytical_model import DimBusiness


def _to_uuid_from_objectid(value: Any) -> uuid.UUID:
    """Deterministic conversion of any MongoDB ObjectId (or hex string) to UUID.

    Uses uuid5 with NAMESPACE_OID so the same source id always maps to the same
    UUID. Works for both 24-char ObjectId hex strings and full 36-char UUIDs.
    """
    return uuid.uuid5(uuid.NAMESPACE_OID, str(value))


class BusinessTransformer(AbstractTransformer[dict, DimBusiness]):
    """Convert a raw MongoDB business document into a DimBusiness row."""

    def transform(self, raw: dict) -> DimBusiness:
        source_id = raw.get("_id")
        if not source_id:
            raise ValueError("Business document has no _id field")

        now = datetime.now(timezone.utc)

        return DimBusiness(
            business_id=_to_uuid_from_objectid(source_id),
            company_key=raw.get("businessKey") or None,
            business_name=raw.get("businessName") or "",
            jurisdiction=None,
            currency=raw.get("defaultCurrency") or "AUD",
            timezone=None,
            is_active=bool(raw.get("isActive", True)),
            is_platform=bool(raw.get("isPlatformCompany", False)),
            created_at=raw.get("createdAt") or now,
            updated_at=raw.get("updatedAt") or now,
        )

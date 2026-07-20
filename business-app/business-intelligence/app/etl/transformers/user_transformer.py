"""Transformer: raw MongoDB user document → DimUser."""
from datetime import datetime, timezone

from app.etl.transformers.base import AbstractTransformer
from app.etl.transformers.business_transformer import _to_uuid_from_objectid
from app.models.users.analytical_model import DimUser


class UserTransformer(AbstractTransformer[dict, DimUser]):
    """Convert a raw MongoDB user document into a DimUser row.

    Skips the passwordHash and any token fields — this is analytical, not
    operational. Raises ValueError if the user has no companyId (platform
    bootstrap users with no tenant scope are filtered upstream, but this
    guard is defensive).
    """

    def transform(self, raw: dict) -> DimUser:
        source_id = raw.get("_id")
        company_id = raw.get("companyId")
        if not source_id:
            raise ValueError("User document has no _id field")
        if not company_id:
            raise ValueError(f"User {source_id} has no companyId")

        first_name = raw.get("firstName") or ""
        last_name = raw.get("lastName") or ""
        full_name = f"{first_name} {last_name}".strip()

        now = datetime.now(timezone.utc)

        return DimUser(
            user_id=_to_uuid_from_objectid(source_id),
            business_id=_to_uuid_from_objectid(company_id),
            email=raw.get("email") or "",
            first_name=first_name or None,
            last_name=last_name or None,
            full_name=full_name or None,
            role=raw.get("role"),
            scope=raw.get("scope"),
            is_active=bool(raw.get("isActive", True)),
            created_at=raw.get("createdAt") or now,
            updated_at=raw.get("updatedAt") or now,
        )

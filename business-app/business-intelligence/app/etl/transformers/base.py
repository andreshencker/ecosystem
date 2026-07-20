"""Abstract transformer base class with built-in normalization utilities.

Every ETL transformer must implement ``transform(raw) → model``.

In addition, the base class exposes a suite of static normalization helpers
so concrete transformers do not duplicate the same defensive coercions:

    _to_decimal(value)      — safe Decimal conversion (never float)
    _to_datetime_utc(value) — normalise to UTC-aware datetime
    _to_date(value)         — extract Python date from datetime or string
    _to_str(value, max_len) — coerce to string, truncate if necessary
    _to_bool(value)         — safe boolean coercion
    _to_uuid5(value)        — deterministic ObjectId → UUID conversion
    _now_utc()              — current UTC datetime

None of these helpers raises on None input — they return None instead so
the transformer's ``transform()`` decides whether missing values are errors.
"""
import uuid
from abc import ABC, abstractmethod
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any, Generic, Optional, TypeVar

S = TypeVar("S")   # Source type  (raw dict from MongoDB)
T = TypeVar("T")   # Target type  (SQLAlchemy model instance)

_NAMESPACE = uuid.NAMESPACE_OID


class AbstractTransformer(ABC, Generic[S, T]):
    """Base class for all ETL transformers.

    Responsibilities:
    - Field mapping and renaming
    - Type coercion via the helper methods below
    - Derived field calculation
    - Validation and rejection of invalid records

    Raises:
        ValueError: from ``transform()`` when a record is missing required
                    fields or contains unrecoverable data.
    """

    @abstractmethod
    def transform(self, raw: S) -> T:
        """Transform a single raw source document into a warehouse model.

        Args:
            raw: A raw document from the extractor (typically a dict).

        Returns:
            A SQLAlchemy model instance ready to be upserted.

        Raises:
            ValueError: If the raw document is invalid or incomplete.
        """
        raise NotImplementedError

    # ── Normalization helpers ─────────────────────────────────────────────────

    @staticmethod
    def _to_decimal(value: Any, *, default: Optional[Decimal] = None) -> Optional[Decimal]:
        """Convert value to Decimal. Returns ``default`` (None) on failure.

        Never uses float internally — converts via string to preserve precision.
        """
        if value is None:
            return default
        try:
            return Decimal(str(value))
        except (InvalidOperation, ValueError, TypeError):
            return default

    @staticmethod
    def _to_datetime_utc(value: Any) -> Optional[datetime]:
        """Normalise a datetime-like value to a UTC-aware datetime.

        Handles:
        - datetime with tzinfo  → converted to UTC
        - naive datetime        → assumed UTC
        - ISO 8601 string       → parsed then normalised
        - Other types           → None
        """
        if value is None:
            return None
        if isinstance(value, datetime):
            if value.tzinfo is None:
                return value.replace(tzinfo=timezone.utc)
            return value.astimezone(timezone.utc)
        if isinstance(value, str):
            try:
                dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
                return AbstractTransformer._to_datetime_utc(dt)
            except ValueError:
                return None
        return None

    @staticmethod
    def _to_date(value: Any) -> Optional[date]:
        """Extract a Python ``date`` from a datetime, date, or YYYY-MM-DD string."""
        if value is None:
            return None
        if isinstance(value, datetime):
            return value.date()
        if isinstance(value, date):
            return value
        if isinstance(value, str):
            try:
                return datetime.strptime(value[:10], "%Y-%m-%d").date()
            except (ValueError, TypeError):
                return None
        return None

    @staticmethod
    def _to_str(value: Any, max_len: Optional[int] = None) -> Optional[str]:
        """Coerce value to str, truncating to ``max_len`` if specified."""
        if value is None:
            return None
        result = str(value).strip()
        if max_len and len(result) > max_len:
            result = result[:max_len]
        return result or None

    @staticmethod
    def _to_bool(value: Any, *, default: bool = False) -> bool:
        """Safe boolean coercion. Returns ``default`` when value is None."""
        if value is None:
            return default
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float)):
            return bool(value)
        if isinstance(value, str):
            return value.strip().lower() in ("true", "1", "yes")
        return default

    @staticmethod
    def _to_uuid5(value: Any) -> Optional[uuid.UUID]:
        """Deterministic ObjectId → UUID5 conversion using NAMESPACE_OID.

        The same source string always produces the same UUID, making this
        safe to use as a stable analytical primary key.
        Returns None if value is None or empty.
        """
        if value is None:
            return None
        raw = str(value).strip()
        if not raw:
            return None
        return uuid.uuid5(_NAMESPACE, raw)

    @staticmethod
    def _now_utc() -> datetime:
        """Return the current UTC-aware datetime."""
        return datetime.now(timezone.utc)

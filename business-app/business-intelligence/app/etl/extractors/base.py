"""
Abstract extractor base class.

Extractors read raw operational data from the source (MongoDB) and yield
records as async iterators. Each entity domain has its own concrete extractor.
"""
from abc import ABC, abstractmethod
from typing import Any, AsyncIterator


class AbstractExtractor(ABC):
    """
    Base class for all ETL extractors.

    An extractor reads from a source system (MongoDB business_app_db)
    and yields raw documents one at a time. The transformer layer is
    responsible for converting these raw documents into warehouse models.
    """

    @abstractmethod
    async def extract(self, business_id: str, **kwargs) -> AsyncIterator[Any]:
        """
        Yield raw records from the source for the given business.

        Args:
            business_id: Tenant identifier for data isolation.
            **kwargs: Additional filter parameters (e.g. since, until).

        Yields:
            Raw source documents (dicts from MongoDB).
        """
        raise NotImplementedError
        # Required to satisfy the async generator type hint
        # (body is never reached)
        yield  # pragma: no cover

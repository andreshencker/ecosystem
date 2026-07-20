"""Abstract loader base class."""
from abc import ABC, abstractmethod
from typing import Any, List


class AbstractLoader(ABC):
    """
    Base class for all ETL loaders.

    A loader receives a batch of transformed model instances and writes
    them to the target data store (PostgreSQL data warehouse).

    Implementation must be idempotent — upsert by event_id primary key.
    """

    @abstractmethod
    async def load(self, records: List[Any]) -> int:
        """
        Write a batch of records to the data warehouse.

        Args:
            records: List of SQLAlchemy model instances from the transformer.

        Returns:
            Number of records successfully upserted.

        Raises:
            RuntimeError: If the batch write fails.
        """
        raise NotImplementedError

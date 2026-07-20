"""
Abstract base repository providing a typed interface for all data access.

Every concrete repository extends AbstractRepository[T] and injects
an AsyncSession from app.database.postgres.get_db.
"""
from abc import ABC, abstractmethod
from typing import Generic, List, Optional, TypeVar

from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T")


class AbstractRepository(ABC, Generic[T]):
    """
    Generic async repository base class.

    Subclasses must implement get_by_id and list_by_business_id.
    Additional query methods should be added to the concrete class.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    @abstractmethod
    async def get_by_id(self, entity_id: str) -> Optional[T]:
        """Fetch a single entity by its primary key."""
        raise NotImplementedError

    @abstractmethod
    async def list_by_business_id(self, business_id: str) -> List[T]:
        """Return all entities belonging to a given business (tenant)."""
        raise NotImplementedError

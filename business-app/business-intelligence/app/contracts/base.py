"""Abstract base class for all information contracts."""
from abc import ABC, abstractmethod
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession


class AbstractContract(ABC):
    """
    Base class for all information contracts in the BI service.

    An information contract is the interface between the BI web layer
    and a specific analytical domain. Each contract owns its schema (Pydantic
    response models) and its service (query logic against the data warehouse).

    Concrete contracts must implement get_summary().
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    @abstractmethod
    async def get_summary(self, business_id: str, period: Optional[str] = None) -> Any:
        """
        Return the analytical summary for a given business and optional period.

        Args:
            business_id: Tenant identifier (from JWT, never from request body).
            period: Optional YYYY-MM filter string.

        Returns:
            A Pydantic model instance matching the contract's schema.
        """
        raise NotImplementedError

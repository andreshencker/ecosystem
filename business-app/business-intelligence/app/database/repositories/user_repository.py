"""Repository for DimUser analytical model."""
from typing import List, Optional

from app.database.repositories.base import AbstractRepository
from app.models.users.analytical_model import DimUser


class UserRepository(AbstractRepository[DimUser]):
    """Read-only access to the dim_user dimension table."""

    async def get_by_id(self, entity_id: str) -> Optional[DimUser]:
        raise NotImplementedError

    async def list_by_business_id(self, business_id: str) -> List[DimUser]:
        raise NotImplementedError

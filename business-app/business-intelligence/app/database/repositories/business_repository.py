"""Repository for DimBusiness analytical model."""
from typing import List, Optional

from app.database.repositories.base import AbstractRepository
from app.models.companies.analytical_model import DimBusiness


class BusinessRepository(AbstractRepository[DimBusiness]):
    """Read-only access to the dim_business dimension table."""

    async def get_by_id(self, entity_id: str) -> Optional[DimBusiness]:
        raise NotImplementedError

    async def list_by_business_id(self, business_id: str) -> List[DimBusiness]:
        raise NotImplementedError

"""Repository for DimCustomer and its child bridge tables."""
import uuid
from typing import List, Optional

from sqlalchemy import or_, select

from app.database.repositories.base import AbstractRepository
from app.models.customers.analytical_model import DimCustomer
from app.models.customers.bridge_models import (
    BridgeCustomerCommunicationPurpose,
    BridgeCustomerCommunicationRecipient,
    BridgeCustomerContact,
    BridgeCustomerLocation,
)
from app.models.companies.analytical_model import DimBusiness


class CustomerRepository(AbstractRepository[DimCustomer]):
    """Read access to the dim_customer dimension table and its bridge tables."""

    async def get_by_id(
        self,
        entity_id: str,
        business_id: Optional[str] = None,
    ) -> Optional[DimCustomer]:
        """Fetch a single customer by customer_id UUID string.

        When business_id is supplied the query is filtered to enforce tenant isolation.
        """
        try:
            customer_uuid = uuid.UUID(entity_id)
        except (ValueError, AttributeError):
            return None

        stmt = select(DimCustomer).where(DimCustomer.customer_id == customer_uuid)
        if business_id:
            try:
                biz_uuid = uuid.UUID(business_id)
                stmt = stmt.where(DimCustomer.business_id == biz_uuid)
            except (ValueError, AttributeError):
                return None

        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_business_id(
        self,
        business_id: Optional[str],
        *,
        page: int = 1,
        limit: int = 50,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        customer_type: Optional[str] = None,
        has_contacts: Optional[bool] = None,
        has_locations: Optional[bool] = None,
        has_communication_configuration: Optional[bool] = None,
        has_data_quality_issues: Optional[bool] = None,
    ) -> List[DimCustomer]:
        """Return customers with optional filters and pagination.

        business_id may be None to list across all businesses (Platform Admin).
        Search covers: customer display_name, ABN, contact name, contact email.
        """
        stmt = select(DimCustomer)

        if business_id is not None:
            try:
                biz_uuid = uuid.UUID(business_id)
                stmt = stmt.where(DimCustomer.business_id == biz_uuid)
            except (ValueError, AttributeError):
                return []

        stmt = _apply_filters(stmt, is_active, customer_type, has_contacts,
                              has_locations, has_communication_configuration,
                              has_data_quality_issues)

        if search:
            stmt = _apply_search(stmt, search)

        offset = (page - 1) * limit
        stmt = stmt.order_by(DimCustomer.display_name).offset(offset).limit(limit)

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_by_business_id(
        self,
        business_id: Optional[str],
        *,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        customer_type: Optional[str] = None,
        has_contacts: Optional[bool] = None,
        has_locations: Optional[bool] = None,
        has_communication_configuration: Optional[bool] = None,
        has_data_quality_issues: Optional[bool] = None,
    ) -> int:
        """Count customers matching the given filters."""
        from sqlalchemy import func

        stmt = select(func.count()).select_from(DimCustomer)

        if business_id is not None:
            try:
                biz_uuid = uuid.UUID(business_id)
                stmt = stmt.where(DimCustomer.business_id == biz_uuid)
            except (ValueError, AttributeError):
                return 0

        stmt = _apply_filters(stmt, is_active, customer_type, has_contacts,
                              has_locations, has_communication_configuration,
                              has_data_quality_issues)

        if search:
            stmt = _apply_search(stmt, search)

        result = await self.db.execute(stmt)
        return result.scalar_one() or 0

    async def get_business_names(
        self, business_ids: list[uuid.UUID]
    ) -> dict[uuid.UUID, str]:
        """Return a {business_id: business_name} map for the given IDs."""
        if not business_ids:
            return {}
        stmt = select(DimBusiness.business_id, DimBusiness.business_name).where(
            DimBusiness.business_id.in_(business_ids)
        )
        result = await self.db.execute(stmt)
        return {row.business_id: row.business_name for row in result.fetchall()}

    async def get_locations(self, customer_id: str) -> List[BridgeCustomerLocation]:
        """Return all locations for a customer."""
        try:
            cust_uuid = uuid.UUID(customer_id)
        except (ValueError, AttributeError):
            return []
        stmt = select(BridgeCustomerLocation).where(
            BridgeCustomerLocation.customer_id == cust_uuid
        ).order_by(BridgeCustomerLocation.tag)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_contacts(self, customer_id: str) -> List[BridgeCustomerContact]:
        """Return all contacts for a customer, primary contact first."""
        try:
            cust_uuid = uuid.UUID(customer_id)
        except (ValueError, AttributeError):
            return []
        stmt = (
            select(BridgeCustomerContact)
            .where(BridgeCustomerContact.customer_id == cust_uuid)
            .order_by(BridgeCustomerContact.is_primary.desc(), BridgeCustomerContact.contact_name)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_purposes(
        self, customer_id: str
    ) -> List[BridgeCustomerCommunicationPurpose]:
        """Return all communication purposes for a customer."""
        try:
            cust_uuid = uuid.UUID(customer_id)
        except (ValueError, AttributeError):
            return []
        stmt = select(BridgeCustomerCommunicationPurpose).where(
            BridgeCustomerCommunicationPurpose.customer_id == cust_uuid
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_recipients(
        self, customer_id: str
    ) -> List[BridgeCustomerCommunicationRecipient]:
        """Return all communication recipients for a customer."""
        try:
            cust_uuid = uuid.UUID(customer_id)
        except (ValueError, AttributeError):
            return []
        stmt = (
            select(BridgeCustomerCommunicationRecipient)
            .where(BridgeCustomerCommunicationRecipient.customer_id == cust_uuid)
            .order_by(
                BridgeCustomerCommunicationRecipient.communication_domain_id,
                BridgeCustomerCommunicationRecipient.channel,
                BridgeCustomerCommunicationRecipient.recipient_type,
            )
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())


# ---------------------------------------------------------------------------
# Private filter helpers (shared by list and count queries)
# ---------------------------------------------------------------------------

def _apply_filters(stmt, is_active, customer_type, has_contacts,
                   has_locations, has_communication_configuration,
                   has_data_quality_issues):
    if is_active is not None:
        stmt = stmt.where(DimCustomer.is_active == is_active)
    if customer_type is not None:
        stmt = stmt.where(DimCustomer.customer_type == customer_type)
    if has_contacts is not None:
        stmt = stmt.where(DimCustomer.has_contacts == has_contacts)
    if has_locations is not None:
        stmt = stmt.where(DimCustomer.has_locations == has_locations)
    if has_communication_configuration is not None:
        stmt = stmt.where(
            DimCustomer.has_communication_configuration == has_communication_configuration
        )
    if has_data_quality_issues is True:
        stmt = stmt.where(DimCustomer.data_quality_issue_count > 0)
    elif has_data_quality_issues is False:
        stmt = stmt.where(DimCustomer.data_quality_issue_count == 0)
    return stmt


def _apply_search(stmt, search: str):
    """Expand search across display_name, ABN, contact name, and contact email."""
    pattern = f"%{search}%"
    contact_match = (
        select(BridgeCustomerContact.customer_id)
        .where(
            or_(
                BridgeCustomerContact.contact_name.ilike(pattern),
                BridgeCustomerContact.email.ilike(pattern),
            )
        )
        .scalar_subquery()
    )
    return stmt.where(
        or_(
            DimCustomer.display_name.ilike(pattern),
            DimCustomer.abn.ilike(pattern),
            DimCustomer.customer_id.in_(contact_match),
        )
    )

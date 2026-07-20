"""Customer contract services.

CustomerKpiService   — existing summary KPI endpoint (preserved).
CustomerDetailService — new full-profile detail and list endpoints.
"""
import uuid as _uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func, case, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contracts.customers.platform_admin_schema import (
    CustomerContactDetail,
    CustomerDetailResponse,
    CustomerListItem,
    CustomerListResponse,
    CustomerLocationDetail,
    CustomerPurposeDetail,
    CustomerRecipientDetail,
)
from app.contracts.customers.schema import CustomerSummaryResponse, RecentCustomer
from app.database.repositories.customer_repository import CustomerRepository
from app.models.customers.analytical_model import DimCustomer
from app.models.customers.bridge_models import (
    BridgeCustomerCommunicationPurpose,
    BridgeCustomerCommunicationRecipient,
)


class CustomerKpiService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_summary(
        self,
        business_id: str,
        period: Optional[str] = None,
    ) -> CustomerSummaryResponse:
        """
        Returns customer summary KPIs for a given businessId.
        The period filter applies only to recentCustomers (created within that month).
        Totals are always cumulative.
        """
        try:
            biz_uuid = _uuid.UUID(business_id)
        except (ValueError, AttributeError):
            raise ValueError(f"Invalid businessId: {business_id!r}")

        # Totals (cumulative, not filtered by period)
        total_stmt = (
            select(
                func.count().label("total"),
                func.sum(case((DimCustomer.is_active == True, 1), else_=0)).label("active"),
                func.sum(case((DimCustomer.is_active == False, 1), else_=0)).label("inactive"),
            )
            .where(DimCustomer.business_id == biz_uuid)
        )
        result = await self.db.execute(total_stmt)
        row = result.one()
        total = row.total or 0
        active = row.active or 0
        inactive = row.inactive or 0

        # Customers by type
        type_stmt = (
            select(DimCustomer.customer_type, func.count().label("cnt"))
            .where(DimCustomer.business_id == biz_uuid)
            .group_by(DimCustomer.customer_type)
        )
        type_result = await self.db.execute(type_stmt)
        customers_by_type = {r.customer_type: r.cnt for r in type_result.all()}

        # Recent customers (last 5, or filtered by period)
        recent_stmt = (
            select(DimCustomer)
            .where(DimCustomer.business_id == biz_uuid)
            .order_by(DimCustomer.created_at.desc())
            .limit(5)
        )
        recent_result = await self.db.execute(recent_stmt)
        recent_docs = recent_result.scalars().all()
        recent = [
            RecentCustomer(
                customerId=doc.customer_id,
                displayName=doc.display_name,
                customerType=doc.customer_type,
                createdAt=doc.created_at,
            )
            for doc in recent_docs
        ]

        return CustomerSummaryResponse(
            businessId=str(business_id),
            period=period,
            totalCustomers=total,
            activeCustomers=active,
            inactiveCustomers=inactive,
            customersByType=customers_by_type,
            recentCustomers=recent,
            calculatedAt=datetime.now(timezone.utc),
        )


class CustomerDetailService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self._repo = CustomerRepository(db)

    async def get_detail(
        self,
        customer_id: str,
        business_id: Optional[str] = None,
    ) -> Optional[CustomerDetailResponse]:
        """Return the full analytical profile for a single customer."""
        customer = await self._repo.get_by_id(customer_id, business_id=business_id)
        if customer is None:
            return None

        cust_id_str = str(customer.customer_id)

        locations_orm = await self._repo.get_locations(cust_id_str)
        contacts_orm = await self._repo.get_contacts(cust_id_str)
        purposes_orm = await self._repo.get_purposes(cust_id_str)
        recipients_orm = await self._repo.get_recipients(cust_id_str)

        # Resolve business name
        biz_names = await self._repo.get_business_names([customer.business_id])
        biz_name = biz_names.get(customer.business_id)

        # Group recipients by purpose
        recipients_by_domain: dict[str, list] = {}
        for r in recipients_orm:
            recipients_by_domain.setdefault(r.communication_domain_id, []).append(r)

        location_details = [_map_location(loc) for loc in locations_orm]
        contact_details = [_map_contact(con) for con in contacts_orm]
        purpose_details = [
            _map_purpose(p, recipients_by_domain.get(p.communication_domain_id, []))
            for p in purposes_orm
        ]

        return CustomerDetailResponse(
            customerId=str(customer.customer_id),
            businessId=str(customer.business_id),
            businessName=biz_name,
            customerName=customer.display_name,
            customerType=customer.customer_type,
            abn=customer.abn,
            isActive=customer.is_active,
            notes=customer.notes,
            contactCount=customer.contact_count,
            locationCount=customer.location_count,
            communicationPurposeCount=customer.communication_purpose_count,
            emailRecipientCount=customer.email_recipient_count,
            smsRecipientCount=customer.sms_recipient_count,
            hasPrimaryContact=customer.has_primary_contact,
            hasAbn=customer.has_abn,
            hasLocations=customer.has_locations,
            hasContacts=customer.has_contacts,
            hasCommunicationConfiguration=customer.has_communication_configuration,
            dataQualityIssueCount=customer.data_quality_issue_count,
            dataQualityIssues=customer.data_quality_issues or [],
            sourceCreatedAt=customer.source_created_at,
            sourceUpdatedAt=customer.source_updated_at,
            syncedAt=customer.synced_at,
            locations=location_details,
            contacts=contact_details,
            purposes=purpose_details,
        )

    async def list_customers(
        self,
        business_id: Optional[str] = None,
        page: int = 1,
        limit: int = 50,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        customer_type: Optional[str] = None,
        has_contacts: Optional[bool] = None,
        has_locations: Optional[bool] = None,
        has_communication_configuration: Optional[bool] = None,
        has_data_quality_issues: Optional[bool] = None,
    ) -> CustomerListResponse:
        """Return a paginated list of customers.

        business_id is optional. When None, lists customers across all businesses
        (Platform Admin cross-tenant view). When provided, scopes to that tenant.
        Search covers display_name, ABN, contact name, and contact email.
        """
        filter_kwargs = dict(
            search=search,
            is_active=is_active,
            customer_type=customer_type,
            has_contacts=has_contacts,
            has_locations=has_locations,
            has_communication_configuration=has_communication_configuration,
            has_data_quality_issues=has_data_quality_issues,
        )

        customers = await self._repo.list_by_business_id(
            business_id,
            page=page,
            limit=limit,
            **filter_kwargs,
        )
        total = await self._repo.count_by_business_id(business_id, **filter_kwargs)

        # Resolve business names for all distinct businesses in the result set
        distinct_biz_ids = list({c.business_id for c in customers})
        biz_names = await self._repo.get_business_names(distinct_biz_ids)

        items = [_map_list_item(c, biz_names.get(c.business_id)) for c in customers]

        return CustomerListResponse(
            businessId=business_id or "",
            items=items,
            total=total,
            page=page,
            limit=limit,
            calculatedAt=datetime.now(timezone.utc),
        )


# ---------------------------------------------------------------------------
# Mapping helpers
# ---------------------------------------------------------------------------

def _map_location(loc) -> CustomerLocationDetail:
    return CustomerLocationDetail(
        sourceLocationId=loc.source_location_id,
        tag=loc.tag,
        country=loc.country,
        addressLine1=loc.address_line_1,
        addressLine2=loc.address_line_2,
        city=loc.city,
        postcode=loc.postcode,
        state=loc.state,
        fullAddress=loc.full_address,
        isValidAddress=loc.is_valid_address,
        isLegacy=loc.is_legacy,
    )


def _map_contact(con) -> CustomerContactDetail:
    return CustomerContactDetail(
        sourceContactId=con.source_contact_id,
        contactName=con.contact_name,
        roleOrPosition=con.role_or_position,
        email=con.email,
        phone=con.phone,
        locationId=con.location_id,
        locationTag=con.location_tag,
        isPrimary=con.is_primary,
        hasEmail=con.has_email,
        hasPhone=con.has_phone,
        hasLocation=con.has_location,
    )


def _map_purpose(purpose, recipients: list) -> CustomerPurposeDetail:
    recipient_details = [
        CustomerRecipientDetail(
            channel=r.channel,
            destination=r.destination,
            recipientType=r.recipient_type,
            destinationNormalized=r.destination_normalized,
            isValidDestination=r.is_valid_destination,
        )
        for r in recipients
    ]
    return CustomerPurposeDetail(
        communicationDomainId=purpose.communication_domain_id,
        configuredChannelCount=purpose.configured_channel_count,
        emailRecipientCount=purpose.email_recipient_count,
        smsRecipientCount=purpose.sms_recipient_count,
        hasEmailChannel=purpose.has_email_channel,
        hasSmsChannel=purpose.has_sms_channel,
        recipients=recipient_details,
    )


def _map_list_item(c: DimCustomer, business_name: Optional[str] = None) -> CustomerListItem:
    return CustomerListItem(
        customerId=str(c.customer_id),
        businessId=str(c.business_id),
        businessName=business_name,
        customerName=c.display_name,
        customerType=c.customer_type,
        abn=c.abn,
        isActive=c.is_active,
        contactCount=c.contact_count,
        locationCount=c.location_count,
        communicationPurposeCount=c.communication_purpose_count,
        emailRecipientCount=c.email_recipient_count,
        smsRecipientCount=c.sms_recipient_count,
        hasPrimaryContact=c.has_primary_contact,
        hasAbn=c.has_abn,
        hasLocations=c.has_locations,
        hasContacts=c.has_contacts,
        hasCommunicationConfiguration=c.has_communication_configuration,
        dataQualityIssueCount=c.data_quality_issue_count,
        dataQualityIssues=c.data_quality_issues,
        sourceCreatedAt=c.source_created_at,
        sourceUpdatedAt=c.source_updated_at,
        syncedAt=c.synced_at,
    )

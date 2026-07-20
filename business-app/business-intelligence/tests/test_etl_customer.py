"""Tests for CustomerTransformer and CustomerDetailService.

Transformer tests are pure Python — no database required.
Service tests use AsyncMock to simulate repository calls.
"""
import uuid
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.etl.transformers.customer_transformer import (
    CustomerTransformResult,
    CustomerTransformer,
)


# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------

CUSTOMER_ID = "507f1f77bcf86cd799439021"
COMPANY_ID = "507f1f77bcf86cd799439011"
LOCATION_ID_1 = "507f1f77bcf86cd799439031"
LOCATION_ID_2 = "507f1f77bcf86cd799439032"
CONTACT_ID_1 = "507f1f77bcf86cd799439041"
CONTACT_ID_2 = "507f1f77bcf86cd799439042"
DOMAIN_ID = "invoicing"


def make_location(
    location_id=LOCATION_ID_1,
    tag="Head Office",
    country="AU",
    line1="123 Main St",
    line2=None,
    city="Sydney",
    postalCode="2000",
    state="NSW",
):
    loc = {
        "_id": location_id,
        "tag": tag,
        "country": country,
        "line1": line1,
        "city": city,
        "postalCode": postalCode,
        "state": state,
    }
    if line2:
        loc["line2"] = line2
    return loc


def make_contact(
    contact_id=CONTACT_ID_1,
    first="Alice",
    last="Smith",
    email="alice@example.com",
    phone="+61412345678",
    role="Manager",
    is_primary=True,
    location_id=LOCATION_ID_1,
):
    return {
        "_id": contact_id,
        "firstName": first,
        "lastName": last,
        "email": email,
        "phone": phone,
        "role": role,
        "isPrimary": is_primary,
        "locationId": location_id,
    }


def make_purpose(
    domain_id=DOMAIN_ID,
    channels=None,
):
    if channels is None:
        channels = [
            {
                "channel": "email",
                "recipients": [
                    {"email": "billing@example.com", "recipientType": "to"},
                    {"email": "cc@example.com", "recipientType": "cc"},
                ],
            },
        ]
    return {"communicationDomainId": domain_id, "channels": channels}


def make_customer(**kwargs):
    defaults = {
        "_id": CUSTOMER_ID,
        "companyId": COMPANY_ID,
        "type": "company",
        "displayName": "Big Corp",
        "abn": "12345678901",
        "isActive": True,
        "createdAt": datetime(2026, 1, 1),
        "updatedAt": datetime(2026, 6, 1),
        "locations": [make_location()],
        "contacts": [make_contact()],
        "communicationPurposes": [make_purpose()],
    }
    defaults.update(kwargs)
    return defaults


transformer = CustomerTransformer()


# ---------------------------------------------------------------------------
# 1. Basic company customer — all fields present
# ---------------------------------------------------------------------------

def test_basic_company_customer():
    result = transformer.transform(make_customer())
    dim = result.dim_customer
    assert dim.display_name == "Big Corp"
    assert dim.customer_type == "company"
    assert dim.abn == "12345678901"
    assert dim.is_active is True
    assert isinstance(result, CustomerTransformResult)


# ---------------------------------------------------------------------------
# 2. Individual customer type
# ---------------------------------------------------------------------------

def test_individual_customer_type():
    result = transformer.transform(make_customer(type="individual"))
    assert result.dim_customer.customer_type == "individual"


# ---------------------------------------------------------------------------
# 3. Missing ABN → data quality issue
# ---------------------------------------------------------------------------

def test_missing_abn_quality_issue():
    result = transformer.transform(make_customer(abn=None))
    assert "missing_abn" in result.dim_customer.data_quality_issues
    assert result.dim_customer.has_abn is False


# ---------------------------------------------------------------------------
# 4. No contacts → missing_contact quality issue
# ---------------------------------------------------------------------------

def test_no_contacts_quality_issue():
    result = transformer.transform(make_customer(contacts=[], contact=None))
    assert "missing_contact" in result.dim_customer.data_quality_issues
    assert result.dim_customer.has_contacts is False
    assert result.dim_customer.contact_count == 0


# ---------------------------------------------------------------------------
# 5. No locations, has legacy address → synthesized location with is_legacy=True
# ---------------------------------------------------------------------------

def test_legacy_address_synthesized_location():
    legacy = {
        "country": "AU",
        "line1": "1 Legacy Rd",
        "city": "Melbourne",
        "postalCode": "3000",
        "state": "VIC",
    }
    result = transformer.transform(
        make_customer(locations=[], address=legacy, contact=None)
    )
    assert len(result.locations) == 1
    loc = result.locations[0]
    assert loc.is_legacy is True
    assert loc.source_location_id == "legacy"
    assert loc.tag == "Main Address"
    assert loc.country == "AU"
    assert loc.city == "Melbourne"
    assert result.dim_customer.has_locations is True


# ---------------------------------------------------------------------------
# 6. Multiple locations
# ---------------------------------------------------------------------------

def test_multiple_locations():
    locs = [
        make_location(LOCATION_ID_1, tag="HQ"),
        make_location(LOCATION_ID_2, tag="Warehouse", city="Brisbane", postalCode="4000"),
    ]
    result = transformer.transform(make_customer(locations=locs))
    assert len(result.locations) == 2
    assert result.dim_customer.location_count == 2
    assert result.dim_customer.has_locations is True


# ---------------------------------------------------------------------------
# 7. Multiple contacts
# ---------------------------------------------------------------------------

def test_multiple_contacts():
    cons = [
        make_contact(CONTACT_ID_1, first="Alice", is_primary=True),
        make_contact(CONTACT_ID_2, first="Bob", last="Jones", email="bob@example.com", is_primary=False),
    ]
    result = transformer.transform(make_customer(contacts=cons))
    assert len(result.contacts) == 2
    assert result.dim_customer.contact_count == 2
    assert result.dim_customer.has_primary_contact is True


# ---------------------------------------------------------------------------
# 8. Contact with valid locationId → location_tag is set
# ---------------------------------------------------------------------------

def test_contact_with_valid_location_id():
    locs = [make_location(LOCATION_ID_1, tag="Head Office")]
    cons = [make_contact(CONTACT_ID_1, location_id=LOCATION_ID_1)]
    result = transformer.transform(make_customer(locations=locs, contacts=cons))
    contact = result.contacts[0]
    assert contact.location_tag == "Head Office"
    assert contact.has_location is True


# ---------------------------------------------------------------------------
# 9. Contact with invalid/stale locationId → has_location=False
# ---------------------------------------------------------------------------

def test_contact_with_invalid_location_id():
    locs = [make_location(LOCATION_ID_1)]
    cons = [make_contact(CONTACT_ID_1, location_id="nonexistent_id")]
    result = transformer.transform(make_customer(locations=locs, contacts=cons))
    contact = result.contacts[0]
    assert contact.has_location is False
    assert "contact_with_missing_location_reference" in result.dim_customer.data_quality_issues


# ---------------------------------------------------------------------------
# 10. Contact without locationId → location fields null
# ---------------------------------------------------------------------------

def test_contact_without_location_id():
    cons = [
        {
            "_id": CONTACT_ID_1,
            "firstName": "Alice",
            "lastName": "Smith",
            "email": "alice@example.com",
            "phone": "+61412345678",
            "isPrimary": True,
        }
    ]
    result = transformer.transform(make_customer(contacts=cons))
    contact = result.contacts[0]
    assert contact.location_id is None
    assert contact.location_tag is None
    assert contact.has_location is False


# ---------------------------------------------------------------------------
# 11. Multiple communication purposes
# ---------------------------------------------------------------------------

def test_multiple_communication_purposes():
    purposes = [
        make_purpose(domain_id="invoicing"),
        make_purpose(domain_id="shifts", channels=[
            {"channel": "sms", "recipients": [{"phone": "+61412345678"}]}
        ]),
    ]
    result = transformer.transform(make_customer(communicationPurposes=purposes))
    assert len(result.purposes) == 2
    assert result.dim_customer.communication_purpose_count == 2
    assert result.dim_customer.has_communication_configuration is True


# ---------------------------------------------------------------------------
# 12. Email recipients with recipientType
# ---------------------------------------------------------------------------

def test_email_recipients_with_recipient_type():
    channels = [
        {
            "channel": "email",
            "recipients": [
                {"email": "to@example.com", "recipientType": "to"},
                {"email": "cc@example.com", "recipientType": "cc"},
                {"email": "bcc@example.com", "recipientType": "bcc"},
            ],
        }
    ]
    result = transformer.transform(
        make_customer(communicationPurposes=[make_purpose(channels=channels)])
    )
    email_recipients = [r for r in result.recipients if r.channel == "email"]
    assert len(email_recipients) == 3
    types = {r.recipient_type for r in email_recipients}
    assert types == {"to", "cc", "bcc"}


# ---------------------------------------------------------------------------
# 13. SMS recipients — no recipientType
# ---------------------------------------------------------------------------

def test_sms_recipients_have_no_recipient_type():
    channels = [
        {
            "channel": "sms",
            "recipients": [
                {"phone": "+61412345678"},
                {"phone": "+61487654321"},
            ],
        }
    ]
    result = transformer.transform(
        make_customer(communicationPurposes=[make_purpose(channels=channels)])
    )
    sms_recipients = [r for r in result.recipients if r.channel == "sms"]
    assert len(sms_recipients) == 2
    assert all(r.recipient_type is None for r in sms_recipients)
    assert result.dim_customer.sms_recipient_count == 2


# ---------------------------------------------------------------------------
# 14. Duplicate recipient destinations → duplicate_recipient quality issue
# ---------------------------------------------------------------------------

def test_duplicate_recipient_quality_issue():
    channels = [
        {
            "channel": "email",
            "recipients": [
                {"email": "dup@example.com", "recipientType": "to"},
                {"email": "DUP@EXAMPLE.COM", "recipientType": "cc"},  # same normalized
            ],
        }
    ]
    result = transformer.transform(
        make_customer(communicationPurposes=[make_purpose(channels=channels)])
    )
    assert "duplicate_recipient" in result.dim_customer.data_quality_issues


# ---------------------------------------------------------------------------
# 15. Invalid email recipient → invalid_email_recipient quality issue
# ---------------------------------------------------------------------------

def test_invalid_email_recipient_quality_issue():
    channels = [
        {
            "channel": "email",
            "recipients": [
                {"email": "to@example.com", "recipientType": "to"},
                {"email": "not-an-email", "recipientType": "cc"},
            ],
        }
    ]
    result = transformer.transform(
        make_customer(communicationPurposes=[make_purpose(channels=channels)])
    )
    assert "invalid_email_recipient" in result.dim_customer.data_quality_issues
    invalid_recs = [
        r for r in result.recipients if r.channel == "email" and not r.is_valid_destination
    ]
    assert len(invalid_recs) == 1


# ---------------------------------------------------------------------------
# 16. Legacy billingRecipients NOT extracted as communication recipients
# ---------------------------------------------------------------------------

def test_billing_recipients_not_extracted():
    raw = make_customer(
        communicationPurposes=[],
        billingRecipients=[
            {"documentType": "invoice", "email": "billing@example.com", "recipientType": "to"},
        ],
    )
    result = transformer.transform(raw)
    assert len(result.recipients) == 0
    assert result.dim_customer.email_recipient_count == 0


# ---------------------------------------------------------------------------
# 17. Deterministic key stability — same input → same keys
# ---------------------------------------------------------------------------

def test_deterministic_key_stability():
    raw = make_customer()
    result1 = transformer.transform(raw)
    result2 = transformer.transform(raw)

    assert result1.dim_customer.customer_id == result2.dim_customer.customer_id
    assert [loc.customer_location_key for loc in result1.locations] == \
           [loc.customer_location_key for loc in result2.locations]
    assert [con.customer_contact_key for con in result1.contacts] == \
           [con.customer_contact_key for con in result2.contacts]
    assert [p.customer_communication_purpose_key for p in result1.purposes] == \
           [p.customer_communication_purpose_key for p in result2.purposes]
    assert [r.customer_recipient_key for r in result1.recipients] == \
           [r.customer_recipient_key for r in result2.recipients]


# ---------------------------------------------------------------------------
# 18. Missing _id raises ValueError
# ---------------------------------------------------------------------------

def test_missing_id_raises():
    with pytest.raises(ValueError, match="_id"):
        transformer.transform({"companyId": COMPANY_ID})


# ---------------------------------------------------------------------------
# 19. Missing companyId raises ValueError
# ---------------------------------------------------------------------------

def test_missing_company_id_raises():
    with pytest.raises(ValueError, match="companyId"):
        transformer.transform({"_id": CUSTOMER_ID})


# ---------------------------------------------------------------------------
# 20. Legacy contact field synthesized when contacts[] is empty
# ---------------------------------------------------------------------------

def test_legacy_contact_synthesized():
    legacy_contact = {
        "name": "Jane Doe",
        "email": "jane@example.com",
        "phone": "+61400000001",
    }
    result = transformer.transform(
        make_customer(contacts=[], contact=legacy_contact)
    )
    assert len(result.contacts) == 1
    con = result.contacts[0]
    assert con.contact_name == "Jane Doe"
    assert con.email == "jane@example.com"
    assert con.is_primary is True
    assert con.has_email is True
    assert con.has_phone is True
    assert con.has_location is False


# ---------------------------------------------------------------------------
# 21. Counts are correct
# ---------------------------------------------------------------------------

def test_counts_are_correct():
    locs = [make_location(LOCATION_ID_1), make_location(LOCATION_ID_2, city="Brisbane", postalCode="4000")]
    cons = [
        make_contact(CONTACT_ID_1, is_primary=True),
        make_contact(CONTACT_ID_2, first="Bob", is_primary=False),
    ]
    channels = [
        {
            "channel": "email",
            "recipients": [
                {"email": "a@example.com", "recipientType": "to"},
                {"email": "b@example.com", "recipientType": "cc"},
            ],
        },
        {
            "channel": "sms",
            "recipients": [{"phone": "+61412345678"}],
        },
    ]
    purposes = [make_purpose(channels=channels)]
    result = transformer.transform(
        make_customer(locations=locs, contacts=cons, communicationPurposes=purposes)
    )
    dim = result.dim_customer
    assert dim.location_count == 2
    assert dim.contact_count == 2
    assert dim.communication_purpose_count == 1
    assert dim.email_recipient_count == 2
    assert dim.sms_recipient_count == 1


# ---------------------------------------------------------------------------
# 22. data_quality_issue_count == len(data_quality_issues)
# ---------------------------------------------------------------------------

def test_quality_issue_count_matches_list_length():
    # Force several issues: no ABN, no contacts, no locations
    raw = {
        "_id": CUSTOMER_ID,
        "companyId": COMPANY_ID,
        "type": "individual",
        "displayName": "Jane",
        "isActive": True,
        "locations": [],
        "contacts": [],
        "communicationPurposes": [],
    }
    result = transformer.transform(raw)
    dim = result.dim_customer
    issues = dim.data_quality_issues or []
    assert dim.data_quality_issue_count == len(issues)


# ---------------------------------------------------------------------------
# 23. Customer with all quality flags clean (no issues)
# ---------------------------------------------------------------------------

def test_no_quality_issues_when_all_clean():
    result = transformer.transform(make_customer())
    dim = result.dim_customer
    assert dim.data_quality_issue_count == 0
    assert not dim.data_quality_issues


# ---------------------------------------------------------------------------
# 24. purpose_without_recipients quality issue
# ---------------------------------------------------------------------------

def test_purpose_without_recipients_quality_issue():
    purposes = [
        make_purpose(
            channels=[{"channel": "email", "recipients": []}]
        )
    ]
    result = transformer.transform(
        make_customer(communicationPurposes=purposes)
    )
    assert "purpose_without_recipients" in result.dim_customer.data_quality_issues


# ---------------------------------------------------------------------------
# 25. email_channel_without_to_recipient quality issue
# ---------------------------------------------------------------------------

def test_email_channel_without_to_recipient():
    channels = [
        {
            "channel": "email",
            "recipients": [
                {"email": "cc@example.com", "recipientType": "cc"},
            ],
        }
    ]
    result = transformer.transform(
        make_customer(communicationPurposes=[make_purpose(channels=channels)])
    )
    assert "email_channel_without_to_recipient" in result.dim_customer.data_quality_issues


# ---------------------------------------------------------------------------
# Additional coverage: incomplete_location quality issue
# ---------------------------------------------------------------------------

def test_incomplete_location_quality_issue():
    # Location missing postalCode
    incomplete_loc = {
        "_id": LOCATION_ID_1,
        "tag": "Office",
        "country": "AU",
        "line1": "1 Main St",
        "city": "Sydney",
        # postalCode omitted
        "state": "NSW",
    }
    result = transformer.transform(make_customer(locations=[incomplete_loc]))
    assert "incomplete_location" in result.dim_customer.data_quality_issues
    assert result.locations[0].is_valid_address is False


# ---------------------------------------------------------------------------
# Additional: contact_with_invalid_email quality issue
# ---------------------------------------------------------------------------

def test_contact_with_invalid_email_quality_issue():
    cons = [
        {
            "_id": CONTACT_ID_1,
            "firstName": "Alice",
            "lastName": "Smith",
            "email": "not-valid",
            "isPrimary": True,
        }
    ]
    result = transformer.transform(make_customer(contacts=cons))
    assert "contact_with_invalid_email" in result.dim_customer.data_quality_issues


# ---------------------------------------------------------------------------
# Additional: missing_contact_email when contacts exist but none have email
# ---------------------------------------------------------------------------

def test_missing_contact_email_quality_issue():
    cons = [
        {
            "_id": CONTACT_ID_1,
            "firstName": "Alice",
            "lastName": "Smith",
            "isPrimary": True,
        }
    ]
    result = transformer.transform(make_customer(contacts=cons))
    assert "missing_contact_email" in result.dim_customer.data_quality_issues


# ---------------------------------------------------------------------------
# Additional: no legacy location synthesized when locations is empty and no address
# ---------------------------------------------------------------------------

def test_no_legacy_location_when_no_address():
    result = transformer.transform(
        make_customer(locations=[], address=None)
    )
    assert len(result.locations) == 0
    assert result.dim_customer.has_locations is False


# ---------------------------------------------------------------------------
# Service layer tests — mock DB, no live database
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_customer_detail_service_returns_none_for_unknown_customer():
    from app.contracts.customers.service import CustomerDetailService

    mock_db = MagicMock()
    service = CustomerDetailService(mock_db)

    # Patch repository get_by_id to return None
    service._repo.get_by_id = AsyncMock(return_value=None)

    result = await service.get_detail("00000000-0000-0000-0000-000000000001", "biz-123")
    assert result is None


@pytest.mark.asyncio
async def test_customer_list_item_shape():
    from app.contracts.customers.service import CustomerDetailService

    mock_db = MagicMock()
    service = CustomerDetailService(mock_db)

    # Build a minimal DimCustomer-like object
    mock_customer = MagicMock()
    mock_customer.customer_id = uuid.uuid4()
    mock_customer.business_id = uuid.uuid4()
    mock_customer.display_name = "Test Corp"
    mock_customer.customer_type = "company"
    mock_customer.abn = "98765432100"
    mock_customer.is_active = True
    mock_customer.notes = None
    mock_customer.contact_count = 1
    mock_customer.location_count = 1
    mock_customer.communication_purpose_count = 1
    mock_customer.email_recipient_count = 2
    mock_customer.sms_recipient_count = 0
    mock_customer.has_primary_contact = True
    mock_customer.has_abn = True
    mock_customer.has_locations = True
    mock_customer.has_contacts = True
    mock_customer.has_communication_configuration = True
    mock_customer.data_quality_issue_count = 0
    mock_customer.data_quality_issues = None
    mock_customer.source_created_at = datetime(2026, 1, 1)
    mock_customer.source_updated_at = datetime(2026, 6, 1)
    mock_customer.synced_at = datetime(2026, 7, 1)
    mock_customer.created_at = datetime(2026, 1, 1)
    mock_customer.updated_at = datetime(2026, 6, 1)

    service._repo.get_by_id = AsyncMock(return_value=mock_customer)
    service._repo.get_locations = AsyncMock(return_value=[])
    service._repo.get_contacts = AsyncMock(return_value=[])
    service._repo.get_purposes = AsyncMock(return_value=[])
    service._repo.get_recipients = AsyncMock(return_value=[])
    service._repo.get_business_names = AsyncMock(
        return_value={mock_customer.business_id: "Test Business"}
    )

    cust_id = str(mock_customer.customer_id)
    biz_id = str(mock_customer.business_id)
    result = await service.get_detail(cust_id, biz_id)

    assert result is not None
    assert result.customerName == "Test Corp"
    assert result.customerType == "company"
    assert result.abn == "98765432100"
    assert result.isActive is True
    assert result.contactCount == 1
    assert result.hasCommunicationConfiguration is True
    assert result.dataQualityIssues == []
    assert result.locations == []
    assert result.contacts == []
    assert result.purposes == []
    assert result.businessName == "Test Business"


@pytest.mark.asyncio
async def test_list_customers_returns_response_shape():
    from app.contracts.customers.service import CustomerDetailService

    mock_db = MagicMock()
    service = CustomerDetailService(mock_db)

    service._repo.list_by_business_id = AsyncMock(return_value=[])
    service._repo.count_by_business_id = AsyncMock(return_value=0)
    service._repo.get_business_names = AsyncMock(return_value={})

    biz_id = str(uuid.uuid4())
    result = await service.list_customers(biz_id, page=1, limit=20)

    assert result.businessId == biz_id
    assert result.items == []
    assert result.total == 0
    assert result.page == 1
    assert result.limit == 20
    assert isinstance(result.calculatedAt, datetime)

"""Transformer: raw MongoDB customer document → CustomerTransformResult.

Produces a DimCustomer row plus four bridge-table row lists:
  - BridgeCustomerLocation
  - BridgeCustomerContact
  - BridgeCustomerCommunicationPurpose
  - BridgeCustomerCommunicationRecipient

All primary keys are deterministic (uuid5) so that repeated runs on the same
source document always yield the same rows, enabling safe DELETE + INSERT
replacement of child collections.
"""
import re
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional

from app.etl.transformers.base import AbstractTransformer
from app.etl.transformers.business_transformer import _to_uuid_from_objectid
from app.models.customers.analytical_model import DimCustomer
from app.models.customers.bridge_models import (
    BridgeCustomerCommunicationPurpose,
    BridgeCustomerCommunicationRecipient,
    BridgeCustomerContact,
    BridgeCustomerLocation,
)

# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
_PHONE_RE = re.compile(r"^\+?[0-9\s\-()‬]{7,20}$")


def _is_valid_email(value: Optional[str]) -> bool:
    if not value:
        return False
    return bool(_EMAIL_RE.match(value.strip()))


def _is_valid_phone(value: Optional[str]) -> bool:
    if not value:
        return False
    return bool(_PHONE_RE.match(value.strip()))


# ---------------------------------------------------------------------------
# Deterministic key helpers
# ---------------------------------------------------------------------------

def _det_uuid(key_string: str) -> uuid.UUID:
    """Generate a deterministic UUID5 from an arbitrary string key."""
    return uuid.uuid5(uuid.NAMESPACE_DNS, key_string)


# ---------------------------------------------------------------------------
# Result dataclass
# ---------------------------------------------------------------------------

@dataclass
class CustomerTransformResult:
    dim_customer: DimCustomer
    locations: list = field(default_factory=list)
    contacts: list = field(default_factory=list)
    purposes: list = field(default_factory=list)
    recipients: list = field(default_factory=list)


# ---------------------------------------------------------------------------
# Transformer
# ---------------------------------------------------------------------------

class CustomerTransformer(AbstractTransformer[dict, Any]):
    """Convert a raw MongoDB customer document into a CustomerTransformResult."""

    def transform(self, raw: dict) -> CustomerTransformResult:
        source_id = raw.get("_id")
        company_id = raw.get("companyId")
        if not source_id:
            raise ValueError("Customer document has no _id field")
        if not company_id:
            raise ValueError(f"Customer {source_id} has no companyId")

        now = datetime.now(timezone.utc)

        customer_id = _to_uuid_from_objectid(source_id)
        business_id = _to_uuid_from_objectid(company_id)

        # ------------------------------------------------------------------
        # 1. Locations
        # ------------------------------------------------------------------
        raw_locations: list = raw.get("locations") or []
        legacy_address: Optional[dict] = raw.get("address")

        locations: list[BridgeCustomerLocation] = []
        # Map source_location_id → tag for contact look-ups
        location_tag_by_source_id: dict[str, str] = {}

        if raw_locations:
            for idx, loc in enumerate(raw_locations):
                source_location_id = str(loc.get("_id") or f"pos:{idx}")
                tag = loc.get("tag") or None
                country = loc.get("country") or None
                line1 = loc.get("line1") or None
                line2 = loc.get("line2") or None
                city = loc.get("city") or None
                postcode = loc.get("postalCode") or None
                state = loc.get("state") or None

                full_address = _build_full_address(line1, line2, city, postcode, state, country)
                is_valid = bool(country and line1 and city and postcode)

                key_str = f"{customer_id}:loc:{source_location_id}"
                location_key = _det_uuid(key_str)

                if tag and source_location_id:
                    location_tag_by_source_id[source_location_id] = tag

                locations.append(
                    BridgeCustomerLocation(
                        customer_location_key=location_key,
                        customer_id=customer_id,
                        business_id=business_id,
                        source_location_id=source_location_id,
                        tag=tag,
                        country=country,
                        address_line_1=line1,
                        address_line_2=line2,
                        city=city,
                        postcode=postcode,
                        state=state,
                        full_address=full_address,
                        is_valid_address=is_valid,
                        is_legacy=False,
                        synced_at=now,
                    )
                )
        elif legacy_address:
            # Synthesise a single legacy location from the flat address field
            country = legacy_address.get("country") or None
            line1 = legacy_address.get("line1") or None
            line2 = legacy_address.get("line2") or None
            city = legacy_address.get("city") or None
            postcode = legacy_address.get("postalCode") or None
            state = legacy_address.get("state") or None

            full_address = _build_full_address(line1, line2, city, postcode, state, country)
            is_valid = bool(country and line1 and city and postcode)

            key_str = f"{customer_id}:loc:legacy"
            location_key = _det_uuid(key_str)

            locations.append(
                BridgeCustomerLocation(
                    customer_location_key=location_key,
                    customer_id=customer_id,
                    business_id=business_id,
                    source_location_id="legacy",
                    tag="Main Address",
                    country=country,
                    address_line_1=line1,
                    address_line_2=line2,
                    city=city,
                    postcode=postcode,
                    state=state,
                    full_address=full_address,
                    is_valid_address=is_valid,
                    is_legacy=True,
                    synced_at=now,
                )
            )

        location_source_ids = {loc.source_location_id for loc in locations}

        # ------------------------------------------------------------------
        # 2. Contacts
        # ------------------------------------------------------------------
        raw_contacts: list = raw.get("contacts") or []
        legacy_contact: Optional[dict] = raw.get("contact")

        contacts: list[BridgeCustomerContact] = []

        if raw_contacts:
            for idx, con in enumerate(raw_contacts):
                source_contact_id = str(con.get("_id") or f"pos:{idx}")
                first = (con.get("firstName") or "").strip()
                last = (con.get("lastName") or "").strip()
                contact_name = " ".join(filter(None, [first, last])) or None
                role = con.get("role") or None
                email = con.get("email") or None
                phone = con.get("phone") or None
                location_id = con.get("locationId") or None
                is_primary = bool(con.get("isPrimary", False))

                # Look up location tag
                location_tag: Optional[str] = None
                has_location = False
                if location_id:
                    location_tag = location_tag_by_source_id.get(str(location_id))
                    has_location = str(location_id) in location_source_ids

                key_str = f"{customer_id}:con:{source_contact_id}"
                contact_key = _det_uuid(key_str)

                contacts.append(
                    BridgeCustomerContact(
                        customer_contact_key=contact_key,
                        customer_id=customer_id,
                        business_id=business_id,
                        source_contact_id=source_contact_id,
                        contact_name=contact_name,
                        role_or_position=role,
                        email=email,
                        phone=phone,
                        location_id=str(location_id) if location_id else None,
                        location_tag=location_tag,
                        is_primary=is_primary,
                        has_email=bool(email),
                        has_phone=bool(phone),
                        has_location=has_location,
                        synced_at=now,
                    )
                )
        elif legacy_contact:
            # Synthesise a single contact from the legacy flat contact field
            contact_name = legacy_contact.get("name") or None
            email = legacy_contact.get("email") or None
            phone = legacy_contact.get("phone") or None

            key_str = f"{customer_id}:con:legacy"
            contact_key = _det_uuid(key_str)

            contacts.append(
                BridgeCustomerContact(
                    customer_contact_key=contact_key,
                    customer_id=customer_id,
                    business_id=business_id,
                    source_contact_id=None,
                    contact_name=contact_name,
                    role_or_position=None,
                    email=email,
                    phone=phone,
                    location_id=None,
                    location_tag=None,
                    is_primary=True,
                    has_email=bool(email),
                    has_phone=bool(phone),
                    has_location=False,
                    synced_at=now,
                )
            )

        # ------------------------------------------------------------------
        # 3. Communication Purposes and Recipients
        # ------------------------------------------------------------------
        raw_purposes: list = raw.get("communicationPurposes") or []
        purposes: list[BridgeCustomerCommunicationPurpose] = []
        recipients: list[BridgeCustomerCommunicationRecipient] = []

        for purpose in raw_purposes:
            domain_id = str(purpose.get("communicationDomainId") or "")
            raw_channels: list = purpose.get("channels") or []

            purpose_email_count = 0
            purpose_sms_count = 0
            has_email_channel = False
            has_sms_channel = False
            channel_count = 0

            for ch in raw_channels:
                channel = str(ch.get("channel") or "").lower()
                if channel not in ("email", "sms"):
                    continue
                channel_count += 1
                if channel == "email":
                    has_email_channel = True
                elif channel == "sms":
                    has_sms_channel = True

                raw_recipients: list = ch.get("recipients") or []
                for rec in raw_recipients:
                    if channel == "email":
                        destination = rec.get("email") or None
                        recipient_type = rec.get("recipientType") or None
                        dest_norm = destination.lower().strip() if destination else None
                        is_valid = _is_valid_email(destination)
                        purpose_email_count += 1
                    else:
                        destination = rec.get("phone") or None
                        recipient_type = None
                        dest_norm = destination.strip() if destination else None
                        is_valid = bool(destination and destination.strip())
                        purpose_sms_count += 1

                    key_str = f"{customer_id}:recipient:{domain_id}:{channel}:{dest_norm or ''}"
                    recipient_key = _det_uuid(key_str)

                    recipients.append(
                        BridgeCustomerCommunicationRecipient(
                            customer_recipient_key=recipient_key,
                            customer_id=customer_id,
                            business_id=business_id,
                            communication_domain_id=domain_id,
                            channel=channel,
                            destination=destination,
                            recipient_type=recipient_type,
                            destination_normalized=dest_norm,
                            is_valid_destination=is_valid,
                            synced_at=now,
                        )
                    )

            purpose_key = _det_uuid(f"{customer_id}:purpose:{domain_id}")
            purposes.append(
                BridgeCustomerCommunicationPurpose(
                    customer_communication_purpose_key=purpose_key,
                    customer_id=customer_id,
                    business_id=business_id,
                    communication_domain_id=domain_id,
                    configured_channel_count=channel_count,
                    email_recipient_count=purpose_email_count,
                    sms_recipient_count=purpose_sms_count,
                    has_email_channel=has_email_channel,
                    has_sms_channel=has_sms_channel,
                    synced_at=now,
                )
            )

        # ------------------------------------------------------------------
        # 4. Aggregate counts and flags for DimCustomer
        # ------------------------------------------------------------------
        contact_count = len(contacts)
        location_count = len(locations)
        communication_purpose_count = len(purposes)
        total_email_recipients = sum(r.email_recipient_count for r in purposes)
        total_sms_recipients = sum(r.sms_recipient_count for r in purposes)

        has_primary_contact = any(c.is_primary for c in contacts)
        abn = raw.get("abn") or None
        has_abn = bool(abn)
        has_locations = location_count > 0
        has_contacts = contact_count > 0
        has_communication_configuration = communication_purpose_count > 0

        # ------------------------------------------------------------------
        # 5. Data quality issues
        # ------------------------------------------------------------------
        quality_issues: list[str] = _compute_quality_issues(
            contacts=contacts,
            locations=locations,
            purposes=purposes,
            recipients=recipients,
            abn=abn,
            location_source_ids=location_source_ids,
        )

        # ------------------------------------------------------------------
        # 6. Primary email for DimCustomer
        # ------------------------------------------------------------------
        primary_email = _resolve_primary_email(contacts, raw)

        # ------------------------------------------------------------------
        # 7. Build DimCustomer
        # ------------------------------------------------------------------
        source_created_at = raw.get("createdAt") or None
        source_updated_at = raw.get("updatedAt") or None

        dim = DimCustomer(
            customer_id=customer_id,
            business_id=business_id,
            display_name=raw.get("displayName") or "",
            customer_type=raw.get("type") or "individual",
            abn=abn,
            email=primary_email,
            is_active=bool(raw.get("isActive", True)),
            notes=raw.get("notes") or None,
            contact_count=contact_count,
            location_count=location_count,
            communication_purpose_count=communication_purpose_count,
            email_recipient_count=total_email_recipients,
            sms_recipient_count=total_sms_recipients,
            has_primary_contact=has_primary_contact,
            has_abn=has_abn,
            has_locations=has_locations,
            has_contacts=has_contacts,
            has_communication_configuration=has_communication_configuration,
            data_quality_issue_count=len(quality_issues),
            data_quality_issues=quality_issues if quality_issues else None,
            source_created_at=source_created_at,
            source_updated_at=source_updated_at,
            synced_at=now,
            # Backward-compat legacy columns
            created_at=source_created_at or now,
            updated_at=source_updated_at or now,
        )

        return CustomerTransformResult(
            dim_customer=dim,
            locations=locations,
            contacts=contacts,
            purposes=purposes,
            recipients=recipients,
        )


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _build_full_address(
    line1: Optional[str],
    line2: Optional[str],
    city: Optional[str],
    postcode: Optional[str],
    state: Optional[str],
    country: Optional[str],
) -> Optional[str]:
    parts = [p for p in [line1, line2, city, postcode, state, country] if p]
    return ", ".join(parts) if parts else None


def _resolve_primary_email(
    contacts: list[BridgeCustomerContact],
    raw: dict,
) -> Optional[str]:
    """Resolve the primary email for DimCustomer.

    Priority:
    1. Email from the contact where is_primary=True
    2. First contact email
    3. Legacy flat email field
    """
    for c in contacts:
        if c.is_primary and c.email:
            return c.email
    for c in contacts:
        if c.email:
            return c.email
    return raw.get("email") or None


def _compute_quality_issues(
    contacts: list[BridgeCustomerContact],
    locations: list[BridgeCustomerLocation],
    purposes: list[BridgeCustomerCommunicationPurpose],
    recipients: list[BridgeCustomerCommunicationRecipient],
    abn: Optional[str],
    location_source_ids: set,
) -> list[str]:
    issues: list[str] = []

    # Missing ABN
    if not abn:
        issues.append("missing_abn")

    # Missing contacts
    if not contacts:
        issues.append("missing_contact")
    else:
        # Has contacts but none have email
        if not any(c.email for c in contacts):
            issues.append("missing_contact_email")

        # Contact with non-empty email that fails validation
        if any(c.email and not _is_valid_email(c.email) for c in contacts):
            issues.append("contact_with_invalid_email")

        # Contact with non-empty phone that fails phone regex
        if any(c.phone and not _is_valid_phone(c.phone) for c in contacts):
            issues.append("contact_with_invalid_phone")

        # Contact with locationId that doesn't match any location
        if any(
            c.location_id and c.location_id not in location_source_ids
            for c in contacts
        ):
            issues.append("contact_with_missing_location_reference")

    # Missing locations
    if not locations:
        issues.append("missing_location")
    else:
        # Has location with missing required fields (country OR line1 OR city OR postcode)
        if any(
            not (loc.country and loc.address_line_1 and loc.city and loc.postcode)
            for loc in locations
        ):
            issues.append("incomplete_location")

    # Purpose-level issues
    if purposes:
        if any(
            (p.email_recipient_count + p.sms_recipient_count) == 0
            for p in purposes
        ):
            issues.append("purpose_without_recipients")

    # Recipient-level issues (across all purposes)
    if recipients:
        # Email channel without a 'to' type recipient (grouped by customer+domain+channel)
        email_recipients_by_domain: dict[str, list] = {}
        for r in recipients:
            if r.channel == "email":
                key = r.communication_domain_id
                email_recipients_by_domain.setdefault(key, []).append(r)

        for domain_id, recs in email_recipients_by_domain.items():
            if not any(r.recipient_type == "to" for r in recs):
                issues.append("email_channel_without_to_recipient")
                break  # one issue per customer is sufficient

        # Invalid email recipients
        if any(
            r.channel == "email" and not r.is_valid_destination
            for r in recipients
        ):
            issues.append("invalid_email_recipient")

        # Invalid SMS recipients
        if any(
            r.channel == "sms" and not r.is_valid_destination
            for r in recipients
        ):
            issues.append("invalid_sms_recipient")

        # Duplicate recipient destinations (same customer+domain+channel+normalized)
        seen: set[tuple] = set()
        has_duplicate = False
        for r in recipients:
            key = (r.communication_domain_id, r.channel, r.destination_normalized)
            if key in seen:
                has_duplicate = True
                break
            seen.add(key)
        if has_duplicate:
            issues.append("duplicate_recipient")

    return issues

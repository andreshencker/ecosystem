"""Pydantic response models for Platform Admin customer endpoints.

These schemas expose the full customer analytical profile including child
collections (locations, contacts, communication purposes, and recipients).
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CustomerLocationDetail(BaseModel):
    sourceLocationId: Optional[str] = None
    tag: Optional[str] = None
    country: Optional[str] = None
    addressLine1: Optional[str] = None
    addressLine2: Optional[str] = None
    city: Optional[str] = None
    postcode: Optional[str] = None
    state: Optional[str] = None
    fullAddress: Optional[str] = None
    isValidAddress: bool
    isLegacy: bool


class CustomerContactDetail(BaseModel):
    sourceContactId: Optional[str] = None
    contactName: Optional[str] = None
    roleOrPosition: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    locationId: Optional[str] = None
    locationTag: Optional[str] = None
    isPrimary: bool
    hasEmail: bool
    hasPhone: bool
    hasLocation: bool


class CustomerRecipientDetail(BaseModel):
    channel: str
    destination: Optional[str] = None
    recipientType: Optional[str] = None
    destinationNormalized: Optional[str] = None
    isValidDestination: bool


class CustomerPurposeDetail(BaseModel):
    communicationDomainId: str
    configuredChannelCount: int
    emailRecipientCount: int
    smsRecipientCount: int
    hasEmailChannel: bool
    hasSmsChannel: bool
    recipients: list[CustomerRecipientDetail]


class CustomerListItem(BaseModel):
    customerId: str
    businessId: str
    businessName: Optional[str] = None
    customerName: str
    customerType: str
    abn: Optional[str] = None
    isActive: bool
    contactCount: int
    locationCount: int
    communicationPurposeCount: int
    emailRecipientCount: int
    smsRecipientCount: int
    hasPrimaryContact: bool
    hasAbn: bool
    hasLocations: bool
    hasContacts: bool
    hasCommunicationConfiguration: bool
    dataQualityIssueCount: int
    dataQualityIssues: Optional[list[str]] = None
    sourceCreatedAt: Optional[datetime] = None
    sourceUpdatedAt: Optional[datetime] = None
    syncedAt: Optional[datetime] = None


class CustomerDetailResponse(BaseModel):
    customerId: str
    businessId: str
    businessName: Optional[str] = None
    customerName: str
    customerType: str
    abn: Optional[str] = None
    isActive: bool
    notes: Optional[str] = None
    contactCount: int
    locationCount: int
    communicationPurposeCount: int
    emailRecipientCount: int
    smsRecipientCount: int
    hasPrimaryContact: bool
    hasAbn: bool
    hasLocations: bool
    hasContacts: bool
    hasCommunicationConfiguration: bool
    dataQualityIssueCount: int
    dataQualityIssues: list[str]
    sourceCreatedAt: Optional[datetime] = None
    sourceUpdatedAt: Optional[datetime] = None
    syncedAt: Optional[datetime] = None
    locations: list[CustomerLocationDetail]
    contacts: list[CustomerContactDetail]
    purposes: list[CustomerPurposeDetail]


class CustomerListResponse(BaseModel):
    businessId: str
    items: list[CustomerListItem]
    total: int
    page: int
    limit: int
    calculatedAt: datetime

from app.models.customers.activity_model import FactCustomerActivity
from app.models.customers.analytical_model import DimCustomer
from app.models.customers.bridge_models import (
    BridgeCustomerCommunicationPurpose,
    BridgeCustomerCommunicationRecipient,
    BridgeCustomerContact,
    BridgeCustomerLocation,
)

__all__ = [
    "DimCustomer",
    "FactCustomerActivity",
    "BridgeCustomerLocation",
    "BridgeCustomerContact",
    "BridgeCustomerCommunicationPurpose",
    "BridgeCustomerCommunicationRecipient",
]

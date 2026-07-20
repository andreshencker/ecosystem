# Import all models so Alembic can discover them via Base.metadata.
from .shared.dim_time import DimTime
from .companies.analytical_model import DimBusiness
from .users.analytical_model import DimUser
from .customers.analytical_model import DimCustomer
from .customers.activity_model import FactCustomerActivity
from .invoices.analytical_model import FactInvoice
from .invoices.payment_model import FactPayment
from .shifts.analytical_model import FactWorkEvent
from .shifts.fact_shift import FactShift
from .contracts.analytical_model import FactContract
from .etl.sync_state_model import SyncStateRecord
from .etl.etl_metadata_model import EtlRunMetadata

__all__ = [
    "DimTime",
    "DimBusiness",
    "DimUser",
    "DimCustomer",
    "FactCustomerActivity",
    "FactInvoice",
    "FactPayment",
    "FactWorkEvent",
    "FactShift",
    "FactContract",
    "SyncStateRecord",
    "EtlRunMetadata",
]

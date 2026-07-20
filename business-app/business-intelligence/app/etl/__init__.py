"""ETL package.

Importing this package registers all known pipelines with the SyncRegistry.
The registry is queried by the SyncManager at run time.
"""
from app.etl.pipelines.business_pipeline import BusinessPipeline
from app.etl.pipelines.contract_pipeline import ContractPipeline
from app.etl.pipelines.customer_pipeline import CustomerPipeline
from app.etl.pipelines.full_sync_pipeline import FullSyncPipeline
from app.etl.pipelines.invoice_pipeline import InvoicePipeline
from app.etl.pipelines.shift_pipeline import ShiftPipeline
from app.etl.pipelines.user_pipeline import UserPipeline
from app.etl.sync.sync_registry import SyncRegistry

# Register all pipeline factories.
SyncRegistry.register("business", BusinessPipeline)
SyncRegistry.register("user", UserPipeline)
SyncRegistry.register("customer", CustomerPipeline)
SyncRegistry.register("contract", ContractPipeline)
SyncRegistry.register("shift", ShiftPipeline)
SyncRegistry.register("invoice", InvoicePipeline)
SyncRegistry.register("full", FullSyncPipeline)

"""Pydantic schema for the Invoice information contract v1.0."""
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel


class InvoiceScope(BaseModel):
    companyId: str
    dateFrom: Optional[str] = None
    dateTo: Optional[str] = None
    currency: str = "AUD"
    customerId: Optional[str] = None


class InvoiceSummaryStats(BaseModel):
    invoiceCount: int
    totalInvoiced: str  # Decimal serialized as string
    totalSubtotal: str
    totalTax: str
    averageInvoiceValue: str
    averageDaysToPayment: str

    @classmethod
    def from_repo(cls, stats: dict) -> "InvoiceSummaryStats":
        TWO = Decimal("0.01")
        count = stats.get("invoice_count", 0)
        total = Decimal(str(stats.get("total_gross", "0"))).quantize(TWO)
        avg = Decimal(str(stats.get("avg_gross", "0"))).quantize(TWO)
        return cls(
            invoiceCount=count,
            totalInvoiced=str(total),
            totalSubtotal=str(
                Decimal(str(stats.get("total_subtotal", "0"))).quantize(TWO)
            ),
            totalTax=str(
                Decimal(str(stats.get("total_tax", "0"))).quantize(TWO)
            ),
            averageInvoiceValue=str(avg),
            averageDaysToPayment=str(
                Decimal(str(stats.get("avg_days_to_due", "0"))).quantize(TWO)
            ),
        )


class StatusBreakdownItem(BaseModel):
    status: str
    count: int
    total: str  # Decimal serialized as string


class InvoiceContractMetadata(BaseModel):
    source: str = "postgresql"
    lastSyncedAt: Optional[str] = None
    currencyGroupingApplied: bool = False


class InvoiceSummaryResponse(BaseModel):
    contract: str = "invoice-summary"
    version: str = "1.0"
    scope: InvoiceScope
    generatedAt: datetime
    summary: InvoiceSummaryStats
    statusBreakdown: List[StatusBreakdownItem]
    metadata: InvoiceContractMetadata

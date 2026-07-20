"""Pydantic schema for the Profitability information contract.

Monetary amounts and percentages are serialised as strings to preserve
Decimal precision.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ProfitabilityResponse(BaseModel):
    businessId: str
    period: Optional[str] = None
    grossRevenue: str  # Decimal serialised as string
    totalCost: str
    grossMargin: str
    grossMarginPct: str
    currency: str = "AUD"
    calculatedAt: datetime

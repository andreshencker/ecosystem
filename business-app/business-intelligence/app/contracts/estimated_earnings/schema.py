"""Pydantic schema for the Estimated Earnings information contract.

Monetary amounts are serialised as strings to preserve Decimal precision.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class EstimatedEarningsResponse(BaseModel):
    businessId: str
    period: Optional[str] = None
    estimatedRevenue: str  # Decimal serialised as string
    currency: str = "AUD"
    calculatedAt: datetime

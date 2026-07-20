"""Pydantic schema for the Shift Summary information contract.

Monetary amounts and hour totals are serialised as strings to preserve
Decimal precision.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ShiftSummaryResponse(BaseModel):
    businessId: str
    period: Optional[str] = None
    totalShifts: int
    totalHours: str  # Decimal serialised as string
    totalBillableHours: str
    totalCalculatedAmount: str
    currency: str = "AUD"
    calculatedAt: datetime

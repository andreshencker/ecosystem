from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class CustomerStats(BaseModel):
    total:         int
    active:        int
    newThisPeriod: int


class DashboardSummaryResponse(BaseModel):
    businessId:   str
    period:       Optional[str] = None
    customers:    CustomerStats
    calculatedAt: datetime

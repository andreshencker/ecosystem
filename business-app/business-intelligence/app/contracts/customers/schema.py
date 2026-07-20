from datetime import datetime
from typing import Optional
from pydantic import BaseModel, UUID4


class RecentCustomer(BaseModel):
    customerId:   UUID4
    displayName:  str
    customerType: str
    createdAt:    datetime

    model_config = {"from_attributes": True}


class CustomerSummaryResponse(BaseModel):
    businessId:        str
    period:            Optional[str] = None
    totalCustomers:    int
    activeCustomers:   int
    inactiveCustomers: int
    customersByType:   dict[str, int]
    recentCustomers:   list[RecentCustomer]
    calculatedAt:      datetime

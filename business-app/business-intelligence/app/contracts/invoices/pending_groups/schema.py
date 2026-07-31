"""Pydantic schema for the pending-invoice-groups information contract.

Mirrors the TypeScript PendingInvoiceGroupsResult DTO in the Business App
backend so both sides agree on the wire format.

All monetary amounts are decimal strings (never float) to preserve precision.
"""
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel


# ── Calculation status literals ────────────────────────────────────────────────

ShiftCalcStatus = Literal["ok", "warning", "error"]
PendingGroupStatus = Literal["ready", "warning", "blocked"]


# ── Shift-level row ───────────────────────────────────────────────────────────

class PendingShiftCalculation(BaseModel):
    shiftId: str
    workDate: str
    description: Optional[str] = None
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    endDate: Optional[str] = None

    # Overnight-safe gross duration hours (decimal string)
    grossDurationHours: str

    breakTaken: bool
    appliedBreakMinutes: int

    # Net worked hours (decimal string)
    workedHours: str

    rateType: str
    appliedRate: str
    currency: str

    # Line amount = workedHours × appliedRate (decimal string)
    amount: str

    calculationStatus: ShiftCalcStatus
    calculationNote: Optional[str] = None


# ── Billing group (one per customer × contract × billing period) ──────────────

class PendingInvoiceGroup(BaseModel):
    # Deterministic group ID: sha256(companyId+customerId+contractId+periodStart+periodEnd)
    groupId: str

    companyId: str
    customerId: str
    customerName: str
    contractId: str
    contractTitle: str
    billingCycle: str
    periodStart: str
    periodEnd: str
    currency: str

    shiftCount: int
    totalWorkedHours: str
    subtotal: str
    taxRate: Optional[str] = None
    taxAmount: str
    total: str

    status: PendingGroupStatus
    warnings: List[str]
    errors: List[str]
    isApprovable: bool

    shiftDetails: List[PendingShiftCalculation]
    calculatedAt: str


# ── Top-level response ────────────────────────────────────────────────────────

class PendingInvoiceGroupsResponse(BaseModel):
    companyId: str
    groups: List[PendingInvoiceGroup]
    totalGroups: int
    approvableGroups: int
    calculatedAt: str

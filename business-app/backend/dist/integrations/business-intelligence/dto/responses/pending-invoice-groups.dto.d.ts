export type PendingGroupStatus = 'ready' | 'warning' | 'blocked';
export type ShiftCalcStatus = 'ok' | 'warning' | 'error';
export interface PendingShiftCalculation {
    shiftId: string;
    workDate: string;
    description: string | null;
    startTime: string | null;
    endTime: string | null;
    endDate: string | null;
    grossDurationHours: string;
    breakTaken: boolean;
    appliedBreakMinutes: number;
    workedHours: string;
    rateType: string;
    appliedRate: string;
    currency: string;
    amount: string;
    calculationStatus: ShiftCalcStatus;
    calculationNote: string | null;
}
export interface PendingInvoiceGroup {
    groupId: string;
    companyId: string;
    customerId: string;
    customerName: string;
    contractId: string;
    contractTitle: string;
    billingCycle: string;
    periodStart: string;
    periodEnd: string;
    currency: string;
    shiftCount: number;
    totalWorkedHours: string;
    subtotal: string;
    taxRate: string | null;
    taxAmount: string;
    total: string;
    status: PendingGroupStatus;
    warnings: string[];
    errors: string[];
    isApprovable: boolean;
    shiftDetails: PendingShiftCalculation[];
    calculatedAt: string;
}
export interface PendingInvoiceGroupsResult {
    companyId: string;
    groups: PendingInvoiceGroup[];
    totalGroups: number;
    approvableGroups: number;
    calculatedAt: string;
}

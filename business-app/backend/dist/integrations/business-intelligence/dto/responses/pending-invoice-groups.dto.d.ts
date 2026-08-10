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
    minimumHours: string;
    minimumHoursApplied: boolean;
    billableHours: string;
    rateType: string;
    appliedRate: string;
    currency: string;
    amount: string;
    calculationStatus: ShiftCalcStatus;
    calculationNote: string | null;
}
export interface PendingAdditionalConcept {
    id: string;
    date: string;
    concept: string;
    amount: string;
}
export interface PendingInvoiceGroup {
    groupId: string;
    companyId: string;
    customerId: string;
    customerName: string;
    customerEmail: string | null;
    customerPhone: string | null;
    contractId: string;
    contractTitle: string;
    invoiceNumber: string;
    billingCycle: string;
    periodStart: string;
    periodEnd: string;
    dueDate: string | null;
    currency: string;
    shiftCount: number;
    totalWorkedHours: string;
    totalBillableHours: string;
    subtotal: string;
    taxRate: string | null;
    taxAmount: string;
    total: string;
    status: PendingGroupStatus;
    warnings: string[];
    errors: string[];
    isApprovable: boolean;
    shiftDetails: PendingShiftCalculation[];
    additionalConcepts: PendingAdditionalConcept[];
    calculatedAt: string;
}
export interface PendingInvoiceGroupsResult {
    companyId: string;
    groups: PendingInvoiceGroup[];
    totalGroups: number;
    approvableGroups: number;
    calculatedAt: string;
}

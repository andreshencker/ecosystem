// ─── BI calculation types (mirrors pending-invoice-groups.dto.ts) ─────────────

export type PendingGroupStatus = 'ready' | 'warning' | 'blocked';
export type ShiftCalcStatus    = 'ok' | 'warning' | 'error';

export interface PendingShiftCalculation {
  shiftId:             string;
  workDate:            string;
  description:         string | null;
  startTime:           string | null;
  endTime:             string | null;
  endDate:             string | null;
  grossDurationHours:  string;
  breakTaken:          boolean;
  appliedBreakMinutes: number;
  workedHours:         string;
  minimumHours:        string;
  minimumHoursApplied: boolean;
  billableHours:       string;
  rateType:            string;
  appliedRate:         string;
  currency:            string;
  amount:              string;
  calculationStatus:   ShiftCalcStatus;
  calculationNote:     string | null;
}

export interface PendingAdditionalConcept {
  id: string;
  date: string;
  concept: string;
  amount: string;
}

export interface PendingInvoiceGroup {
  groupId:          string;
  companyId:        string;
  customerId:       string;
  customerName:     string;
  customerEmail:    string | null;
  customerPhone:    string | null;
  contractId:       string;
  contractTitle:    string;
  invoiceNumber:    string;
  billingCycle:     string;
  periodStart:      string;
  periodEnd:        string;
  dueDate:          string | null;
  currency:         string;
  shiftCount:       number;
  totalWorkedHours: string;
  totalBillableHours: string;
  subtotal:         string;
  taxRate:          string | null;
  taxAmount:        string;
  total:            string;
  status:           PendingGroupStatus;
  warnings:         string[];
  errors:           string[];
  isApprovable:     boolean;
  shiftDetails:     PendingShiftCalculation[];
  additionalConcepts: PendingAdditionalConcept[];
  calculatedAt:     string;
}

export interface PendingInvoiceGroupsResult {
  companyId:        string;
  groups:           PendingInvoiceGroup[];
  totalGroups:      number;
  approvableGroups: number;
  calculatedAt:     string;
}

// ─── Approval request/response ────────────────────────────────────────────────

export interface ApproveInvoicePayload {
  groupId:     string;
  customerId:  string;
  contractId:  string;
  periodStart: string;
  periodEnd:   string;
}

export interface InvoiceApprovalResult {
  invoiceId:     string;
  invoiceNumber: string;
  groupId:       string;
  customerId:    string;
  contractId:    string;
  periodStart:   string;
  periodEnd:     string;
  currency:      string;
  subtotal:      string;
  taxAmount:     string;
  total:         string;
  shiftCount:    number;
  status:        'approved' | 'outstanding' | 'sent' | 'send_failed' | 'paid' | 'voided';
}

export interface ApprovedInvoiceListItem extends InvoiceApprovalResult {
  approvedAt: string;
  customerName: string | null;
  invoiceDate: string;
  dueDate: string | null;
  amountPaid: string;
  balance: string;
  sentAt: string | null;
  lastReminderAt: string | null;
  reminderCount: number;
  paidAt: string | null;
  paymentReference: string | null;
  voidedAt: string | null;
  voidReason: string | null;
}

export interface ApprovedInvoiceListResult {
  items: ApprovedInvoiceListItem[];
  total: number;
}

export interface ReceivablesSummary {
  currency: string;
  totalIncome: string;
  outstanding: string;
  paid: string;
  invoiceCount: number;
  trend: Array<{ label: string; totalIncome: string; paid: string; outstanding: string }>;
  statuses: Array<{ label: string; value: string; count: number }>;
  customers: Array<{ label: string; totalIncome: string; paid: string; outstanding: string; overdue: string; count: number }>;
  aging: Array<{ label: string; value: string; count: number }>;
  paymentTrend: Array<{ label: string; paid: string; count: number }>;
  overdue: string;
  overdueCount: number;
  collectionRate: string;
  customerTimeline: Array<{ label: string; customer: string; totalIncome: string; paid: string; outstanding: string; share: string }>;
  customerGrowth: Array<{ label: string; current: string; previous: string; growthRate: string }>;
}

export interface InvoiceDashboardFilters {
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
  invoiceStatus?: string;
  search?: string;
}

export interface CustomerPaymentBehavior {
  id?: string;
  customerId: string;
  customerName: string;
  paidInvoices: number;
  averagePaymentDays: string | null;
  averageDelayDays: string | null;
  maximumDelayDays: number | null;
  onTimeRate: string | null;
  paymentFrequencyDays: string | null;
  outstanding: string;
  overdue: string;
  risk: 'low' | 'medium' | 'high' | 'unknown';
}

export interface CashFlowResponse {
  currency: string;
  received: string;
  expectedNext7Days: string;
  expectedNext15Days: string;
  expectedNext30Days: string;
  outstanding: string;
  overdue: string;
  timeline: Array<{ label: string; received: string; expected: string; projected: string }>;
  customers: CustomerPaymentBehavior[];
  calculatedAt: string;
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export const STATUS_COLORS: Record<PendingGroupStatus, 'success' | 'warning' | 'error'> = {
  ready:   'success',
  warning: 'warning',
  blocked: 'error',
};

export const STATUS_LABELS: Record<PendingGroupStatus, string> = {
  ready:   'Ready',
  warning: 'Warning',
  blocked: 'Blocked',
};

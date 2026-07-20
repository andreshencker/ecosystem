/**
 * Platform Admin contract types — sourced from the BI analytical model.
 * All data comes from GET /platform-admin/contracts/*.
 * The operational Contract MongoDB model is never used for these views.
 */

// ─── Support issues ───────────────────────────────────────────────────────────

export interface BiContractSupportIssue {
  code: string;
  severity: 'invalid' | 'warning';
  field: string;
  message: string;
}

// ─── List item ────────────────────────────────────────────────────────────────

export interface BiContractAdminListItem {
  contractId: string;
  businessId: string;
  businessName: string | null;
  customerId: string | null;
  customerName: string | null;

  positionName: string;
  invoiceDescription: string | null;
  workType: string | null;
  status: string;

  startDate: string | null;
  endDate: string | null;
  isOpenEnded: boolean;

  billingCycle: string;
  paymentScheduleMode: 'terms' | 'scheduled';
  paymentTermsDays: number | null;
  scheduledPaymentDay: string | null;

  rateType: string;
  minHourlyRate: number | null;
  maxHourlyRate: number | null;
  minimumHours: number | null;
  defaultBreakMinutes: number | null;

  currency: string | null;
  chargeGst: boolean;
  gstRate: number | null;

  holidayRulesEnabled: boolean;
  holidayCalendarId: string | null;
  holidayCalendarName: string | null;
  holidayBehaviour: string | null;
  /** 'unknown' in Phase 1 — display as "Status not available" */
  holidayCalendarStatus: string;

  paymentCalendarEnabled: boolean;
  paymentCalendarId: string | null;
  /** 'unknown' in Phase 1 — display as "Status not available" */
  paymentCalendarStatus: string;

  superannuationEnabled: boolean;
  superannuationRate: number | null;
  superannuationPaymentFrequency: string | null;

  configurationStatus: 'complete' | 'warning' | 'invalid';
  supportIssueCount: number;
  supportIssueCodes: string[];

  sourceCreatedAt: string | null;
  sourceUpdatedAt: string | null;
  syncedAt: string | null;
}

// ─── Detail ───────────────────────────────────────────────────────────────────

export interface BiContractAdminDetail extends BiContractAdminListItem {
  supportIssues: BiContractSupportIssue[];
}

// ─── Responses ────────────────────────────────────────────────────────────────

export interface BiContractAdminListResponse {
  businessId: string | null;
  items: BiContractAdminListItem[];
  total: number;
  page: number;
  limit: number;
  datasetVersion: string;
  calculatedAt: string;
}

export interface BiContractAdminSummaryResponse {
  businessId: string | null;

  totalContracts: number;
  activeContracts: number;
  inactiveContracts: number;
  finishedContracts: number;
  cancelledContracts: number;
  openEndedContracts: number;
  contractsWithEndDate: number;
  contractsWithGst: number;
  contractsWithSuperannuation: number;
  contractsWithHolidayRules: number;
  contractsWithPaymentCalendar: number;
  contractsMissingCustomer: number;
  contractsMissingRateConfig: number;

  completeContracts: number;
  warningContracts: number;
  invalidContracts: number;

  /** null when denominator is zero */
  activeContractRate: number | null;
  openEndedContractRate: number | null;
  configurationCompletionRate: number | null;
  configurationWarningRate: number | null;
  configurationInvalidRate: number | null;
  holidayCalendarCoverage: number | null;
  paymentCalendarCoverage: number | null;
  gstConfigurationValidity: number | null;
  superannuationConfigurationValidity: number | null;

  datasetVersion: string;
  calculatedAt: string;
}

export interface BiContractSupportIssueListResponse {
  contractId: string;
  configurationStatus: 'complete' | 'warning' | 'invalid';
  supportIssueCount: number;
  supportIssues: BiContractSupportIssue[];
  calculatedAt: string;
}

// ─── Query params ─────────────────────────────────────────────────────────────

export interface PlatformAdminContractListParams {
  search?: string;
  businessId?: string;
  customerId?: string;
  status?: string;
  workType?: string;
  billingCycle?: string;
  currency?: string;
  configurationStatus?: string;
  chargeGst?: boolean;
  superEnabled?: boolean;
  holidayRulesEnabled?: boolean;
  paymentCalendarEnabled?: boolean;
  updatedFrom?: string;
  updatedTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface PlatformAdminContractSummaryParams {
  businessId?: string;
  status?: string;
  createdFrom?: string;
  createdTo?: string;
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export function fmtConfigStatus(status: 'complete' | 'warning' | 'invalid'): string {
  switch (status) {
    case 'complete': return 'Complete';
    case 'warning':  return 'Warning';
    case 'invalid':  return 'Invalid';
  }
}

export function fmtIssueCount(count: number): string {
  if (count === 0) return 'No issues';
  if (count === 1) return '1 issue';
  return `${count} issues`;
}

export function fmtCalendarStatus(status: string): string {
  if (!status || status === 'unknown') return 'Status not available';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function fmtRatio(value: number | null): string {
  if (value === null || value === undefined) return 'Not available';
  return `${Math.round(value * 100)}%`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

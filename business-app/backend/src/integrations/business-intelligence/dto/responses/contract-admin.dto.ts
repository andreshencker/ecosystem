/**
 * TypeScript DTOs mirroring the BI Python ContractAdmin Pydantic schemas.
 *
 * These types represent the contract between the NestJS BI façade and the
 * Python BI service. They are consumed by the Platform Admin backend routes.
 * No calculations are performed here — all metrics come from BI.
 */

// ─── Support issues ───────────────────────────────────────────────────────────

export interface BiContractSupportIssue {
  code: string;
  severity: 'invalid' | 'warning';
  field: string;
  message: string;
}

// ─── List row ─────────────────────────────────────────────────────────────────

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

  startDate: string | null;       // ISO date YYYY-MM-DD
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
  holidayCalendarStatus: string;    // 'unknown' in Phase 1

  paymentCalendarEnabled: boolean;
  paymentCalendarId: string | null;
  paymentCalendarStatus: string;    // 'unknown' in Phase 1

  superannuationEnabled: boolean;
  superannuationRate: number | null;
  superannuationPaymentFrequency: string | null;

  configurationStatus: 'complete' | 'warning' | 'invalid';
  supportIssueCount: number;
  supportIssueCodes: string[];

  sourceCreatedAt: string | null;   // ISO datetime
  sourceUpdatedAt: string | null;
  syncedAt: string | null;
}

// ─── Detail (extends list item with expanded issues) ──────────────────────────

export interface BiContractAdminDetail extends BiContractAdminListItem {
  supportIssues: BiContractSupportIssue[];
}

// ─── List response ────────────────────────────────────────────────────────────

export interface BiContractAdminListResponse {
  businessId: string | null;
  items: BiContractAdminListItem[];
  total: number;
  page: number;
  limit: number;
  datasetVersion: string;
  calculatedAt: string;
}

// ─── Summary response ─────────────────────────────────────────────────────────

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

  // KPI rates: null when denominator is zero
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

// ─── Support issues response ──────────────────────────────────────────────────

export interface BiContractSupportIssueListResponse {
  contractId: string;
  configurationStatus: 'complete' | 'warning' | 'invalid';
  supportIssueCount: number;
  supportIssues: BiContractSupportIssue[];
  calculatedAt: string;
}

// ─── Query params ─────────────────────────────────────────────────────────────

export interface BiContractAdminListParams {
  businessId?: string;
  customerId?: string;
  status?: string;
  workType?: string;
  billingCycle?: string;
  currency?: string;
  chargeGst?: boolean;
  superEnabled?: boolean;
  holidayRulesEnabled?: boolean;
  paymentCalendarEnabled?: boolean;
  configurationStatus?: string;
  search?: string;
  startDateFrom?: string;
  startDateTo?: string;
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: string;
}

export interface BiContractAdminSummaryParams {
  businessId?: string;
  status?: string;
  createdFrom?: string;
  createdTo?: string;
}

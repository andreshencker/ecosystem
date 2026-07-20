export interface BiContractSupportIssue {
    code: string;
    severity: 'invalid' | 'warning';
    field: string;
    message: string;
}
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
    holidayCalendarStatus: string;
    paymentCalendarEnabled: boolean;
    paymentCalendarId: string | null;
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
export interface BiContractAdminDetail extends BiContractAdminListItem {
    supportIssues: BiContractSupportIssue[];
}
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

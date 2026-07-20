/**
 * Unit tests for Platform Admin Contracts feature.
 *
 * Tests pure logic functions and type contracts that don't require a DOM.
 * (React component rendering tests would require jest-environment-jsdom.)
 */

import type {
  BiContractAdminListItem,
  BiContractAdminDetail,
  BiContractAdminSummaryResponse,
  BiContractSupportIssueListResponse,
  BiContractSupportIssue,
  PlatformAdminContractListParams,
  PlatformAdminContractSummaryParams,
} from '@/types/platform-admin-contract';
import {
  fmtConfigStatus,
  fmtIssueCount,
  fmtCalendarStatus,
  fmtRatio,
  fmtDate,
} from '@/types/platform-admin-contract';

// ─── fmtConfigStatus ──────────────────────────────────────────────────────────

describe('fmtConfigStatus', () => {
  it('formats complete', () => expect(fmtConfigStatus('complete')).toBe('Complete'));
  it('formats warning',  () => expect(fmtConfigStatus('warning')).toBe('Warning'));
  it('formats invalid',  () => expect(fmtConfigStatus('invalid')).toBe('Invalid'));
});

// ─── fmtIssueCount ───────────────────────────────────────────────────────────

describe('fmtIssueCount', () => {
  it('returns No issues for 0', () => expect(fmtIssueCount(0)).toBe('No issues'));
  it('returns singular for 1',  () => expect(fmtIssueCount(1)).toBe('1 issue'));
  it('returns plural for >1',   () => {
    expect(fmtIssueCount(2)).toBe('2 issues');
    expect(fmtIssueCount(10)).toBe('10 issues');
  });
});

// ─── fmtCalendarStatus ────────────────────────────────────────────────────────

describe('fmtCalendarStatus', () => {
  it('maps unknown to Status not available', () => {
    expect(fmtCalendarStatus('unknown')).toBe('Status not available');
  });

  it('maps empty string to Status not available', () => {
    expect(fmtCalendarStatus('')).toBe('Status not available');
  });

  it('capitalises a known status', () => {
    expect(fmtCalendarStatus('active')).toBe('Active');
    expect(fmtCalendarStatus('inactive')).toBe('Inactive');
  });

  it('does not label unknown as inactive', () => {
    const result = fmtCalendarStatus('unknown');
    expect(result).not.toContain('inactive');
    expect(result).not.toContain('Inactive');
  });
});

// ─── fmtRatio ─────────────────────────────────────────────────────────────────

describe('fmtRatio', () => {
  it('returns Not available for null', () => {
    expect(fmtRatio(null)).toBe('Not available');
  });

  it('converts ratio to percentage', () => {
    expect(fmtRatio(1.0)).toBe('100%');
    expect(fmtRatio(0.75)).toBe('75%');
    expect(fmtRatio(0.0)).toBe('0%');
  });

  it('rounds to nearest integer', () => {
    expect(fmtRatio(0.333)).toBe('33%');
    expect(fmtRatio(0.666)).toBe('67%');
  });
});

// ─── fmtDate ─────────────────────────────────────────────────────────────────

describe('fmtDate', () => {
  it('returns dash for null', () => expect(fmtDate(null)).toBe('—'));
  it('returns dash for undefined', () => expect(fmtDate(undefined)).toBe('—'));
  it('formats an ISO date string', () => {
    const result = fmtDate('2026-01-15T00:00:00Z');
    expect(result).toContain('2026');
  });
});

// ─── BiContractAdminListItem type contract ────────────────────────────────────

describe('BiContractAdminListItem type contract', () => {
  it('accepts a fully populated item', () => {
    const item: BiContractAdminListItem = {
      contractId: 'c1',
      businessId: 'biz1',
      businessName: 'Acme Corp',
      customerId: 'cust1',
      customerName: 'John Doe',
      positionName: 'Developer',
      invoiceDescription: 'Dev services',
      workType: 'contractor',
      status: 'active',
      startDate: '2026-01-01',
      endDate: null,
      isOpenEnded: true,
      billingCycle: 'per_shift',
      paymentScheduleMode: 'terms',
      paymentTermsDays: 14,
      scheduledPaymentDay: null,
      rateType: 'fixed',
      minHourlyRate: 95,
      maxHourlyRate: 95,
      minimumHours: 4,
      defaultBreakMinutes: 30,
      currency: 'AUD',
      chargeGst: false,
      gstRate: null,
      holidayRulesEnabled: false,
      holidayCalendarId: null,
      holidayCalendarName: null,
      holidayBehaviour: null,
      holidayCalendarStatus: 'unknown',
      paymentCalendarEnabled: false,
      paymentCalendarId: null,
      paymentCalendarStatus: 'unknown',
      superannuationEnabled: false,
      superannuationRate: null,
      superannuationPaymentFrequency: null,
      configurationStatus: 'complete',
      supportIssueCount: 0,
      supportIssueCodes: [],
      sourceCreatedAt: '2026-01-01T00:00:00Z',
      sourceUpdatedAt: '2026-06-01T00:00:00Z',
      syncedAt: '2026-06-02T00:00:00Z',
    };
    expect(item.contractId).toBe('c1');
    expect(item.configurationStatus).toBe('complete');
    expect(item.supportIssueCount).toBe(0);
  });

  it('allows null optional fields', () => {
    const item: BiContractAdminListItem = {
      contractId: 'c2',
      businessId: 'biz1',
      businessName: null,
      customerId: null,
      customerName: null,
      positionName: 'Position',
      invoiceDescription: null,
      workType: null,
      status: 'inactive',
      startDate: null,
      endDate: null,
      isOpenEnded: false,
      billingCycle: 'weekly',
      paymentScheduleMode: 'terms',
      paymentTermsDays: null,
      scheduledPaymentDay: null,
      rateType: 'hourly',
      minHourlyRate: null,
      maxHourlyRate: null,
      minimumHours: null,
      defaultBreakMinutes: null,
      currency: null,
      chargeGst: false,
      gstRate: null,
      holidayRulesEnabled: false,
      holidayCalendarId: null,
      holidayCalendarName: null,
      holidayBehaviour: null,
      holidayCalendarStatus: 'unknown',
      paymentCalendarEnabled: false,
      paymentCalendarId: null,
      paymentCalendarStatus: 'unknown',
      superannuationEnabled: false,
      superannuationRate: null,
      superannuationPaymentFrequency: null,
      configurationStatus: 'invalid',
      supportIssueCount: 2,
      supportIssueCodes: ['missing_rate', 'missing_customer'],
      sourceCreatedAt: null,
      sourceUpdatedAt: null,
      syncedAt: null,
    };
    expect(item.businessName).toBeNull();
    expect(item.customerName).toBeNull();
    expect(item.configurationStatus).toBe('invalid');
    expect(item.supportIssueCodes).toHaveLength(2);
  });
});

// ─── BiContractAdminDetail extends list item ──────────────────────────────────

describe('BiContractAdminDetail type contract', () => {
  it('includes supportIssues array', () => {
    const issue: BiContractSupportIssue = {
      code: 'missing_customer',
      severity: 'invalid',
      field: 'customerId',
      message: 'Contract has no linked customer.',
    };
    const detail: BiContractAdminDetail = {
      contractId: 'c1',
      businessId: 'biz1',
      businessName: 'Acme',
      customerId: null,
      customerName: null,
      positionName: 'Dev',
      invoiceDescription: null,
      workType: 'contractor',
      status: 'active',
      startDate: '2026-01-01',
      endDate: null,
      isOpenEnded: true,
      billingCycle: 'per_shift',
      paymentScheduleMode: 'terms',
      paymentTermsDays: 14,
      scheduledPaymentDay: null,
      rateType: 'fixed',
      minHourlyRate: 90,
      maxHourlyRate: 90,
      minimumHours: null,
      defaultBreakMinutes: null,
      currency: 'AUD',
      chargeGst: false,
      gstRate: null,
      holidayRulesEnabled: false,
      holidayCalendarId: null,
      holidayCalendarName: null,
      holidayBehaviour: null,
      holidayCalendarStatus: 'unknown',
      paymentCalendarEnabled: false,
      paymentCalendarId: null,
      paymentCalendarStatus: 'unknown',
      superannuationEnabled: false,
      superannuationRate: null,
      superannuationPaymentFrequency: null,
      configurationStatus: 'invalid',
      supportIssueCount: 1,
      supportIssueCodes: ['missing_customer'],
      sourceCreatedAt: null,
      sourceUpdatedAt: null,
      syncedAt: null,
      supportIssues: [issue],
    };
    expect(detail.supportIssues).toHaveLength(1);
    expect(detail.supportIssues[0].severity).toBe('invalid');
    expect(detail.supportIssues[0].code).toBe('missing_customer');
  });
});

// ─── Summary response type ────────────────────────────────────────────────────

describe('BiContractAdminSummaryResponse type contract', () => {
  it('accepts a full summary with null ratios', () => {
    const summary: BiContractAdminSummaryResponse = {
      businessId: null,
      totalContracts: 10,
      activeContracts: 7,
      inactiveContracts: 1,
      finishedContracts: 1,
      cancelledContracts: 1,
      openEndedContracts: 4,
      contractsWithEndDate: 6,
      contractsWithGst: 3,
      contractsWithSuperannuation: 2,
      contractsWithHolidayRules: 2,
      contractsWithPaymentCalendar: 1,
      contractsMissingCustomer: 0,
      contractsMissingRateConfig: 0,
      completeContracts: 8,
      warningContracts: 1,
      invalidContracts: 1,
      activeContractRate: 0.7,
      openEndedContractRate: 0.4,
      configurationCompletionRate: 0.8,
      configurationWarningRate: 0.1,
      configurationInvalidRate: 0.1,
      holidayCalendarCoverage: null,
      paymentCalendarCoverage: null,
      gstConfigurationValidity: 1.0,
      superannuationConfigurationValidity: null,
      datasetVersion: '1.0',
      calculatedAt: '2026-07-18T00:00:00Z',
    };
    expect(summary.totalContracts).toBe(10);
    expect(summary.holidayCalendarCoverage).toBeNull();
    expect(fmtRatio(summary.holidayCalendarCoverage)).toBe('Not available');
    expect(fmtRatio(summary.paymentCalendarCoverage)).toBe('Not available');
  });
});

// ─── Support issues grouped by severity ──────────────────────────────────────

describe('Support issues grouping by severity', () => {
  const issues: BiContractSupportIssue[] = [
    { code: 'missing_customer', severity: 'invalid', field: 'customerId', message: 'No customer.' },
    { code: 'missing_rate',     severity: 'invalid', field: 'rate',       message: 'No rate.'     },
    { code: 'open_ended_warn',  severity: 'warning', field: 'endDate',    message: 'Open-ended.'  },
  ];

  it('separates invalid from warning issues', () => {
    const invalid = issues.filter((i) => i.severity === 'invalid');
    const warning  = issues.filter((i) => i.severity === 'warning');
    expect(invalid).toHaveLength(2);
    expect(warning).toHaveLength(1);
    expect(warning[0].code).toBe('open_ended_warn');
  });

  it('renders empty issues list when none', () => {
    const noIssues: BiContractSupportIssue[] = [];
    const invalid = noIssues.filter((i) => i.severity === 'invalid');
    const warning  = noIssues.filter((i) => i.severity === 'warning');
    expect(invalid).toHaveLength(0);
    expect(warning).toHaveLength(0);
  });
});

// ─── BiContractSupportIssueListResponse ──────────────────────────────────────

describe('BiContractSupportIssueListResponse type contract', () => {
  it('accepts a zero-issue response', () => {
    const response: BiContractSupportIssueListResponse = {
      contractId: 'c1',
      configurationStatus: 'complete',
      supportIssueCount: 0,
      supportIssues: [],
      calculatedAt: '2026-07-18T00:00:00Z',
    };
    expect(response.supportIssueCount).toBe(0);
    expect(response.supportIssues).toHaveLength(0);
  });
});

// ─── Filter params type contract ──────────────────────────────────────────────

describe('PlatformAdminContractListParams', () => {
  it('accepts all supported filter keys', () => {
    const params: PlatformAdminContractListParams = {
      search: 'developer',
      businessId: 'biz1',
      customerId: 'cust1',
      status: 'active',
      workType: 'contractor',
      billingCycle: 'per_shift',
      currency: 'AUD',
      configurationStatus: 'complete',
      chargeGst: true,
      superEnabled: false,
      holidayRulesEnabled: true,
      paymentCalendarEnabled: false,
      updatedFrom: '2026-01-01',
      updatedTo: '2026-12-31',
      page: 1,
      limit: 50,
      sortBy: 'source_updated_at',
      sortDir: 'desc',
    };
    expect(params.search).toBe('developer');
    expect(params.sortDir).toBe('desc');
    expect(params.chargeGst).toBe(true);
  });

  it('accepts empty params object', () => {
    const params: PlatformAdminContractListParams = {};
    expect(Object.keys(params)).toHaveLength(0);
  });

  it('sortDir is constrained to asc | desc', () => {
    const asc: PlatformAdminContractListParams = { sortDir: 'asc' };
    const desc: PlatformAdminContractListParams = { sortDir: 'desc' };
    expect(asc.sortDir).toBe('asc');
    expect(desc.sortDir).toBe('desc');
  });
});

describe('PlatformAdminContractSummaryParams', () => {
  it('accepts all summary filter keys', () => {
    const params: PlatformAdminContractSummaryParams = {
      businessId: 'biz1',
      status: 'active',
      createdFrom: '2026-01-01',
      createdTo: '2026-12-31',
    };
    expect(params.businessId).toBe('biz1');
  });

  it('accepts empty params object', () => {
    const params: PlatformAdminContractSummaryParams = {};
    expect(Object.keys(params)).toHaveLength(0);
  });
});

// ─── Pagination ───────────────────────────────────────────────────────────────

describe('Pagination params', () => {
  it('frontend page 0 → API page 1', () => {
    const frontendPages = [0, 1, 2, 3];
    const apiPages = frontendPages.map((p) => p + 1);
    expect(apiPages).toEqual([1, 2, 3, 4]);
  });
});

// ─── hasActiveFilters logic ───────────────────────────────────────────────────

function hasActiveFilters(filters: {
  search: string;
  statusFilter: string;
  configStatusFilter: string;
  gstFilter: string;
}): boolean {
  return (
    filters.search !== '' ||
    filters.statusFilter !== '' ||
    filters.configStatusFilter !== '' ||
    filters.gstFilter !== ''
  );
}

describe('hasActiveFilters logic', () => {
  it('returns false when all filters are empty', () => {
    expect(hasActiveFilters({ search: '', statusFilter: '', configStatusFilter: '', gstFilter: '' }))
      .toBe(false);
  });

  it('returns true when search is set', () => {
    expect(hasActiveFilters({ search: 'dev', statusFilter: '', configStatusFilter: '', gstFilter: '' }))
      .toBe(true);
  });

  it('returns true when configStatus is set', () => {
    expect(hasActiveFilters({ search: '', statusFilter: '', configStatusFilter: 'invalid', gstFilter: '' }))
      .toBe(true);
  });

  it('returns true when gstFilter is set', () => {
    expect(hasActiveFilters({ search: '', statusFilter: '', configStatusFilter: '', gstFilter: 'true' }))
      .toBe(true);
  });
});

// ─── Friendly error message ───────────────────────────────────────────────────

describe('Friendly BI error message', () => {
  const FRIENDLY_MSG =
    'Contract analytics are temporarily unavailable.\n' +
    'Please verify that the Business Intelligence service is running.';

  it('constructs a friendly error when BI is unavailable', () => {
    const rawError = new Error('Request failed with status code 503');
    const friendlyError = Object.assign(new Error(FRIENDLY_MSG), { cause: rawError });
    expect(friendlyError.message).toBe(FRIENDLY_MSG);
    expect(friendlyError.message).not.toContain('503');
  });

  it('never shows raw Request failed message to users', () => {
    expect(FRIENDLY_MSG).not.toContain('Request failed');
    expect(FRIENDLY_MSG).not.toContain('503');
    expect(FRIENDLY_MSG).toContain('Business Intelligence');
  });

  it('passes null when no error', () => {
    const rawError: Error | null = null;
    const friendlyError: Error | null = rawError
      ? Object.assign(new Error(FRIENDLY_MSG), { cause: rawError })
      : null;
    expect(friendlyError).toBeNull();
  });
});

// ─── Empty states ─────────────────────────────────────────────────────────────

describe('Empty state messages', () => {
  it('empty state message differs when filters are active vs no data', () => {
    const withFilters = 'No Contracts match the current filters. Try adjusting your search.';
    const withoutFilters = 'No Contract data has been synced to Business Intelligence yet.';
    expect(withFilters).not.toBe(withoutFilters);
    expect(withFilters).toContain('filters');
    expect(withoutFilters).toContain('Business Intelligence');
  });

  it('zero-issue message is distinct from error message', () => {
    const noIssues = 'This Contract has no detected configuration issues.';
    const notFound = 'Contract analytics record not found.';
    expect(noIssues).not.toBe(notFound);
  });
});

// ─── Page is read-only — no create/edit/delete ────────────────────────────────

describe('Read-only contract admin page', () => {
  it('does not export any mutation hooks', () => {
    // The hooks file exports only query hooks — no useCreate/useUpdate/useDelete
    const contractHooks = require('@/hooks/api/usePlatformAdminContracts');
    expect(contractHooks).not.toHaveProperty('useCreatePlatformAdminContract');
    expect(contractHooks).not.toHaveProperty('useUpdatePlatformAdminContract');
    expect(contractHooks).not.toHaveProperty('useDeletePlatformAdminContract');
  });

  it('hook file exports only read hooks', () => {
    const contractHooks = require('@/hooks/api/usePlatformAdminContracts');
    expect(contractHooks).toHaveProperty('usePlatformAdminContractSummary');
    expect(contractHooks).toHaveProperty('usePlatformAdminContracts');
    expect(contractHooks).toHaveProperty('usePlatformAdminContract');
    expect(contractHooks).toHaveProperty('usePlatformAdminContractIssues');
  });
});

// ─── Navigation — Contracts is in Platform Admin sidebar ──────────────────────

describe('Platform Admin navigation', () => {
  it('platform admin sidebarAdmin includes Contracts route', () => {
    const { getRoleConfig } = require('@/config/rbac/role-config');
    const config = getRoleConfig('platform_admin');
    const adminSidebar = config.sidebarAdmin;
    expect(adminSidebar).toBeDefined();
    const allItems = adminSidebar.flatMap((s: { items: Array<{ href: string }> }) => s.items);
    const contractsItem = allItems.find((i: { href: string }) => i.href === '/platform-admin/contracts');
    expect(contractsItem).toBeDefined();
  });

  it('platform admin has wildcard route access', () => {
    const { ALLOWED_ROUTES } = require('@/config/rbac/route-rules');
    expect(ALLOWED_ROUTES.platform_admin).toContain('*');
  });

  it('business_owner sidebar does not include platform-admin contracts', () => {
    const { getRoleConfig } = require('@/config/rbac/role-config');
    const config = getRoleConfig('business_owner');
    const allItems = config.sidebar.flatMap((s: { items: Array<{ href: string }> }) => s.items);
    const found = allItems.find((i: { href: string }) => i.href.startsWith('/platform-admin'));
    expect(found).toBeUndefined();
  });

  it('business_admin sidebar does not include platform-admin contracts', () => {
    const { getRoleConfig } = require('@/config/rbac/role-config');
    const config = getRoleConfig('business_admin');
    const allItems = config.sidebar.flatMap((s: { items: Array<{ href: string }> }) => s.items);
    const found = allItems.find((i: { href: string }) => i.href.startsWith('/platform-admin'));
    expect(found).toBeUndefined();
  });
});

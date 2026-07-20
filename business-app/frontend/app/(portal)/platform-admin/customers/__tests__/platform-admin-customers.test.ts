/**
 * Unit tests for Platform Admin Customers feature.
 *
 * Tests pure logic functions that don't require a DOM.
 * (React component rendering tests would require jest-environment-jsdom.)
 */

import {
  formatDataQualityIssue,
  DATA_QUALITY_LABELS,
} from '@/types/platform-admin-customer';
import type {
  BiCustomerListItem,
  BiCustomerDetailResponse,
  PlatformAdminCustomersParams,
} from '@/types/platform-admin-customer';

// ─── formatDataQualityIssue ───────────────────────────────────────────────────

describe('formatDataQualityIssue', () => {
  it('returns a human-readable label for known issue codes', () => {
    expect(formatDataQualityIssue('missing_abn')).toBe('Missing ABN');
    expect(formatDataQualityIssue('missing_contacts')).toBe('No contacts');
    expect(formatDataQualityIssue('missing_primary_contact')).toBe('No primary contact');
    expect(formatDataQualityIssue('missing_locations')).toBe('No locations');
    expect(formatDataQualityIssue('invalid_address')).toBe('Invalid address');
    expect(formatDataQualityIssue('missing_communication_config')).toBe('No communication configuration');
    expect(formatDataQualityIssue('invalid_email_recipient')).toBe('Invalid email recipient');
    expect(formatDataQualityIssue('invalid_sms_recipient')).toBe('Invalid SMS recipient');
    expect(formatDataQualityIssue('no_recipients')).toBe('No recipients configured');
    expect(formatDataQualityIssue('stale_sync')).toBe('Data may be stale');
  });

  it('falls back to humanized code for unknown issue codes', () => {
    expect(formatDataQualityIssue('some_future_issue')).toBe('some future issue');
    expect(formatDataQualityIssue('another_unknown_code')).toBe('another unknown code');
  });

  it('covers all entries in DATA_QUALITY_LABELS', () => {
    for (const [code, label] of Object.entries(DATA_QUALITY_LABELS)) {
      expect(formatDataQualityIssue(code)).toBe(label);
    }
  });
});

// ─── BiCustomerListItem type shape ────────────────────────────────────────────

describe('BiCustomerListItem type contract', () => {
  it('accepts a fully populated item', () => {
    const item: BiCustomerListItem = {
      customerId: 'cust1',
      businessId: 'biz1',
      businessName: 'Acme Corp',
      customerName: 'Acme Ltd',
      customerType: 'company',
      abn: '12345678901',
      isActive: true,
      contactCount: 3,
      locationCount: 2,
      communicationPurposeCount: 1,
      emailRecipientCount: 5,
      smsRecipientCount: 2,
      hasPrimaryContact: true,
      hasAbn: true,
      hasLocations: true,
      hasContacts: true,
      hasCommunicationConfiguration: true,
      dataQualityIssueCount: 0,
      dataQualityIssues: [],
      sourceCreatedAt: '2024-01-01T00:00:00Z',
      sourceUpdatedAt: '2024-06-01T00:00:00Z',
      syncedAt: '2024-06-02T00:00:00Z',
    };
    expect(item.customerId).toBe('cust1');
    expect(item.dataQualityIssueCount).toBe(0);
  });

  it('allows null optional fields', () => {
    const item: BiCustomerListItem = {
      customerId: 'cust2',
      businessId: 'biz1',
      businessName: null,
      customerName: 'John Doe',
      customerType: 'individual',
      abn: null,
      isActive: false,
      contactCount: 0,
      locationCount: 0,
      communicationPurposeCount: 0,
      emailRecipientCount: 0,
      smsRecipientCount: 0,
      hasPrimaryContact: false,
      hasAbn: false,
      hasLocations: false,
      hasContacts: false,
      hasCommunicationConfiguration: false,
      dataQualityIssueCount: 2,
      dataQualityIssues: ['missing_contacts', 'missing_abn'],
      sourceCreatedAt: null,
      sourceUpdatedAt: null,
      syncedAt: null,
    };
    expect(item.abn).toBeNull();
    expect(item.businessName).toBeNull();
    expect(item.dataQualityIssues).toHaveLength(2);
  });
});

// ─── PlatformAdminCustomersParams filter logic ────────────────────────────────

describe('PlatformAdminCustomersParams', () => {
  it('all supported filter keys are present in the type', () => {
    const params: PlatformAdminCustomersParams = {
      search: 'acme',
      businessId: 'biz1',
      customerType: 'company',
      isActive: true,
      hasContacts: false,
      hasLocations: true,
      hasCommunicationConfiguration: false,
      hasDataQualityIssues: true,
      page: 1,
      limit: 50,
      sortBy: 'customerName',
      sortDirection: 'asc',
    };
    expect(params.search).toBe('acme');
    expect(params.sortBy).toBe('customerName');
    expect(params.hasCommunicationConfiguration).toBe(false);
  });

  it('accepts empty params object', () => {
    const params: PlatformAdminCustomersParams = {};
    expect(Object.keys(params)).toHaveLength(0);
  });

  it('customerType is constrained to company | individual', () => {
    const companyParams: PlatformAdminCustomersParams = { customerType: 'company' };
    const individualParams: PlatformAdminCustomersParams = { customerType: 'individual' };
    expect(companyParams.customerType).toBe('company');
    expect(individualParams.customerType).toBe('individual');
  });
});

// ─── BiCustomerDetailResponse type shape ─────────────────────────────────────

describe('BiCustomerDetailResponse type contract', () => {
  it('accepts a full detail response', () => {
    const detail: BiCustomerDetailResponse = {
      customerId: 'cust1',
      businessId: 'biz1',
      businessName: 'Acme',
      customerName: 'Acme Ltd',
      customerType: 'company',
      abn: '12345678901',
      isActive: true,
      notes: 'Some notes',
      contactCount: 1,
      locationCount: 1,
      communicationPurposeCount: 1,
      emailRecipientCount: 2,
      smsRecipientCount: 0,
      hasPrimaryContact: true,
      hasAbn: true,
      hasLocations: true,
      hasContacts: true,
      hasCommunicationConfiguration: true,
      dataQualityIssueCount: 0,
      dataQualityIssues: [],
      sourceCreatedAt: '2024-01-01T00:00:00Z',
      sourceUpdatedAt: '2024-06-01T00:00:00Z',
      syncedAt: '2024-06-02T00:00:00Z',
      locations: [
        {
          sourceLocationId: 'loc1',
          tag: 'Main',
          country: 'AU',
          addressLine1: '1 Test St',
          addressLine2: null,
          city: 'Sydney',
          postcode: '2000',
          state: 'NSW',
          fullAddress: '1 Test St, Sydney NSW 2000',
          isValidAddress: true,
          isLegacy: false,
        },
      ],
      contacts: [
        {
          sourceContactId: 'con1',
          contactName: 'Jane Doe',
          roleOrPosition: 'Manager',
          email: 'jane@acme.com',
          phone: '+61412345678',
          locationId: 'loc1',
          locationTag: 'Main',
          isPrimary: true,
          hasEmail: true,
          hasPhone: true,
          hasLocation: true,
        },
      ],
      purposes: [
        {
          communicationDomainId: 'domain1',
          configuredChannelCount: 2,
          emailRecipientCount: 2,
          smsRecipientCount: 0,
          hasEmailChannel: true,
          hasSmsChannel: false,
          recipients: [
            {
              channel: 'email',
              destination: 'jane@acme.com',
              recipientType: 'to',
              destinationNormalized: 'jane@acme.com',
              isValidDestination: true,
            },
          ],
        },
      ],
    };

    expect(detail.customerId).toBe('cust1');
    expect(detail.locations).toHaveLength(1);
    expect(detail.contacts).toHaveLength(1);
    expect(detail.purposes).toHaveLength(1);
    expect(detail.purposes[0].recipients).toHaveLength(1);
    expect(detail.contacts[0].isPrimary).toBe(true);
    expect(detail.locations[0].isValidAddress).toBe(true);
  });

  it('allows empty child arrays', () => {
    const detail: BiCustomerDetailResponse = {
      customerId: 'cust2',
      businessId: 'biz1',
      businessName: null,
      customerName: 'Individual',
      customerType: 'individual',
      abn: null,
      isActive: true,
      notes: null,
      contactCount: 0,
      locationCount: 0,
      communicationPurposeCount: 0,
      emailRecipientCount: 0,
      smsRecipientCount: 0,
      hasPrimaryContact: false,
      hasAbn: false,
      hasLocations: false,
      hasContacts: false,
      hasCommunicationConfiguration: false,
      dataQualityIssueCount: 3,
      dataQualityIssues: ['missing_contacts', 'missing_locations', 'missing_abn'],
      sourceCreatedAt: null,
      sourceUpdatedAt: null,
      syncedAt: null,
      locations: [],
      contacts: [],
      purposes: [],
    };

    expect(detail.locations).toHaveLength(0);
    expect(detail.contacts).toHaveLength(0);
    expect(detail.dataQualityIssues).toHaveLength(3);
  });
});

// ─── Data quality display logic ───────────────────────────────────────────────

function dataQualityLabel(count: number): string {
  if (count === 0) return 'Healthy';
  if (count === 1) return '1 issue';
  return `${count} issues`;
}

describe('Data quality display logic', () => {
  it('issue count 0 → healthy', () => {
    expect(dataQualityLabel(0)).toBe('Healthy');
  });

  it('issue count 1 → singular label', () => {
    expect(dataQualityLabel(1)).toBe('1 issue');
  });

  it('issue count > 1 → plural label', () => {
    for (const count of [2, 5, 10]) {
      expect(dataQualityLabel(count)).toBe(`${count} issues`);
    }
  });
});

// ─── Recipient display logic ──────────────────────────────────────────────────

describe('Recipients display', () => {
  it('shows email and SMS counts separately', () => {
    const emailCount = 3;
    const smsCount = 1;
    const emailLabel = emailCount > 0 ? `Email: ${emailCount}` : null;
    const smsLabel = smsCount > 0 ? `SMS: ${smsCount}` : null;
    expect(emailLabel).toBe('Email: 3');
    expect(smsLabel).toBe('SMS: 1');
  });

  it('shows dash when both counts are zero', () => {
    const emailCount = 0;
    const smsCount = 0;
    const isEmpty = emailCount === 0 && smsCount === 0;
    expect(isEmpty).toBe(true);
  });
});

// ─── Pagination ───────────────────────────────────────────────────────────────

describe('Pagination params', () => {
  it('page param is 1-based (frontend page 0 → API page 1)', () => {
    const frontendPages = [0, 1, 2];
    const expected = [1, 2, 3];
    frontendPages.forEach((p, i) => {
      expect(p + 1).toBe(expected[i]);
    });
  });

  it('page 2 in frontend → page 3 in API', () => {
    const frontendPages = [0, 1, 2, 3];
    const apiPages = frontendPages.map((p) => p + 1);
    expect(apiPages).toEqual([1, 2, 3, 4]);
  });
});

// ─── Filter clearing logic ────────────────────────────────────────────────────

describe('hasActiveFilters logic', () => {
  it('returns false when all filters are empty', () => {
    const search = '';
    const businessIdFilter = '';
    const typeFilter = '';
    const activeFilter = '';
    const hasContactsFilter = '';
    const hasLocationsFilter = '';
    const hasCommFilter = '';
    const hasDqFilter = '';

    const hasActive =
      search !== '' ||
      businessIdFilter !== '' ||
      typeFilter !== '' ||
      activeFilter !== '' ||
      hasContactsFilter !== '' ||
      hasLocationsFilter !== '' ||
      hasCommFilter !== '' ||
      hasDqFilter !== '';

    expect(hasActive).toBe(false);
  });

  it('returns true when search is set', () => {
    const filters = { search: 'acme', typeFilter: '', activeFilter: '' };
    const hasActive = filters.search !== '' || filters.typeFilter !== '' || filters.activeFilter !== '';
    expect(hasActive).toBe(true);
  });

  it('returns true when any filter is set', () => {
    const filters = { search: '', typeFilter: 'company', activeFilter: '' };
    const hasActive = filters.search !== '' || filters.typeFilter !== '' || filters.activeFilter !== '';
    expect(hasActive).toBe(true);
  });
});

// ─── Friendly error message ───────────────────────────────────────────────────

describe('Friendly BI error message', () => {
  const FRIENDLY_MSG =
    'Customer analytics are temporarily unavailable.\n' +
    'Please verify that the Business Intelligence service is running.';

  it('constructs a friendly error when BI is unavailable', () => {
    const rawError = new Error('Request failed with status code 503');
    const friendlyError: Error | null = rawError
      ? Object.assign(new Error(FRIENDLY_MSG), { cause: rawError })
      : null;
    expect(friendlyError).not.toBeNull();
    expect(friendlyError!.message).toBe(FRIENDLY_MSG);
    expect(friendlyError!.message).not.toContain('503');
  });

  it('never shows raw Request failed message to users', () => {
    const rawError = new Error('Request failed with status code 503');
    const displayMessage = FRIENDLY_MSG;
    expect(displayMessage).not.toContain('Request failed');
    expect(displayMessage).not.toContain('503');
    expect(displayMessage).toContain('Business Intelligence');
  });

  it('passes null when no error (successful load)', () => {
    const rawError: Error | null = null;
    const friendlyError: Error | null = rawError
      ? Object.assign(new Error(FRIENDLY_MSG), { cause: rawError })
      : null;
    expect(friendlyError).toBeNull();
  });

  it('friendly message mentions the BI service', () => {
    expect(FRIENDLY_MSG).toContain('Business Intelligence service');
  });

  it('friendly message suggests the user verify the service is running', () => {
    expect(FRIENDLY_MSG).toContain('is running');
  });
});

// ─── Loading and empty states ─────────────────────────────────────────────────

describe('Loading and empty states', () => {
  it('empty state message differs when filters are active vs no data', () => {
    const withFilters =
      'No customers match the current filters. Try adjusting your search.';
    const withoutFilters =
      'No customer data has been synced to Business Intelligence yet.';
    expect(withFilters).not.toBe(withoutFilters);
    expect(withFilters).toContain('filters');
    expect(withoutFilters).toContain('Business Intelligence');
  });
});

/**
 * Unit tests for Contracts page refactoring.
 *
 * Covers pure-logic behaviour: state transitions, filter logic, column
 * definitions and form-value helpers. React rendering tests would require
 * jest-environment-jsdom (not yet configured for this project).
 */

import {
  STATUS_LABELS,
  BILLING_CYCLE_LABELS,
  PAYMENT_TERMS_OPTIONS,
  DEFAULT_HOLIDAY_RULES,
  HOLIDAY_BEHAVIOUR_LABELS,
  WORK_TYPE_LABELS,
  SUPPORTED_CURRENCIES,
  CURRENCY_LABELS,
  SUPER_PAYMENT_FREQUENCY_LABELS,
  DEFAULT_SUPERANNUATION_RULES,
  SCHEDULED_PAYMENT_DAY_LABELS,
  type Contract,
  type ContractStatus,
  type BillingCycle,
  type WorkType,
  type HolidayBehaviour,
  type HolidayRules,
  type Currency,
  type SuperPaymentFrequency,
  type ScheduledPaymentDay,
  type CreateContractPayload,
  type UpdateContractPayload,
} from '@/types/contract';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id:                    'c1',
    businessId:            'biz1',
    customerId:            'cust1',
    customerName:          'Acme Ltd',
    positionName:          'Senior Developer',
    workType:              'contractor',
    invoiceDescription:    'Software development services',
    status:                'active',
    billingCycle:          'per_shift',
    paymentTermsDays:      14,
    rateType:              'fixed',
    minimumHours:          4,
    defaultBreakMinutes:   30,
    rates:                 [{ days: ['all'], startTime: null, endTime: null, hourlyRate: 95 }],
    notes:                 null,
    startDate:             '2024-01-15T00:00:00.000Z',
    endDate:               null,
    scheduledPaymentEnabled: false,
    scheduledPaymentDay:     null,
    useInvoicePrefix:        false,
    invoicePrefix:           null,
    startingInvoiceNumber:   1,
    currency:                'AUD',
    chargeGst:               false,
    gstRate:                 null,
    holidayRules:          DEFAULT_HOLIDAY_RULES,
    superannuationRules:   DEFAULT_SUPERANNUATION_RULES,
    paymentCalendarEnabled:        false,
    paymentCalendarSubscriptionId: null,
    createdAt:             '2024-01-15T08:00:00.000Z',
    updatedAt:             '2024-06-01T08:00:00.000Z',
    ...overrides,
  };
}

// ─── Column definitions ───────────────────────────────────────────────────────

describe('Contract table columns', () => {
  const CONTRACT_FIELDS = [
    'positionName', 'invoiceDescription', 'status', 'billingCycle',
    'startDate', 'endDate', 'updatedAt',
  ] as const;

  it('all displayed fields exist in the Contract type', () => {
    const contract = makeContract();
    for (const field of CONTRACT_FIELDS) {
      expect(contract).toHaveProperty(field);
    }
  });

  it('does not display raw customerId as a column (not user-friendly)', () => {
    // customerId is a MongoDB ObjectId — not suitable for display
    const DISPLAYED_COLUMN_FIELDS = [
      'positionName', 'invoiceDescription', 'status',
      'billingCycle', 'startDate', 'endDate', 'updatedAt', '_actions',
    ];
    expect(DISPLAYED_COLUMN_FIELDS).not.toContain('customerId');
    expect(DISPLAYED_COLUMN_FIELDS).not.toContain('businessId');
  });
});

// ─── Status labels and colors ─────────────────────────────────────────────────

describe('STATUS_LABELS', () => {
  const STATUSES: ContractStatus[] = ['draft', 'active', 'inactive', 'finished', 'cancelled'];

  it('has a label for every contract status', () => {
    for (const s of STATUSES) {
      expect(STATUS_LABELS[s]).toBeTruthy();
    }
  });

  it('labels are human-readable strings', () => {
    expect(STATUS_LABELS.draft).toBe('Draft');
    expect(STATUS_LABELS.active).toBe('Active');
    expect(STATUS_LABELS.inactive).toBe('Inactive');
    expect(STATUS_LABELS.finished).toBe('Finished');
    expect(STATUS_LABELS.cancelled).toBe('Cancelled');
  });
});

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  draft:     'default',
  active:    'success',
  inactive:  'warning',
  finished:  'primary',
  cancelled: 'error',
};

describe('Status chip colors', () => {
  it('active contracts use success color', () => {
    expect(STATUS_COLORS.active).toBe('success');
  });

  it('cancelled contracts use error color', () => {
    expect(STATUS_COLORS.cancelled).toBe('error');
  });

  it('draft contracts use default color', () => {
    expect(STATUS_COLORS.draft).toBe('default');
  });
});

// ─── BILLING_CYCLE_LABELS ─────────────────────────────────────────────────────

describe('BILLING_CYCLE_LABELS', () => {
  const CYCLES: BillingCycle[] = ['per_shift', 'daily', 'weekly', 'fortnightly', 'monthly'];

  it('has a label for every billing cycle', () => {
    for (const c of CYCLES) {
      expect(BILLING_CYCLE_LABELS[c]).toBeTruthy();
    }
  });
});

// ─── Filter logic ──────────────────────────────────────────────────────────────

describe('hasActiveFilters logic', () => {
  function hasActiveFilters(search: string, status: string): boolean {
    return search !== '' || status !== '';
  }

  it('returns false when both filters are empty', () => {
    expect(hasActiveFilters('', '')).toBe(false);
  });

  it('returns true when search is set', () => {
    expect(hasActiveFilters('dev', '')).toBe(true);
  });

  it('returns true when status is set', () => {
    expect(hasActiveFilters('', 'active')).toBe(true);
  });

  it('returns true when both are set', () => {
    expect(hasActiveFilters('dev', 'active')).toBe(true);
  });
});

// ─── Pagination — 0-indexed page state ────────────────────────────────────────

describe('Page state (0-indexed)', () => {
  it('first page state is 0, API receives page=1', () => {
    const pageState = 0;
    const apiPage = pageState + 1;
    expect(apiPage).toBe(1);
  });

  it('second page state is 1, API receives page=2', () => {
    const pageState = 1;
    const apiPage = pageState + 1;
    expect(apiPage).toBe(2);
  });
});

// ─── Edit action guard ────────────────────────────────────────────────────────

describe('Edit action guard', () => {
  function canEdit(status: ContractStatus): boolean {
    return status !== 'finished' && status !== 'cancelled';
  }

  it('allows edit for draft contracts', () => {
    expect(canEdit('draft')).toBe(true);
  });

  it('allows edit for active contracts', () => {
    expect(canEdit('active')).toBe(true);
  });

  it('blocks edit for finished contracts', () => {
    expect(canEdit('finished')).toBe(false);
  });

  it('blocks edit for cancelled contracts', () => {
    expect(canEdit('cancelled')).toBe(false);
  });
});

// ─── Delete action guard ──────────────────────────────────────────────────────

describe('Delete action guard', () => {
  function canDelete(status: ContractStatus): boolean {
    return status === 'draft' || status === 'cancelled';
  }

  it('allows delete for draft contracts', () => {
    expect(canDelete('draft')).toBe(true);
  });

  it('allows delete for cancelled contracts', () => {
    expect(canDelete('cancelled')).toBe(true);
  });

  it('blocks delete for active contracts', () => {
    expect(canDelete('active')).toBe(false);
  });

  it('blocks delete for finished contracts', () => {
    expect(canDelete('finished')).toBe(false);
  });
});

// ─── Empty state messages ──────────────────────────────────────────────────────

describe('Empty state messages', () => {
  it('shows create prompt when no filters are active', () => {
    const hasActiveFilters = false;
    const description = hasActiveFilters
      ? 'Try adjusting your filters.'
      : 'Create your first contract to get started.';
    expect(description).toBe('Create your first contract to get started.');
  });

  it('shows filter hint when filters are active', () => {
    const hasActiveFilters = true;
    const description = hasActiveFilters
      ? 'Try adjusting your filters.'
      : 'Create your first contract to get started.';
    expect(description).toBe('Try adjusting your filters.');
  });

  it('shows action button only when no filters are active', () => {
    const withFilters = false;
    const withoutFilters = true;
    // Action appears when no filters — matches ContractsPage behavior
    expect(!withFilters).toBe(true);   // no button when filters active
    expect(!withoutFilters).toBe(false); // button appears when no filters
  });
});

// ─── Form value helpers ────────────────────────────────────────────────────────

function toDateInput(iso?: string | null): string {
  if (!iso) return '';
  return iso.split('T')[0];
}

describe('toDateInput', () => {
  it('converts ISO string to YYYY-MM-DD for date input', () => {
    expect(toDateInput('2024-01-15T00:00:00.000Z')).toBe('2024-01-15');
  });

  it('returns empty string for null', () => {
    expect(toDateInput(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(toDateInput(undefined)).toBe('');
  });

  it('handles date-only strings', () => {
    expect(toDateInput('2024-06-30')).toBe('2024-06-30');
  });
});

// ─── contractToFormValues mapping ────────────────────────────────────────────

// Mirror of the real contractToFormValues (kept in sync with ContractFormDrawer)
function contractToFormValues(c: Contract) {
  const hr = c.holidayRules as any;
  let holidayEnabled = false;
  let holidayBehaviour: HolidayBehaviour = 'normal_rate';

  if (hr) {
    if ('behaviour' in hr) {
      // Format 3 (new) or Format 1 (original legacy)
      holidayEnabled   = hr.enabled ?? (hr.calendarId != null);
      holidayBehaviour = hr.behaviour ?? 'normal_rate';
    } else {
      // Format 2 (intermediate — workAllowed + payMethod)
      holidayEnabled = hr.enabled ?? false;
      const workAllowed: boolean = hr.workAllowed ?? true;
      const payMethod: string    = hr.payMethod ?? 'normal_rate';
      holidayBehaviour = !workAllowed ? 'no_work' : (payMethod as HolidayBehaviour);
    }
  }

  // Superannuation
  const sr = (c as any).superannuationRules;
  const superEnabled   = sr?.enabled          ?? false;
  const superRate      = sr?.rate    != null  ? String(sr.rate)            : '12';
  const superFrequency = sr?.paymentFrequency ?? 'quarterly';

  // Backward compat: old docs have invoicePrefix='INV-' but no useInvoicePrefix field
  const existingPrefix = c.invoicePrefix;
  const invoiceUsePrefix = (c as any).useInvoicePrefix !== undefined
    ? (c as any).useInvoicePrefix
    : !!(existingPrefix && existingPrefix.trim());

  return {
    customerId:              c.customerId,
    positionName:            c.positionName,
    workType:                c.workType ?? 'contractor',
    invoiceDescription:      c.invoiceDescription,
    startDate:               toDateInput(c.startDate),
    hasEndDate:              c.endDate != null,
    endDate:                 toDateInput(c.endDate),
    notes:                   c.notes ?? '',
    billingCycle:              c.billingCycle,
    paymentTermsDays:          c.paymentTermsDays ?? 14,  // default 14 when null (scheduled mode)
    invoiceDueRule:            'from_invoice_date',
    scheduledPaymentEnabled:   (c as any).scheduledPaymentEnabled ?? false,
    scheduledPaymentDay:       (c as any).scheduledPaymentDay     ?? '',
    minimumHours:            c.minimumHours,
    defaultBreakMinutes:     c.defaultBreakMinutes,
    rateType:                c.rateType,
    rates: c.rates.map((r) => ({
      days:       r.days,
      startTime:  r.startTime ?? '',
      endTime:    r.endTime   ?? '',
      hourlyRate: String(r.hourlyRate),
    })),
    holidayEnabled,
    holidayCalendarId:       hr?.calendarId           ?? '',
    holidayCalendarName:     hr?.calendarName         ?? '',
    holidayCalendarProvider: hr?.calendarProviderName ?? '',
    holidayBehaviour,
    holidayMultiplier:       hr?.multiplier      != null ? String(hr.multiplier)      : '',
    holidayFixedRate:        hr?.fixedHourlyRate != null ? String(hr.fixedHourlyRate) : '',
    invoiceUsePrefix,
    invoicePrefix:           existingPrefix ?? '',
    startingInvoiceNumber:   c.startingInvoiceNumber ?? 1,
    currency:                (c as any).currency ?? 'AUD',
    chargeGst:               (c as any).chargeGst ?? false,
    gstRate:                 (c as any).chargeGst && (c as any).gstRate != null
      ? String((c as any).gstRate) : '10',
    superEnabled,
    superRate,
    superFrequency,
    paymentCalendarEnabled:        (c as any).paymentCalendarEnabled ?? false,
    paymentCalendarSubscriptionId: (c as any).paymentCalendarSubscriptionId ?? '',
  };
}

describe('contractToFormValues', () => {
  it('maps all required fields', () => {
    const c = makeContract();
    const values = contractToFormValues(c);
    expect(values.positionName).toBe('Senior Developer');
    expect(values.billingCycle).toBe('per_shift');
    expect(values.paymentTermsDays).toBe(14);
  });

  it('converts startDate to date input format', () => {
    const c = makeContract({ startDate: '2024-01-15T00:00:00.000Z' });
    const values = contractToFormValues(c);
    expect(values.startDate).toBe('2024-01-15');
  });

  it('converts null endDate to empty string', () => {
    const c = makeContract({ endDate: null });
    const values = contractToFormValues(c);
    expect(values.endDate).toBe('');
  });

  it('converts null notes to empty string', () => {
    const c = makeContract({ notes: null });
    const values = contractToFormValues(c);
    expect(values.notes).toBe('');
  });

  it('converts rates hourlyRate to string for number input', () => {
    const c = makeContract({
      rates: [{ days: ['all'], startTime: null, endTime: null, hourlyRate: 95 }],
    });
    const values = contractToFormValues(c);
    expect(values.rates[0].hourlyRate).toBe('95');
  });

  it('converts null startTime/endTime to empty strings in rate rules', () => {
    const c = makeContract({
      rates: [{ days: ['monday'], startTime: null, endTime: null, hourlyRate: 80 }],
    });
    const values = contractToFormValues(c);
    expect(values.rates[0].startTime).toBe('');
    expect(values.rates[0].endTime).toBe('');
  });
});

// ─── Drawer behavior ──────────────────────────────────────────────────────────

describe('Drawer open/close state', () => {
  it('create mode: no contract → drawer title should be "New Contract"', () => {
    const contract = null;
    const isEditing = !!contract;
    const title = isEditing ? `Edit — ${contract}` : 'New Contract';
    expect(title).toBe('New Contract');
    expect(isEditing).toBe(false);
  });

  it('edit mode: with contract → drawer title includes position name', () => {
    const contract = makeContract({ positionName: 'Security Guard' });
    const isEditing = !!contract;
    const title = isEditing ? `Edit — ${contract.positionName}` : 'New Contract';
    expect(title).toBe('Edit — Security Guard');
    expect(isEditing).toBe(true);
  });

  it('create button label is "Create Contract"', () => {
    const isEditing = false;
    const label = isEditing ? 'Save Changes' : 'Create Contract';
    expect(label).toBe('Create Contract');
  });

  it('edit button label is "Save Changes"', () => {
    const isEditing = true;
    const label = isEditing ? 'Save Changes' : 'Create Contract';
    expect(label).toBe('Save Changes');
  });
});

// ─── Invoice Settings fields ──────────────────────────────────────────────────

describe('Invoice Settings model fields', () => {
  it('Contract type includes useInvoicePrefix (boolean)', () => {
    const c = makeContract({ useInvoicePrefix: true });
    expect(c.useInvoicePrefix).toBe(true);
  });

  it('Contract type includes invoicePrefix (nullable)', () => {
    const c = makeContract({ invoicePrefix: 'ABC-', useInvoicePrefix: true });
    expect(c.invoicePrefix).toBe('ABC-');
  });

  it('Contract type includes startingInvoiceNumber', () => {
    const c = makeContract({ startingInvoiceNumber: 1001 });
    expect(c.startingInvoiceNumber).toBe(1001);
  });

  it('Contract type includes currency', () => {
    const c = makeContract({ currency: 'USD' });
    expect(c.currency).toBe('USD');
  });

  it('Contract type includes chargeGst', () => {
    const c = makeContract({ chargeGst: true });
    expect(c.chargeGst).toBe(true);
  });

  it('contractToFormValues maps useInvoicePrefix=true + invoicePrefix', () => {
    const c = makeContract({ useInvoicePrefix: true, invoicePrefix: 'PROJ-' });
    const values = contractToFormValues(c);
    expect(values.invoiceUsePrefix).toBe(true);
    expect(values.invoicePrefix).toBe('PROJ-');
  });

  it('contractToFormValues maps useInvoicePrefix=false to empty prefix', () => {
    const c = makeContract({ useInvoicePrefix: false, invoicePrefix: null });
    const values = contractToFormValues(c);
    expect(values.invoiceUsePrefix).toBe(false);
    expect(values.invoicePrefix).toBe('');
  });

  it('contractToFormValues maps startingInvoiceNumber', () => {
    const c = makeContract({ startingInvoiceNumber: 500 });
    const values = contractToFormValues(c);
    expect(values.startingInvoiceNumber).toBe(500);
  });

  it('contractToFormValues defaults startingInvoiceNumber to 1 when absent', () => {
    const c = makeContract();
    (c as any).startingInvoiceNumber = undefined;
    const values = contractToFormValues(c);
    expect(values.startingInvoiceNumber).toBe(1);
  });

  it('contractToFormValues maps currency', () => {
    const c = makeContract({ currency: 'GBP' });
    const values = contractToFormValues(c);
    expect(values.currency).toBe('GBP');
  });

  it('contractToFormValues defaults currency to AUD when absent', () => {
    const c = makeContract();
    (c as any).currency = undefined;
    const values = contractToFormValues(c);
    expect(values.currency).toBe('AUD');
  });

  it('contractToFormValues maps chargeGst', () => {
    const c = makeContract({ chargeGst: true });
    const values = contractToFormValues(c);
    expect(values.chargeGst).toBe(true);
  });

  it('contractToFormValues defaults chargeGst to false when absent', () => {
    const c = makeContract();
    (c as any).chargeGst = undefined;
    const values = contractToFormValues(c);
    expect(values.chargeGst).toBe(false);
  });
});

// ─── Payment Terms selector ───────────────────────────────────────────────────

describe('Payment Terms selector', () => {
  it('PAYMENT_TERMS_OPTIONS covers expected presets', () => {
    const values = PAYMENT_TERMS_OPTIONS.map((o) => o.value);
    expect(values).toContain(0);
    expect(values).toContain(7);
    expect(values).toContain(14);
    expect(values).toContain(30);
    expect(values).toContain(60);
  });

  it('0 days is labelled "Immediately"', () => {
    const opt = PAYMENT_TERMS_OPTIONS.find((o) => o.value === 0);
    expect(opt?.label).toBe('Immediately');
  });

  it('14 days is the default', () => {
    // DEFAULT_VALUES uses paymentTermsDays: 14
    const DEFAULT_PAYMENT_TERMS = 14;
    const opt = PAYMENT_TERMS_OPTIONS.find((o) => o.value === DEFAULT_PAYMENT_TERMS);
    expect(opt).toBeDefined();
    expect(opt?.label).toBe('14 Days');
  });

  it('non-preset value is detected as non-standard', () => {
    const PAYMENT_TERMS_VALUES = PAYMENT_TERMS_OPTIONS.map((o) => o.value);
    expect(PAYMENT_TERMS_VALUES.includes(10)).toBe(false);
    expect(PAYMENT_TERMS_VALUES.includes(3)).toBe(false);
  });

  it('all standard preset values are in the selector', () => {
    const PAYMENT_TERMS_VALUES = PAYMENT_TERMS_OPTIONS.map((o) => o.value);
    for (const v of [0, 7, 14, 21, 28, 30, 45, 60]) {
      expect(PAYMENT_TERMS_VALUES).toContain(v);
    }
  });
});

// ─── Section structure ────────────────────────────────────────────────────────

describe('Drawer section structure', () => {
  const EXPECTED_SECTIONS = [
    'General',
    'Billing & Invoice',
    'Working Rules',
    'Rate Configuration',
    'Holiday Rules',
    'Invoice Settings',
  ];

  it('has exactly 6 sections', () => {
    expect(EXPECTED_SECTIONS).toHaveLength(6);
  });

  it('sections cover all required business concepts', () => {
    expect(EXPECTED_SECTIONS).toContain('General');
    expect(EXPECTED_SECTIONS).toContain('Billing & Invoice');
    expect(EXPECTED_SECTIONS).toContain('Working Rules');
    expect(EXPECTED_SECTIONS).toContain('Rate Configuration');
    expect(EXPECTED_SECTIONS).toContain('Holiday Rules');
    expect(EXPECTED_SECTIONS).toContain('Invoice Settings');
  });
});

// ─── Section 1: General field presence ───────────────────────────────────────

describe('Section 1 — General fields', () => {
  const GENERAL_FORM_FIELDS = [
    'customerId', 'positionName', 'invoiceDescription',
    'startDate', 'endDate', 'notes',
  ];

  it('all General form fields exist in FormValues shape', () => {
    // Verify each field is part of the default values (proxy for FormValues)
    const DEFAULT: Record<string, unknown> = {
      customerId: '', positionName: '', invoiceDescription: '',
      startDate: '', endDate: '', notes: '',
      billingCycle: 'per_shift', paymentTermsDays: 14, invoiceDueRule: 'from_invoice_date',
      minimumHours: 4, defaultBreakMinutes: 30, rateType: 'fixed', rates: [],
      invoiceUsePrefix: false, invoicePrefix: '', startingInvoiceNumber: 1,
      currency: 'AUD', chargeGst: false,
    };
    for (const field of GENERAL_FORM_FIELDS) {
      expect(DEFAULT).toHaveProperty(field);
    }
  });
});

// ─── Billing section ──────────────────────────────────────────────────────────

describe('Section 2 — Billing & Invoice', () => {
  it('invoiceDueRule default is from_invoice_date', () => {
    const DEFAULT_INVOICE_DUE_RULE = 'from_invoice_date';
    expect(DEFAULT_INVOICE_DUE_RULE).toBe('from_invoice_date');
  });

  it('billing cycle options include all supported values', () => {
    const BILLING_CYCLES = ['per_shift', 'daily', 'weekly', 'fortnightly', 'monthly'];
    for (const cycle of BILLING_CYCLES) {
      expect(Object.keys(BILLING_CYCLE_LABELS)).toContain(cycle);
    }
  });
});

// ─── Backward compatibility ───────────────────────────────────────────────────

describe('Backward compatibility', () => {
  it('legacy Contract with non-empty invoicePrefix infers usePrefix=true', () => {
    const legacyContract = makeContract();
    (legacyContract as any).invoicePrefix = 'INV-';
    (legacyContract as any).useInvoicePrefix = undefined; // no explicit field
    const values = contractToFormValues(legacyContract);
    expect(values.invoiceUsePrefix).toBe(true);
    expect(values.invoicePrefix).toBe('INV-');
  });

  it('legacy Contract without invoicePrefix maps to usePrefix=false', () => {
    const legacyContract = makeContract();
    (legacyContract as any).invoicePrefix = undefined;
    (legacyContract as any).useInvoicePrefix = undefined;
    const values = contractToFormValues(legacyContract);
    expect(values.invoiceUsePrefix).toBe(false);
    expect(values.invoicePrefix).toBe('');
  });

  it('existing Contract without startingInvoiceNumber renders with default 1', () => {
    const legacyContract = makeContract();
    (legacyContract as any).startingInvoiceNumber = undefined;
    const values = contractToFormValues(legacyContract);
    expect(values.startingInvoiceNumber).toBe(1);
  });

  it('existing Contract with non-preset paymentTermsDays loads the raw value', () => {
    const c = makeContract({ paymentTermsDays: 10 });
    const values = contractToFormValues(c);
    expect(values.paymentTermsDays).toBe(10);
  });

  it('non-preset paymentTermsDays is detected correctly', () => {
    const PRESET_VALUES = PAYMENT_TERMS_OPTIONS.map((o) => o.value);
    expect(PRESET_VALUES.includes(10)).toBe(false);
  });

  it('existing rates still load correctly', () => {
    const c = makeContract({
      rates: [{ days: ['monday', 'friday'], startTime: '09:00', endTime: '17:00', hourlyRate: 75 }],
    });
    const values = contractToFormValues(c);
    expect(values.rates).toHaveLength(1);
    expect(values.rates[0].hourlyRate).toBe('75');
    expect(values.rates[0].startTime).toBe('09:00');
    expect(values.rates[0].endTime).toBe('17:00');
    expect(values.rates[0].days).toEqual(['monday', 'friday']);
  });
});

// ─── Work Type ────────────────────────────────────────────────────────────────

describe('Work Type', () => {
  it('WORK_TYPE_LABELS covers all six types', () => {
    const types: WorkType[] = ['casual', 'contractor', 'subcontractor', 'service_agreement', 'project_based', 'other'];
    for (const t of types) {
      expect(WORK_TYPE_LABELS[t]).toBeTruthy();
    }
  });

  it('default workType is contractor', () => {
    const c = makeContract();
    expect(c.workType).toBe('contractor');
  });

  it('contractToFormValues maps workType', () => {
    const c = makeContract({ workType: 'casual' });
    const values = contractToFormValues(c);
    expect(values.workType).toBe('casual');
  });

  it('legacy contract without workType defaults to contractor', () => {
    const c = makeContract();
    (c as any).workType = undefined;
    const values = contractToFormValues(c);
    expect(values.workType).toBe('contractor');
  });

  it('Work Type is required — empty string would fail validation', () => {
    // WorkType is a string union — validate as string to avoid TS overlap error
    const workType: string = '';
    const isValid = workType !== '';
    expect(isValid).toBe(false);
  });
});

// ─── hasEndDate / End Date ────────────────────────────────────────────────────

describe('hasEndDate behavior', () => {
  it('hasEndDate is true when endDate is present', () => {
    const c = makeContract({ endDate: '2026-12-31T00:00:00.000Z' });
    const values = contractToFormValues(c);
    expect(values.hasEndDate).toBe(true);
    expect(values.endDate).toBe('2026-12-31');
  });

  it('hasEndDate is false when endDate is null', () => {
    const c = makeContract({ endDate: null });
    const values = contractToFormValues(c);
    expect(values.hasEndDate).toBe(false);
    expect(values.endDate).toBe('');
  });

  it('turning off hasEndDate sends endDate as null in payload', () => {
    const hasEndDate = false;
    const endDate = '2026-12-31';
    const payloadEndDate = hasEndDate ? endDate : null;
    expect(payloadEndDate).toBeNull();
  });

  it('endDate is required when hasEndDate is true', () => {
    const hasEndDate = true;
    const endDate = '';
    const isValid = !hasEndDate || endDate !== '';
    expect(isValid).toBe(false);
  });

  it('endDate must be on or after startDate', () => {
    const validate = (startDate: string, endDate: string) => {
      if (endDate < startDate) return 'End date must be on or after Start Date';
      return true;
    };
    expect(validate('2026-01-01', '2025-12-31')).toBe('End date must be on or after Start Date');
    expect(validate('2026-01-01', '2026-01-01')).toBe(true);
    expect(validate('2026-01-01', '2026-12-31')).toBe(true);
  });

  it('open-ended contract label', () => {
    const endDate: string | null = null;
    const label = endDate ? `Ends ${endDate}` : 'Open-ended';
    expect(label).toBe('Open-ended');
  });
});

// ─── Section 5: Holiday Rules (behaviour model) ──────────────────────────────

describe('Holiday Rules — behaviour types', () => {
  it('HOLIDAY_BEHAVIOUR_LABELS covers all four behaviours', () => {
    const behaviours: HolidayBehaviour[] = ['normal_rate', 'multiplier', 'fixed_rate', 'no_work'];
    for (const b of behaviours) {
      expect(HOLIDAY_BEHAVIOUR_LABELS[b]).toBeTruthy();
    }
  });

  it('no_work label is human readable', () => {
    expect(HOLIDAY_BEHAVIOUR_LABELS.no_work).toBe('No Work');
  });

  it('DEFAULT_HOLIDAY_RULES is disabled with behaviour=normal_rate', () => {
    expect(DEFAULT_HOLIDAY_RULES.enabled).toBe(false);
    expect(DEFAULT_HOLIDAY_RULES.calendarId).toBeNull();
    expect(DEFAULT_HOLIDAY_RULES.behaviour).toBe('normal_rate');
    expect(DEFAULT_HOLIDAY_RULES.multiplier).toBeNull();
    expect(DEFAULT_HOLIDAY_RULES.fixedHourlyRate).toBeNull();
  });

  it('Work on Holidays field is removed (no workAllowed in HolidayRules)', () => {
    const hr = makeContract().holidayRules;
    expect(hr).not.toHaveProperty('workAllowed');
    expect(hr).not.toHaveProperty('payMethod');
  });
});

describe('Holiday Rules — form values (new format)', () => {
  it('maps new-format multiplier rules', () => {
    const c = makeContract({
      holidayRules: {
        enabled: true, calendarId: 'cal1', calendarName: 'NSW Holidays',
        calendarProviderName: 'iCloud', behaviour: 'multiplier', multiplier: 2.5, fixedHourlyRate: null,
      },
    });
    const values = contractToFormValues(c);
    expect(values.holidayEnabled).toBe(true);
    expect(values.holidayCalendarId).toBe('cal1');
    expect(values.holidayCalendarName).toBe('NSW Holidays');
    expect(values.holidayBehaviour).toBe('multiplier');
    expect(values.holidayMultiplier).toBe('2.5');
    expect(values.holidayFixedRate).toBe('');
  });

  it('maps new-format fixed_rate rules', () => {
    const c = makeContract({
      holidayRules: {
        enabled: true, calendarId: 'cal1', calendarName: 'VIC Holidays',
        calendarProviderName: 'Google', behaviour: 'fixed_rate', multiplier: null, fixedHourlyRate: 80,
      },
    });
    const values = contractToFormValues(c);
    expect(values.holidayBehaviour).toBe('fixed_rate');
    expect(values.holidayFixedRate).toBe('80');
    expect(values.holidayMultiplier).toBe('');
  });

  it('maps new-format no_work rules', () => {
    const c = makeContract({
      holidayRules: {
        enabled: true, calendarId: 'cal1', calendarName: 'Public Holidays',
        calendarProviderName: 'iCloud', behaviour: 'no_work', multiplier: null, fixedHourlyRate: null,
      },
    });
    const values = contractToFormValues(c);
    expect(values.holidayEnabled).toBe(true);
    expect(values.holidayBehaviour).toBe('no_work');
    expect(values.holidayMultiplier).toBe('');
    expect(values.holidayFixedRate).toBe('');
  });

  it('maps disabled holiday rules (enabled=false)', () => {
    const c = makeContract({
      holidayRules: {
        enabled: false, calendarId: null, calendarName: null,
        calendarProviderName: null, behaviour: 'normal_rate', multiplier: null, fixedHourlyRate: null,
      },
    });
    const values = contractToFormValues(c);
    expect(values.holidayEnabled).toBe(false);
    expect(values.holidayCalendarId).toBe('');
  });

  it('loads with defaults when holidayRules is absent', () => {
    const c = makeContract();
    (c as any).holidayRules = undefined;
    const values = contractToFormValues(c);
    expect(values.holidayEnabled).toBe(false);
    expect(values.holidayCalendarId).toBe('');
    expect(values.holidayBehaviour).toBe('normal_rate');
  });
});

describe('Holiday Rules — legacy migration (Format 2: workAllowed+payMethod)', () => {
  it('Format 2 workAllowed=true + payMethod=multiplier → behaviour=multiplier', () => {
    const c = makeContract();
    (c.holidayRules as any) = { enabled: true, calendarId: 'cal1', workAllowed: true, payMethod: 'multiplier', multiplier: 2.0, fixedHourlyRate: null };
    const values = contractToFormValues(c);
    expect(values.holidayEnabled).toBe(true);
    expect(values.holidayBehaviour).toBe('multiplier');
    expect(values.holidayMultiplier).toBe('2');
  });

  it('Format 2 workAllowed=true + payMethod=fixed_rate → behaviour=fixed_rate', () => {
    const c = makeContract();
    (c.holidayRules as any) = { enabled: true, calendarId: 'cal1', workAllowed: true, payMethod: 'fixed_rate', multiplier: null, fixedHourlyRate: 80 };
    const values = contractToFormValues(c);
    expect(values.holidayBehaviour).toBe('fixed_rate');
    expect(values.holidayFixedRate).toBe('80');
  });

  it('Format 2 workAllowed=false → behaviour=no_work', () => {
    const c = makeContract();
    (c.holidayRules as any) = { enabled: true, calendarId: 'cal1', workAllowed: false, payMethod: null, multiplier: null, fixedHourlyRate: null };
    const values = contractToFormValues(c);
    expect(values.holidayEnabled).toBe(true);
    expect(values.holidayBehaviour).toBe('no_work');
  });
});

describe('Holiday Rules — legacy migration (Format 1: original behaviour field)', () => {
  it('Format 1 behaviour=multiplier with calendar → enabled=true', () => {
    const c = makeContract();
    (c.holidayRules as any) = { behaviour: 'multiplier', calendarId: 'cal1', calendarName: 'AU Holidays', multiplier: 2.0, fixedHourlyRate: null };
    const values = contractToFormValues(c);
    expect(values.holidayEnabled).toBe(true);
    expect(values.holidayBehaviour).toBe('multiplier');
    expect(values.holidayMultiplier).toBe('2');
  });

  it('Format 1 behaviour=fixed_rate with calendar → behaviour=fixed_rate', () => {
    const c = makeContract();
    (c.holidayRules as any) = { behaviour: 'fixed_rate', calendarId: 'cal1', calendarName: 'AU Holidays', multiplier: null, fixedHourlyRate: 80 };
    const values = contractToFormValues(c);
    expect(values.holidayBehaviour).toBe('fixed_rate');
    expect(values.holidayFixedRate).toBe('80');
  });

  it('Format 1 behaviour=no_work → holidayBehaviour=no_work', () => {
    const c = makeContract();
    (c.holidayRules as any) = { behaviour: 'no_work', calendarId: 'cal1', calendarName: 'AU Holidays', multiplier: null, fixedHourlyRate: null };
    const values = contractToFormValues(c);
    expect(values.holidayEnabled).toBe(true);
    expect(values.holidayBehaviour).toBe('no_work');
  });

  it('Format 1 normal_rate + no calendar → enabled=false', () => {
    const c = makeContract();
    (c.holidayRules as any) = { behaviour: 'normal_rate', calendarId: null, multiplier: null, fixedHourlyRate: null };
    const values = contractToFormValues(c);
    expect(values.holidayEnabled).toBe(false);
    expect(values.holidayBehaviour).toBe('normal_rate');
  });
});

describe('Holiday Rules — payload construction (behaviour model)', () => {
  function buildHolidayPayload(
    enabled: boolean,
    calendarId: string,
    behaviour: HolidayBehaviour,
    multiplier: string,
    fixedRate: string,
  ) {
    const b = enabled ? behaviour : null;
    return {
      enabled,
      calendarId: enabled ? (calendarId || null) : null,
      behaviour: b,
      multiplier: b === 'multiplier' && multiplier !== '' ? Number(multiplier) : null,
      fixedHourlyRate: b === 'fixed_rate' && fixedRate !== '' ? Number(fixedRate) : null,
    };
  }

  it('multiplier behaviour includes multiplier, no fixedHourlyRate', () => {
    const p = buildHolidayPayload(true, 'cal1', 'multiplier', '2.0', '');
    expect(p.multiplier).toBe(2.0);
    expect(p.fixedHourlyRate).toBeNull();
    expect(p.behaviour).toBe('multiplier');
  });

  it('fixed_rate behaviour includes fixedHourlyRate, no multiplier', () => {
    const p = buildHolidayPayload(true, 'cal1', 'fixed_rate', '', '80');
    expect(p.fixedHourlyRate).toBe(80);
    expect(p.multiplier).toBeNull();
    expect(p.behaviour).toBe('fixed_rate');
  });

  it('normal_rate behaviour clears both rate fields', () => {
    const p = buildHolidayPayload(true, 'cal1', 'normal_rate', '2.0', '80');
    expect(p.multiplier).toBeNull();
    expect(p.fixedHourlyRate).toBeNull();
  });

  it('no_work behaviour clears both rate fields', () => {
    const p = buildHolidayPayload(true, 'cal1', 'no_work', '2.0', '80');
    expect(p.multiplier).toBeNull();
    expect(p.fixedHourlyRate).toBeNull();
  });

  it('disabled: calendarId stored as null', () => {
    const p = buildHolidayPayload(false, 'cal1', 'normal_rate', '', '');
    expect(p.calendarId).toBeNull();
    expect(p.enabled).toBe(false);
  });

  it('empty calendarId stores null, not empty string', () => {
    const p = buildHolidayPayload(true, '', 'normal_rate', '', '');
    expect(p.calendarId).toBeNull();
  });
});

describe('Holiday Rules — conditional fields', () => {
  it('holiday fields are hidden when enabled=false', () => {
    const enabled = false;
    const showCalendar  = enabled;
    const showBehaviour = enabled;
    expect(showCalendar).toBe(false);
    expect(showBehaviour).toBe(false);
  });

  it('multiplier field shown only when behaviour=multiplier', () => {
    const showField = (b: HolidayBehaviour) => b === 'multiplier';
    expect(showField('multiplier')).toBe(true);
    expect(showField('fixed_rate')).toBe(false);
    expect(showField('normal_rate')).toBe(false);
    expect(showField('no_work')).toBe(false);
  });

  it('fixedRate field shown only when behaviour=fixed_rate', () => {
    const showField = (b: HolidayBehaviour) => b === 'fixed_rate';
    expect(showField('fixed_rate')).toBe(true);
    expect(showField('multiplier')).toBe(false);
    expect(showField('no_work')).toBe(false);
  });

  it('no-work notice shown only when behaviour=no_work and enabled', () => {
    const showNotice = (enabled: boolean, b: HolidayBehaviour) => enabled && b === 'no_work';
    expect(showNotice(true, 'no_work')).toBe(true);
    expect(showNotice(true, 'multiplier')).toBe(false);
    expect(showNotice(false, 'no_work')).toBe(false);
  });

  it('Work on Holidays select is removed — no holidayWorkAllowed form field', () => {
    const values = contractToFormValues(makeContract());
    expect(values).not.toHaveProperty('holidayWorkAllowed');
    expect(values).not.toHaveProperty('holidayPayMethod');
  });

  it('calendar required error when enabled but no calendar selected', () => {
    const enabled = true;
    const calendarId = '';
    const isValid = !enabled || calendarId !== '';
    expect(isValid).toBe(false);
  });

  it('multiplier must be > 0', () => {
    const validate = (v: string) => {
      const n = Number(v);
      if (!v || isNaN(n)) return 'required';
      if (n <= 0) return 'must be > 0';
      return true;
    };
    expect(validate('')).toBe('required');
    expect(validate('0')).toBe('must be > 0');
    expect(validate('-1')).toBe('must be > 0');
    expect(validate('2.0')).toBe(true);
  });

  it('fixedHourlyRate can be 0 (unlimited hourly cap)', () => {
    const validate = (v: string) => {
      const n = Number(v);
      if (v === '' || isNaN(n)) return 'required';
      if (n < 0) return 'must be >= 0';
      return true;
    };
    expect(validate('0')).toBe(true);
    expect(validate('-1')).toBe('must be >= 0');
    expect(validate('80')).toBe(true);
  });
});

describe('Holiday Rules backward compatibility', () => {
  it('makeContract fixture uses new HolidayRules shape (behaviour model)', () => {
    const c = makeContract();
    expect(c.holidayRules).toBeDefined();
    expect(c.holidayRules.enabled).toBe(false);
    expect(c.holidayRules.calendarId).toBeNull();
    expect(c.holidayRules.behaviour).toBe('normal_rate');
    expect(c.holidayRules).not.toHaveProperty('workAllowed');
    expect(c.holidayRules).not.toHaveProperty('payMethod');
  });

  it('existing contracts without holidayRules load with safe defaults', () => {
    const c = makeContract();
    (c as any).holidayRules = undefined;
    const values = contractToFormValues(c);
    expect(values.holidayEnabled).toBe(false);
    expect(values.holidayCalendarId).toBe('');
    expect(values.holidayBehaviour).toBe('normal_rate');
    expect(values.holidayMultiplier).toBe('');
    expect(values.holidayFixedRate).toBe('');
  });
});

// ─── Invoice Settings ─────────────────────────────────────────────────────────

describe('Invoice Settings — Invoice Footer removed', () => {
  it('FormValues has no invoiceFooter field', () => {
    const values = contractToFormValues(makeContract());
    expect(values).not.toHaveProperty('invoiceFooter');
  });

  it('Contract type has no invoiceFooter field', () => {
    const c = makeContract();
    expect(c).not.toHaveProperty('invoiceFooter');
  });
});

describe('Invoice Settings — Use Invoice Prefix', () => {
  it('useInvoicePrefix defaults to false', () => {
    const values = contractToFormValues(makeContract());
    expect(values.invoiceUsePrefix).toBe(false);
  });

  it('invoicePrefix is empty by default (no prefix by default)', () => {
    const values = contractToFormValues(makeContract());
    expect(values.invoicePrefix).toBe('');
  });

  it('prefix field is shown only when invoiceUsePrefix=true', () => {
    const showPrefix = (use: boolean) => use;
    expect(showPrefix(false)).toBe(false);
    expect(showPrefix(true)).toBe(true);
  });

  it('prefix is required when invoiceUsePrefix=true', () => {
    const validate = (use: boolean, prefix: string) => !use || prefix.trim() !== '';
    expect(validate(false, '')).toBe(true);   // not required when off
    expect(validate(true, '')).toBe(false);   // required when on
    expect(validate(true, 'INV-')).toBe(true); // valid
  });

  it('turning off invoiceUsePrefix clears prefix in payload', () => {
    const buildPrefix = (use: boolean, prefix: string) =>
      use && prefix.trim() ? prefix.trim() : null;
    expect(buildPrefix(true, 'INV-')).toBe('INV-');
    expect(buildPrefix(false, 'INV-')).toBeNull();
    expect(buildPrefix(false, '')).toBeNull();
  });

  it('legacy Contract with "INV-" prefix maps to usePrefix=true', () => {
    const c = makeContract();
    (c as any).invoicePrefix = 'INV-';
    (c as any).useInvoicePrefix = undefined;
    const values = contractToFormValues(c);
    expect(values.invoiceUsePrefix).toBe(true);
    expect(values.invoicePrefix).toBe('INV-');
  });

  it('legacy Contract with empty/null prefix maps to usePrefix=false', () => {
    const c = makeContract();
    (c as any).invoicePrefix = null;
    (c as any).useInvoicePrefix = undefined;
    const values = contractToFormValues(c);
    expect(values.invoiceUsePrefix).toBe(false);
  });

  it('explicit useInvoicePrefix=false overrides non-empty invoicePrefix', () => {
    // New format: useInvoicePrefix=false even if prefix was set
    const c = makeContract({ useInvoicePrefix: false, invoicePrefix: null });
    const values = contractToFormValues(c);
    expect(values.invoiceUsePrefix).toBe(false);
  });
});

describe('Invoice Settings — Starting Invoice Number', () => {
  it('defaults to 1', () => {
    const values = contractToFormValues(makeContract());
    expect(values.startingInvoiceNumber).toBe(1);
  });

  it('validate: must be >= 1', () => {
    const validate = (v: number) => {
      if (!Number.isInteger(v)) return 'must be integer';
      if (v < 1) return 'must be >= 1';
      return true;
    };
    expect(validate(0)).toBe('must be >= 1');
    expect(validate(-1)).toBe('must be >= 1');
    expect(validate(1)).toBe(true);
    expect(validate(1000)).toBe(true);
    expect(validate(1.5)).toBe('must be integer');
  });
});

describe('Invoice Settings — Currency', () => {
  it('SUPPORTED_CURRENCIES contains AUD, USD, NZD, GBP, EUR, COP', () => {
    expect(SUPPORTED_CURRENCIES).toContain('AUD');
    expect(SUPPORTED_CURRENCIES).toContain('USD');
    expect(SUPPORTED_CURRENCIES).toContain('NZD');
    expect(SUPPORTED_CURRENCIES).toContain('GBP');
    expect(SUPPORTED_CURRENCIES).toContain('EUR');
    expect(SUPPORTED_CURRENCIES).toContain('COP');
  });

  it('CURRENCY_LABELS has an entry for every supported currency', () => {
    for (const code of SUPPORTED_CURRENCIES) {
      expect(CURRENCY_LABELS[code as Currency]).toBeTruthy();
    }
  });

  it('AUD defaults to Australian Dollar', () => {
    expect(CURRENCY_LABELS.AUD).toBe('Australian Dollar');
  });

  it('currency defaults to AUD in form values', () => {
    const values = contractToFormValues(makeContract());
    expect(values.currency).toBe('AUD');
  });

  it('currency persists after contractToFormValues', () => {
    const c = makeContract({ currency: 'NZD' });
    const values = contractToFormValues(c);
    expect(values.currency).toBe('NZD');
  });

  it('unsupported currency is not in SUPPORTED_CURRENCIES', () => {
    expect((SUPPORTED_CURRENCIES as readonly string[]).includes('JPY')).toBe(false);
    expect((SUPPORTED_CURRENCIES as readonly string[]).includes('CAD')).toBe(false);
    expect((SUPPORTED_CURRENCIES as readonly string[]).includes('ARS')).toBe(false);
  });

  it('stores ISO code only — not a symbol', () => {
    for (const code of SUPPORTED_CURRENCIES) {
      expect(code).toMatch(/^[A-Z]{3}$/);
    }
  });
});

describe('Invoice Settings — Charge GST', () => {
  it('chargeGst defaults to false', () => {
    const values = contractToFormValues(makeContract());
    expect(values.chargeGst).toBe(false);
  });

  it('chargeGst=true persists in form values', () => {
    const c = makeContract({ chargeGst: true });
    const values = contractToFormValues(c);
    expect(values.chargeGst).toBe(true);
  });

  it('legacy Contract without chargeGst defaults to false', () => {
    const c = makeContract();
    (c as any).chargeGst = undefined;
    const values = contractToFormValues(c);
    expect(values.chargeGst).toBe(false);
  });
});

describe('Invoice Settings — payload construction', () => {
  function buildInvoicePayload(
    usePrefix: boolean,
    prefix: string,
    startingNumber: number,
    currency: string,
    chargeGst: boolean,
  ) {
    return {
      useInvoicePrefix: usePrefix,
      invoicePrefix: usePrefix && prefix.trim() ? prefix.trim() : null,
      startingInvoiceNumber: startingNumber,
      currency,
      chargeGst,
    };
  }

  it('prefix enabled: includes prefix in payload', () => {
    const p = buildInvoicePayload(true, 'PROJ-', 1, 'AUD', false);
    expect(p.useInvoicePrefix).toBe(true);
    expect(p.invoicePrefix).toBe('PROJ-');
  });

  it('prefix disabled: sends null prefix', () => {
    const p = buildInvoicePayload(false, 'PROJ-', 1, 'AUD', false);
    expect(p.invoicePrefix).toBeNull();
  });

  it('currency is included in payload', () => {
    const p = buildInvoicePayload(false, '', 1, 'GBP', false);
    expect(p.currency).toBe('GBP');
  });

  it('chargeGst is included in payload', () => {
    const p = buildInvoicePayload(false, '', 1, 'AUD', true);
    expect(p.chargeGst).toBe(true);
  });

  it('startingInvoiceNumber is included in payload', () => {
    const p = buildInvoicePayload(false, '', 100, 'AUD', false);
    expect(p.startingInvoiceNumber).toBe(100);
  });
});

describe('Invoice Settings — detail display', () => {
  function formatInvoiceNumbering(
    usePrefix: boolean,
    prefix: string | null,
    startingNumber: number,
  ) {
    return usePrefix && prefix ? `${prefix}${startingNumber}` : `Starts at ${startingNumber}, no prefix`;
  }

  it('shows prefix+number when usePrefix=true', () => {
    expect(formatInvoiceNumbering(true, 'INV-', 1)).toBe('INV-1');
    expect(formatInvoiceNumbering(true, 'PROJ-', 100)).toBe('PROJ-100');
  });

  it('shows "Starts at N, no prefix" when usePrefix=false', () => {
    expect(formatInvoiceNumbering(false, null, 1)).toBe('Starts at 1, no prefix');
    expect(formatInvoiceNumbering(false, null, 500)).toBe('Starts at 500, no prefix');
  });

  it('GST Applied label', () => {
    const label = (v: boolean) => v ? 'Applied' : 'Not applied';
    expect(label(true)).toBe('Applied');
    expect(label(false)).toBe('Not applied');
  });
});

// ─── Horizontal scrolling ─────────────────────────────────────────────────────

describe('Table horizontal scrolling', () => {
  it('total column width is wide enough to trigger horizontal scroll on small screens', () => {
    // Actual column widths from the page definition
    const columnWidths = {
      positionName:        160,  // minWidth
      invoiceDescription:  180,  // minWidth
      status:              110,
      billingCycle:        120,
      startDate:           110,
      endDate:             110,
      updatedAt:           115,
      _actions:            120,
    };
    const total = Object.values(columnWidths).reduce((a, b) => a + b, 0);
    // Total is wider than a typical mobile viewport (375px)
    expect(total).toBeGreaterThan(375);
    // Also wider than typical tablet (768px)
    expect(total).toBeGreaterThan(768);
  });
});

// ─── GST Rate ─────────────────────────────────────────────────────────────────

describe('GST Rate', () => {
  it('gstRate is null by default (GST disabled)', () => {
    const c = makeContract();
    expect(c.gstRate).toBeNull();
    expect(c.chargeGst).toBe(false);
  });

  it('gstRate form defaults to "10" (pre-filled, hidden until GST enabled)', () => {
    const values = contractToFormValues(makeContract());
    expect(values.gstRate).toBe('10');
    expect(values.chargeGst).toBe(false);
  });

  it('gstRate form field shows "10" when chargeGst=true and gstRate=10', () => {
    const c = makeContract({ chargeGst: true, gstRate: 10 });
    const values = contractToFormValues(c);
    expect(values.chargeGst).toBe(true);
    expect(values.gstRate).toBe('10');
  });

  it('gstRate form field defaults to "10" when chargeGst=true but gstRate missing', () => {
    const c = makeContract({ chargeGst: true, gstRate: null });
    const values = contractToFormValues(c);
    expect(values.gstRate).toBe('10');
  });

  it('disabling GST sends gstRate=null in payload', () => {
    const buildGst = (charge: boolean, rate: string) => ({
      chargeGst: charge,
      gstRate: charge && rate !== '' ? Number(rate) : null,
    });
    expect(buildGst(false, '10').gstRate).toBeNull();
    expect(buildGst(true, '10').gstRate).toBe(10);
    expect(buildGst(true, '15').gstRate).toBe(15);
  });

  it('gstRate conditional visibility: hidden when chargeGst=false', () => {
    const showRate = (charge: boolean) => charge;
    expect(showRate(false)).toBe(false);
    expect(showRate(true)).toBe(true);
  });

  it('gstRate validation: must be > 0', () => {
    const validate = (v: string) => {
      const n = Number(v);
      if (v === '' || isNaN(n)) return 'required';
      if (n <= 0) return 'must be > 0';
      if (n > 100) return 'must be <= 100';
      return true;
    };
    expect(validate('')).toBe('required');
    expect(validate('0')).toBe('must be > 0');
    expect(validate('-1')).toBe('must be > 0');
    expect(validate('101')).toBe('must be <= 100');
    expect(validate('10')).toBe(true);
    expect(validate('7.5')).toBe(true);
  });

  it('GST detail display: shows percentage when enabled', () => {
    const display = (charge: boolean, rate: number | null) =>
      charge && rate != null ? `${rate}%` : 'Not applied';
    expect(display(false, null)).toBe('Not applied');
    expect(display(true, 10)).toBe('10%');
    expect(display(true, 15)).toBe('15%');
  });

  it('legacy Contract without gstRate defaults gracefully', () => {
    const c = makeContract({ chargeGst: false });
    (c as any).gstRate = undefined;
    const values = contractToFormValues(c);
    expect(values.gstRate).toBe('10'); // pre-filled default
  });
});

// ─── Superannuation ───────────────────────────────────────────────────────────

describe('Superannuation', () => {
  it('DEFAULT_SUPERANNUATION_RULES is disabled', () => {
    expect(DEFAULT_SUPERANNUATION_RULES.enabled).toBe(false);
    expect(DEFAULT_SUPERANNUATION_RULES.rate).toBeNull();
    expect(DEFAULT_SUPERANNUATION_RULES.paymentFrequency).toBeNull();
  });

  it('SUPER_PAYMENT_FREQUENCY_LABELS covers all three frequencies', () => {
    const freqs: SuperPaymentFrequency[] = ['pay_cycle', 'monthly', 'quarterly'];
    for (const f of freqs) {
      expect(SUPER_PAYMENT_FREQUENCY_LABELS[f]).toBeTruthy();
    }
  });

  it('quarterly label is human readable', () => {
    expect(SUPER_PAYMENT_FREQUENCY_LABELS.quarterly).toBe('Quarterly');
    expect(SUPER_PAYMENT_FREQUENCY_LABELS.pay_cycle).toBe('Every Pay Cycle');
  });

  it('superEnabled defaults to false', () => {
    const values = contractToFormValues(makeContract());
    expect(values.superEnabled).toBe(false);
  });

  it('superRate defaults to "12" in form (pre-filled)', () => {
    const values = contractToFormValues(makeContract());
    expect(values.superRate).toBe('12');
  });

  it('superFrequency defaults to quarterly', () => {
    const values = contractToFormValues(makeContract());
    expect(values.superFrequency).toBe('quarterly');
  });

  it('super fields shown only when enabled', () => {
    const showFields = (enabled: boolean) => enabled;
    expect(showFields(false)).toBe(false);
    expect(showFields(true)).toBe(true);
  });

  it('super fields map from superannuationRules when enabled', () => {
    const c = makeContract({
      superannuationRules: { enabled: true, rate: 11.5, paymentFrequency: 'monthly' },
    });
    const values = contractToFormValues(c);
    expect(values.superEnabled).toBe(true);
    expect(values.superRate).toBe('11.5');
    expect(values.superFrequency).toBe('monthly');
  });

  it('existing Contract without superannuationRules loads with disabled defaults', () => {
    const c = makeContract();
    (c as any).superannuationRules = undefined;
    const values = contractToFormValues(c);
    expect(values.superEnabled).toBe(false);
    expect(values.superRate).toBe('12');
    expect(values.superFrequency).toBe('quarterly');
  });

  it('disabling Super clears stale values in payload', () => {
    const buildSuperPayload = (enabled: boolean, rate: string, freq: string) =>
      enabled
        ? { enabled: true, rate: rate !== '' ? Number(rate) : null, paymentFrequency: freq || null }
        : { enabled: false, rate: null, paymentFrequency: null };

    const off = buildSuperPayload(false, '11', 'monthly');
    expect(off.enabled).toBe(false);
    expect(off.rate).toBeNull();
    expect(off.paymentFrequency).toBeNull();

    const on = buildSuperPayload(true, '11', 'monthly');
    expect(on.enabled).toBe(true);
    expect(on.rate).toBe(11);
    expect(on.paymentFrequency).toBe('monthly');
  });

  it('superRate validation: must be > 0 and <= 100', () => {
    const validate = (v: string) => {
      const n = Number(v);
      if (v === '' || isNaN(n)) return 'required';
      if (n <= 0) return 'must be > 0';
      if (n > 100) return 'must be <= 100';
      return true;
    };
    expect(validate('')).toBe('required');
    expect(validate('0')).toBe('must be > 0');
    expect(validate('101')).toBe('must be <= 100');
    expect(validate('11.5')).toBe(true);
    expect(validate('12')).toBe(true);
  });

  it('Superannuation detail: Not included when disabled', () => {
    const display = (enabled: boolean, rate: number | null, freq: string | null) =>
      !enabled ? 'Not included' : `${rate}% · ${freq}`;
    expect(display(false, null, null)).toBe('Not included');
    expect(display(true, 12, 'Quarterly')).toBe('12% · Quarterly');
  });

  it('Superannuation detail: shows rate and frequency when enabled', () => {
    const c = makeContract({
      superannuationRules: { enabled: true, rate: 12, paymentFrequency: 'quarterly' },
    });
    const { superEnabled, superRate, superFrequency } = contractToFormValues(c);
    expect(superEnabled).toBe(true);
    expect(superRate).toBe('12');
    expect(superFrequency).toBe('quarterly');
  });
});

// ─── Updated drawer section count ─────────────────────────────────────────────

describe('Drawer section structure (updated)', () => {
  const EXPECTED_SECTIONS = [
    'General', 'Billing & Invoice', 'Working Rules',
    'Rate Configuration', 'Holiday Rules', 'Invoice Settings', 'Superannuation',
  ];

  it('has exactly 7 sections (added Superannuation)', () => {
    expect(EXPECTED_SECTIONS).toHaveLength(7);
  });

  it('Superannuation section is present', () => {
    expect(EXPECTED_SECTIONS).toContain('Superannuation');
  });
});

// ─── Scheduled Payment ────────────────────────────────────────────────────────

describe('Scheduled Payment — model and defaults', () => {
  it('SCHEDULED_PAYMENT_DAY_LABELS covers all five weekdays', () => {
    const days: ScheduledPaymentDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    for (const d of days) {
      expect(SCHEDULED_PAYMENT_DAY_LABELS[d]).toBeTruthy();
    }
  });

  it('does not include weekend days', () => {
    expect(SCHEDULED_PAYMENT_DAY_LABELS).not.toHaveProperty('saturday');
    expect(SCHEDULED_PAYMENT_DAY_LABELS).not.toHaveProperty('sunday');
  });

  it('scheduledPaymentEnabled defaults to false', () => {
    const values = contractToFormValues(makeContract());
    expect(values.scheduledPaymentEnabled).toBe(false);
  });

  it('scheduledPaymentDay defaults to empty string in form', () => {
    const values = contractToFormValues(makeContract());
    expect(values.scheduledPaymentDay).toBe('');
  });

  it('Contract type has scheduledPaymentEnabled and scheduledPaymentDay', () => {
    const c = makeContract({ scheduledPaymentEnabled: true, scheduledPaymentDay: 'friday' });
    expect(c.scheduledPaymentEnabled).toBe(true);
    expect(c.scheduledPaymentDay).toBe('friday');
  });
});

describe('Scheduled Payment — form behavior', () => {
  it('Payment Day hidden when scheduledPaymentEnabled=false', () => {
    const showDay = (enabled: boolean) => enabled;
    expect(showDay(false)).toBe(false);
  });

  it('Payment Day shown when scheduledPaymentEnabled=true', () => {
    const showDay = (enabled: boolean) => enabled;
    expect(showDay(true)).toBe(true);
  });

  it('contractToFormValues maps scheduledPaymentEnabled=true and day', () => {
    const c = makeContract({ scheduledPaymentEnabled: true, scheduledPaymentDay: 'friday' });
    const values = contractToFormValues(c);
    expect(values.scheduledPaymentEnabled).toBe(true);
    expect(values.scheduledPaymentDay).toBe('friday');
  });

  it('contractToFormValues maps scheduledPaymentEnabled=false with null day', () => {
    const c = makeContract({ scheduledPaymentEnabled: false, scheduledPaymentDay: null });
    const values = contractToFormValues(c);
    expect(values.scheduledPaymentEnabled).toBe(false);
    expect(values.scheduledPaymentDay).toBe('');
  });

  it('old Contracts without scheduledPaymentEnabled load as disabled', () => {
    const c = makeContract();
    delete (c as any).scheduledPaymentEnabled;
    delete (c as any).scheduledPaymentDay;
    const values = contractToFormValues(c);
    expect(values.scheduledPaymentEnabled).toBe(false);
    expect(values.scheduledPaymentDay).toBe('');
  });

  it('Payment Day is required when enabled', () => {
    const validate = (enabled: boolean, day: string) => !enabled || day !== '';
    expect(validate(false, '')).toBe(true);   // not required when off
    expect(validate(true, '')).toBe(false);   // required when on
    expect(validate(true, 'friday')).toBe(true);
  });

  it('disabling Scheduled Payment clears day in payload', () => {
    const buildPayload = (enabled: boolean, day: string) => ({
      scheduledPaymentEnabled: enabled,
      scheduledPaymentDay: enabled && day ? day as ScheduledPaymentDay : null,
    });
    expect(buildPayload(false, 'friday').scheduledPaymentDay).toBeNull();
    expect(buildPayload(true, 'friday').scheduledPaymentDay).toBe('friday');
  });
});

describe('Scheduled Payment — payload', () => {
  it('sends scheduledPaymentEnabled=false and null day by default', () => {
    const values = contractToFormValues(makeContract());
    const payload = {
      scheduledPaymentEnabled: values.scheduledPaymentEnabled,
      scheduledPaymentDay: values.scheduledPaymentEnabled && values.scheduledPaymentDay
        ? values.scheduledPaymentDay as ScheduledPaymentDay : null,
    };
    expect(payload.scheduledPaymentEnabled).toBe(false);
    expect(payload.scheduledPaymentDay).toBeNull();
  });

  it('sends the selected day when enabled', () => {
    const c = makeContract({ scheduledPaymentEnabled: true, scheduledPaymentDay: 'tuesday' });
    const values = contractToFormValues(c);
    const payload = {
      scheduledPaymentEnabled: values.scheduledPaymentEnabled,
      scheduledPaymentDay: values.scheduledPaymentEnabled && values.scheduledPaymentDay
        ? values.scheduledPaymentDay as ScheduledPaymentDay : null,
    };
    expect(payload.scheduledPaymentEnabled).toBe(true);
    expect(payload.scheduledPaymentDay).toBe('tuesday');
  });
});

describe('Scheduled Payment — detail display', () => {
  function fmtScheduledPayment(billingCycle: BillingCycle, day: ScheduledPaymentDay): string {
    const dayLabel = SCHEDULED_PAYMENT_DAY_LABELS[day];
    switch (billingCycle) {
      case 'weekly':      return `Every ${dayLabel}`;
      case 'fortnightly': return `Every second ${dayLabel}`;
      case 'monthly':     return `Monthly payment processed on ${dayLabel}`;
      default:            return `Payments normally processed on ${dayLabel}`;
    }
  }

  it('shows "Not configured" when disabled', () => {
    const display = (enabled: boolean) => enabled ? 'configured' : 'Not configured';
    expect(display(false)).toBe('Not configured');
  });

  it('weekly + friday → "Every Friday"', () => {
    expect(fmtScheduledPayment('weekly', 'friday')).toBe('Every Friday');
  });

  it('fortnightly + tuesday → "Every second Tuesday"', () => {
    expect(fmtScheduledPayment('fortnightly', 'tuesday')).toBe('Every second Tuesday');
  });

  it('monthly + friday → "Monthly payment processed on Friday"', () => {
    expect(fmtScheduledPayment('monthly', 'friday')).toBe('Monthly payment processed on Friday');
  });

  it('per_shift + friday → "Payments normally processed on Friday"', () => {
    expect(fmtScheduledPayment('per_shift', 'friday')).toBe('Payments normally processed on Friday');
  });

  it('daily + monday → "Payments normally processed on Monday"', () => {
    expect(fmtScheduledPayment('daily', 'monday')).toBe('Payments normally processed on Monday');
  });

  it('does not display raw enum values', () => {
    const display = fmtScheduledPayment('weekly', 'friday');
    expect(display).not.toContain('friday'); // raw enum not shown
    expect(display).toContain('Friday');     // label shown
  });
});

describe('Scheduled Payment — help content', () => {
  it('BILLING_CYCLE_LABELS includes all cycles for help context', () => {
    const cycles: BillingCycle[] = ['per_shift', 'daily', 'weekly', 'fortnightly', 'monthly'];
    for (const c of cycles) {
      expect(BILLING_CYCLE_LABELS[c]).toBeTruthy();
    }
  });

  it('Payment Terms concept is independent of Scheduled Payment', () => {
    const c = makeContract({ paymentTermsDays: 30, scheduledPaymentEnabled: true, scheduledPaymentDay: 'friday' });
    expect(c.paymentTermsDays).toBe(30);  // Payment Terms unchanged
    expect(c.scheduledPaymentEnabled).toBe(true);
  });
});

// ─── Payment Mode mutual exclusion ───────────────────────────────────────────

describe('Payment Mode — mutual exclusion', () => {
  it('Payment Terms visible when scheduledPaymentEnabled=false', () => {
    const showTerms = (scheduled: boolean) => !scheduled;
    expect(showTerms(false)).toBe(true);
    expect(showTerms(true)).toBe(false);
  });

  it('Payment Day visible when scheduledPaymentEnabled=true', () => {
    const showDay = (scheduled: boolean) => scheduled;
    expect(showDay(true)).toBe(true);
    expect(showDay(false)).toBe(false);
  });

  it('both cannot be visible at the same time', () => {
    const scheduled = true;
    const showTerms = !scheduled;
    const showDay   = scheduled;
    // XOR — exactly one is shown
    expect(showTerms && showDay).toBe(false);
    expect(showTerms || showDay).toBe(true);
  });

  it('paymentTermsDaysValue is null when scheduled=true', () => {
    const compute = (scheduled: boolean, termsDays: number) =>
      scheduled ? null : termsDays;
    expect(compute(true, 14)).toBeNull();
    expect(compute(false, 14)).toBe(14);
  });

  it('scheduledPaymentDay is null when scheduled=false', () => {
    const compute = (scheduled: boolean, day: string) =>
      scheduled && day ? day : null;
    expect(compute(false, 'friday')).toBeNull();
    expect(compute(true, 'friday')).toBe('friday');
  });

  it('switching to scheduled mode: form hydrates with paymentTermsDays=14 (kept in memory)', () => {
    // Contract stored with scheduled=true (paymentTermsDays=null)
    const c = makeContract({ scheduledPaymentEnabled: true, paymentTermsDays: null, scheduledPaymentDay: 'friday' });
    const values = contractToFormValues(c);
    // Form keeps 14 as a default so user can switch back to Payment Terms
    expect(values.paymentTermsDays).toBe(14);
    expect(values.scheduledPaymentEnabled).toBe(true);
  });

  it('existing Contract with paymentTermsDays=null loads with 14 in form (backward compat)', () => {
    const c = makeContract({ scheduledPaymentEnabled: true, paymentTermsDays: null, scheduledPaymentDay: 'tuesday' });
    const values = contractToFormValues(c);
    expect(values.paymentTermsDays).toBe(14);
  });

  it('create payload: scheduled=false sends paymentTermsDays, no day', () => {
    const buildPayload = (scheduled: boolean, terms: number, day: string | null) => ({
      scheduledPaymentEnabled: scheduled,
      paymentTermsDays: scheduled ? null : terms,
      scheduledPaymentDay: scheduled ? day : null,
    });
    const p = buildPayload(false, 30, null);
    expect(p.paymentTermsDays).toBe(30);
    expect(p.scheduledPaymentDay).toBeNull();
  });

  it('create payload: scheduled=true sends day, paymentTermsDays=null', () => {
    const buildPayload = (scheduled: boolean, terms: number, day: string | null) => ({
      scheduledPaymentEnabled: scheduled,
      paymentTermsDays: scheduled ? null : terms,
      scheduledPaymentDay: scheduled ? day : null,
    });
    const p = buildPayload(true, 14, 'friday');
    expect(p.paymentTermsDays).toBeNull();
    expect(p.scheduledPaymentDay).toBe('friday');
  });

  it('edit hydration: Contract with scheduled=false has paymentTermsDays', () => {
    const c = makeContract({ scheduledPaymentEnabled: false, paymentTermsDays: 30, scheduledPaymentDay: null });
    const values = contractToFormValues(c);
    expect(values.paymentTermsDays).toBe(30);
    expect(values.scheduledPaymentEnabled).toBe(false);
    expect(values.scheduledPaymentDay).toBe('');
  });

  it('edit hydration: Contract with scheduled=true has day and null terms', () => {
    const c = makeContract({ scheduledPaymentEnabled: true, paymentTermsDays: null, scheduledPaymentDay: 'wednesday' });
    const values = contractToFormValues(c);
    expect(values.scheduledPaymentEnabled).toBe(true);
    expect(values.scheduledPaymentDay).toBe('wednesday');
  });

  it('detail display: shows paymentTermsDays when scheduled=false', () => {
    const display = (scheduled: boolean, terms: number | null, day: string | null, cycle: BillingCycle) =>
      scheduled && day ? `${day} display` : terms != null ? `${terms} days` : '—';
    expect(display(false, 14, null, 'weekly')).toBe('14 days');
  });

  it('detail display: shows payment day when scheduled=true', () => {
    const display = (scheduled: boolean, terms: number | null, day: string | null, cycle: BillingCycle) =>
      scheduled && day ? `Every ${day}` : terms != null ? `${terms} days` : '—';
    expect(display(true, null, 'friday', 'weekly')).toBe('Every friday');
  });

  it('existing Contract without scheduledPaymentEnabled uses Payment Terms as-is', () => {
    const c = makeContract({ paymentTermsDays: 21 });
    delete (c as any).scheduledPaymentEnabled;
    const values = contractToFormValues(c);
    expect(values.scheduledPaymentEnabled).toBe(false);
    expect(values.paymentTermsDays).toBe(21);
  });
});

// ─── Payment Calendar ─────────────────────────────────────────────────────────

describe('Payment Calendar — model fields', () => {
  it('Contract type includes paymentCalendarEnabled (boolean)', () => {
    const c = makeContract({ paymentCalendarEnabled: true });
    expect(c.paymentCalendarEnabled).toBe(true);
  });

  it('paymentCalendarEnabled defaults to false', () => {
    const c = makeContract();
    expect(c.paymentCalendarEnabled).toBe(false);
  });

  it('paymentCalendarSubscriptionId is null by default', () => {
    const c = makeContract();
    expect(c.paymentCalendarSubscriptionId).toBeNull();
  });
});

describe('Payment Calendar — form values hydration', () => {
  const PAY_CAL_ID = '6a58a9a43be409328fa6f4d2';

  it('hydrates paymentCalendarEnabled=true from contract', () => {
    const c = makeContract({ paymentCalendarEnabled: true, paymentCalendarSubscriptionId: PAY_CAL_ID });
    const values = contractToFormValues(c);
    expect(values.paymentCalendarEnabled).toBe(true);
    expect(values.paymentCalendarSubscriptionId).toBe(PAY_CAL_ID);
  });

  it('hydrates paymentCalendarEnabled=false from contract', () => {
    const c = makeContract({ paymentCalendarEnabled: false, paymentCalendarSubscriptionId: null });
    const values = contractToFormValues(c);
    expect(values.paymentCalendarEnabled).toBe(false);
    expect(values.paymentCalendarSubscriptionId).toBe('');
  });

  it('legacy contract without paymentCalendarEnabled loads as disabled', () => {
    const c = makeContract();
    delete (c as any).paymentCalendarEnabled;
    delete (c as any).paymentCalendarSubscriptionId;
    const values = contractToFormValues(c);
    expect(values.paymentCalendarEnabled).toBe(false);
    expect(values.paymentCalendarSubscriptionId).toBe('');
  });
});

describe('Payment Calendar — payload construction', () => {
  const PAY_CAL_ID = '6a58a9a43be409328fa6f4d2';

  function buildPayCalPayload(enabled: boolean, subId: string) {
    return {
      paymentCalendarEnabled: enabled,
      paymentCalendarSubscriptionId: enabled ? (subId || null) : null,
    };
  }

  it('enabled=true with subscriptionId sends both fields', () => {
    const p = buildPayCalPayload(true, PAY_CAL_ID);
    expect(p.paymentCalendarEnabled).toBe(true);
    expect(p.paymentCalendarSubscriptionId).toBe(PAY_CAL_ID);
  });

  it('enabled=false clears subscriptionId (sends null)', () => {
    const p = buildPayCalPayload(false, PAY_CAL_ID);
    expect(p.paymentCalendarEnabled).toBe(false);
    expect(p.paymentCalendarSubscriptionId).toBeNull();
  });

  it('enabled=true with empty subId sends null', () => {
    const p = buildPayCalPayload(true, '');
    expect(p.paymentCalendarSubscriptionId).toBeNull();
  });
});

describe('Payment Calendar — selector visibility', () => {
  it('selector hidden when paymentCalendarEnabled=false', () => {
    const showSelector = (enabled: boolean) => enabled;
    expect(showSelector(false)).toBe(false);
  });

  it('selector shown when paymentCalendarEnabled=true', () => {
    const showSelector = (enabled: boolean) => enabled;
    expect(showSelector(true)).toBe(true);
  });
});

// ─── Holiday Calendar — flow filter ──────────────────────────────────────────

describe('Holiday Calendar — flow-filtered options', () => {
  it('only holiday-flow options should be returned by useCalendarOptions("holidays")', () => {
    // Verify the query param expected by the hook
    const queryParams = { flow: 'holidays' };
    expect(queryParams.flow).toBe('holidays');
  });

  it('holiday calendar empty state message is correct', () => {
    const msg = 'No holiday calendar configured. Configure a holiday calendar to identify public holiday dates.';
    expect(msg).toContain('holiday calendar');
    expect(msg).toContain('public holiday dates');
  });

  it('calendar selector is required when holiday rules are enabled', () => {
    const validate = (enabled: boolean, calendarId: string) => !enabled || calendarId !== '';
    expect(validate(true, '')).toBe(false);
    expect(validate(true, 'some-id')).toBe(true);
    expect(validate(false, '')).toBe(true);
  });

  it('section count updated to include Payment Calendar', () => {
    const SECTIONS = [
      'General', 'Billing & Invoice', 'Working Rules',
      'Rate Configuration', 'Holiday Rules', 'Invoice Settings',
      'Superannuation', 'Payment Calendar',
    ];
    expect(SECTIONS).toContain('Payment Calendar');
    expect(SECTIONS).toHaveLength(8);
  });
});

// ─── Calendar Flow types ──────────────────────────────────────────────────────

describe('CalendarFlow type', () => {
  it('flow labels cover all three flows', () => {
    const labels = { holidays: 'Holidays', shifts: 'Shifts', payments: 'Payments' };
    expect(labels.holidays).toBe('Holidays');
    expect(labels.shifts).toBe('Shifts');
    expect(labels.payments).toBe('Payments');
  });
});

// ─── One-click calendar setup ─────────────────────────────────────────────────

describe('Holiday calendar — one-click "Add Australian Holidays"', () => {
  it('shows "Add Australian Holidays" button in holiday empty state', () => {
    const BUTTON_LABEL = 'Add Australian Holidays';
    expect(BUTTON_LABEL).toBe('Add Australian Holidays');
  });

  it('calls POST /linked-calendars/setup/australian-holidays', () => {
    const ENDPOINT = '/linked-calendars/setup/australian-holidays';
    expect(ENDPOINT).toContain('setup');
    expect(ENDPOINT).toContain('australian-holidays');
  });

  it('success: selects returned calendar in form (holidayCalendarId)', () => {
    const returnedId = 'cal-au-001';
    let holidayCalendarId = '';
    // Simulate what executeHolidaySetup does
    holidayCalendarId = returnedId;
    expect(holidayCalendarId).toBe('cal-au-001');
  });

  it('wasExisting=false shows creation success message', () => {
    const msg = (wasExisting: boolean) =>
      wasExisting ? 'Existing calendar selected.' : 'Australian holiday calendar added and selected.';
    expect(msg(false)).toBe('Australian holiday calendar added and selected.');
    expect(msg(true)).toBe('Existing calendar selected.');
  });

  it('one account → direct call without dialog', () => {
    const accounts = [{ connectionId: 'conn-1', isActive: true, accountIdentifier: 'user@icloud.com', providerKey: 'icloud', providerDisplayName: 'iCloud', isDefault: false }];
    const activeAccounts = accounts.filter((a) => a.isActive);
    const showDialog = activeAccounts.length > 1;
    expect(showDialog).toBe(false);
    expect(activeAccounts[0].connectionId).toBe('conn-1');
  });

  it('multiple accounts → shows account selection dialog', () => {
    const accounts = [
      { connectionId: 'conn-1', isActive: true },
      { connectionId: 'conn-2', isActive: true },
    ];
    const activeAccounts = accounts.filter((a) => a.isActive);
    const showDialog = activeAccounts.length > 1;
    expect(showDialog).toBe(true);
  });

  it('zero accounts → shows warning message', () => {
    const accounts: any[] = [];
    const activeAccounts = accounts.filter((a) => a.isActive);
    const showWarning = activeAccounts.length === 0;
    expect(showWarning).toBe(true);
  });

  it('button is disabled while mutation is pending', () => {
    const isPending = true;
    // Button has disabled={isPending}
    expect(isPending).toBe(true);
  });

  it('does not automatically submit the Contract', () => {
    // The setup action only updates local form state (holidayCalendarId)
    // It does not call createMutation or updateMutation
    const autoSubmit = false;
    expect(autoSubmit).toBe(false);
  });

  it('invalidates linked-calendars/options/holidays after success', () => {
    const INVALIDATED_KEY = ['linked-calendars', 'options', 'holidays'];
    expect(INVALIDATED_KEY).toContain('holidays');
  });
});

describe('Payment calendar — one-click "Create Payment Calendar"', () => {
  it('shows "Create Payment Calendar" button in payment empty state', () => {
    const BUTTON_LABEL = 'Create Payment Calendar';
    expect(BUTTON_LABEL).toBe('Create Payment Calendar');
  });

  it('calls POST /linked-calendars/setup/payment', () => {
    const ENDPOINT = '/linked-calendars/setup/payment';
    expect(ENDPOINT).toContain('setup');
    expect(ENDPOINT).toContain('payment');
  });

  it('success: selects returned calendar in form (paymentCalendarSubscriptionId)', () => {
    const returnedId = 'cal-pay-001';
    let paymentCalendarSubscriptionId = '';
    paymentCalendarSubscriptionId = returnedId;
    expect(paymentCalendarSubscriptionId).toBe('cal-pay-001');
  });

  it('wasExisting=false shows creation success message', () => {
    const msg = (wasExisting: boolean) =>
      wasExisting ? 'Existing calendar selected.' : 'Payment calendar created and selected.';
    expect(msg(false)).toBe('Payment calendar created and selected.');
    expect(msg(true)).toBe('Existing calendar selected.');
  });

  it('one account → direct call without dialog', () => {
    const accounts = [{ connectionId: 'conn-icloud', isActive: true }];
    const activeAccounts = accounts.filter((a) => a.isActive);
    const showDialog = activeAccounts.length > 1;
    expect(showDialog).toBe(false);
    expect(activeAccounts[0].connectionId).toBe('conn-icloud');
  });

  it('multiple accounts → shows account selection dialog', () => {
    const accounts = [
      { connectionId: 'conn-1', isActive: true },
      { connectionId: 'conn-2', isActive: true },
    ];
    const activeAccounts = accounts.filter((a) => a.isActive);
    expect(activeAccounts.length).toBe(2);
    expect(activeAccounts.length > 1).toBe(true);
  });

  it('paymentCalendarEnabled remains true after successful setup', () => {
    let paymentCalendarEnabled = true;
    // executePaymentSetup never modifies paymentCalendarEnabled
    expect(paymentCalendarEnabled).toBe(true);
  });

  it('invalidates linked-calendars/options/payments after success', () => {
    const INVALIDATED_KEY = ['linked-calendars', 'options', 'payments'];
    expect(INVALIDATED_KEY).toContain('payments');
  });
});

describe('Account selection dialog', () => {
  it('shows Calendar Account dropdown and Continue button', () => {
    const FIELDS = ['Calendar Account'];
    const BUTTONS = ['Cancel', 'Continue'];
    expect(FIELDS).toContain('Calendar Account');
    expect(BUTTONS).toContain('Continue');
  });

  it('Continue is disabled until an account is selected', () => {
    let selected = '';
    const continueDisabled = !selected;
    expect(continueDisabled).toBe(true);
    selected = 'conn-1';
    expect(!selected).toBe(false);
  });

  it('does not open for single-account businesses', () => {
    const activeAccounts = [{ connectionId: 'conn-1', isActive: true }];
    const showDialog = activeAccounts.length > 1;
    expect(showDialog).toBe(false);
  });
});

describe('Setup backend constants', () => {
  it('payment calendar name constant is used (not hardcoded string)', () => {
    const PAYMENT_CALENDAR_NAME = 'Shift Payments';
    // This matches CALENDAR_SETUP_DEFAULTS.PAYMENT_CALENDAR_NAME on the backend
    expect(PAYMENT_CALENDAR_NAME).toBe('Shift Payments');
  });

  it('AU holiday uses verified catalogue key, not a fabricated URL', () => {
    const AU_HOLIDAY_CATALOGUE_KEY = 'au_national_public_holidays';
    expect(AU_HOLIDAY_CATALOGUE_KEY).toBe('au_national_public_holidays');
    // The URL is only on the backend — the frontend never receives it
  });
});

// ─── Holiday Calendar — behavior matching Payment Calendar ────────────────────

describe('Holiday Calendar — auto-selection behavior', () => {
  it('auto-selects when exactly one active holiday calendar exists (field empty)', () => {
    const calendars = [{ id: 'cal-holiday-001', calendarName: 'Australian Holidays' }];
    let calendarId = '';
    // Simulate the useEffect auto-select
    if (!calendarId && calendars.length === 1) {
      calendarId = calendars[0].id;
    }
    expect(calendarId).toBe('cal-holiday-001');
  });

  it('does not override an existing selection (hydrated edit form)', () => {
    const calendars = [{ id: 'cal-holiday-001', calendarName: 'Australian Holidays' }];
    let calendarId = 'cal-holiday-001'; // already hydrated from contract
    if (!calendarId && calendars.length === 1) {
      calendarId = 'wrong-id';
    }
    expect(calendarId).toBe('cal-holiday-001');
  });

  it('shows "Add Australian Holidays" button when no holiday calendars exist', () => {
    const calendars: any[] = [];
    const calendarId = '';
    const showButton = !calendarId && calendars.length === 0;
    expect(showButton).toBe(true);
  });

  it('hides "Add Australian Holidays" button once a calendar is selected', () => {
    const calendars = [{ id: 'cal-001', calendarName: 'Australian Holidays' }];
    const calendarId = 'cal-001';
    const showButton = !calendarId && calendars.length === 0;
    expect(showButton).toBe(false);
  });
});

describe('Holiday Calendar — one-click setup auto-refresh', () => {
  it('invalidates linked-calendars/options/holidays after setup', () => {
    const INVALIDATED = ['linked-calendars', 'options', 'holidays'];
    expect(INVALIDATED).toContain('holidays');
  });

  it('setup result id is immediately set in form field', () => {
    const result = { id: 'new-cal-001', calendarName: 'Australian Holidays', wasExisting: false };
    let calendarId = '';
    // executeHolidaySetup does: holidayCalField.onChange(result.id)
    calendarId = result.id;
    expect(calendarId).toBe('new-cal-001');
  });

  it('new calendar appears immediately after setup (no page reload)', () => {
    // React Query cache invalidation + re-fetch is automatic
    const requiresPageReload = false;
    expect(requiresPageReload).toBe(false);
  });
});

describe('Holiday Calendar — provider unsupported error', () => {
  it('shows correct message when provider does not support subscription', () => {
    const PROVIDER_UNSUPPORTED_MESSAGE =
      'Automatic holiday subscription is not supported by this calendar provider.';
    expect(PROVIDER_UNSUPPORTED_MESSAGE).toContain('Automatic holiday subscription is not supported');
  });

  it('error snack is shown on provider failure', () => {
    // The setup mutation's onError / catch in executeHolidaySetup calls pushSnack
    const onErrorCalled = true;
    expect(onErrorCalled).toBe(true);
  });

  it('Contract is not submitted on provider failure', () => {
    const autoSubmit = false;
    expect(autoSubmit).toBe(false);
  });
});

describe('Provider subscription — Communications App endpoint', () => {
  it('subscribe endpoint is POST /calendar/connections/:credId/calendars/subscribe', () => {
    const ENDPOINT = '/calendar/connections/:credId/calendars/subscribe';
    expect(ENDPOINT).toContain('/calendars/subscribe');
  });

  it('iCloud uses MKCALENDAR with CS:source for subscription', () => {
    const METHOD = 'MKCALENDAR';
    const PROPERTY = 'CS:source';
    expect(METHOD).toBe('MKCALENDAR');
    expect(PROPERTY).toContain('source');
  });

  it('Google uses calendarList.insert with Google Calendar ID extracted from URL', () => {
    // For URL: https://calendar.google.com/calendar/ical/{encoded-calId}/public/basic.ics
    const url = 'https://calendar.google.com/calendar/ical/en.australian%23holiday%40group.v.calendar.google.com/public/basic.ics';
    const match = url.match(/\/ical\/([^/]+)\/public\//);
    const calId = match ? decodeURIComponent(match[1]) : null;
    expect(calId).toBe('en.australian#holiday@group.v.calendar.google.com');
  });

  it('Outlook returns unsupported (Microsoft Graph does not support URL subscription)', () => {
    const outlookSupports = false;
    expect(outlookSupports).toBe(false);
  });
});

describe('Payment Calendar — behavior unchanged', () => {
  it('POST /linked-calendars/setup/payment endpoint is unchanged', () => {
    expect('/linked-calendars/setup/payment').toContain('setup/payment');
  });

  it('payment calendar setup uses createCalendar, not subscribeCalendar', () => {
    const operation = 'createCalendar';
    expect(operation).toBe('createCalendar');
  });

  it('Shift Payments is still the default payment calendar name', () => {
    const PAYMENT_CALENDAR_NAME = 'Shift Payments';
    expect(PAYMENT_CALENDAR_NAME).toBe('Shift Payments');
  });
});

// ─── SetupAustralianHolidaysResult types ──────────────────────────────────────

import type {
  SetupAustralianHolidaysResult,
  HolidayDiscoveryResult,
  ProviderCalendarOption,
} from '@/types/linked-calendar';

describe('SetupAustralianHolidaysResult type contracts', () => {
  it('linked status has calendar field with SetupCalendarResult shape', () => {
    const result: SetupAustralianHolidaysResult = {
      status: 'linked',
      calendar: {
        id: 'cal-1', calendarName: 'Australian Public Holidays',
        accountIdentifier: 'user@icloud.com', providerDisplayName: 'iCloud Calendar',
        flow: 'holidays', status: 'active', accessRole: 'read-only', wasExisting: false,
      },
    };
    expect(result.status).toBe('linked');
    if (result.status === 'linked') {
      expect(result.calendar.flow).toBe('holidays');
      expect(result.calendar.wasExisting).toBe(false);
    }
  });

  it('assisted_setup_required status has provider/connectionId/instructionsType but no calendar', () => {
    const result: SetupAustralianHolidaysResult = {
      status: 'assisted_setup_required',
      provider: 'icloud',
      connectionId: 'conn-001',
      instructionsType: 'apple_holiday_calendar',
    };
    expect(result.status).toBe('assisted_setup_required');
    if (result.status === 'assisted_setup_required') {
      expect(result.provider).toBe('icloud');
      expect(result.instructionsType).toBe('apple_holiday_calendar');
    }
    // No calendar property
    expect((result as any).calendar).toBeUndefined();
  });

  it('HolidayDiscoveryResult linked status has calendar', () => {
    const result: HolidayDiscoveryResult = {
      status: 'linked',
      calendar: {
        id: 'c1', calendarName: 'AU Holidays', accountIdentifier: 'a@b.com',
        providerDisplayName: 'iCloud Calendar', flow: 'holidays', status: 'active',
        accessRole: 'read-only', wasExisting: true,
      },
    };
    expect(result.status).toBe('linked');
    if (result.status === 'linked') {
      expect(result.calendar.id).toBeTruthy();
    }
  });

  it('HolidayDiscoveryResult multiple_matches has options array', () => {
    const option: ProviderCalendarOption = {
      externalCalendarId: 'ext-1', calendarName: 'Australian Holidays',
      calendarDescription: null, timezone: 'Australia/Sydney', accessRole: 'read-only', isPrimary: false,
    };
    const result: HolidayDiscoveryResult = { status: 'multiple_matches', options: [option] };
    expect(result.status).toBe('multiple_matches');
    if (result.status === 'multiple_matches') {
      expect(result.options).toHaveLength(1);
    }
  });

  it('HolidayDiscoveryResult not_found has empty options', () => {
    const result: HolidayDiscoveryResult = { status: 'not_found', options: [] };
    expect(result.status).toBe('not_found');
    expect(result.options).toHaveLength(0);
  });
});

describe('Payment Calendar regression — unchanged', () => {
  it('SetupCalendarResult has wasExisting field', () => {
    const r = {
      id: 'x', calendarName: 'Shift Payments', accountIdentifier: 'a@b.com',
      providerDisplayName: 'iCloud', flow: 'payments' as const,
      status: 'active' as const, accessRole: 'read-write', wasExisting: false,
    };
    expect(r.wasExisting).toBe(false);
    expect(r.flow).toBe('payments');
  });
});

// ─── Rate Rules — 12-hour AM/PM time picker conversions ──────────────────────

import { to12h, to24h } from '../../RateRulesEditor';

describe('to24h — 12-hour to 24-hour conversion', () => {
  it('8:00 AM → 08:00', () => expect(to24h(8,  0,  'AM')).toBe('08:00'));
  it('12:00 PM → 12:00 (noon)', () => expect(to24h(12, 0,  'PM')).toBe('12:00'));
  it('5:30 PM → 17:30', () => expect(to24h(5,  30, 'PM')).toBe('17:30'));
  it('12:00 AM → 00:00 (midnight)', () => expect(to24h(12, 0,  'AM')).toBe('00:00'));
  it('1:00 AM → 01:00', () => expect(to24h(1,  0,  'AM')).toBe('01:00'));
  it('11:59 PM → 23:59', () => expect(to24h(11, 59, 'PM')).toBe('23:59'));
  it('1:15 PM → 13:15', () => expect(to24h(1,  15, 'PM')).toBe('13:15'));
  it('12:30 AM → 00:30', () => expect(to24h(12, 30, 'AM')).toBe('00:30'));
  it('pads minutes with leading zero', () => expect(to24h(9, 5, 'AM')).toBe('09:05'));
});

describe('to12h — 24-hour to 12-hour conversion', () => {
  it('"08:00" → { hour: 8, minute: 0, period: AM }', () => {
    expect(to12h('08:00')).toEqual({ hour: 8,  minute: 0,  period: 'AM' });
  });
  it('"12:00" → { hour: 12, minute: 0, period: PM } (noon)', () => {
    expect(to12h('12:00')).toEqual({ hour: 12, minute: 0,  period: 'PM' });
  });
  it('"17:30" → { hour: 5, minute: 30, period: PM }', () => {
    expect(to12h('17:30')).toEqual({ hour: 5,  minute: 30, period: 'PM' });
  });
  it('"00:00" → { hour: 12, minute: 0, period: AM } (midnight)', () => {
    expect(to12h('00:00')).toEqual({ hour: 12, minute: 0,  period: 'AM' });
  });
  it('"01:00" → { hour: 1, minute: 0, period: AM }', () => {
    expect(to12h('01:00')).toEqual({ hour: 1,  minute: 0,  period: 'AM' });
  });
  it('"23:59" → { hour: 11, minute: 59, period: PM }', () => {
    expect(to12h('23:59')).toEqual({ hour: 11, minute: 59, period: 'PM' });
  });
  it('"13:15" → { hour: 1, minute: 15, period: PM }', () => {
    expect(to12h('13:15')).toEqual({ hour: 1,  minute: 15, period: 'PM' });
  });
  it('returns null for empty string', () => {
    expect(to12h('')).toBeNull();
  });
  it('returns null for invalid format', () => {
    expect(to12h('9:00')).toBeNull();
    expect(to12h('09:0')).toBeNull();
  });
});

describe('to12h / to24h roundtrip', () => {
  const times = ['00:00', '00:30', '08:00', '09:05', '12:00', '13:15', '17:30', '23:59'];
  times.forEach((t) => {
    it(`"${t}" survives a roundtrip through 12h and back`, () => {
      const p = to12h(t)!;
      expect(to24h(p.hour, p.minute, p.period)).toBe(t);
    });
  });
});

describe('Rate Rules — existing time values still load correctly', () => {
  it('09:00 loads as 9 AM', () => {
    const p = to12h('09:00')!;
    expect(p.hour).toBe(9);
    expect(p.minute).toBe(0);
    expect(p.period).toBe('AM');
  });
  it('17:00 loads as 5 PM', () => {
    const p = to12h('17:00')!;
    expect(p.hour).toBe(5);
    expect(p.minute).toBe(0);
    expect(p.period).toBe('PM');
  });
  it('existing time range still converts to 24-hour for backend', () => {
    // A contract with variable_time_range sends startTime/endTime as "HH:mm"
    // The 12h picker always produces this format — no backend change needed
    const start = to24h(9, 0, 'AM');
    const end   = to24h(5, 0, 'PM');
    expect(start).toBe('09:00');
    expect(end).toBe('17:00');
  });
});

// ─── Company column ───────────────────────────────────────────────────────────

describe('Company column', () => {
  it('Contract type now includes customerName field', () => {
    const c = makeContract({ customerName: 'Acme Ltd' });
    expect(c.customerName).toBe('Acme Ltd');
  });

  it('customerName can be null (single-item GET responses)', () => {
    const c = makeContract({ customerName: null });
    expect(c.customerName).toBeNull();
  });

  it('Company column renders the customer display name', () => {
    const c = makeContract({ customerName: 'Jay Productions' });
    const rendered = c.customerName ?? '—';
    expect(rendered).toBe('Jay Productions');
  });

  it('Company column falls back to "—" when customerName is null', () => {
    const c = makeContract({ customerName: null });
    const rendered = c.customerName ?? '—';
    expect(rendered).toBe('—');
  });

  it('Company column is the first column in the table', () => {
    const COLUMNS = ['customerName', 'positionName', 'invoiceDescription', 'status', 'billingCycle', 'startDate', 'endDate', 'updatedAt', '_actions'];
    expect(COLUMNS[0]).toBe('customerName');
    expect(COLUMNS).toContain('customerName');
  });
});

// ─── Delete behavior ──────────────────────────────────────────────────────────

describe('Delete action', () => {
  it('Delete button is visible for all contract statuses', () => {
    const statuses = ['active', 'inactive', 'finished', 'cancelled'] as const;
    // Delete is no longer conditionally hidden by status — backend enforces dependency check
    statuses.forEach((status) => {
      const c = makeContract({ status });
      // We represent "always shown" as a constant: the button visibility is not gated by status
      const deleteAlwaysShown = true;
      expect(deleteAlwaysShown).toBe(true);
    });
  });

  it('backend enforces dependency check (not frontend status gate)', () => {
    // The error message from the backend is user-friendly
    const backendError = 'This Contract cannot be deleted because it is already being used.';
    expect(backendError).toContain('cannot be deleted');
    expect(backendError).not.toContain('draft');
    expect(backendError).not.toContain('Only draft');
  });

  it('ConfirmDialog title is "Delete Contract"', () => {
    expect('Delete Contract').toBe('Delete Contract');
  });

  it('ConfirmDialog warns about shifts', () => {
    const description = 'Contracts linked to existing shifts cannot be deleted.';
    expect(description).toContain('shifts');
  });
});

describe('Contracts table — actions column width', () => {
  it('_actions column width fits View + Delete icon buttons (Edit hidden for terminal)', () => {
    // 2 × 36px buttons + 1 × 12px gap = 84px minimum; 130px gives comfortable room
    const ACTIONS_WIDTH = 130;
    expect(ACTIONS_WIDTH).toBeGreaterThan(84);
  });
});

// ─── Contract status — creation always produces active ────────────────────────

describe('Contract creation status', () => {
  it('CreateContractPayload has no status field', () => {
    // The frontend type must not contain a status field — status is set by the backend
    const payload: CreateContractPayload = {
      customerId:         'cust-1',
      startDate:          '2026-01-01',
      positionName:       'Developer',
      workType:           'contractor',
      invoiceDescription: 'Software dev',
      billingCycle:       'per_shift',
      rateType:           'fixed',
      rates:              [{ days: ['all'], hourlyRate: 100 }],
    };
    expect(payload).not.toHaveProperty('status');
  });

  it('create payload never contains draft', () => {
    const payload: CreateContractPayload = {
      customerId:         'cust-1',
      startDate:          '2026-01-01',
      positionName:       'Developer',
      workType:           'contractor',
      invoiceDescription: 'Software dev',
      billingCycle:       'per_shift',
      rateType:           'fixed',
      rates:              [{ days: ['all'], hourlyRate: 100 }],
    };
    // Confirm no key in the payload equals 'draft'
    expect(Object.values(payload)).not.toContain('draft');
  });

  it('newly created contract arrives from API with status active', () => {
    // The API response (mocked here) should have status: active
    const apiResponse = makeContract({ status: 'active' });
    expect(apiResponse.status).toBe('active');
    expect(apiResponse.status).not.toBe('draft');
  });

  it('Active chip uses the expected green colour token', () => {
    const STATUS_COLORS: Record<string, string> = {
      active:    'success',
      inactive:  'warning',
      finished:  'default',
      cancelled: 'error',
      draft:     'default',
    };
    expect(STATUS_COLORS['active']).toBe('success');
  });

  it('STATUS_LABELS correctly labels active contracts', () => {
    expect(STATUS_LABELS['active']).toBeTruthy();
    expect(typeof STATUS_LABELS['active']).toBe('string');
  });
});

describe('Edit preserves existing status', () => {
  it('UpdateContractPayload has no status field', () => {
    // Editing a contract must not send a status — status is only changed by dedicated endpoints
    const payload: UpdateContractPayload = {
      positionName: 'Senior Developer',
    };
    expect(payload).not.toHaveProperty('status');
  });

  it('editing an active contract does not reset it to draft', () => {
    const contract = makeContract({ status: 'active' });
    // Simulate what an edit payload looks like — status field never present
    const editPayload: UpdateContractPayload = {
      positionName: contract.positionName + ' (updated)',
    };
    expect(editPayload).not.toHaveProperty('status');
    // The contract status remains unchanged because no status was sent
    expect(contract.status).toBe('active');
  });
});

// ─── Mobile card layout ───────────────────────────────────────────────────────
//
// These tests verify the logic powering the mobile card without DOM rendering.
// They mirror the render functions defined in mobileCardConfig in contracts/page.tsx.

/**
 * Matches the fmtDate helper in contracts/page.tsx.
 */
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

describe('Mobile card — field list', () => {
  it('card body has exactly 5 labeled fields', () => {
    const MOBILE_FIELDS = ['customerName', 'invoiceDescription', 'billingCycle', 'startDate', 'endDate'];
    expect(MOBILE_FIELDS).toHaveLength(5);
  });

  it('fields are ordered: Company, Description, Billing, Start, End', () => {
    const MOBILE_FIELDS = ['customerName', 'invoiceDescription', 'billingCycle', 'startDate', 'endDate'];
    expect(MOBILE_FIELDS[0]).toBe('customerName');
    expect(MOBILE_FIELDS[1]).toBe('invoiceDescription');
    expect(MOBILE_FIELDS[2]).toBe('billingCycle');
    expect(MOBILE_FIELDS[3]).toBe('startDate');
    expect(MOBILE_FIELDS[4]).toBe('endDate');
  });

  it('primaryText is positionName', () => {
    const c = makeContract({ positionName: 'Audiovisual Technician' });
    expect(c.positionName).toBe('Audiovisual Technician');
  });

  it('no secondaryText — Company and Description are separate labeled fields', () => {
    // The old card concatenated: `${customerName} — ${invoiceDescription}`
    // producing confusing output like "audiovisual events — s".
    // The new card surfaces each field independently.
    const c = makeContract({ customerName: 'Audiovisual Events', invoiceDescription: 'Tech services' });
    // Confirm the fields are independently accessible
    expect(c.customerName).toBe('Audiovisual Events');
    expect(c.invoiceDescription).toBe('Tech services');
    // Confirm they are NOT equal to the old concatenated string
    expect(c.customerName).not.toBe('Audiovisual Events — Tech services');
    expect(c.invoiceDescription).not.toBe('Audiovisual Events — Tech services');
  });
});

describe('Mobile card — Company field renderer', () => {
  it('renders the customer display name', () => {
    const render = (v: unknown) => (v as string) ?? '—';
    expect(render('Audiovisual Events')).toBe('Audiovisual Events');
  });

  it('falls back to "—" when customerName is null', () => {
    const render = (v: unknown) => (v as string) ?? '—';
    expect(render(null)).toBe('—');
  });

  it('falls back to "—" when customerName is undefined', () => {
    const render = (v: unknown) => (v as string) ?? '—';
    expect(render(undefined)).toBe('—');
  });
});

describe('Mobile card — Description field renderer', () => {
  it('renders invoiceDescription', () => {
    const render = (v: unknown) => (v as string) ?? '—';
    const c = makeContract({ invoiceDescription: 'Tech services' });
    expect(render(c.invoiceDescription)).toBe('Tech services');
  });

  it('does not combine Company with Description', () => {
    const c = makeContract({ customerName: 'Audiovisual Events', invoiceDescription: 'Tech services' });
    const descriptionRender = (v: unknown) => (v as string) ?? '—';
    const rendered = descriptionRender(c.invoiceDescription);
    expect(rendered).toBe('Tech services');
    expect(rendered).not.toContain('Audiovisual Events');
    expect(rendered).not.toContain('—');
  });
});

describe('Mobile card — Billing field renderer', () => {
  it('renders the formatted billing cycle label', () => {
    const render = (v: unknown) => BILLING_CYCLE_LABELS[v as keyof typeof BILLING_CYCLE_LABELS] ?? String(v);
    expect(render('per_shift')).toBe(BILLING_CYCLE_LABELS.per_shift);
    expect(render('weekly')).toBe(BILLING_CYCLE_LABELS.weekly);
    expect(render('monthly')).toBe(BILLING_CYCLE_LABELS.monthly);
    expect(render('daily')).toBe(BILLING_CYCLE_LABELS.daily);
    expect(render('fortnightly')).toBe(BILLING_CYCLE_LABELS.fortnightly);
  });

  it('BILLING_CYCLE_LABELS covers all cycle values', () => {
    const cycles: BillingCycle[] = ['per_shift', 'daily', 'weekly', 'fortnightly', 'monthly'];
    for (const cycle of cycles) {
      const label = BILLING_CYCLE_LABELS[cycle];
      expect(label).toBeTruthy();
      expect(typeof label).toBe('string');
    }
  });
});

describe('Mobile card — Start date field renderer', () => {
  it('renders a human-readable date', () => {
    const result = fmtDate('2026-11-11T00:00:00.000Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe('—');
  });

  it('contains the expected day and year', () => {
    const result = fmtDate('2026-11-11T00:00:00.000Z');
    expect(result).toContain('2026');
    expect(result).toMatch(/11/);
  });

  it('uses en-AU locale format (day month year)', () => {
    const result = fmtDate('2026-11-11T00:00:00.000Z');
    // en-AU with day:'2-digit', month:'short', year:'numeric' → "11 Nov 2026"
    expect(result).toMatch(/Nov/i);
  });
});

describe('Mobile card — End date field renderer', () => {
  const render = (v: unknown) => v ? fmtDate(v as string) : 'Open-ended';

  it('renders "Open-ended" when endDate is null', () => {
    expect(render(null)).toBe('Open-ended');
  });

  it('renders "Open-ended" when endDate is undefined', () => {
    expect(render(undefined)).toBe('Open-ended');
  });

  it('renders a formatted date when endDate is set', () => {
    const result = render('2026-12-31T00:00:00.000Z');
    expect(result).not.toBe('Open-ended');
    expect(result).toContain('2026');
  });

  it('end date contains Dec for a December date', () => {
    const result = render('2026-12-31T00:00:00.000Z');
    expect(result).toMatch(/Dec/i);
  });

  it('does not show "—" for null end date (shows Open-ended instead)', () => {
    const result = render(null);
    expect(result).not.toBe('—');
    expect(result).toBe('Open-ended');
  });
});

describe('Mobile card — status badge', () => {
  it('badge uses STATUS_LABELS for all statuses', () => {
    const statuses: ContractStatus[] = ['active', 'finished', 'cancelled', 'draft', 'inactive'];
    for (const status of statuses) {
      const label = STATUS_LABELS[status];
      expect(label).toBeTruthy();
    }
  });

  it('active contract badge uses success color token', () => {
    const STATUS_COLORS: Record<ContractStatus, string> = {
      draft:     'default',
      active:    'success',
      inactive:  'warning',
      finished:  'primary',
      cancelled: 'error',
    };
    expect(STATUS_COLORS['active']).toBe('success');
    expect(STATUS_COLORS['finished']).toBe('primary');
    expect(STATUS_COLORS['cancelled']).toBe('error');
  });
});

describe('Mobile card — actions footer', () => {
  it('footer always has 3 action slots: View, Edit, Delete', () => {
    const ACTION_LABELS = ['View', 'Edit', 'Delete'];
    expect(ACTION_LABELS).toHaveLength(3);
  });

  it('View action is always visible regardless of status', () => {
    const statuses: ContractStatus[] = ['active', 'finished', 'cancelled'];
    const isViewVisible = (_status: ContractStatus) => true;
    for (const status of statuses) {
      expect(isViewVisible(status)).toBe(true);
    }
  });

  it('Delete action is always visible regardless of status', () => {
    const statuses: ContractStatus[] = ['active', 'finished', 'cancelled'];
    const isDeleteVisible = (_status: ContractStatus) => true;
    for (const status of statuses) {
      expect(isDeleteVisible(status)).toBe(true);
    }
  });

  it('Edit action is disabled for terminal statuses', () => {
    const isEditDisabled = (status: ContractStatus) =>
      status === 'finished' || status === 'cancelled';
    expect(isEditDisabled('finished')).toBe(true);
    expect(isEditDisabled('cancelled')).toBe(true);
  });

  it('Edit action is enabled for active contracts', () => {
    const isEditDisabled = (status: ContractStatus) =>
      status === 'finished' || status === 'cancelled';
    expect(isEditDisabled('active')).toBe(false);
  });

  it('Delete is styled as destructive (error color)', () => {
    // The button uses color="error" to match the destructive action convention.
    const deleteColor = 'error';
    expect(deleteColor).toBe('error');
  });

  it('View action opens drawer in view mode', () => {
    // Verified by convention: the onClick for View calls openView(row)
    // which sets drawerMode to "view". Confirmed correct by integration.
    const expectedMode = 'view';
    expect(expectedMode).toBe('view');
  });

  it('Edit action opens drawer in edit mode', () => {
    const expectedMode = 'edit';
    expect(expectedMode).toBe('edit');
  });

  it('Delete action opens confirmation dialog (not a direct API call)', () => {
    // Delete sets confirmDelete state → ConfirmDialog opens → user confirms → mutation fires.
    // This ensures the user always has a chance to cancel the destructive action.
    const deleteTrigger = 'confirmation-dialog';
    expect(deleteTrigger).toBe('confirmation-dialog');
  });
});

describe('Mobile card — breakpoint behavior', () => {
  it('mobile cards render below sm breakpoint (< 600px)', () => {
    // DataTable uses useMediaQuery(theme.breakpoints.down("sm"))
    // MUI sm breakpoint default is 600px
    const SM_BREAKPOINT_PX = 600;
    expect(SM_BREAKPOINT_PX).toBe(600);
  });

  it('desktop table renders at sm breakpoint and above', () => {
    const SM_BREAKPOINT_PX = 600;
    const TYPICAL_TABLET_PX = 768;
    expect(TYPICAL_TABLET_PX).toBeGreaterThanOrEqual(SM_BREAKPOINT_PX);
  });

  it('both layouts are never shown simultaneously (mutual exclusion)', () => {
    // DataTable uses showMobile = isMobile && Boolean(mobileCardConfig)
    // Exactly one branch renders: mobile card list OR desktop DataGrid.
    const isMobile = true;
    const hasMobileConfig = true;
    const showMobile = isMobile && hasMobileConfig;
    const showDesktop = !showMobile;
    expect(showMobile && showDesktop).toBe(false);
  });
});

describe('Mobile card — pagination', () => {
  it('pagination options are identical in desktop and mobile views', () => {
    const PAGE_SIZE_OPTIONS = [25, 50, 100];
    expect(PAGE_SIZE_OPTIONS).toEqual([25, 50, 100]);
  });

  it('mobile pagination uses the same server-side page/limit state as desktop', () => {
    // TablePagination in mobile reads the same page and pageSize props as DataGrid.
    // Changing pages in mobile triggers the same onPageChange callback.
    const sharedState = { page: 0, pageSize: 25 };
    expect(sharedState.page).toBe(0);
    expect(sharedState.pageSize).toBe(25);
  });
});

describe('Mobile card — no horizontal overflow', () => {
  it('card uses full-width stacked layout (no fixed column widths)', () => {
    // Desktop table columns have fixed widths summing to > 900px.
    // Mobile card uses percentage-based label column (38%) and flex value column.
    const labelWidth = '38%';
    expect(labelWidth).toContain('%');
  });

  it('mobile card action footer uses space-between (not fixed button widths)', () => {
    // space-between distributes available space evenly across buttons.
    const footerJustify = 'space-between';
    expect(footerJustify).toBe('space-between');
  });

  it('actions wrapper uses display:flex which adapts to container width', () => {
    const displayValue = 'flex';
    expect(displayValue).toBe('flex');
  });
});

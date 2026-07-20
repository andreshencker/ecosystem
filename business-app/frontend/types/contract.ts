export type ContractStatus = 'draft' | 'active' | 'inactive' | 'finished' | 'cancelled';

// ─── Work Type ────────────────────────────────────────────────────────────────

export type WorkType =
  | 'casual'
  | 'contractor'
  | 'subcontractor'
  | 'service_agreement'
  | 'project_based'
  | 'other';

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  casual:            'Casual',
  contractor:        'Contractor',
  subcontractor:     'Subcontractor',
  service_agreement: 'Service Agreement',
  project_based:     'Project-based',
  other:             'Other',
};

// ─── Scheduled Payment ───────────────────────────────────────────────────────

export type ScheduledPaymentDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

export const SCHEDULED_PAYMENT_DAY_LABELS: Record<ScheduledPaymentDay, string> = {
  monday:    'Monday',
  tuesday:   'Tuesday',
  wednesday: 'Wednesday',
  thursday:  'Thursday',
  friday:    'Friday',
};

// ─── Holiday Rules types ──────────────────────────────────────────────────────

/**
 * Unified holiday behaviour replacing the old workAllowed + payMethod split.
 * no_work     → work is not allowed on holiday dates
 * normal_rate → work allowed at the normal contract rate
 * multiplier  → work allowed; multiply normal rate by `multiplier`
 * fixed_rate  → work allowed; replace normal rate with `fixedHourlyRate`
 */
export type HolidayBehaviour = 'normal_rate' | 'multiplier' | 'fixed_rate' | 'no_work';

export const HOLIDAY_BEHAVIOUR_LABELS: Record<HolidayBehaviour, string> = {
  normal_rate: 'Normal Rate',
  multiplier:  'Multiplier',
  fixed_rate:  'Fixed Rate',
  no_work:     'No Work',
};

export interface HolidayRules {
  enabled:              boolean;
  calendarId:           string | null;
  calendarName:         string | null;
  calendarProviderName: string | null;
  behaviour:            HolidayBehaviour | null;
  multiplier:           number | null;
  fixedHourlyRate:      number | null;
}

export const DEFAULT_HOLIDAY_RULES: HolidayRules = {
  enabled:              false,
  calendarId:           null,
  calendarName:         null,
  calendarProviderName: null,
  behaviour:            'normal_rate',
  multiplier:           null,
  fixedHourlyRate:      null,
};

// ─── Superannuation types ─────────────────────────────────────────────────────

export type SuperPaymentFrequency = 'pay_cycle' | 'monthly' | 'quarterly';

export const SUPER_PAYMENT_FREQUENCY_LABELS: Record<SuperPaymentFrequency, string> = {
  pay_cycle: 'Every Pay Cycle',
  monthly:   'Monthly',
  quarterly: 'Quarterly',
};

export interface SuperannuationRules {
  enabled:          boolean;
  rate:             number | null;
  paymentFrequency: SuperPaymentFrequency | null;
}

export const DEFAULT_SUPERANNUATION_RULES: SuperannuationRules = {
  enabled:          false,
  rate:             null,
  paymentFrequency: null,
};

// ─── Currency ─────────────────────────────────────────────────────────────────

export const SUPPORTED_CURRENCIES = ['AUD', 'USD', 'NZD', 'GBP', 'EUR', 'COP'] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_LABELS: Record<Currency, string> = {
  AUD: 'Australian Dollar',
  USD: 'United States Dollar',
  NZD: 'New Zealand Dollar',
  GBP: 'British Pound',
  EUR: 'Euro',
  COP: 'Colombian Peso',
};

// ─── Payment Terms presets ────────────────────────────────────────────────────

export const PAYMENT_TERMS_OPTIONS: { value: number; label: string }[] = [
  { value: 0,  label: 'Immediately' },
  { value: 7,  label: '7 Days' },
  { value: 14, label: '14 Days' },
  { value: 21, label: '21 Days' },
  { value: 28, label: '28 Days' },
  { value: 30, label: '30 Days' },
  { value: 45, label: '45 Days' },
  { value: 60, label: '60 Days' },
];

export type BillingCycle =
  | 'per_shift'
  | 'daily'
  | 'weekly'
  | 'fortnightly'
  | 'monthly';

export type RateType = 'fixed' | 'variable' | 'variable_time_range';

export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  per_shift:   'Per Shift',
  daily:       'Daily',
  weekly:      'Weekly',
  fortnightly: 'Fortnightly',
  monthly:     'Monthly',
};

export const STATUS_LABELS: Record<ContractStatus, string> = {
  draft:     'Draft',
  active:    'Active',
  inactive:  'Inactive',
  finished:  'Finished',
  cancelled: 'Cancelled',
};

export const RATE_DAY_OPTIONS = [
  { value: 'all',       label: 'All days' },
  { value: 'monday',    label: 'Monday' },
  { value: 'tuesday',   label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday',  label: 'Thursday' },
  { value: 'friday',    label: 'Friday' },
  { value: 'saturday',  label: 'Saturday' },
  { value: 'sunday',    label: 'Sunday' },
] as const;

export interface RateRule {
  days:        string[];
  startTime:   string | null;
  endTime:     string | null;
  hourlyRate:  number;
}

export interface Contract {
  id:                     string;
  businessId:             string;
  customerId:             string;
  /** Customer display name. Present on list responses; null on single-item gets. */
  customerName:           string | null;
  startDate:              string;
  endDate:                string | null;
  positionName:           string;
  /** Commercial/work relationship type. Default: 'contractor' for legacy records. */
  workType:               WorkType;
  invoiceDescription:     string;
  status:                 ContractStatus;
  billingCycle:            BillingCycle;
  /** null when scheduledPaymentEnabled is true */
  paymentTermsDays:        number | null;
  scheduledPaymentEnabled: boolean;
  scheduledPaymentDay:     ScheduledPaymentDay | null;
  rateType:               RateType;
  minimumHours:           number;
  defaultBreakMinutes:    number;
  rates:                  RateRule[];
  notes:                  string | null;
  useInvoicePrefix:       boolean;
  invoicePrefix:          string | null;
  startingInvoiceNumber:  number;
  currency:               string;
  chargeGst:              boolean;
  gstRate:                number | null;
  holidayRules:           HolidayRules;
  superannuationRules:    SuperannuationRules;
  /** Whether expected payment dates should be tracked in a calendar. Default: false. */
  paymentCalendarEnabled:          boolean;
  /** References LinkedCalendar id with flow='payments'. null when disabled. */
  paymentCalendarSubscriptionId:   string | null;
  createdAt:              string;
  updatedAt:              string;
}

export interface ContractListResponse {
  items: Contract[];
  total: number;
  page:  number;
  limit: number;
}

export interface RateRulePayload {
  days:       string[];
  startTime?: string | null;
  endTime?:   string | null;
  hourlyRate: number;
}

export interface CreateContractPayload {
  customerId:               string;
  startDate:                string;
  endDate?:                 string;
  positionName:             string;
  workType?:                WorkType;
  invoiceDescription:       string;
  billingCycle:             BillingCycle;
  paymentTermsDays?:        number | null;
  scheduledPaymentEnabled?: boolean;
  scheduledPaymentDay?:     ScheduledPaymentDay | null;
  rateType:                 RateType;
  minimumHours?:            number;
  defaultBreakMinutes?:     number;
  rates:                    RateRulePayload[];
  notes?:                   string;
  useInvoicePrefix?:        boolean;
  invoicePrefix?:           string | null;
  startingInvoiceNumber?:   number;
  currency?:                string;
  chargeGst?:               boolean;
  gstRate?:                 number | null;
  holidayRules?:            Partial<HolidayRules>;
  superannuationRules?:     Partial<SuperannuationRules>;
  paymentCalendarEnabled?:         boolean;
  paymentCalendarSubscriptionId?:  string | null;
}

export interface UpdateContractPayload {
  startDate?:               string;
  endDate?:                 string | null;
  positionName?:            string;
  workType?:                WorkType;
  invoiceDescription?:      string;
  billingCycle?:            BillingCycle;
  paymentTermsDays?:        number | null;
  scheduledPaymentEnabled?: boolean;
  scheduledPaymentDay?:     ScheduledPaymentDay | null;
  rateType?:                RateType;
  minimumHours?:            number;
  defaultBreakMinutes?:     number;
  rates?:                   RateRulePayload[];
  notes?:                   string;
  useInvoicePrefix?:        boolean;
  invoicePrefix?:           string | null;
  startingInvoiceNumber?:   number;
  currency?:                string;
  chargeGst?:               boolean;
  gstRate?:                 number | null;
  holidayRules?:            Partial<HolidayRules>;
  superannuationRules?:     Partial<SuperannuationRules>;
  paymentCalendarEnabled?:         boolean;
  paymentCalendarSubscriptionId?:  string | null;
}

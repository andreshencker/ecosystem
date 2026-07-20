import type {
  ContractDocument,
  RateRule,
  ContractStatus,
  BillingCycle,
  RateType,
  WorkType,
  HolidayBehaviour,
  SuperPaymentFrequency,
  ScheduledPaymentDay,
} from '../schemas/contract.schema';

export interface HolidayRulesResponseDto {
  enabled:              boolean;
  calendarId:           string | null;
  calendarName:         string | null;
  calendarProviderName: string | null;
  behaviour:            HolidayBehaviour | null;
  multiplier:           number | null;
  fixedHourlyRate:      number | null;
}

export interface SuperannuationRulesResponseDto {
  enabled:          boolean;
  rate:             number | null;
  paymentFrequency: SuperPaymentFrequency | null;
}

export interface RateRuleResponseDto {
  days: string[];
  startTime: string | null;
  endTime: string | null;
  hourlyRate: number;
}

export interface ContractResponseDto {
  id: string;
  businessId: string;
  customerId: string;
  /** Display name of the associated customer. Populated on list responses; null on single-item gets. */
  customerName: string | null;
  startDate: string;
  endDate: string | null;
  positionName: string;
  /** Commercial/work relationship type. Default: 'contractor' for legacy records. */
  workType: WorkType;
  invoiceDescription: string;
  status: ContractStatus;
  billingCycle: BillingCycle;
  /** null when scheduledPaymentEnabled is true */
  paymentTermsDays: number | null;
  scheduledPaymentEnabled: boolean;
  scheduledPaymentDay: ScheduledPaymentDay | null;
  rateType: RateType;
  minimumHours: number;
  defaultBreakMinutes: number;
  rates: RateRuleResponseDto[];
  notes: string | null;
  useInvoicePrefix: boolean;
  invoicePrefix: string | null;
  startingInvoiceNumber: number;
  currency: string;
  chargeGst: boolean;
  gstRate: number | null;
  holidayRules: HolidayRulesResponseDto;
  superannuationRules: SuperannuationRulesResponseDto;
  /** Whether expected payment dates should be tracked in a calendar. Default: false. */
  paymentCalendarEnabled: boolean;
  /** References LinkedCalendar._id with flow='payments'. null when disabled. */
  paymentCalendarSubscriptionId: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapRate(r: RateRule): RateRuleResponseDto {
  return {
    days: r.days,
    startTime: r.startTime ?? null,
    endTime: r.endTime ?? null,
    hourlyRate: r.hourlyRate,
  };
}

/**
 * Maps raw holiday rules from MongoDB, handling all three historical formats:
 *
 * Format 3 (current — this session): `enabled` + `behaviour`
 * Format 2 (previous session):       `enabled` + `workAllowed` + `payMethod`
 * Format 1 (original legacy):        `behaviour` without `enabled`
 */
function mapHolidayRules(hr: any): HolidayRulesResponseDto {
  if (!hr) {
    return {
      enabled: false, calendarId: null, calendarName: null,
      calendarProviderName: null, behaviour: 'normal_rate',
      multiplier: null, fixedHourlyRate: null,
    };
  }

  let enabled: boolean;
  let behaviour: HolidayBehaviour | null;

  if ('behaviour' in hr) {
    // Format 3 (new) or Format 1 (original legacy) — has `behaviour` field
    enabled = hr.enabled ?? (hr.calendarId != null);
    behaviour = hr.behaviour ?? 'normal_rate';
  } else {
    // Format 2 (intermediate) — has `payMethod` + `workAllowed`, not `behaviour`
    enabled = hr.enabled ?? false;
    const workAllowed: boolean = hr.workAllowed ?? true;
    const payMethod: string = hr.payMethod !== undefined ? hr.payMethod ?? 'normal_rate' : 'normal_rate';
    behaviour = !workAllowed ? 'no_work' : (payMethod as HolidayBehaviour);
  }

  return {
    enabled,
    calendarId:           hr.calendarId           ?? null,
    calendarName:         hr.calendarName         ?? null,
    calendarProviderName: hr.calendarProviderName ?? null,
    behaviour,
    multiplier:           hr.multiplier           ?? null,
    fixedHourlyRate:      hr.fixedHourlyRate      ?? null,
  };
}

function mapSuperannuationRules(sr: any): SuperannuationRulesResponseDto {
  if (!sr || !sr.enabled) {
    return { enabled: false, rate: null, paymentFrequency: null };
  }
  return {
    enabled:          true,
    rate:             sr.rate             ?? null,
    paymentFrequency: sr.paymentFrequency ?? null,
  };
}

export function toContractResponse(
  doc: ContractDocument | Record<string, any>,
): ContractResponseDto {
  const d = doc as any;
  const toISO = (v: any): string =>
    v instanceof Date ? v.toISOString() : String(v ?? '');

  return {
    id: String(d._id),
    businessId: d.businessId,
    customerId: d.customerId,
    customerName: d.customerName ?? null,
    startDate: toISO(d.startDate),
    endDate: d.endDate ? toISO(d.endDate) : null,
    positionName: d.positionName,
    workType: d.workType ?? 'contractor',
    invoiceDescription: d.invoiceDescription,
    status: d.status,
    billingCycle: d.billingCycle,
    paymentTermsDays: d.paymentTermsDays,
    scheduledPaymentEnabled: d.scheduledPaymentEnabled ?? false,
    scheduledPaymentDay: (d.scheduledPaymentEnabled ?? false) ? (d.scheduledPaymentDay ?? null) : null,
    rateType: d.rateType,
    minimumHours: d.minimumHours ?? 4,
    defaultBreakMinutes: d.defaultBreakMinutes ?? 30,
    rates: (d.rates ?? []).map(mapRate),
    notes: d.notes ?? null,
    // Backward compat: old docs without useInvoicePrefix infer it from invoicePrefix presence
    useInvoicePrefix: d.useInvoicePrefix ?? (d.invoicePrefix ? true : false),
    invoicePrefix: d.invoicePrefix ?? null,
    startingInvoiceNumber: d.startingInvoiceNumber ?? 1,
    currency: d.currency ?? 'AUD',
    chargeGst: d.chargeGst ?? false,
    gstRate: (d.chargeGst ?? false) ? (d.gstRate ?? null) : null,
    holidayRules: mapHolidayRules(d.holidayRules),
    superannuationRules: mapSuperannuationRules(d.superannuationRules),
    paymentCalendarEnabled: d.paymentCalendarEnabled ?? false,
    paymentCalendarSubscriptionId: (d.paymentCalendarEnabled ?? false)
      ? (d.paymentCalendarSubscriptionId ?? null)
      : null,
    createdAt: toISO(d.createdAt),
    updatedAt: toISO(d.updatedAt),
  };
}

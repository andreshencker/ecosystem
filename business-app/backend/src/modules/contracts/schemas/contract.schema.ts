import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// ─── Enums ────────────────────────────────────────────────────────────────────

export type ContractStatus = 'draft' | 'active' | 'inactive' | 'finished' | 'cancelled';

export type BillingCycle =
  | 'per_shift'
  | 'daily'
  | 'weekly'
  | 'fortnightly'
  | 'monthly';

export type RateType = 'fixed' | 'variable' | 'variable_time_range';

export type WorkType =
  | 'casual'
  | 'contractor'
  | 'subcontractor'
  | 'service_agreement'
  | 'project_based'
  | 'other';

export const VALID_WORK_TYPES: WorkType[] = [
  'casual',
  'contractor',
  'subcontractor',
  'service_agreement',
  'project_based',
  'other',
];

// ─── Scheduled Payment Day ────────────────────────────────────────────────────

export const SCHEDULED_PAYMENT_DAYS = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
] as const;
export type ScheduledPaymentDay = (typeof SCHEDULED_PAYMENT_DAYS)[number];

// ─── Currency ─────────────────────────────────────────────────────────────────

export const SUPPORTED_CURRENCIES = ['AUD', 'USD', 'NZD', 'GBP', 'EUR', 'COP'] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

// ─── Holiday Behaviour ────────────────────────────────────────────────────────
//
// 'no_work'     — work is not allowed on holiday dates
// 'normal_rate' — work allowed, pay at normal contract rate
// 'multiplier'  — work allowed, multiply normal rate by `multiplier`
// 'fixed_rate'  — work allowed, replace normal rate with `fixedHourlyRate`

export type HolidayBehaviour = 'normal_rate' | 'multiplier' | 'fixed_rate' | 'no_work';

export const VALID_HOLIDAY_BEHAVIOURS: HolidayBehaviour[] = [
  'normal_rate',
  'multiplier',
  'fixed_rate',
  'no_work',
];

// ─── Superannuation payment frequency ────────────────────────────────────────

export const SUPER_PAYMENT_FREQUENCIES = ['pay_cycle', 'monthly', 'quarterly'] as const;
export type SuperPaymentFrequency = (typeof SUPER_PAYMENT_FREQUENCIES)[number];

// ─── HolidayRules sub-document ────────────────────────────────────────────────

@Schema({ _id: false, versionKey: false })
export class HolidayRules {
  /** Whether holiday detection is active for this contract. */
  @Prop({ type: Boolean, default: false })
  enabled!: boolean;

  /**
   * References LinkedCalendar._id (Business App collection).
   * Required when enabled === true.
   */
  @Prop({ type: String, default: null })
  calendarId!: string | null;

  /** Display snapshot — calendarName at time of selection. */
  @Prop({ type: String, default: null, trim: true })
  calendarName!: string | null;

  /** Display snapshot — providerDisplayName at time of selection. */
  @Prop({ type: String, default: null, trim: true })
  calendarProviderName!: string | null;

  /**
   * Unified holiday behaviour. Replaces the old workAllowed + payMethod split:
   *   no_work     → work is not allowed
   *   normal_rate → work allowed at the normal rate
   *   multiplier  → work allowed, rate × multiplier
   *   fixed_rate  → work allowed at fixedHourlyRate
   *
   * Legacy documents may have `workAllowed` + `payMethod` instead; the response
   * mapper converts those transparently.
   */
  @Prop({
    type: String,
    enum: ['normal_rate', 'multiplier', 'fixed_rate', 'no_work', null],
    default: 'normal_rate',
  })
  behaviour!: HolidayBehaviour | null;

  /** Multiplier applied to the normal rate when behaviour === 'multiplier'. > 0. */
  @Prop({ type: Number, default: null })
  multiplier!: number | null;

  /** Fixed hourly rate when behaviour === 'fixed_rate'. >= 0. */
  @Prop({ type: Number, default: null })
  fixedHourlyRate!: number | null;
}

export const HolidayRulesSchema = SchemaFactory.createForClass(HolidayRules);

// ─── SuperannuationRules sub-document ────────────────────────────────────────

@Schema({ _id: false, versionKey: false })
export class SuperannuationRules {
  @Prop({ type: Boolean, default: false })
  enabled!: boolean;

  /** Superannuation rate as a percentage (e.g. 12 = 12%). Required when enabled. */
  @Prop({ type: Number, default: null })
  rate!: number | null;

  @Prop({
    type: String,
    enum: ['pay_cycle', 'monthly', 'quarterly', null],
    default: null,
  })
  paymentFrequency!: SuperPaymentFrequency | null;
}

export const SuperannuationRulesSchema = SchemaFactory.createForClass(SuperannuationRules);

// ─── RateRule sub-document ────────────────────────────────────────────────────

export const VALID_RATE_DAYS = [
  'all',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

@Schema({ _id: false, versionKey: false })
export class RateRule {
  @Prop({ type: [String], required: true })
  days!: string[];

  @Prop({ type: String, default: null })
  startTime!: string | null;

  @Prop({ type: String, default: null })
  endTime!: string | null;

  @Prop({ type: Number, required: true })
  hourlyRate!: number;
}

export const RateRuleSchema = SchemaFactory.createForClass(RateRule);

// ─── Contract document ────────────────────────────────────────────────────────

export type ContractDocument = HydratedDocument<Contract>;
export type InvoiceDueRule = 'from_invoice_date' | 'end_of_week' | 'end_of_month';

@Schema({
  collection: 'contracts',
  timestamps: true,
  versionKey: false,
})
export class Contract {
  @Prop({ required: true, index: true })
  businessId!: string;

  @Prop({ required: true, index: true })
  customerId!: string;

  @Prop({ required: true })
  startDate!: Date;

  @Prop({ type: Date, default: null })
  endDate!: Date | null;

  @Prop({ required: true, trim: true })
  positionName!: string;

  /**
   * Commercial/work relationship type.
   * Default: 'contractor' — safe for existing records that predate this field.
   */
  @Prop({
    type: String,
    enum: ['casual', 'contractor', 'subcontractor', 'service_agreement', 'project_based', 'other'],
    default: 'contractor',
  })
  workType!: WorkType;

  @Prop({ required: true, trim: true })
  invoiceDescription!: string;

  @Prop({
    required: true,
    enum: ['draft', 'active', 'inactive', 'finished', 'cancelled'],
    default: 'active',
  })
  status!: ContractStatus;

  @Prop({
    required: true,
    enum: ['per_shift', 'daily', 'weekly', 'fortnightly', 'monthly'],
  })
  billingCycle!: BillingCycle;

  @Prop({
    type: String,
    enum: ['from_invoice_date', 'end_of_week', 'end_of_month'],
    default: 'from_invoice_date',
  })
  invoiceDueRule!: InvoiceDueRule;

  /**
   * Days the Customer has to pay. Required when scheduledPaymentEnabled is false.
   * null when scheduledPaymentEnabled is true — the two payment methods are mutually exclusive.
   */
  @Prop({ type: Number, default: null })
  paymentTermsDays!: number | null;

  /** Whether the Customer has a fixed weekday on which they normally process payments. */
  @Prop({ type: Boolean, default: false })
  scheduledPaymentEnabled!: boolean;

  /**
   * The weekday on which the Customer normally processes payments.
   * Required when scheduledPaymentEnabled is true; null otherwise.
   */
  @Prop({
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', null],
    default: null,
  })
  scheduledPaymentDay!: ScheduledPaymentDay | null;

  @Prop({
    required: true,
    enum: ['fixed', 'variable', 'variable_time_range'],
  })
  rateType!: RateType;

  @Prop({ type: Number, default: 4 })
  minimumHours!: number;

  @Prop({ type: Number, default: 30 })
  defaultBreakMinutes!: number;

  @Prop({ type: [RateRuleSchema], required: true, default: [] })
  rates!: RateRule[];

  @Prop({ type: String, default: null, trim: true })
  notes!: string | null;

  @Prop({ type: Boolean, default: false })
  useInvoicePrefix!: boolean;

  @Prop({ type: String, default: null, trim: true })
  invoicePrefix!: string | null;

  @Prop({ type: Number, default: 1, min: 1 })
  startingInvoiceNumber!: number;

  @Prop({
    type: String,
    enum: ['AUD', 'USD', 'NZD', 'GBP', 'EUR', 'COP'],
    default: 'AUD',
  })
  currency!: Currency;

  @Prop({ type: Boolean, default: false })
  chargeGst!: boolean;

  /** GST rate as a percentage (e.g. 10 = 10%). Required when chargeGst is true. */
  @Prop({ type: Number, default: null })
  gstRate!: number | null;

  /**
   * Holiday detection and pay-override rules.
   * Uses `behaviour` to encode both workAllowed and payMethod in a single field.
   * Legacy documents may have `workAllowed` + `payMethod` instead; the response
   * mapper handles transparent migration.
   */
  @Prop({
    type: HolidayRulesSchema,
    default: (): HolidayRules => ({
      enabled:             false,
      calendarId:          null,
      calendarName:        null,
      calendarProviderName: null,
      behaviour:           'normal_rate',
      multiplier:          null,
      fixedHourlyRate:     null,
    }),
  })
  holidayRules!: HolidayRules;

  @Prop({
    type: SuperannuationRulesSchema,
    default: (): SuperannuationRules => ({
      enabled:          false,
      rate:             null,
      paymentFrequency: null,
    }),
  })
  superannuationRules!: SuperannuationRules;

  /**
   * Whether expected invoice payment dates should be synced to a calendar.
   * Default false — backward compatible for all existing records.
   */
  @Prop({ type: Boolean, default: false })
  paymentCalendarEnabled!: boolean;

  /**
   * References LinkedCalendar._id (Business App collection) with flow = 'payments'.
   * Required when paymentCalendarEnabled is true.
   */
  @Prop({ type: String, default: null })
  paymentCalendarSubscriptionId!: string | null;
}

export const ContractSchema = SchemaFactory.createForClass(Contract);

ContractSchema.index({ businessId: 1, customerId: 1 });
ContractSchema.index({ businessId: 1, status: 1 });
ContractSchema.index({ customerId: 1, status: 1 });

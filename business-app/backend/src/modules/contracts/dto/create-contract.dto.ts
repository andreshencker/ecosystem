import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { WorkType, HolidayBehaviour, SuperPaymentFrequency } from '../schemas/contract.schema';
import { SUPPORTED_CURRENCIES, SUPER_PAYMENT_FREQUENCIES, SCHEDULED_PAYMENT_DAYS } from '../schemas/contract.schema';

export class HolidayRulesDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  calendarId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  calendarName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  calendarProviderName?: string | null;

  @IsOptional()
  @IsEnum(['normal_rate', 'multiplier', 'fixed_rate', 'no_work', null])
  behaviour?: HolidayBehaviour | null;

  @IsOptional()
  @ValidateIf((o) => o.behaviour === 'multiplier')
  @IsNumber({}, { message: 'multiplier must be a number' })
  @Min(0.01, { message: 'multiplier must be greater than 0' })
  multiplier?: number | null;

  @IsOptional()
  @ValidateIf((o) => o.behaviour === 'fixed_rate')
  @IsNumber({}, { message: 'fixedHourlyRate must be a number' })
  @Min(0, { message: 'fixedHourlyRate must be >= 0' })
  fixedHourlyRate?: number | null;
}

export class SuperannuationRulesDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber({}, { message: 'rate must be a number' })
  @Min(0.01, { message: 'rate must be greater than 0' })
  @Max(100, { message: 'rate must not exceed 100' })
  rate?: number | null;

  @IsOptional()
  @IsEnum(SUPER_PAYMENT_FREQUENCIES, {
    message: `paymentFrequency must be one of: ${SUPER_PAYMENT_FREQUENCIES.join(', ')}`,
  })
  paymentFrequency?: SuperPaymentFrequency | null;
}

export class RateRuleDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  days!: string[];

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be HH:mm' })
  startTime?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be HH:mm' })
  endTime?: string | null;

  @IsNumber({}, { message: 'hourlyRate must be a number' })
  @Min(0.01, { message: 'hourlyRate must be greater than 0' })
  hourlyRate!: number;
}

export class CreateContractDto {
  @IsMongoId({ message: 'customerId must be a valid ObjectId' })
  customerId!: string;

  @IsDateString({}, { message: 'startDate must be a valid ISO date string' })
  startDate!: string;

  @IsOptional()
  @IsDateString({}, { message: 'endDate must be a valid ISO date string' })
  endDate?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(200)
  positionName!: string;

  @IsOptional()
  @IsEnum(['casual', 'contractor', 'subcontractor', 'service_agreement', 'project_based', 'other'])
  workType?: WorkType;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(500)
  invoiceDescription!: string;

  @IsEnum(['per_shift', 'daily', 'weekly', 'fortnightly', 'monthly'], {
    message: 'billingCycle must be one of: per_shift, daily, weekly, fortnightly, monthly',
  })
  billingCycle!: 'per_shift' | 'daily' | 'weekly' | 'fortnightly' | 'monthly';

  @IsOptional()
  @IsEnum(['from_invoice_date', 'end_of_week', 'end_of_month'])
  invoiceDueRule?: 'from_invoice_date' | 'end_of_week' | 'end_of_month';

  // Payment Terms and Scheduled Payment are mutually exclusive.
  @IsOptional()
  @ValidateIf((o) => !o.scheduledPaymentEnabled)
  @IsInt({ message: 'paymentTermsDays must be an integer' })
  @Min(0, { message: 'paymentTermsDays must be >= 0' })
  @Max(365)
  paymentTermsDays?: number | null;

  @IsOptional()
  @IsBoolean()
  scheduledPaymentEnabled?: boolean;

  @IsOptional()
  @ValidateIf((o) => o.scheduledPaymentEnabled === true)
  @IsEnum(SCHEDULED_PAYMENT_DAYS, {
    message: `scheduledPaymentDay must be one of: ${SCHEDULED_PAYMENT_DAYS.join(', ')}`,
  })
  scheduledPaymentDay?: string | null;

  @IsEnum(['fixed', 'variable', 'variable_time_range'], {
    message: 'rateType must be one of: fixed, variable, variable_time_range',
  })
  rateType!: 'fixed' | 'variable' | 'variable_time_range';

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumHours?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(480)
  defaultBreakMinutes?: number;

  @IsArray()
  @ArrayMinSize(1, { message: 'rates must have at least one rule' })
  @ValidateNested({ each: true })
  @Type(() => RateRuleDto)
  rates!: RateRuleDto[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  useInvoicePrefix?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  invoicePrefix?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  startingInvoiceNumber?: number;

  @IsOptional()
  @IsEnum(SUPPORTED_CURRENCIES, {
    message: `currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`,
  })
  currency?: string;

  @IsOptional()
  @IsBoolean()
  chargeGst?: boolean;

  @IsOptional()
  @ValidateIf((o) => o.chargeGst === true)
  @IsNumber({}, { message: 'gstRate must be a number' })
  @Min(0.01, { message: 'gstRate must be greater than 0' })
  @Max(100, { message: 'gstRate must not exceed 100' })
  gstRate?: number | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => HolidayRulesDto)
  holidayRules?: HolidayRulesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SuperannuationRulesDto)
  superannuationRules?: SuperannuationRulesDto;

  @IsOptional()
  @IsBoolean()
  paymentCalendarEnabled?: boolean;

  @IsOptional()
  @IsString()
  paymentCalendarSubscriptionId?: string | null;
}

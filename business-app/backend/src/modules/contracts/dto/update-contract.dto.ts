import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { HolidayRulesDto, RateRuleDto, SuperannuationRulesDto } from './create-contract.dto';
import type { WorkType } from '../schemas/contract.schema';
import { SUPPORTED_CURRENCIES, SCHEDULED_PAYMENT_DAYS } from '../schemas/contract.schema';

export class UpdateContractDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  positionName?: string;

  @IsOptional()
  @IsEnum(['casual', 'contractor', 'subcontractor', 'service_agreement', 'project_based', 'other'])
  workType?: WorkType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  invoiceDescription?: string;

  @IsOptional()
  @IsEnum(['per_shift', 'daily', 'weekly', 'fortnightly', 'monthly'])
  billingCycle?: 'per_shift' | 'daily' | 'weekly' | 'fortnightly' | 'monthly';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  paymentTermsDays?: number | null;

  @IsOptional()
  @IsBoolean()
  scheduledPaymentEnabled?: boolean;

  @IsOptional()
  @IsEnum(SCHEDULED_PAYMENT_DAYS, {
    message: `scheduledPaymentDay must be one of: ${SCHEDULED_PAYMENT_DAYS.join(', ')}`,
  })
  scheduledPaymentDay?: string | null;

  @IsOptional()
  @IsEnum(['fixed', 'variable', 'variable_time_range'])
  rateType?: 'fixed' | 'variable' | 'variable_time_range';

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumHours?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(480)
  defaultBreakMinutes?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RateRuleDto)
  rates?: RateRuleDto[];

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

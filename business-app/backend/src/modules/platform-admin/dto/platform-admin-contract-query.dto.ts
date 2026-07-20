import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

function toBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function toInt(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : undefined;
}

export class PlatformAdminContractQueryDto {
  @ApiPropertyOptional({ description: 'Search across position, description, business name, customer name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by tenant businessId' })
  @IsOptional()
  @IsString()
  businessId?: string;

  @ApiPropertyOptional({ description: 'Filter by customerId' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Contract status: active | inactive | finished | cancelled' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Work type enum' })
  @IsOptional()
  @IsString()
  workType?: string;

  @ApiPropertyOptional({ description: 'Billing cycle enum' })
  @IsOptional()
  @IsString()
  billingCycle?: string;

  @ApiPropertyOptional({ description: 'Currency code e.g. AUD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Configuration health: complete | warning | invalid' })
  @IsOptional()
  @IsString()
  configurationStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBoolean(value))
  chargeGst?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBoolean(value))
  superEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBoolean(value))
  holidayRulesEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBoolean(value))
  paymentCalendarEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Updated date range start (ISO date)' })
  @IsOptional()
  @IsString()
  updatedFrom?: string;

  @ApiPropertyOptional({ description: 'Updated date range end (ISO date)' })
  @IsOptional()
  @IsString()
  updatedTo?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => toInt(value))
  page?: number;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  @Transform(({ value }) => toInt(value))
  limit?: number;

  @ApiPropertyOptional({ description: 'Sort field: source_created_at | source_updated_at | position_name | status | start_date | configuration_status' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortDir?: string;
}

export class PlatformAdminContractSummaryQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdTo?: string;
}

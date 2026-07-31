import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class ListWebhookDeliveriesQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) =>
    value !== undefined ? parseInt(String(value), 10) : undefined,
  )
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) =>
    value !== undefined ? parseInt(String(value), 10) : undefined,
  )
  offset?: number;

  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsString()
  processingStatus?: string;

  @IsOptional()
  @IsString()
  signatureStatus?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  duplicate?: boolean;

  @IsOptional()
  @IsDateString()
  receivedFrom?: string;

  @IsOptional()
  @IsDateString()
  receivedTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}

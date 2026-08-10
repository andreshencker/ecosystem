// src/accounting/dto/list-manual-journals.dto.ts

import { IsOptional, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ListManualJournalsQueryDto {
  /** Page cursor (Xero: page number, 1-based). */
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  /** YYYY-MM-DD inclusive lower bound. */
  @IsOptional()
  @IsString()
  dateFrom?: string;

  /** YYYY-MM-DD inclusive upper bound. */
  @IsOptional()
  @IsString()
  dateTo?: string;

  /** draft | posted | deleted | voided | all */
  @IsOptional()
  @IsIn(['draft', 'posted', 'deleted', 'voided', 'all'])
  status?: 'draft' | 'posted' | 'deleted' | 'voided' | 'all';
}

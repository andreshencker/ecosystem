// src/accounting/dto/list-journals.dto.ts
//
// Query parameters for the General Ledger journals listing (read-only).
// Uses the Xero /Journals endpoint — not for Manual Journal CRUD.

import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListJournalsQueryDto {
  /**
   * Pagination offset cursor (Xero Journals use offset, not page number).
   * Pass the nextCursor value from a previous response to fetch the next page.
   */
  @IsOptional()
  @IsString()
  cursor?: string;

  /** YYYY-MM-DD inclusive lower bound. */
  @IsOptional()
  @IsString()
  dateFrom?: string;

  /** YYYY-MM-DD inclusive upper bound. */
  @IsOptional()
  @IsString()
  dateTo?: string;

  /**
   * Filter by journal source type (e.g. ACCREC, ACCPAY, TRANSFER, MANUALADJUSTMENT).
   * Only show this filter when the actual response contains a sourceType field.
   */
  @IsOptional()
  @IsString()
  sourceType?: string;

  /** Pagination offset (alternative to cursor; Xero-specific). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

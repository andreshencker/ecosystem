// src/accounting/dto/list-bank-transactions.dto.ts

import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class ListBankTransactionsQueryDto {
  /**
   * Cursor encodes the Xero page number (1-based).
   * Xero returns a maximum of 100 transactions per page.
   */
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) =>
    value !== undefined ? parseInt(String(value), 10) : undefined,
  )
  limit?: number;

  /** ISO date string YYYY-MM-DD — inclusive lower bound. */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateFrom must be YYYY-MM-DD' })
  dateFrom?: string;

  /** ISO date string YYYY-MM-DD — inclusive upper bound. */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateTo must be YYYY-MM-DD' })
  dateTo?: string;

  /** Filter by transaction status. Defaults to authorised. */
  @IsOptional()
  @IsIn(['authorised', 'deleted', 'all'])
  status?: 'authorised' | 'deleted' | 'all';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}

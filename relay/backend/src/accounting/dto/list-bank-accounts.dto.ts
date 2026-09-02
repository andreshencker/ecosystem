// src/accounting/dto/list-bank-accounts.dto.ts

import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class ListBankAccountsQueryDto {
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

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  /**
   * When true, includes archived (inactive) bank accounts.
   * Defaults to false — only active accounts are returned.
   */
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  includeArchived?: boolean;

  /**
   * Provider account type to filter by.
   * 'BANK' (default) — standard bank accounts.
   * 'CREDITCARD'     — credit card accounts.
   * Both types are valid financial accounts that support BankTransactions.
   */
  @IsOptional()
  @IsIn(['BANK', 'CREDITCARD'])
  accountType?: 'BANK' | 'CREDITCARD';

  /**
   * When true, the provider fetches the BankSummary report in parallel with the
   * accounts list and enriches each account summary with its balance data.
   * Requires one extra Xero API call (GET /Reports/BankSummary) — but that
   * single call covers ALL accounts, so there is no per-row N+1 cost.
   * Defaults to false — balance fields are absent when not requested.
   */
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  withBalances?: boolean;
}

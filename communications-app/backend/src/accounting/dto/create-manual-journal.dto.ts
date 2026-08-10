// src/accounting/dto/create-manual-journal.dto.ts
//
// Canonical contract for creating a manual journal via Communications.
//
// Communications validates structure only — account codes, amounts, debit/credit
// intent, taxes, and business logic are the exclusive responsibility of the
// external application. Communications must not rebalance, infer, or modify
// the journal lines supplied by the caller.

import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ManualJournalLineDto {
  /** Provider account code. Required — external app is responsible for correct account selection. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  accountCode!: string;

  /**
   * Signed line amount. Positive = debit, negative = credit.
   * The external application decides debit/credit intent — Communications does not rebalance.
   */
  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxType?: string;

  @IsOptional()
  @IsArray()
  tracking?: Array<{ name: string; option: string }>;
}

export class CreateManualJournalDto {
  /** ISO date string (YYYY-MM-DD). Required by Xero. */
  @IsString()
  @IsNotEmpty()
  date!: string;

  /** Journal narration / description. Required. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  narration!: string;

  /**
   * Journal lines. Minimum 2 lines required by Xero.
   * External app must supply balanced debits/credits — Communications does not validate balance.
   */
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => ManualJournalLineDto)
  lines!: ManualJournalLineDto[];

  /** 'draft' | 'posted'. Defaults to 'draft' when omitted. */
  @IsOptional()
  @IsIn(['draft', 'posted'])
  status?: 'draft' | 'posted';

  @IsOptional()
  @IsIn(['NoTax', 'Exclusive', 'Inclusive'])
  lineAmountType?: 'NoTax' | 'Exclusive' | 'Inclusive';

  @IsOptional()
  @IsBoolean()
  showOnCashBasisReports?: boolean;

  /**
   * Caller-supplied correlation reference for idempotency / tracking.
   * Mapped to the provider's URL/reference field. Not validated for uniqueness
   * by Communications — duplicate prevention is the calling application's responsibility.
   */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  externalReference?: string;

  /** Optional Communications organisation ID. */
  @IsOptional()
  @IsString()
  organisationId?: string;
}

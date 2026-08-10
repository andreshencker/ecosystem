// src/accounting/dto/update-manual-journal.dto.ts

import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ManualJournalLineDto } from './create-manual-journal.dto';

export class UpdateManualJournalDto {
  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  narration?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualJournalLineDto)
  lines?: ManualJournalLineDto[];

  @IsOptional()
  @IsIn(['draft', 'posted'])
  status?: 'draft' | 'posted';

  @IsOptional()
  @IsIn(['NoTax', 'Exclusive', 'Inclusive'])
  lineAmountType?: 'NoTax' | 'Exclusive' | 'Inclusive';

  @IsOptional()
  @IsBoolean()
  showOnCashBasisReports?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  externalReference?: string;

  @IsOptional()
  @IsString()
  organisationId?: string;
}

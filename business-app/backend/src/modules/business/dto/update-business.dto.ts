import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DepositAccountDto {
  /** BSB — 6 digits (e.g. 062000) */
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'bsb must be exactly 6 digits' })
  bsb?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  accountNumber?: string;
}

/**
 * Editable business-operation fields of the Business.
 * businessKey, ownerUserId, isActive, and isPlatformCompany are system-managed
 * and cannot be changed through the portal edit form.
 */
export class UpdateBusinessDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  businessName?: string;

  /** Australian Business Number — 11 digits. */
  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/, { message: 'abn must be exactly 11 digits' })
  abn?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DepositAccountDto)
  depositAccount?: DepositAccountDto;

  /** ISO 4217 currency code, e.g. AUD, USD, EUR. */
  @IsOptional()
  @IsString()
  @MaxLength(3)
  defaultCurrency?: string;
}

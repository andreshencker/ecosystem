import {
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateDepositAccountDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'bsb must be exactly 6 digits' })
  bsb?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  accountNumber?: string;
}

export class UpdateFiscalProfileDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/, { message: 'abn must be exactly 11 digits' })
  abn?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateDepositAccountDto)
  depositAccount?: UpdateDepositAccountDto;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  defaultCurrency?: string;
}

export interface FiscalProfileResponseDto {
  companyId: string;
  abn: string | null;
  depositAccount: { bsb: string | null; accountNumber: string | null };
  defaultCurrency: string;
}

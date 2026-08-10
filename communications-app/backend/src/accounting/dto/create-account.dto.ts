// src/accounting/dto/create-account.dto.ts

import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  code?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  name!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  type!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsBoolean()
  paymentsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  showInExpenseClaims?: boolean;

  @IsOptional()
  @IsString()
  organisationId?: string;
}

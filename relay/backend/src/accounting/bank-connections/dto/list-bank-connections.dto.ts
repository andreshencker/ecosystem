// src/accounting/bank-connections/dto/list-bank-connections.dto.ts

import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

import type { BankConnectionStatus } from '../schemas/bank-connection.schema';

export class ListBankConnectionsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  provider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  institution?: string;

  @IsOptional()
  @IsEnum(['connected', 'disconnected', 'expired', 'error', 'pending'])
  status?: BankConnectionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

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
  cursor?: string;
}

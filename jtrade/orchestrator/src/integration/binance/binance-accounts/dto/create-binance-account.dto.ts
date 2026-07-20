// src/integrations/binance/binance-accounts/dto/create-binance-account.dto.ts
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateBinanceAccountDto {
  @IsString()
  userPlatformId!: string; // string plano

  @IsString()
  @MinLength(8)
  apiKey!: string;

  @IsString()
  @MinLength(8)
  apiSecret!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

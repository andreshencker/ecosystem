// src/integrations/binance/binance-accounts/dto/update-binance-account.dto.ts
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateBinanceAccountDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  apiKey?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  apiSecret?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

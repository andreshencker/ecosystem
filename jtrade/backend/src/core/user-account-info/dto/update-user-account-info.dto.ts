import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, Length } from 'class-validator';

export class UpdateUserAccountInfoDto {
  @IsOptional()
  @IsString()
  @Length(0, 60)
  accountLabel?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  accountRef?: string;

  @IsOptional()
  @IsBoolean()
  canTrade?: boolean;

  @IsOptional()
  @IsBoolean()
  useDrawdownLimit?: boolean;

  @IsOptional()
  @IsBoolean()
  useProfitLimit?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxDrawdownPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxProfitPercent?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
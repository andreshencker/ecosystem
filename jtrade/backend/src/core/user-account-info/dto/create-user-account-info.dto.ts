import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateUserAccountInfoDto {
  @IsMongoId()
  userProjectPlatformId!: string;

  @IsOptional()
  @IsMongoId()
  indicatorProjectId?: string;

  @IsOptional()
  @IsString()
  @Length(0, 60)
  accountLabel?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  accountRef?: string;

  @IsBoolean()
  canTrade!: boolean;

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
}
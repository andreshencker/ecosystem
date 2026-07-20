import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateSymbolExecutionDto {
  @IsMongoId()
  userAccountInfoId!: string;

  @IsString()
  @IsNotEmpty()
  alertGroupId!: string;

  @Type(() => Number)
  @IsNumber()
  contractSize!: number;

  @Type(() => Number)
  @IsNumber()
  riskPercent!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  stopDistancePips?: number;

  @Type(() => Number)
  @IsNumber()
  returnRatio!: number;

  @IsOptional()
  @IsBoolean()
  useStopLoss?: boolean;

  @IsOptional()
  @IsBoolean()
  useTakeProfit?: boolean;

  @IsOptional()
  @IsBoolean()
  useTrailingStop?: boolean;

  @IsOptional()
  @IsBoolean()
  useBreakEven?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  atrPeriod?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  atrMultiplier?: number;

  @IsOptional()
  @IsBoolean()
  closeTradesOnWeekend?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
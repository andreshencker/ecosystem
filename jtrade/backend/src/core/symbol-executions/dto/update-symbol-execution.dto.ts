import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional } from 'class-validator';

export class UpdateSymbolExecutionDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  contractSize?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  riskPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  stopDistancePips?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  returnRatio?: number;

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
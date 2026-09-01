import { Type } from 'class-transformer';
import {
  IsBoolean, IsIn, IsMongoId, IsNumber, IsOptional, IsString, Matches, MaxLength, MinLength,
} from 'class-validator';

const TF = /^(M1|M5|M15|M30|H1|H4|D1|W1)$/;

export class CreateSignalbotDto {
  @IsMongoId() productId!: string;

  @IsOptional() @IsString() @MaxLength(60) accountRef?: string;
  @IsOptional() @IsString() @MaxLength(120) accountLabel?: string;

  @IsOptional() @IsBoolean() canTrade?: boolean;
  @IsOptional() @IsBoolean() useDrawdownLimit?: boolean;
  @IsOptional() @IsBoolean() useProfitLimit?: boolean;
  @IsOptional() @Type(() => Number) @IsNumber() maxDrawdownPercent?: number;
  @IsOptional() @Type(() => Number) @IsNumber() maxProfitPercent?: number;
}

export class UpdateSignalbotDto {
  @IsOptional() @IsString() @MaxLength(60) accountRef?: string;
  @IsOptional() @IsString() @MaxLength(120) accountLabel?: string;
  @IsOptional() @IsBoolean() canTrade?: boolean;
  @IsOptional() @IsBoolean() useDrawdownLimit?: boolean;
  @IsOptional() @IsBoolean() useProfitLimit?: boolean;
  @IsOptional() @Type(() => Number) @IsNumber() maxDrawdownPercent?: number;
  @IsOptional() @Type(() => Number) @IsNumber() maxProfitPercent?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ExecutionDto {
  @IsMongoId() channelId!: string;

  @IsOptional() @Type(() => Number) @IsNumber() contractSize?: number;
  @IsOptional() @Type(() => Number) @IsNumber() riskPercent?: number;
  @IsOptional() @Type(() => Number) @IsNumber() stopDistancePips?: number;
  @IsOptional() @Type(() => Number) @IsNumber() returnRatio?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() useStopLoss?: boolean;
  @IsOptional() @IsBoolean() useTakeProfit?: boolean;
  @IsOptional() @IsBoolean() useTrailingStop?: boolean;
  @IsOptional() @IsBoolean() useBreakEven?: boolean;
  @IsOptional() @Type(() => Number) @IsNumber() atrPeriod?: number;
  @IsOptional() @Type(() => Number) @IsNumber() atrMultiplier?: number;
  @IsOptional() @IsBoolean() closeTradesOnWeekend?: boolean;
}

export class UpdateExecutionDto {
  @IsOptional() @Type(() => Number) @IsNumber() contractSize?: number;
  @IsOptional() @Type(() => Number) @IsNumber() riskPercent?: number;
  @IsOptional() @Type(() => Number) @IsNumber() stopDistancePips?: number;
  @IsOptional() @Type(() => Number) @IsNumber() returnRatio?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() useStopLoss?: boolean;
  @IsOptional() @IsBoolean() useTakeProfit?: boolean;
  @IsOptional() @IsBoolean() useTrailingStop?: boolean;
  @IsOptional() @IsBoolean() useBreakEven?: boolean;
  @IsOptional() @Type(() => Number) @IsNumber() atrPeriod?: number;
  @IsOptional() @Type(() => Number) @IsNumber() atrMultiplier?: number;
  @IsOptional() @IsBoolean() closeTradesOnWeekend?: boolean;
}

/** Query the EA sends to the runtime endpoint. */
export class RuntimeQueryDto {
  @IsString() token!: string;
  @IsString() symbol!: string;
  @IsString() @Matches(TF) timeframe!: string;
  @IsOptional() @IsString() lastSignalId?: string;
  @IsOptional() @IsString() eaVersion?: string;
  @IsOptional() @IsIn(['json', 'flat']) format?: 'json' | 'flat';
}

/** Fill report from the EA. */
export class RuntimeResultDto {
  @IsString() token!: string;
  @IsString() signalId!: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(60) ticket?: string;
  @IsOptional() @Type(() => Number) @IsNumber() entryPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() slippage?: number;
  @IsOptional() @IsString() @MaxLength(500) error?: string;
}

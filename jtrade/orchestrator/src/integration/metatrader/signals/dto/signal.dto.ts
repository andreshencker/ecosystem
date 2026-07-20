import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class SignalDto {
  // viene del 3002 (CORE)
  @IsString()
  signalId: string;

  // opcional (puede venir si lo mandas desde el core)
  @IsOptional()
  @IsString()
  userPlatformId?: string;

  @IsIn(['BUY', 'SELL'])
  action: 'BUY' | 'SELL';

  @IsString()
  symbol: string;

  @IsBoolean()
  canTrade: boolean;

  @IsNumber()
  riskPercent: number;

  @IsNumber()
  @IsOptional()
  stopDistancePips?: number;

  @IsNumber()
  rrRatio: number;

  @IsString()
  eaVersion: string;
}

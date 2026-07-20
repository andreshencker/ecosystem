import {
  IsBooleanString,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class QueryAlertsDto {
  @IsOptional()
  @IsMongoId()
  indicatorProjectId?: string;

  @IsOptional()
  @IsMongoId()
  symbolId?: string;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsIn(['BUY', 'SELL', 'buy', 'sell'])
  action?: string;

  @IsOptional()
  @IsString()
  @Length(1, 30)
  @Matches(/^[A-Za-z0-9._-]+$/, { message: 'symbol has invalid characters' })
  symbol?: string;

  @IsOptional()
  @IsString()
  @Length(1, 10)
  @Matches(/^(M1|M2|M3|M5|M10|M15|M30|H1|H2|H3|H4|H6|H8|H12|D1|W1|MN1)$/i, {
    message:
      'timeframe must be one of: M1,M2,M3,M5,M10,M15,M30,H1,H2,H3,H4,H6,H8,H12,D1,W1,MN1',
  })
  timeFrame?: string;

  @IsOptional()
  @IsBooleanString()
  isActive?: string;
}

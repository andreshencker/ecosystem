import {
  IsBoolean,
  IsMongoId,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class UpdateAlertDto {
  @IsOptional()
  @IsMongoId()
  symbolId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 10)
  @Matches(/^(M1|M2|M3|M5|M10|M15|M30|H1|H2|H3|H4|H6|H8|H12|D1|W1|MN1)$/i, {
    message:
      'timeframe must be one of: M1,M2,M3,M5,M10,M15,M30,H1,H2,H3,H4,H6,H8,H12,D1,W1,MN1',
  })
  timeframe?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

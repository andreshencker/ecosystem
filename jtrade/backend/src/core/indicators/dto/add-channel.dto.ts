import { IsIn, IsMongoId } from 'class-validator';
import { TIMEFRAMES, type Timeframe } from '../schemas/indicator.schema';

export class AddChannelDto {
  @IsMongoId()
  symbolId!: string;

  @IsIn(TIMEFRAMES as unknown as string[])
  timeframe!: Timeframe;
}

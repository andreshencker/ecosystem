import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import type { CalendarFlow } from '../schemas/linked-calendar.schema';
import { CALENDAR_FLOWS } from '../schemas/linked-calendar.schema';

export class SubscribeFromCatalogueDto {
  @IsString()
  @IsNotEmpty({ message: 'connectionId is required' })
  connectionId!: string;

  @IsString()
  @IsNotEmpty({ message: 'catalogueKey is required' })
  catalogueKey!: string;

  @IsEnum(CALENDAR_FLOWS, { message: `flow must be one of: ${CALENDAR_FLOWS.join(', ')}` })
  flow!: CalendarFlow;
}

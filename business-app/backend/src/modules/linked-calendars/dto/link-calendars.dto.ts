import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, ArrayMinSize } from 'class-validator';
import type { CalendarFlow } from '../schemas/linked-calendar.schema';
import { CALENDAR_FLOWS } from '../schemas/linked-calendar.schema';

export class LinkCalendarsDto {
  @IsString()
  @IsNotEmpty({ message: 'connectionId is required' })
  connectionId!: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one calendarId must be provided' })
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  calendarIds!: string[];

  /** Flow this calendar is being configured for. Optional; can be set later via PATCH. */
  @IsOptional()
  @IsEnum(CALENDAR_FLOWS, { message: `flow must be one of: ${CALENDAR_FLOWS.join(', ')}` })
  flow?: CalendarFlow | null;
}

import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import type { CalendarFlow } from '../schemas/linked-calendar.schema';
import { CALENDAR_FLOWS } from '../schemas/linked-calendar.schema';

export class CreateCalendarDto {
  @IsString()
  @IsNotEmpty({ message: 'connectionId is required' })
  connectionId!: string;

  @IsString()
  @IsNotEmpty({ message: 'name is required' })
  @MaxLength(200, { message: 'name must be at most 200 characters' })
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(CALENDAR_FLOWS, { message: `flow must be one of: ${CALENDAR_FLOWS.join(', ')}` })
  flow!: CalendarFlow;
}

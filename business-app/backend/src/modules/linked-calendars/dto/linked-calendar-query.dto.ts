import { IsOptional, IsString, IsEnum, IsIn } from 'class-validator';
import type { LinkedCalendarStatus, CalendarFlow } from '../schemas/linked-calendar.schema';
import { CALENDAR_FLOWS } from '../schemas/linked-calendar.schema';

export class LinkedCalendarQueryDto {
  @IsOptional()
  @IsString()
  connectionId?: string;

  @IsOptional()
  @IsString()
  providerKey?: string;

  @IsOptional()
  @IsEnum(['active', 'paused'])
  status?: LinkedCalendarStatus;

  @IsOptional()
  @IsIn(CALENDAR_FLOWS, { message: `flow must be one of: ${CALENDAR_FLOWS.join(', ')}` })
  flow?: CalendarFlow;

  @IsOptional()
  @IsString()
  search?: string;
}

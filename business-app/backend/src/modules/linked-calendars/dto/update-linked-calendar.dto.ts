import { IsEnum, IsIn, IsOptional } from 'class-validator';
import type { LinkedCalendarStatus, CalendarFlow } from '../schemas/linked-calendar.schema';
import { CALENDAR_FLOWS } from '../schemas/linked-calendar.schema';

export class UpdateLinkedCalendarDto {
  @IsOptional()
  @IsEnum(['active', 'paused'], { message: 'status must be active or paused' })
  status?: LinkedCalendarStatus;

  /** Assign or re-assign the business flow. Send null to clear the flow (mark unassigned). */
  @IsOptional()
  @IsIn([...CALENDAR_FLOWS, null] as const, {
    message: `flow must be one of: ${CALENDAR_FLOWS.join(', ')} or null`,
  })
  flow?: CalendarFlow | null;
}

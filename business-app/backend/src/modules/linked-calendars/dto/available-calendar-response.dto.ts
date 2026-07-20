import type { LinkedCalendarStatus } from '../schemas/linked-calendar.schema';

export interface AvailableCalendarResponseDto {
  externalCalendarId: string;
  calendarName: string;
  calendarDescription: string | null;
  timezone: string | null;
  accessRole: string | null;
  isPrimary: boolean;
  isLinked: boolean;
  linkedCalendarId: string | null;
  linkedStatus: LinkedCalendarStatus | null;
}

import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Matches,
} from 'class-validator';
import type { CalendarFlow } from '../schemas/linked-calendar.schema';
import { CALENDAR_FLOWS } from '../schemas/linked-calendar.schema';

/** Subscription URL constraints. */
const MAX_URL_LENGTH = 2048;

export class SubscribeByUrlDto {
  @IsString()
  @IsNotEmpty({ message: 'connectionId is required' })
  connectionId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Subscription URL is required' })
  @MaxLength(MAX_URL_LENGTH, { message: `URL must be at most ${MAX_URL_LENGTH} characters` })
  @IsUrl(
    { protocols: ['https'], require_protocol: true, require_tld: true },
    { message: 'Subscription URL must be a valid HTTPS URL (e.g. https://example.org/calendar.ics)' },
  )
  // Additional guard: reject javascript:, data:, file:, and other dangerous schemes
  @Matches(
    /^https:\/\//i,
    { message: 'Only HTTPS subscription URLs are accepted' },
  )
  subscriptionUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  calendarName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(CALENDAR_FLOWS, { message: `flow must be one of: ${CALENDAR_FLOWS.join(', ')}` })
  flow!: CalendarFlow;
}

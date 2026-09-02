// src/calendar/dto/connect-calendar.dto.ts

import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConnectCalendarDto {
  @ApiProperty({ enum: ['google_calendar', 'outlook_calendar', 'icloud'] })
  @IsEnum(['google_calendar', 'outlook_calendar', 'icloud'])
  providerKey!: 'google_calendar' | 'outlook_calendar' | 'icloud';

  @ApiPropertyOptional({ default: 'default' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiProperty()
  @IsObject()
  credentials!: Record<string, any>;
}

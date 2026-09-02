import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Partial update payload for a Relay Event.
 * domainCatalogueId is intentionally excluded — the domain cannot be
 * changed after creation.
 */
export class UpdateRelayEventDto {
  @ApiPropertyOptional({ example: 'Invoice Dispatched' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: ['notification', 'alert', 'request', 'security'],
  })
  @IsOptional()
  @IsEnum(['notification', 'alert', 'request', 'security'])
  eventType?: 'notification' | 'alert' | 'request' | 'security';

  @ApiPropertyOptional({
    description: 'Full channel content object (email and/or sms)',
  })
  @IsOptional()
  @IsObject()
  channelContent?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

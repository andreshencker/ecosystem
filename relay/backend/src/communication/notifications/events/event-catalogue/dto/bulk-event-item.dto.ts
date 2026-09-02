// src/notifications/events/event-catalogue/dto/bulk-event-item.dto.ts
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class BulkEventItemDto {
  @IsString()
  @IsNotEmpty()
  eventKey!: string;

  @IsString()
  @IsNotEmpty()
  displayName!: string;

  /** Which application created/owns this event — e.g. 'relay', 'business-app'. */
  @IsOptional()
  @IsString()
  app?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(['notification', 'alert', 'request'])
  eventType!: 'notification' | 'alert' | 'request';

  @IsOptional()
  @IsObject()
  channelContent?: any;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

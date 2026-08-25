import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRelayEventDto {
  @ApiProperty({
    description: 'Relay Purpose (domain) ObjectId',
    example: '64f...',
  })
  @IsMongoId()
  domainCatalogueId!: string;

  @ApiProperty({
    example: 'invoice_sent',
    description:
      'Unique key — lowercase letters, numbers, hyphens and underscores',
  })
  @IsString()
  @IsNotEmpty()
  eventKey!: string;

  @ApiProperty({ example: 'Invoice Sent' })
  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @ApiPropertyOptional({
    example: 'Triggered when an invoice is sent to a customer',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['notification', 'alert', 'request', 'security'] })
  @IsEnum(['notification', 'alert', 'request', 'security'])
  eventType!: 'notification' | 'alert' | 'request' | 'security';

  @ApiPropertyOptional({
    description: 'Channel content configuration for email and/or SMS',
  })
  @IsOptional()
  @IsObject()
  channelContent?: Record<string, any>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

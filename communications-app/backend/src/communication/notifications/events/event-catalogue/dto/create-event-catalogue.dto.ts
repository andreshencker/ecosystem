import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateEventCatalogueDto {
  @IsMongoId()
  domainCatalogueId!: string;

  @IsString()
  @IsNotEmpty()
  eventKey!: string;

  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(['notification', 'alert', 'request', 'security'])
  eventType!: 'notification' | 'alert' | 'request' | 'security';

  @IsOptional()
  @IsObject()
  channelContent?: any;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(['platform', 'company'])
  scope?: 'platform' | 'company';

  @IsOptional()
  @IsEnum(['platform', 'company'])
  senderScope?: 'platform' | 'company';
}

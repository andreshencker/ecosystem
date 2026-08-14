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

  @IsEnum(['notification', 'alert', 'request'])
  eventType!: 'notification' | 'alert' | 'request';

  @IsOptional()
  @IsObject()
  channelContent?: any;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

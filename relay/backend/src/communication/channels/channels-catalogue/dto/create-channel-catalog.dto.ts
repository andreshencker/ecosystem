// src/channels/channels-catalogue/dto/create-channel.dto.ts
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import type { ContentFormat } from '../schemas/channel-catalog.schema';

export class CreateChannelDto {
  @IsString()
  @IsNotEmpty()
  channelKey!: string;

  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['html', 'text', 'binary'])
  contentFormat!: ContentFormat;

  @IsOptional()
  @IsBoolean()
  supportsTemplates?: boolean;

  @IsOptional()
  @IsBoolean()
  supportsFiles?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

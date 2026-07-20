// src/channels/channels-catalogue/dto/update-channel.dto.ts
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import type { ContentFormat } from '../schemas/channel-catalog.schema';

export class UpdateChannelDto {
  @IsOptional()
  @IsString()
  channelKey?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['html', 'text', 'binary'])
  contentFormat?: ContentFormat;

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

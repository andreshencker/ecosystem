// src/channels/channels-catalogue/dto/channel-response.dto.ts
import type { ContentFormat } from '../schemas/channel-catalog.schema';

export class ChannelResponseDto {
  id!: string;

  channelKey!: string;
  displayName!: string;
  description?: string;

  contentFormat!: ContentFormat;
  supportsTemplates!: boolean;
  supportsFiles!: boolean;

  isActive!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

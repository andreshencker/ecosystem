// src/channels/channels-catalogue/mappers/channel.mapper.ts
import { ChannelResponseDto } from '../dto/channel-catalog-response.dto';

export class ChannelMapper {
  static toResponse(doc: any): ChannelResponseDto {
    return {
      id: String(doc._id),

      channelKey: doc.channelKey,
      displayName: doc.displayName,
      description: doc.description ?? '',

      contentFormat: doc.contentFormat,
      supportsTemplates: !!doc.supportsTemplates,
      supportsFiles: !!doc.supportsFiles,

      isActive: !!doc.isActive,

      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  static toResponseList(list: any[]): ChannelResponseDto[] {
    return (list ?? []).map((x) => this.toResponse(x));
  }
}

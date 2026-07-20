// src/notifications/events/event-catalogue/dto/event-catalogue-response.dto.ts

export type ChannelRuntimeDto = {
  channel: 'email' | 'sms' | 'storage' | string;

  // ✅ nunca sensibles
  providerCredentialsId: string;
  companyChannelProviderId?: string;

  providerId?: string;
  providerKey?: string;
  connectionType?: string;

  channelId?: string;
  channelKey?: string;

  tag?: string; // "marketing", "support", etc. (no sensible)
};

export class EventCatalogueResponseDto {
  id!: string;
  domainCatalogueId!: string | any;

  eventKey!: string;
  displayName!: string;
  description!: string;
  eventType!: 'notification' | 'alert' | 'request';

  channelContent!: any;

  // ✅ runtime metadata (NO credentials)
  channelsRuntime?: ChannelRuntimeDto[];

  isActive!: boolean;

  createdAt!: string;
  updatedAt!: string;
}

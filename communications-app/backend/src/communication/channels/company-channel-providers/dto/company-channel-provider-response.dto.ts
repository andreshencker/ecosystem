export type ChannelMiniDto = {
  id: string;
  channelKey?: string;
  displayName?: string;
  isActive?: boolean;
};

export type ProviderMiniDto = {
  id: string;
  providerKey?: string;
  displayName?: string;
  connectionType?: string;
  isActive?: boolean;
  /** All channel ObjectId strings this provider belongs to. */
  channelIds?: string[];
  /** First channelId — kept for backwards compatibility. */
  channelId?: string;
};

export class CompanyChannelProviderResponseDto {
  id!: string;

  companyId!: string;
  providerId!: string;
  channelId!: string;

  isDefault!: boolean;
  isActive!: boolean;

  // populate opcional
  provider?: ProviderMiniDto;
  channel?: ChannelMiniDto;

  createdAt!: string;
  updatedAt!: string;
}

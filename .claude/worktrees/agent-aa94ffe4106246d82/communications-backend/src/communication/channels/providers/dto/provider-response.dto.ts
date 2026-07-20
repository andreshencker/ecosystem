export class ProviderResponseDto {
  id!: string;

  providerKey!: string;
  displayName!: string;

  channelId!: string;

  // opcional: cuando hacemos populate
  channel?: {
    id: string;
    channelKey: string;
    displayName: string;
    isActive: boolean;
  };

  connectionType!: 'api_key' | 'smtp' | 'oauth' | 'access_keys';
  isActive!: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

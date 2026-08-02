export class ProviderResponseDto {
  id!: string;

  providerKey!: string;
  displayName!: string;
  description?: string;

  /** Primary channel ID (first element of channelIds). Kept for backward compatibility. */
  channelId!: string;

  /** All channel IDs this provider belongs to. */
  channelIds!: string[];

  /** Populated primary channel — present when the query includes populate. */
  channel?: {
    id: string;
    channelKey: string;
    displayName: string;
    isActive: boolean;
  };

  /** All populated channels — present when the query includes populate. */
  channels?: Array<{
    id: string;
    channelKey: string;
    displayName: string;
    isActive: boolean;
  }>;

  connectionType!:
    | 'api_key'
    | 'smtp'
    | 'oauth'
    | 'access_keys'
    | 'token'
    | 'app_password';
  isActive!: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

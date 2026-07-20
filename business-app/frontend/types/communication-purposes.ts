export type PurposeChannel = 'email' | 'sms';

export interface ChannelToUse {
  channel: PurposeChannel;
  providerCredentialsId: string;
}

export interface Purpose {
  id: string;
  companyId: string;
  domainKey: string;
  displayName: string;
  domainCategory: string;
  isActive: boolean;
  isSystem: boolean;
  channelsToUse: ChannelToUse[];
  createdAt: string;
  updatedAt: string;
}

export interface PurposeListResponse {
  data: Purpose[];
  total: number;
  limit: number;
  offset: number;
}

export interface CredentialOption {
  /** ProviderCredentials ObjectId — submitted as providerCredentialsId when saving. */
  id: string;
  tag: string;
  /** Safe display value: email, phone, bucket name, masked key. Never a secret. */
  displayIdentifier?: string;
  label: string;
  channel: string;
  channelDisplayName: string;
  providerKey: string;
  providerDisplayName: string;
  connectionType: string;
  isActive: boolean;
}

export interface CreatePurposePayload {
  domainKey: string;
  displayName: string;
  domainCategory: string;
  isActive?: boolean;
  channelsToUse?: ChannelToUse[];
}

export interface UpdatePurposePayload {
  displayName?: string;
  domainCategory?: string;
  isActive?: boolean;
  channelsToUse?: ChannelToUse[];
}

export type PurposeChannel = 'email' | 'sms';

export interface ChannelToUseResponseDto {
  channel: PurposeChannel;
  providerCredentialsId: string;
}

export interface PurposeResponseDto {
  id: string;
  companyId: string;
  domainKey: string;
  displayName: string;
  domainCategory: string;
  isActive: boolean;
  isSystem: boolean;
  channelsToUse: ChannelToUseResponseDto[];
  createdAt: string;
  updatedAt: string;
}

export interface PurposeListResponseDto {
  data: PurposeResponseDto[];
  total: number;
  limit: number;
  offset: number;
}

export interface CredentialOptionDto {
  /** ProviderCredentials ObjectId — the value sent to Communications on domain save. */
  id: string;
  /** Short human label set by the user (e.g. "general", "marketing"). */
  tag: string;
  /**
   * Non-secret display value stored alongside the encrypted payload.
   * Examples: email address, phone number, masked key, bucket name.
   * Undefined for credentials created before this field was added.
   * Never contains passwords, API keys, secrets or auth tokens.
   */
  displayIdentifier?: string;
  /** Pre-built label from Communications (e.g. "EMAIL — Gmail — general"). */
  label: string;
  /** "email" | "sms" */
  channel: string;
  /** Human-readable channel name (e.g. "Email"). */
  channelDisplayName: string;
  /** Internal provider slug (e.g. "gmail", "sendgrid", "twilio"). */
  providerKey: string;
  /** User-facing provider name (e.g. "Gmail", "SendGrid"). May be empty string. */
  providerDisplayName: string;
  /** Connection mechanism (e.g. "smtp", "api_key"). */
  connectionType: string;
  isActive: boolean;
}

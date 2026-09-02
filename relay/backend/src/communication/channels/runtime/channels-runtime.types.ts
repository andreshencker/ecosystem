// src/channels/runtime/channels-runtime.types.ts

export type ChannelKey =
  | 'email'
  | 'sms'
  | 'storage'
  | 'calendar'
  | 'payment'
  | 'accounting'
  | 'billing';

/**
 * Canonical runtime context produced by ChannelsRuntimeResolverService.
 *
 * Every field is always populated — the resolver throws before returning
 * an incomplete context. Callers can trust all fields unconditionally.
 *
 * Resolution path:
 *   Company → Channel → Provider → CompanyChannelProvider → Credentials
 *
 * Security rules:
 *   - `credentials` are decrypted in-memory only; never persisted or logged.
 *   - `channelId` and `companyChannelProviderId` are safe MongoDB ObjectId
 *     strings suitable for audit logging.
 */
export type ChannelsRuntimeResolved = {
  /** Channel business responsibility (e.g. 'payment', 'accounting'). */
  channelKey: ChannelKey;

  /** MongoDB ObjectId of the Channel document. */
  channelId: string;

  /** Stable provider identifier (e.g. 'stripe', 'xero'). */
  providerKey: string;

  /** MongoDB ObjectId of the Provider document. */
  providerId: string | null;

  /** Auth mechanism declared on the provider (e.g. 'oauth', 'api_key'). */
  connectionType: string;

  /**
   * MongoDB ObjectId of the CompanyChannelProvider record.
   * This is the ownership proof: company × channel × provider.
   */
  companyChannelProviderId: string;

  /** MongoDB ObjectId of the ProviderCredentials record. */
  providerCredentialsId: string;

  /** Credential tag (e.g. 'live', 'sandbox', 'default'). */
  tag: string;

  /** True when both the CCP and the credential record are active. */
  isActive: boolean;

  /** True when the credential record itself is active. */
  credentialsIsActive: boolean;

  /**
   * Decrypted credential fields — in-memory only for this request.
   * Never persisted, never returned to callers outside the runtime layer.
   */
  credentials: Record<string, any>;
};

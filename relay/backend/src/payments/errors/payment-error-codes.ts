// src/payments/errors/payment-error-codes.ts

/**
 * Canonical Payments error codes.
 *
 * Used by:
 *   - PaymentException (HTTP layer)
 *   - Domain error classes (service/domain layer)
 *   - Provider adapters (translate provider errors to canonical codes)
 *
 * Design rules:
 *   - Codes are stable string constants; never change a value once published.
 *   - All codes use the SCREAMING_SNAKE_CASE PAYMENT_ prefix.
 *   - Descriptions explain WHEN the error occurs, not what to do about it.
 */
export const PaymentErrorCode = {
  /** ProviderCredentials document not found for the given accountId. */
  PAYMENT_ACCOUNT_NOT_FOUND: 'PAYMENT_ACCOUNT_NOT_FOUND',

  /** The credential found belongs to a different company than the authenticated one. */
  PAYMENT_ACCOUNT_ACCESS_DENIED: 'PAYMENT_ACCOUNT_ACCESS_DENIED',

  /** providerKey is not registered in PaymentProviderRegistry. */
  PAYMENT_PROVIDER_NOT_FOUND: 'PAYMENT_PROVIDER_NOT_FOUND',

  /** Provider is registered but no active CompanyChannelProvider link exists for this company. */
  PAYMENT_PROVIDER_NOT_CONFIGURED: 'PAYMENT_PROVIDER_NOT_CONFIGURED',

  /** Stored credentials failed format validation or the provider rejected them. */
  PAYMENT_CREDENTIALS_INVALID: 'PAYMENT_CREDENTIALS_INVALID',

  /** Stored credentials could not be decrypted (key rotation or corruption). */
  PAYMENT_CREDENTIALS_DECRYPTION_FAILED:
    'PAYMENT_CREDENTIALS_DECRYPTION_FAILED',

  /** The provider does not declare this capability as available. */
  PAYMENT_CAPABILITY_NOT_SUPPORTED: 'PAYMENT_CAPABILITY_NOT_SUPPORTED',

  /** The provider API is unreachable or returned a server error. */
  PAYMENT_PROVIDER_UNAVAILABLE: 'PAYMENT_PROVIDER_UNAVAILABLE',

  /** Configuration is syntactically invalid or internally inconsistent. */
  PAYMENT_CONFIGURATION_INVALID: 'PAYMENT_CONFIGURATION_INVALID',

  /**
   * Operation is defined in the interface but not yet implemented for this provider.
   * Thrown by skeleton adapter methods that are not yet built.
   */
  PAYMENT_OPERATION_NOT_IMPLEMENTED: 'PAYMENT_OPERATION_NOT_IMPLEMENTED',

  /** The requested payment method was not found in the provider configuration. */
  PAYMENT_METHOD_NOT_FOUND: 'PAYMENT_METHOD_NOT_FOUND',

  /** The payment method exists but cannot be configured through the API. */
  PAYMENT_METHOD_NOT_CONFIGURABLE: 'PAYMENT_METHOD_NOT_CONFIGURABLE',
} as const;

export type PaymentErrorCode =
  (typeof PaymentErrorCode)[keyof typeof PaymentErrorCode];

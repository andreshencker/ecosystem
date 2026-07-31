// src/payments/enums/payment-account-status.enum.ts

/**
 * Canonical status of a connected payment provider account.
 *
 * - active:        Fully operational; all required capabilities enabled.
 * - restricted:    Operational but some capabilities are limited by the provider.
 * - pending:       Account created but not yet fully verified by the provider.
 * - disconnected:  Credentials are invalid, expired, or have been revoked.
 */
export enum PaymentAccountStatus {
  Active = 'active',
  Restricted = 'restricted',
  Pending = 'pending',
  Disconnected = 'disconnected',
}

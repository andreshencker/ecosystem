// src/payments/contracts/payment-unit.contract.ts
//
// Canonical representation of a currency or tradeable asset that a payment
// provider connection can process.
//
// Provider-agnostic by design:
//   Stripe   → fiat currencies (aud, usd, eur, …)
//   Binance  → crypto/tokens  (usdt, btc, eth, bnb, …)
//
// The frontend must never assume that every provider uses fiat currencies.
// It must consume only this contract and never reference provider-specific
// asset lists or ISO 4217 hardcoded lists.

export type PaymentUnitKind = 'fiat' | 'crypto' | 'token' | 'unknown';

export interface PaymentUnit {
  /**
   * Canonical code — always uppercase.
   * Fiat example: 'AUD', 'USD'
   * Crypto example: 'BTC', 'USDT'
   */
  code: string;

  /** Human-readable label returned or resolved by the provider adapter. */
  label: string;

  /** Category that classifies how this asset is used. */
  kind: PaymentUnitKind;

  /** Optional display symbol (e.g. 'A$', '€', '₿'). */
  symbol?: string;

  /**
   * Blockchain or settlement network for crypto/token assets.
   * Not applicable for fiat. Examples: 'TRC20', 'ERC20', 'BEP20'.
   */
  network?: string;

  /**
   * Provider-specific metadata — safe, non-secret auxiliary information.
   * Consumers must not act on this field for business logic.
   */
  providerMetadata?: Record<string, unknown>;
}

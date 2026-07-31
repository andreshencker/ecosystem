// src/payments/interfaces/payment-provider.interface.ts

import type {
  PaymentProviderCapabilities,
  PaymentProviderMetadata,
  PaymentProviderConnectionResult,
  PaymentProviderContext,
  PaymentProviderRef,
} from '../types/payment.types';
import type { PaymentAccount } from '../contracts/payment-account.contract';
import type { PaymentBalance } from '../contracts/payment-balance.contract';
import type { PaymentMethodConfiguration } from '../contracts/payment-method-configuration.contract';
import type { PaymentAccountVerificationResult } from '../types/payment-account-verification.types';
import type {
  CreatePaymentTestParams,
  PaymentTestResult,
} from '../types/payment-testing.types';
import type { PaymentTestScenario } from '../enums/payment-test-scenario.enum';
import type {
  PaymentListResult,
  PaymentDetail,
  ListPaymentsParams,
} from '../contracts/payment-list.contract';
import type { PaymentUnit } from '../contracts/payment-unit.contract';
import type {
  RefundSummary,
  RefundDetail,
  RefundListResult,
  ListRefundsParams,
  CreateRefundParams,
} from '../contracts/payment-refund-list.contract';
import type {
  PayoutDetail,
  PayoutListResult,
  ListPayoutsParams,
} from '../contracts/payment-payout-list.contract';
import type {
  WebhookEndpointDetail,
  WebhookEndpointCreateResult,
  WebhookEndpointListResult,
  CreateWebhookEndpointParams,
  UpdateWebhookEndpointParams,
  ListWebhookEndpointsParams,
} from '../contracts/payment-webhook-endpoint.contract';
import type { VerifiedWebhookEvent } from '../contracts/payment-webhook-delivery.contract';
import type { GatewayGuide } from '../contracts/payment-gateway-guide.contract';

/**
 * Base contract every payment provider adapter must implement.
 *
 * Technical execution capability contracts are defined as separate interfaces
 * below. Providers implement only the interfaces that match their feature set.
 * This keeps the base contract minimal and prevents providers from being forced
 * to stub dozens of unsupported operations.
 */
export interface IPaymentProvider {
  /** Stable identifier matching the providerKey in the catalog (e.g. 'stripe'). */
  readonly providerKey: string;

  /** Human-readable provider name (e.g. 'Stripe'). */
  readonly displayName: string;

  /** Short description shown in the provider catalogue UI. */
  readonly description: string;

  /**
   * Returns the provider's declared capabilities and their implementation status.
   * Status values: 'available' | 'planned' | 'unsupported'.
   *
   * A capability may only be declared 'available' when its corresponding
   * operation is fully implemented and tested. Never claim 'available'
   * prematurely — callers may try to invoke the operation.
   */
  getCapabilities(): PaymentProviderCapabilities;

  /**
   * Returns static metadata used for catalogue display and discovery.
   * Must not perform any network calls.
   */
  getMetadata(): PaymentProviderMetadata;
}

// ─── Technical execution capability interfaces ────────────────────────────────
// Each interface extends IPaymentProvider so the type predicate relationship
// is structurally sound and type guards can narrow safely.
//
// A provider MUST NOT implement any of these until the corresponding
// operation is fully built — returning a fake response is prohibited.

/** Live connection validation against the provider's API. */
export interface IPaymentConnectionProvider extends IPaymentProvider {
  readonly supportsConnection: true;
  validateConnection(
    credentials: Record<string, unknown>,
  ): Promise<PaymentProviderConnectionResult>;
}

/** One-time payment execution (e.g. charge, payment intent). */
export interface IPaymentTransactionProvider extends IPaymentProvider {
  readonly supportsTransactions: true;
}

/** Hosted or embedded checkout session creation. */
export interface IPaymentCheckoutProvider extends IPaymentProvider {
  readonly supportsCheckout: true;
}

/** Payment method management (attach, detach, list). */
export interface IPaymentMethodProvider extends IPaymentProvider {
  readonly supportsPaymentMethods: true;
}

/** Recurring charge execution (billing cycle charge, usage-based billing). */
export interface IPaymentRecurringChargeProvider extends IPaymentProvider {
  readonly supportsRecurringCharges: true;
}

/**
 * Provider-backed refund listing, detail retrieval, and creation.
 *
 * Replaces the stub IPaymentRefundProvider with a full operational interface.
 * The `supportsRefundListing` discriminant is distinct from `supportsRefunds`
 * so that existing code using the stub is unaffected.
 */
export interface IPaymentRefundProvider extends IPaymentProvider {
  readonly supportsRefundListing: true;
  listRefunds(
    context: PaymentProviderContext,
    params: ListRefundsParams,
  ): Promise<RefundListResult>;
  getRefund(
    context: PaymentProviderContext,
    refundId: string,
  ): Promise<RefundDetail>;
  createRefund(
    context: PaymentProviderContext,
    params: CreateRefundParams,
  ): Promise<RefundDetail>;
}

// Re-export contract types so callers can import from the interface file
export type {
  RefundSummary,
  RefundDetail,
  RefundListResult,
  ListRefundsParams,
  CreateRefundParams,
};

/** Incoming webhook event handling — stub (full definition below). */
export interface _IPaymentWebhookProviderStub extends IPaymentProvider {
  readonly supportsWebhooks: true;
}

/** Dispute retrieval and response submission. */
export interface IPaymentDisputeProvider extends IPaymentProvider {
  readonly supportsDisputes: true;
}

/** Payout management (bank transfers from provider balance — stub, replaced below). */
export interface _IPaymentPayoutProviderStub extends IPaymentProvider {
  readonly supportsPayouts: true;
}

/** Account balance retrieval. */
export interface IPaymentBalanceProvider extends IPaymentProvider {
  readonly supportsBalance: true;
  getBalance(context: PaymentProviderContext): Promise<PaymentBalance>;
}

// ─── Type guards ──────────────────────────────────────────────────────────────
// Each guard uses the `in` operator to check property existence before accessing
// the property value — no unsafe casts.
//
// The `in` check narrows the provider type within the `&&` chain, making
// the subsequent property access and equality comparison type-safe.

export function isConnectionProvider(
  provider: IPaymentProvider,
): provider is IPaymentConnectionProvider {
  return (
    'supportsConnection' in provider &&
    provider.supportsConnection === true &&
    'validateConnection' in provider &&
    typeof provider.validateConnection === 'function'
  );
}

export function isTransactionProvider(
  provider: IPaymentProvider,
): provider is IPaymentTransactionProvider {
  return (
    'supportsTransactions' in provider && provider.supportsTransactions === true
  );
}

export function isCheckoutProvider(
  provider: IPaymentProvider,
): provider is IPaymentCheckoutProvider {
  return 'supportsCheckout' in provider && provider.supportsCheckout === true;
}

export function isMethodProvider(
  provider: IPaymentProvider,
): provider is IPaymentMethodProvider {
  return (
    'supportsPaymentMethods' in provider &&
    provider.supportsPaymentMethods === true
  );
}

export function isRecurringChargeProvider(
  provider: IPaymentProvider,
): provider is IPaymentRecurringChargeProvider {
  return (
    'supportsRecurringCharges' in provider &&
    provider.supportsRecurringCharges === true
  );
}

export function isRefundProvider(
  provider: IPaymentProvider | PaymentProviderRef,
): provider is IPaymentRefundProvider {
  return (
    'supportsRefundListing' in provider &&
    provider.supportsRefundListing === true &&
    'listRefunds' in provider &&
    typeof (provider as Record<string, unknown>)['listRefunds'] ===
      'function' &&
    'createRefund' in provider &&
    typeof (provider as Record<string, unknown>)['createRefund'] === 'function'
  );
}

export function isWebhookProvider(
  provider: IPaymentProvider,
): provider is _IPaymentWebhookProviderStub {
  return 'supportsWebhooks' in provider && provider.supportsWebhooks === true;
}

export function isDisputeProvider(
  provider: IPaymentProvider,
): provider is IPaymentDisputeProvider {
  return 'supportsDisputes' in provider && provider.supportsDisputes === true;
}

// isPayoutProvider moved to the full IPaymentPayoutProvider definition below.

export function isBalanceProvider(
  provider: IPaymentProvider | PaymentProviderRef,
): provider is IPaymentBalanceProvider {
  return (
    'supportsBalance' in provider &&
    provider.supportsBalance === true &&
    'getBalance' in provider &&
    typeof (provider as Record<string, unknown>)['getBalance'] === 'function'
  );
}

/**
 * Payment method configuration management (list, retrieve, update display preferences).
 *
 * This interface extends IPaymentMethodProvider so the supportsPaymentMethods
 * flag is shared. The type guard isPaymentMethodConfigurationProvider checks
 * for the full operation set — use it instead of isMethodProvider when you
 * need to call listPaymentMethodConfigurations / update.
 */
export interface IPaymentMethodConfigurationProvider extends IPaymentProvider {
  readonly supportsPaymentMethods: true;
  listPaymentMethodConfigurations(
    context: PaymentProviderContext,
  ): Promise<PaymentMethodConfiguration[]>;
  getPaymentMethodConfiguration(
    context: PaymentProviderContext,
    methodId: string,
  ): Promise<PaymentMethodConfiguration>;
  updatePaymentMethodConfiguration(
    context: PaymentProviderContext,
    methodId: string,
    enabled: boolean,
  ): Promise<PaymentMethodConfiguration>;
}

export function isPaymentMethodConfigurationProvider(
  provider: IPaymentProvider | PaymentProviderRef,
): provider is IPaymentMethodConfigurationProvider {
  return (
    'supportsPaymentMethods' in provider &&
    provider.supportsPaymentMethods === true &&
    'listPaymentMethodConfigurations' in provider &&
    typeof (provider as Record<string, unknown>)[
      'listPaymentMethodConfigurations'
    ] === 'function'
  );
}

/** Account state retrieval and connection verification. */
export interface IPaymentAccountProvider extends IPaymentProvider {
  readonly supportsAccount: true;
  getAccount(context: PaymentProviderContext): Promise<PaymentAccount>;
  verifyConnection(
    context: PaymentProviderContext,
  ): Promise<PaymentAccountVerificationResult>;
}

/**
 * Type guard that accepts both IPaymentProvider and PaymentProviderRef so it
 * can be used on PaymentProviderRuntimeContext.provider without unsafe casts.
 *
 * After this guard narrows to IPaymentAccountProvider (which extends
 * IPaymentProvider), assertCapability() and other IPaymentProvider methods
 * become valid.
 */
export function isAccountProvider(
  provider: IPaymentProvider | PaymentProviderRef,
): provider is IPaymentAccountProvider {
  return (
    'supportsAccount' in provider &&
    provider.supportsAccount === true &&
    'getAccount' in provider &&
    typeof (provider as Record<string, unknown>)['getAccount'] === 'function' &&
    'verifyConnection' in provider &&
    typeof (provider as Record<string, unknown>)['verifyConnection'] ===
      'function'
  );
}

/** Payment testing capability (test mode only). */
export interface IPaymentTestingProvider extends IPaymentProvider {
  readonly supportsPaymentTesting: true;
  getSupportedTestScenarios(paymentMethodKey: string): PaymentTestScenario[];
  createPaymentTest(
    context: PaymentProviderContext,
    params: CreatePaymentTestParams,
  ): Promise<PaymentTestResult>;
}

export function isTestingProvider(
  provider: IPaymentProvider | PaymentProviderRef,
): provider is IPaymentTestingProvider {
  return (
    'supportsPaymentTesting' in provider &&
    provider.supportsPaymentTesting === true &&
    'getSupportedTestScenarios' in provider &&
    typeof (provider as Record<string, unknown>)[
      'getSupportedTestScenarios'
    ] === 'function' &&
    'createPaymentTest' in provider &&
    typeof (provider as Record<string, unknown>)['createPaymentTest'] ===
      'function'
  );
}

/** Provider-backed payment listing and detail retrieval. */
export interface IPaymentListProvider extends IPaymentProvider {
  readonly supportsPaymentListing: true;
  listPayments(
    context: PaymentProviderContext,
    params: ListPaymentsParams,
  ): Promise<PaymentListResult>;
  getPayment(
    context: PaymentProviderContext,
    paymentId: string,
  ): Promise<PaymentDetail>;
}

export function isPaymentListProvider(
  provider: IPaymentProvider | PaymentProviderRef,
): provider is IPaymentListProvider {
  return (
    'supportsPaymentListing' in provider &&
    provider.supportsPaymentListing === true &&
    'listPayments' in provider &&
    typeof (provider as Record<string, unknown>)['listPayments'] ===
      'function' &&
    'getPayment' in provider &&
    typeof (provider as Record<string, unknown>)['getPayment'] === 'function'
  );
}

/**
 * Provider-driven currency / asset enumeration.
 *
 * Returns the canonical set of PaymentUnit records the provider can process
 * for the connected account. Each unit has an uppercase code, a label, and
 * a kind so that the frontend can display a provider-agnostic selector.
 *
 * Fiat example (Stripe AUD account):  [{ code: 'AUD', label: 'AUD', kind: 'fiat' }]
 * Crypto example (future Binance):    [{ code: 'USDT', ... }, { code: 'BTC', ... }]
 */
export interface IPaymentUnitProvider extends IPaymentProvider {
  readonly supportsPaymentUnits: true;
  listPaymentUnits(context: PaymentProviderContext): Promise<PaymentUnit[]>;
}

export function isPaymentUnitProvider(
  provider: IPaymentProvider | PaymentProviderRef,
): provider is IPaymentUnitProvider {
  return (
    'supportsPaymentUnits' in provider &&
    provider.supportsPaymentUnits === true &&
    'listPaymentUnits' in provider &&
    typeof (provider as Record<string, unknown>)['listPaymentUnits'] ===
      'function'
  );
}

/**
 * Provider-backed payout listing and detail.
 *
 * A payout moves funds from the provider balance to an external destination
 * such as a bank account. Providers that support payouts implement this
 * interface; providers that do not (e.g. payment-only gateways) leave it out.
 *
 * Stripe example:
 *   - listPayouts  → GET /v1/payouts
 *   - getPayout    → GET /v1/payouts/:id
 */
export interface IPaymentPayoutProvider extends IPaymentProvider {
  readonly supportsPayoutListing: true;
  listPayouts(
    context: PaymentProviderContext,
    params: ListPayoutsParams,
  ): Promise<PayoutListResult>;
  getPayout(
    context: PaymentProviderContext,
    payoutId: string,
  ): Promise<PayoutDetail>;
}

export function isPayoutProvider(
  provider: IPaymentProvider | PaymentProviderRef,
): provider is IPaymentPayoutProvider {
  return (
    'supportsPayoutListing' in provider &&
    provider.supportsPayoutListing === true &&
    'listPayouts' in provider &&
    typeof (provider as Record<string, unknown>)['listPayouts'] ===
      'function' &&
    'getPayout' in provider &&
    typeof (provider as Record<string, unknown>)['getPayout'] === 'function'
  );
}

/**
 * Provider webhook endpoint management and signature verification.
 *
 * Providers that support webhook endpoint CRUD and inbound signature
 * verification implement this interface.
 *
 * Stripe: manages endpoints via GET/POST/PATCH/DELETE /v1/webhook_endpoints
 *         and verifies signatures via Stripe.webhooks.constructEvent().
 */
export interface IPaymentWebhookProvider extends IPaymentProvider {
  readonly supportsWebhookEndpoints: true;

  listWebhookEndpoints(
    context: PaymentProviderContext,
    params: ListWebhookEndpointsParams,
  ): Promise<WebhookEndpointListResult>;

  getWebhookEndpoint(
    context: PaymentProviderContext,
    endpointId: string,
  ): Promise<WebhookEndpointDetail>;

  createWebhookEndpoint(
    context: PaymentProviderContext,
    params: CreateWebhookEndpointParams,
  ): Promise<WebhookEndpointCreateResult>;

  updateWebhookEndpoint(
    context: PaymentProviderContext,
    endpointId: string,
    params: UpdateWebhookEndpointParams,
  ): Promise<WebhookEndpointDetail>;

  deleteWebhookEndpoint(
    context: PaymentProviderContext,
    endpointId: string,
  ): Promise<{ deleted: boolean; endpointId: string }>;

  /**
   * Returns the event types this provider recommends for endpoint configuration.
   * Never hardcoded in generic frontend code.
   */
  listSupportedEventTypes(): string[];

  /**
   * Verifies the provider webhook signature using the raw request body.
   * Throws on invalid or missing signature.
   *
   * @param rawBody - Original raw HTTP body bytes (before JSON parsing).
   * @param signatureHeaders - Provider signature headers (e.g. Stripe-Signature).
   * @param signingSecret - Decrypted signing secret for this endpoint.
   */
  verifyWebhookSignature(
    rawBody: Buffer,
    signatureHeaders: Record<string, string>,
    signingSecret: string,
  ): VerifiedWebhookEvent;
}

export function isWebhookEndpointProvider(
  provider: IPaymentProvider | PaymentProviderRef,
): provider is IPaymentWebhookProvider {
  return (
    'supportsWebhookEndpoints' in provider &&
    provider.supportsWebhookEndpoints === true &&
    'listWebhookEndpoints' in provider &&
    typeof (provider as Record<string, unknown>)['listWebhookEndpoints'] ===
      'function' &&
    'verifyWebhookSignature' in provider &&
    typeof (provider as Record<string, unknown>)['verifyWebhookSignature'] ===
      'function'
  );
}

/**
 * Provider that supplies a static integration guide for the developer portal.
 *
 * The guide is rendered by the /payments/gateway page. All provider-specific
 * documentation (steps, examples, presentation types, testing) lives in the
 * provider adapter — never hardcoded in the generic frontend.
 */
export interface IGatewayGuideProvider extends IPaymentProvider {
  readonly supportsGatewayGuide: true;
  getGatewayGuide(): GatewayGuide;
}

export function isGatewayGuideProvider(
  provider: IPaymentProvider | PaymentProviderRef,
): provider is IGatewayGuideProvider {
  return (
    'supportsGatewayGuide' in provider &&
    provider.supportsGatewayGuide === true &&
    'getGatewayGuide' in provider &&
    typeof (provider as Record<string, unknown>)['getGatewayGuide'] ===
      'function'
  );
}

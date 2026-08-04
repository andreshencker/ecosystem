// src/payments/providers/stripe/stripe.provider.ts
//
// Stripe payment provider.
//
// All Stripe SDK imports and all Stripe API logic live in this file.
// Nothing Stripe-specific leaks outside src/payments/providers/stripe/.

import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

import type {
  IPaymentProvider,
  IPaymentConnectionProvider,
  IPaymentAccountProvider,
  IPaymentBalanceProvider,
  IPaymentMethodConfigurationProvider,
  IPaymentTestingProvider,
  IPaymentListProvider,
  IPaymentUnitProvider,
  IPaymentRefundProvider,
  IPaymentPayoutProvider,
  IPaymentWebhookProvider,
  IGatewayGuideProvider,
} from '../../interfaces/payment-provider.interface';
import type { GatewayGuide } from '../../contracts/payment-gateway-guide.contract';
import { STRIPE_GATEWAY_GUIDE } from './stripe.gateway-guide';
import type {
  PaymentProviderCapabilities,
  PaymentProviderMetadata,
  PaymentProviderConnectionResult,
  PaymentProviderContext,
} from '../../types/payment.types';
import type { PaymentUnit } from '../../contracts/payment-unit.contract';
import type { PaymentAccount } from '../../contracts/payment-account.contract';
import type {
  PaymentBalance,
  PaymentBalanceLine,
  BalanceSourceType,
} from '../../contracts/payment-balance.contract';
import type { PaymentMethodConfiguration } from '../../contracts/payment-method-configuration.contract';
import type { PaymentAccountVerificationResult } from '../../types/payment-account-verification.types';
import { PaymentAccountStatus } from '../../enums/payment-account-status.enum';
import type { PaymentAccountCapability } from '../../contracts/payment-account.contract';
import {
  PaymentCredentialsInvalidError,
  PaymentConfigurationInvalidError,
  PaymentMethodNotFoundError,
  PaymentMethodNotConfigurableError,
  PaymentProviderUnavailableError,
} from '../../errors/payment.errors';
import { CapabilityStatus } from '../../enums/payment.enums';
import type { PaymentTestScenario } from '../../enums/payment-test-scenario.enum';
import type {
  CreatePaymentTestParams,
  PaymentTestResult,
} from '../../types/payment-testing.types';
import type {
  ListPaymentsParams,
  PaymentListResult,
  PaymentDetail,
} from '../../contracts/payment-list.contract';
import type {
  RefundListResult,
  RefundDetail,
  ListRefundsParams,
  CreateRefundParams,
} from '../../contracts/payment-refund-list.contract';
import type {
  PayoutListResult,
  PayoutDetail,
  ListPayoutsParams,
} from '../../contracts/payment-payout-list.contract';
import type {
  WebhookEndpointListResult,
  WebhookEndpointDetail,
  WebhookEndpointCreateResult,
  CreateWebhookEndpointParams,
  UpdateWebhookEndpointParams,
  ListWebhookEndpointsParams,
} from '../../contracts/payment-webhook-endpoint.contract';
import type { VerifiedWebhookEvent } from '../../contracts/payment-webhook-delivery.contract';
import { getStripeTestScenarios, executeStripeTest } from './stripe.testing';
import {
  listStripePayments,
  getStripePayment,
  listStripePaymentUnits,
} from './stripe.payments';
import {
  listStripeRefunds,
  getStripeRefund,
  createStripeRefund,
  throwStripeRefundError,
} from './stripe.refunds';
import { listStripePayouts, getStripePayout } from './stripe.payouts';
import {
  listStripeWebhookEndpoints,
  getStripeWebhookEndpoint,
  createStripeWebhookEndpoint,
  updateStripeWebhookEndpoint,
  deleteStripeWebhookEndpoint,
  verifyStripeWebhookSignature,
} from './stripe.webhooks';
import { getStripeRecommendedEventTypes } from './stripe.webhook-events';

import {
  STRIPE_PROVIDER_KEY,
  STRIPE_DISPLAY_NAME,
  STRIPE_DESCRIPTION,
  STRIPE_CONNECTION_TYPE,
} from './stripe.constants';
import { STRIPE_CAPABILITIES } from './stripe.capabilities';
import { StripeCredentialsContract } from './stripe.credentials.contract';
import type {
  IPaymentsPageDefinitionProvider,
  IRefundsPageDefinitionProvider,
  IPaymentTestingPageDefinitionProvider,
} from '../../interfaces/payment-provider.interface';
import type {
  PaymentsPageDefinition,
  PaymentsPageDefinitionContext,
} from '../../contracts/payments-page-definition.contract';
import { buildStripePageDefinition } from './stripe.page-definition';
import type {
  RefundsPageDefinition,
  RefundsPageDefinitionContext,
} from '../../contracts/refunds-page-definition.contract';
import { buildStripeRefundsPageDefinition } from './stripe.refunds-page-definition';
import type {
  PaymentTestingPageDefinition,
  PaymentTestingPageDefinitionContext,
} from '../../contracts/payment-testing-page-definition.contract';
import { buildStripeTestingPageDefinition } from './stripe.testing-page-definition';
import {
  extractStripeMethodEntries,
  mapStripeMethodToCanonical,
  buildStripeUpdateParams,
} from './stripe.payment-methods';

// ─── Stripe SDK configuration ─────────────────────────────────────────────────

const STRIPE_API_VERSION = '2026-06-24.dahlia' as const;
const STRIPE_TIMEOUT_MS = 10_000;

// ─── Internal helpers ─────────────────────────────────────────────────────────

function keyEnvironment(secretKey: string): 'test' | 'live' | null {
  if (secretKey.startsWith('sk_test_')) return 'test';
  if (secretKey.startsWith('sk_live_')) return 'live';
  return null;
}

function mapStripeError(
  err: unknown,
  providerKey: string,
  environment: 'test' | 'live',
): PaymentProviderConnectionResult {
  const base: PaymentProviderConnectionResult = {
    connected: false,
    providerKey,
    checkedAt: new Date(),
    metadata: { environment },
  };

  if (err instanceof Stripe.errors.StripeAuthenticationError) {
    return {
      ...base,
      message:
        'Stripe authentication failed — the secret key was rejected. ' +
        'Verify the key is correct and has not been revoked.',
    };
  }

  if (err instanceof Stripe.errors.StripePermissionError) {
    return {
      ...base,
      message:
        'Stripe permission denied — the key may be a restricted key without account-read access.',
    };
  }

  if (err instanceof Stripe.errors.StripeRateLimitError) {
    return {
      ...base,
      message: 'Stripe rate limit reached. Try again in a few seconds.',
    };
  }

  if (
    err instanceof Stripe.errors.StripeConnectionError ||
    (err instanceof Error && err.message?.toLowerCase().includes('timeout'))
  ) {
    return {
      ...base,
      message:
        'Could not reach Stripe — check your network connection or try again.',
    };
  }

  if (err instanceof Stripe.errors.StripeAPIError) {
    return {
      ...base,
      message:
        'Stripe returned a server error. The service may be temporarily unavailable.',
    };
  }

  if (err instanceof Stripe.errors.StripeInvalidRequestError) {
    return {
      ...base,
      message:
        'Invalid request sent to Stripe. This may indicate a malformed credential.',
    };
  }

  return {
    ...base,
    message: 'An unexpected error occurred while connecting to Stripe.',
  };
}

/**
 * Throws a domain error for Stripe API errors that occur in getAccount /
 * verifyConnection (unlike validateConnection, these throw rather than return
 * a failure result).
 */
function throwStripeAccountError(err: unknown, providerKey: string): never {
  if (
    err instanceof Stripe.errors.StripeAuthenticationError ||
    err instanceof Stripe.errors.StripePermissionError ||
    err instanceof Stripe.errors.StripeInvalidRequestError
  ) {
    throw new PaymentCredentialsInvalidError(
      'Stripe credentials are invalid, revoked, or lack the required permissions.',
    );
  }

  if (
    err instanceof Stripe.errors.StripeConnectionError ||
    err instanceof Stripe.errors.StripeRateLimitError ||
    err instanceof Stripe.errors.StripeAPIError ||
    (err instanceof Error && err.message?.toLowerCase().includes('timeout'))
  ) {
    throw new PaymentProviderUnavailableError(
      providerKey,
      err instanceof Error ? err.message : undefined,
    );
  }

  throw new PaymentProviderUnavailableError(
    providerKey,
    err instanceof Error ? err.message : 'Unexpected error',
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

@Injectable()
export class StripePaymentProvider
  implements
    IPaymentProvider,
    IPaymentConnectionProvider,
    IPaymentAccountProvider,
    IPaymentBalanceProvider,
    IPaymentMethodConfigurationProvider,
    IPaymentTestingProvider,
    IPaymentListProvider,
    IPaymentUnitProvider,
    IPaymentRefundProvider,
    IPaymentPayoutProvider,
    IPaymentWebhookProvider,
    IGatewayGuideProvider,
    IPaymentsPageDefinitionProvider,
    IRefundsPageDefinitionProvider,
    IPaymentTestingPageDefinitionProvider
{
  readonly providerKey: string = STRIPE_PROVIDER_KEY;
  readonly displayName: string = STRIPE_DISPLAY_NAME;
  readonly description: string = STRIPE_DESCRIPTION;
  readonly supportsConnection = true as const;
  readonly supportsAccount = true as const;
  readonly supportsBalance = true as const;
  readonly supportsPaymentMethods = true as const;
  readonly supportsPaymentTesting = true as const;
  readonly supportsPaymentListing = true as const;
  readonly supportsPaymentUnits = true as const;
  readonly supportsRefundListing = true as const;
  readonly supportsPayoutListing = true as const;
  readonly supportsWebhookEndpoints = true as const;
  readonly supportsGatewayGuide = true as const;
  readonly supportsPaymentsPageDefinition = true as const;
  readonly supportsRefundsPageDefinition = true as const;
  readonly supportsPaymentTestingPageDefinition = true as const;

  getCapabilities(): PaymentProviderCapabilities {
    return STRIPE_CAPABILITIES;
  }

  getMetadata(): PaymentProviderMetadata {
    return {
      providerKey: this.providerKey,
      displayName: this.displayName,
      description: this.description,
      connectionType: STRIPE_CONNECTION_TYPE,
    };
  }

  /**
   * Tests the connection to Stripe using the supplied decrypted credentials.
   *
   * Performs GET /v1/account — a real, read-only Stripe API call.
   * Creates no resource, triggers no payment, produces no charge.
   *
   * Credentials arrive pre-decrypted from ChannelsRuntimeResolverService.
   * They must never be logged or returned to the caller.
   *
   * Security invariants:
   *   - secretKey is used only to instantiate the Stripe client; never logged.
   *   - No credential value appears in the returned result or metadata.
   *   - Raw Stripe responses are never forwarded — only safe fields are mapped.
   */
  async validateConnection(
    credentials: Record<string, unknown>,
  ): Promise<PaymentProviderConnectionResult> {
    const providerKey = this.providerKey;

    // 1. Normalize and validate credential structure.
    //    This catches malformed credentials before any network call.
    let creds: ReturnType<typeof StripeCredentialsContract.normalize>['value'];
    try {
      const normalized = StripeCredentialsContract.normalize(credentials);
      StripeCredentialsContract.validate(normalized.value);
      creds = normalized.value;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Malformed Stripe credentials.';
      return {
        connected: false,
        providerKey,
        checkedAt: new Date(),
        message: msg,
      };
    }

    // 2. Derive the actual environment from the secret-key prefix.
    const keyEnv = keyEnvironment(creds.secretKey);
    if (!keyEnv) {
      return {
        connected: false,
        providerKey,
        checkedAt: new Date(),
        message:
          'Unrecognized secret key format — expected sk_test_... or sk_live_...',
      };
    }

    // 3. Reject mode/key mismatch before making any network call.
    if (keyEnv === 'test' && creds.mode === 'live') {
      return {
        connected: false,
        providerKey,
        checkedAt: new Date(),
        metadata: { environment: 'test' },
        message:
          'Mode mismatch: the stored mode is "live" but the secret key belongs to ' +
          'the test environment (sk_test_...). Update the credential mode to "test" ' +
          'or replace the key with a live key.',
      };
    }
    if (keyEnv === 'live' && creds.mode === 'test') {
      return {
        connected: false,
        providerKey,
        checkedAt: new Date(),
        metadata: { environment: 'live' },
        message:
          'Mode mismatch: the stored mode is "test" but the secret key belongs to ' +
          'the live environment (sk_live_...). Update the credential mode to "live" ' +
          'or replace the key with a test key.',
      };
    }

    const environment: 'test' | 'live' = keyEnv;

    // 4. Create a per-request Stripe client.
    //    Each company has its own key — clients must not be shared across requests.
    const client = this.createStripeClient(creds.secretKey);

    // 5. Perform a single read-only Stripe API call: GET /v1/account.
    //    Passing null retrieves the platform account associated with the key.
    //    Creates no resource, triggers no payment, produces no charge.
    try {
      const account = await this.retrieveStripeAccount(client);

      // Map only safe, non-sensitive Stripe account fields to metadata.
      // Stripe SDK types stay inside this file — they are never part of the
      // common PaymentProviderConnectionResult shape.
      const metadata: Record<string, unknown> = { environment };
      if (account.id) metadata['accountIdentifier'] = account.id;
      if (account.business_profile?.name)
        metadata['displayName'] = account.business_profile.name;
      else if (account.email) metadata['displayName'] = account.email;
      if (account.country) metadata['country'] = account.country;
      if (account.default_currency)
        metadata['defaultCurrency'] = account.default_currency;

      return {
        connected: true,
        providerKey,
        checkedAt: new Date(),
        message: 'Stripe connection validated successfully.',
        metadata,
      };
    } catch (err) {
      return mapStripeError(err, providerKey, environment);
    }
  }

  /**
   * Retrieves the live account state from Stripe.
   *
   * Performs GET /v1/account and maps to the canonical PaymentAccount shape.
   * `connectedAt` is not known at the provider level — the service layer enriches
   * it from ProviderCredentials.createdAt after this method returns.
   */
  async getAccount(context: PaymentProviderContext): Promise<PaymentAccount> {
    const secretKey = this.extractSecretKey(context.credentials);
    const environment = keyEnvironment(secretKey);
    const client = this.createStripeClient(secretKey);

    let account: Stripe.Account;
    try {
      account = await this.retrieveStripeAccount(client);
    } catch (err) {
      throwStripeAccountError(err, this.providerKey);
    }

    return this.mapStripeAccountToCanonical(account, context, environment);
  }

  /**
   * Verifies that the stored credentials are currently valid.
   *
   * Returns valid:true for active, restricted, and pending accounts
   * (the credential authenticated successfully). Authentication failures
   * throw rather than returning valid:false.
   */
  async verifyConnection(
    context: PaymentProviderContext,
  ): Promise<PaymentAccountVerificationResult> {
    const secretKey = this.extractSecretKey(context.credentials);
    const client = this.createStripeClient(secretKey);

    let account: Stripe.Account;
    try {
      account = await this.retrieveStripeAccount(client);
    } catch (err) {
      throwStripeAccountError(err, this.providerKey);
    }

    const status = this.mapStripeAccountStatus(account);

    return {
      accountId: context.credentialsId,
      providerKey: this.providerKey,
      valid: true,
      status,
      verifiedAt: new Date(),
    };
  }

  // ─── Payment testing ──────────────────────────────────────────────────────────

  getSupportedTestScenarios(paymentMethodKey: string): PaymentTestScenario[] {
    return getStripeTestScenarios(paymentMethodKey);
  }

  async createPaymentTest(
    context: PaymentProviderContext,
    params: CreatePaymentTestParams,
  ): Promise<PaymentTestResult> {
    const secretKey = this.extractSecretKey(context.credentials);
    const client = this.createStripeClient(secretKey);
    return executeStripeTest(client, context.credentialsId, params);
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private createStripeClient(secretKey: string): Stripe {
    return new Stripe(secretKey, {
      apiVersion: STRIPE_API_VERSION,
      maxNetworkRetries: 0,
      timeout: STRIPE_TIMEOUT_MS,
    });
  }

  private retrieveStripeAccount(client: Stripe): Promise<Stripe.Account> {
    // null retrieves the account that owns the API key (platform account).
    return client.accounts.retrieve(null);
  }

  private extractSecretKey(credentials: Record<string, unknown>): string {
    const key = credentials['secretKey'];
    if (typeof key !== 'string' || !key) {
      throw new PaymentCredentialsInvalidError(
        'Missing or invalid secretKey in Stripe credentials.',
      );
    }
    return key;
  }

  private mapStripeAccountToCanonical(
    account: Stripe.Account,
    context: PaymentProviderContext,
    environment: 'test' | 'live' | null,
  ): PaymentAccount {
    const displayName =
      account.business_profile?.name ??
      (account.settings as { dashboard?: { display_name?: string } } | null)
        ?.dashboard?.display_name ??
      account.email ??
      null;

    return {
      id: context.credentialsId,
      providerKey: this.providerKey,
      environment,
      displayName,
      country: account.country ?? null,
      defaultCurrency: account.default_currency ?? null,
      status: this.mapStripeAccountStatus(account),
      capabilities: this.mapStripeCapabilities(),
      // connectedAt is not known at the provider level — enriched by the service layer.
      connectedAt: null,
      verifiedAt: null,
    };
  }

  private mapStripeAccountStatus(
    account: Stripe.Account,
  ): PaymentAccountStatus {
    const req = account.requirements;
    const currentlyDue = req?.currently_due ?? [];
    const pastDue = req?.past_due ?? [];
    const disabledReason = req?.disabled_reason ?? null;

    if (!account.details_submitted) {
      return PaymentAccountStatus.Pending;
    }

    if (
      account.charges_enabled &&
      account.payouts_enabled &&
      currentlyDue.length === 0 &&
      !disabledReason
    ) {
      return PaymentAccountStatus.Active;
    }

    // Charges are enabled but something limits the account.
    if (
      account.charges_enabled &&
      (currentlyDue.length > 0 || !account.payouts_enabled || disabledReason)
    ) {
      return PaymentAccountStatus.Restricted;
    }

    // details_submitted is true but past_due requirements remain.
    if (pastDue.length > 0 && account.details_submitted) {
      return PaymentAccountStatus.Restricted;
    }

    return PaymentAccountStatus.Pending;
  }

  private mapStripeCapabilities(): PaymentAccountCapability[] {
    const caps = STRIPE_CAPABILITIES.capabilities;
    return Object.entries(caps).map(([name, status]) => ({
      name,
      status:
        status === CapabilityStatus.Available
          ? ('active' as const)
          : ('inactive' as const),
      configurable: false,
    }));
  }

  // ─── Balance ─────────────────────────────────────────────────────────────────

  /**
   * Retrieves the live account balance from Stripe.
   *
   * Performs GET /v1/balance — a real, read-only Stripe API call.
   * Creates no resource, triggers no payment, produces no charge.
   *
   * Security invariants:
   *   - secretKey is used only to instantiate the Stripe client; never logged.
   *   - No credential value appears in the returned PaymentBalance.
   *   - Raw Stripe Balance objects are discarded after mapping.
   *   - Integer minor units are preserved exactly as received from Stripe.
   */
  async getBalance(context: PaymentProviderContext): Promise<PaymentBalance> {
    const secretKey = this.extractSecretKey(context.credentials);
    const client = this.createStripeClient(secretKey);

    let balance: Stripe.Balance;
    try {
      balance = await client.balance.retrieve();
    } catch (err) {
      throwStripeAccountError(err, this.providerKey);
    }

    return {
      accountId: context.credentialsId,
      available: this.mapStripeBalanceLines(balance.available),
      pending: this.mapStripeBalanceLines(balance.pending),
      reserved: this.mapConnectReservedLines(balance.connect_reserved ?? []),
      retrievedAt: new Date(),
    };
  }

  private mapStripeBalanceLines(
    lines: Array<Stripe.Balance.Available | Stripe.Balance.Pending>,
  ): PaymentBalanceLine[] {
    const result: PaymentBalanceLine[] = [];

    for (const line of lines) {
      const currency = line.currency; // Stripe always returns lowercase
      // SourceTypes has well-known keys (card, bank_account, fpx) but no index
      // signature. Cast to permissive record only for iteration — values are always
      // numeric per the Stripe spec.
      const st = line.source_types as
        | Record<string, number | undefined>
        | undefined;

      if (st && Object.keys(st).length > 0) {
        for (const [key, amount] of Object.entries(st)) {
          if (typeof amount === 'number') {
            result.push({
              amountMinor: amount,
              currency,
              sourceType: this.mapStripeSourceType(key),
            });
          }
        }
      } else {
        result.push({
          amountMinor: line.amount,
          currency,
          sourceType: 'other',
        });
      }
    }

    return result;
  }

  private mapConnectReservedLines(
    lines: Array<{ amount: number; currency: string }>,
  ): PaymentBalanceLine[] {
    return lines.map((line) => ({
      amountMinor: line.amount,
      currency: line.currency,
      sourceType: 'other' as BalanceSourceType,
    }));
  }

  private mapStripeSourceType(key: string): BalanceSourceType {
    if (key === 'card') return 'card';
    if (key === 'bank_account') return 'bank_transfer';
    return 'other';
  }

  // ─── Payment method configurations ───────────────────────────────────────────

  /**
   * Retrieves all payment method configurations for the Stripe account.
   *
   * Calls GET /v1/payment_method_configurations, selects the default config
   * (or the first if none is marked default), and maps each present method
   * field to a canonical PaymentMethodConfiguration record.
   *
   * Throws PaymentConfigurationInvalidError when the list is empty.
   */
  async listPaymentMethodConfigurations(
    context: PaymentProviderContext,
  ): Promise<PaymentMethodConfiguration[]> {
    const secretKey = this.extractSecretKey(context.credentials);
    const client = this.createStripeClient(secretKey);

    let configs: Stripe.ApiList<Stripe.PaymentMethodConfiguration>;
    try {
      configs = await client.paymentMethodConfigurations.list();
    } catch (err) {
      throwStripeAccountError(err, this.providerKey);
    }

    if (!configs.data || configs.data.length === 0) {
      throw new PaymentConfigurationInvalidError(
        'No payment method configurations found for this Stripe account.',
      );
    }

    const config = configs.data.find((c) => c.is_default) ?? configs.data[0];

    const entries = extractStripeMethodEntries(config);
    return entries.map((e) =>
      mapStripeMethodToCanonical(e.key, e.data, context.credentialsId),
    );
  }

  /**
   * Retrieves a single payment method configuration by its Stripe field key.
   *
   * Throws PaymentMethodNotFoundError when the methodId is not present in
   * the configuration.
   */
  async getPaymentMethodConfiguration(
    context: PaymentProviderContext,
    methodId: string,
  ): Promise<PaymentMethodConfiguration> {
    const methods = await this.listPaymentMethodConfigurations(context);
    const method = methods.find((m) => m.id === methodId);
    if (!method) {
      throw new PaymentMethodNotFoundError(methodId);
    }
    return method;
  }

  /**
   * Updates the display_preference for a single payment method.
   *
   * Retrieves the current state first to validate configurability, then
   * calls PATCH /v1/payment_method_configurations/:id.
   *
   * Throws PaymentMethodNotFoundError when the methodId does not exist.
   * Throws PaymentMethodNotConfigurableError when the method is not configurable.
   */
  async updatePaymentMethodConfiguration(
    context: PaymentProviderContext,
    methodId: string,
    enabled: boolean,
  ): Promise<PaymentMethodConfiguration> {
    const secretKey = this.extractSecretKey(context.credentials);
    const client = this.createStripeClient(secretKey);

    // 1. Fetch the current config to validate the method exists and is configurable.
    let configs: Stripe.ApiList<Stripe.PaymentMethodConfiguration>;
    try {
      configs = await client.paymentMethodConfigurations.list();
    } catch (err) {
      throwStripeAccountError(err, this.providerKey);
    }

    if (!configs.data || configs.data.length === 0) {
      throw new PaymentConfigurationInvalidError(
        'No payment method configurations found for this Stripe account.',
      );
    }

    const config = configs.data.find((c) => c.is_default) ?? configs.data[0];
    const entries = extractStripeMethodEntries(config);
    const entry = entries.find((e) => e.key === methodId);

    if (!entry) {
      throw new PaymentMethodNotFoundError(methodId);
    }

    const { display_preference: dp } = entry.data;
    // Only overridable===false is truly non-configurable (Connect child config
    // where the parent's setting cannot be overridden). A method with
    // available=false is simply disabled — setting preference='on' enables it.
    if (dp.overridable === false) {
      throw new PaymentMethodNotConfigurableError(
        methodId,
        'method is controlled by the parent configuration',
      );
    }

    // 2. Apply the update to Stripe.
    const updateParams = buildStripeUpdateParams(methodId, enabled);
    let updated: Stripe.PaymentMethodConfiguration;
    try {
      updated = await client.paymentMethodConfigurations.update(
        config.id,
        updateParams as Stripe.PaymentMethodConfigurationUpdateParams,
      );
    } catch (err) {
      // StripeInvalidRequestError during a payment method update means the
      // method is not supported for this account, country, or currency.
      // Map to PaymentMethodNotConfigurableError so the safe Stripe reason
      // is preserved in the response instead of a generic credentials error.
      if (err instanceof Stripe.errors.StripeInvalidRequestError) {
        throw new PaymentMethodNotConfigurableError(methodId, err.message);
      }
      throwStripeAccountError(err, this.providerKey);
    }

    // 3. Map the updated config entry back to canonical.
    const updatedEntries = extractStripeMethodEntries(updated);
    const updatedEntry = updatedEntries.find((e) => e.key === methodId);
    if (!updatedEntry) {
      throw new PaymentMethodNotFoundError(methodId);
    }

    return mapStripeMethodToCanonical(
      updatedEntry.key,
      updatedEntry.data,
      context.credentialsId,
    );
  }

  // ─── Payment listing ──────────────────────────────────────────────────────────

  async listPayments(
    context: PaymentProviderContext,
    params: ListPaymentsParams,
  ): Promise<PaymentListResult> {
    const secretKey = this.extractSecretKey(context.credentials);
    const client = this.createStripeClient(secretKey);
    try {
      return await listStripePayments(client, context.credentialsId, params);
    } catch (err) {
      throwStripeAccountError(err, this.providerKey);
    }
  }

  async getPayment(
    context: PaymentProviderContext,
    paymentId: string,
  ): Promise<PaymentDetail> {
    const secretKey = this.extractSecretKey(context.credentials);
    const client = this.createStripeClient(secretKey);
    try {
      return await getStripePayment(client, context.credentialsId, paymentId);
    } catch (err) {
      throwStripeAccountError(err, this.providerKey);
    }
  }

  // ─── Payment units ────────────────────────────────────────────────────────────

  async listPaymentUnits(
    context: PaymentProviderContext,
  ): Promise<PaymentUnit[]> {
    const secretKey = this.extractSecretKey(context.credentials);
    const client = this.createStripeClient(secretKey);
    try {
      return await listStripePaymentUnits(client);
    } catch (err) {
      throwStripeAccountError(err, this.providerKey);
    }
  }

  // ─── Refunds ──────────────────────────────────────────────────────────────────

  async listRefunds(
    context: PaymentProviderContext,
    params: ListRefundsParams,
  ): Promise<RefundListResult> {
    const secretKey = this.extractSecretKey(context.credentials);
    const client = this.createStripeClient(secretKey);
    try {
      return await listStripeRefunds(client, context.credentialsId, params);
    } catch (err) {
      throwStripeRefundError(err, this.providerKey);
    }
  }

  async getRefund(
    context: PaymentProviderContext,
    refundId: string,
  ): Promise<RefundDetail> {
    const secretKey = this.extractSecretKey(context.credentials);
    const client = this.createStripeClient(secretKey);
    try {
      return await getStripeRefund(client, context.credentialsId, refundId);
    } catch (err) {
      throwStripeRefundError(err, this.providerKey);
    }
  }

  async createRefund(
    context: PaymentProviderContext,
    params: CreateRefundParams,
  ): Promise<RefundDetail> {
    const secretKey = this.extractSecretKey(context.credentials);
    const client = this.createStripeClient(secretKey);
    try {
      return await createStripeRefund(client, context.credentialsId, params);
    } catch (err) {
      throwStripeRefundError(err, this.providerKey);
    }
  }

  // ─── Payouts ──────────────────────────────────────────────────────────────────

  async listPayouts(
    context: PaymentProviderContext,
    params: ListPayoutsParams,
  ): Promise<PayoutListResult> {
    const secretKey = this.extractSecretKey(context.credentials);
    const client = this.createStripeClient(secretKey);
    try {
      return await listStripePayouts(client, context.credentialsId, params);
    } catch (err) {
      throwStripeAccountError(err, this.providerKey);
    }
  }

  async getPayout(
    context: PaymentProviderContext,
    payoutId: string,
  ): Promise<PayoutDetail> {
    const secretKey = this.extractSecretKey(context.credentials);
    const client = this.createStripeClient(secretKey);
    try {
      return await getStripePayout(client, context.credentialsId, payoutId);
    } catch (err) {
      throwStripeAccountError(err, this.providerKey);
    }
  }

  // ─── Webhook endpoint management ─────────────────────────────────────────────

  async listWebhookEndpoints(
    context: PaymentProviderContext,
    params: ListWebhookEndpointsParams,
  ): Promise<WebhookEndpointListResult> {
    const secretKey = this.extractSecretKey(context.credentials);
    const client = this.createStripeClient(secretKey);
    try {
      return await listStripeWebhookEndpoints(
        client,
        context.credentialsId,
        params,
      );
    } catch (err) {
      throwStripeAccountError(err, this.providerKey);
    }
  }

  async getWebhookEndpoint(
    context: PaymentProviderContext,
    endpointId: string,
  ): Promise<WebhookEndpointDetail> {
    const secretKey = this.extractSecretKey(context.credentials);
    const client = this.createStripeClient(secretKey);
    try {
      return await getStripeWebhookEndpoint(
        client,
        context.credentialsId,
        endpointId,
      );
    } catch (err) {
      throwStripeAccountError(err, this.providerKey);
    }
  }

  async createWebhookEndpoint(
    context: PaymentProviderContext,
    params: CreateWebhookEndpointParams,
  ): Promise<WebhookEndpointCreateResult> {
    const secretKey = this.extractSecretKey(context.credentials);
    const client = this.createStripeClient(secretKey);
    try {
      return await createStripeWebhookEndpoint(
        client,
        context.credentialsId,
        params,
      );
    } catch (err) {
      throwStripeAccountError(err, this.providerKey);
    }
  }

  async updateWebhookEndpoint(
    context: PaymentProviderContext,
    endpointId: string,
    params: UpdateWebhookEndpointParams,
  ): Promise<WebhookEndpointDetail> {
    const secretKey = this.extractSecretKey(context.credentials);
    const client = this.createStripeClient(secretKey);
    try {
      return await updateStripeWebhookEndpoint(
        client,
        context.credentialsId,
        endpointId,
        params,
      );
    } catch (err) {
      throwStripeAccountError(err, this.providerKey);
    }
  }

  async deleteWebhookEndpoint(
    context: PaymentProviderContext,
    endpointId: string,
  ): Promise<{ deleted: boolean; endpointId: string }> {
    const secretKey = this.extractSecretKey(context.credentials);
    const client = this.createStripeClient(secretKey);
    try {
      return await deleteStripeWebhookEndpoint(client, endpointId);
    } catch (err) {
      throwStripeAccountError(err, this.providerKey);
    }
  }

  listSupportedEventTypes(): string[] {
    return getStripeRecommendedEventTypes();
  }

  verifyWebhookSignature(
    rawBody: Buffer,
    signatureHeaders: Record<string, string>,
    signingSecret: string,
  ): VerifiedWebhookEvent {
    const sig = signatureHeaders['stripe-signature'] ?? '';
    return verifyStripeWebhookSignature(rawBody, sig, signingSecret);
  }

  getGatewayGuide(): GatewayGuide {
    return STRIPE_GATEWAY_GUIDE;
  }

  getPaymentsPageDefinition(
    context: PaymentsPageDefinitionContext,
  ): Promise<PaymentsPageDefinition> {
    return buildStripePageDefinition(context);
  }

  getRefundsPageDefinition(
    context: RefundsPageDefinitionContext,
  ): Promise<RefundsPageDefinition> {
    return buildStripeRefundsPageDefinition(context);
  }

  getPaymentTestingPageDefinition(
    context: PaymentTestingPageDefinitionContext,
  ): Promise<PaymentTestingPageDefinition> {
    return buildStripeTestingPageDefinition(context);
  }
}

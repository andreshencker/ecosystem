// src/payments/providers/stripe-connect/stripe-connect.provider.ts
//
// Stripe Connect adapter — a separate provider from direct `stripe`. Same
// Stripe SDK and credential shape, but this key is the *platform* account and
// every operation is a Connect operation (v2 accounts, account links,
// destination Checkout charges).

import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

import type {
  IPaymentProvider,
  IPaymentConnectionProvider,
  IPaymentConnectProvider,
  IGatewayGuideProvider,
} from '../../interfaces/payment-provider.interface';
import type {
  PaymentProviderCapabilities,
  PaymentProviderMetadata,
  PaymentProviderConnectionResult,
  PaymentProviderContext,
} from '../../types/payment.types';
import type { GatewayGuide } from '../../contracts/payment-gateway-guide.contract';
import type {
  ConnectedPaymentAccountState,
  ConnectAccountSessionResult,
  ConnectCheckoutResult,
  ConnectOnboardingResult,
  CreateConnectedPaymentAccountParams,
  CreateConnectAccountSessionParams,
  CreateConnectCheckoutParams,
  CreateConnectOnboardingParams,
} from '../../contracts/payment-connect.contract';
import { PaymentCredentialsInvalidError } from '../../errors/payment.errors';

import {
  STRIPE_CONNECT_API_VERSION,
  STRIPE_CONNECT_CONNECTION_TYPE,
  STRIPE_CONNECT_DESCRIPTION,
  STRIPE_CONNECT_DISPLAY_NAME,
  STRIPE_CONNECT_PROVIDER_KEY,
  STRIPE_CONNECT_TIMEOUT_MS,
} from './stripe-connect.constants';
import { STRIPE_CONNECT_CAPABILITIES } from './stripe-connect.capabilities';
import { STRIPE_CONNECT_GATEWAY_GUIDE } from './stripe-connect.gateway-guide';
import { StripeConnectCredentialsContract } from './stripe-connect.credentials.contract';
import {
  createStripeConnectAccountSession,
  createStripeConnectCheckout,
  createStripeConnectOnboarding,
  createStripeConnectedAccount,
  getStripeConnectedAccount,
} from '../stripe/stripe.connect';

function keyEnvironment(secretKey: string): 'test' | 'live' | null {
  if (secretKey.startsWith('sk_test_')) return 'test';
  if (secretKey.startsWith('sk_live_')) return 'live';
  return null;
}

@Injectable()
export class StripeConnectPaymentProvider
  implements
    IPaymentProvider,
    IPaymentConnectionProvider,
    IPaymentConnectProvider,
    IGatewayGuideProvider
{
  readonly providerKey: string = STRIPE_CONNECT_PROVIDER_KEY;
  readonly displayName: string = STRIPE_CONNECT_DISPLAY_NAME;
  readonly description: string = STRIPE_CONNECT_DESCRIPTION;
  readonly supportsConnection = true as const;
  readonly supportsConnect = true as const;
  readonly supportsGatewayGuide = true as const;

  getCapabilities(): PaymentProviderCapabilities {
    return STRIPE_CONNECT_CAPABILITIES;
  }

  getMetadata(): PaymentProviderMetadata {
    return {
      providerKey: this.providerKey,
      displayName: this.displayName,
      description: this.description,
      connectionType: STRIPE_CONNECT_CONNECTION_TYPE,
    };
  }

  getGatewayGuide(): GatewayGuide {
    return STRIPE_CONNECT_GATEWAY_GUIDE;
  }

  // ─── connection test ─────────────────────────────────────────────────────

  async validateConnection(
    credentials: Record<string, unknown>,
  ): Promise<PaymentProviderConnectionResult> {
    let secretKey: string;
    try {
      const normalized = StripeConnectCredentialsContract.normalize(credentials);
      StripeConnectCredentialsContract.validate(normalized.value);
      secretKey = normalized.value.secretKey;
    } catch (err) {
      return {
        connected: false,
        providerKey: this.providerKey,
        checkedAt: new Date(),
        message:
          err instanceof Error ? err.message : 'Malformed Stripe credentials.',
      };
    }

    const environment = keyEnvironment(secretKey);
    const client = this.client(secretKey);
    try {
      // GET /v1/account — null retrieves the account that owns the API key.
      const account = await client.accounts.retrieve(null);
      const metadata: Record<string, unknown> = {};
      if (environment) metadata['environment'] = environment;
      if (account.id) metadata['accountIdentifier'] = account.id;
      // Connect is only usable when the account is a platform.
      const isPlatform = !!account.controller || !!(account as { type?: string }).type;
      return {
        connected: true,
        providerKey: this.providerKey,
        checkedAt: new Date(),
        metadata: { ...metadata, connectPlatform: isPlatform },
        message: isPlatform
          ? 'Connected to the Stripe platform account.'
          : 'Connected, but Connect may not be enabled on this Stripe account.',
      };
    } catch (err) {
      return {
        connected: false,
        providerKey: this.providerKey,
        checkedAt: new Date(),
        message:
          err instanceof Error ? err.message : 'Stripe connection check failed.',
      };
    }
  }

  // ─── connect operations ──────────────────────────────────────────────────

  createConnectedAccount(
    context: PaymentProviderContext,
    params: CreateConnectedPaymentAccountParams,
  ): Promise<ConnectedPaymentAccountState> {
    return createStripeConnectedAccount(this.clientFor(context), params);
  }

  getConnectedAccount(
    context: PaymentProviderContext,
    providerAccountId: string,
  ): Promise<ConnectedPaymentAccountState> {
    return getStripeConnectedAccount(this.clientFor(context), providerAccountId);
  }

  createConnectOnboarding(
    context: PaymentProviderContext,
    params: CreateConnectOnboardingParams,
  ): Promise<ConnectOnboardingResult> {
    return createStripeConnectOnboarding(this.clientFor(context), params);
  }

  createConnectAccountSession(
    context: PaymentProviderContext,
    params: CreateConnectAccountSessionParams,
  ): Promise<ConnectAccountSessionResult> {
    return createStripeConnectAccountSession(this.clientFor(context), params);
  }

  createConnectCheckout(
    context: PaymentProviderContext,
    params: CreateConnectCheckoutParams,
  ): Promise<ConnectCheckoutResult> {
    return createStripeConnectCheckout(this.clientFor(context), params);
  }

  // ─── helpers ─────────────────────────────────────────────────────────────

  private clientFor(context: PaymentProviderContext): Stripe {
    return this.client(this.extractSecretKey(context.credentials));
  }

  private client(secretKey: string): Stripe {
    return new Stripe(secretKey, {
      apiVersion: STRIPE_CONNECT_API_VERSION,
      maxNetworkRetries: 0,
      timeout: STRIPE_CONNECT_TIMEOUT_MS,
    });
  }

  private extractSecretKey(credentials: Record<string, unknown>): string {
    const key = credentials['secretKey'];
    if (typeof key !== 'string' || !key) {
      throw new PaymentCredentialsInvalidError(
        'Missing or invalid secretKey in Stripe Connect credentials.',
      );
    }
    return key;
  }
}

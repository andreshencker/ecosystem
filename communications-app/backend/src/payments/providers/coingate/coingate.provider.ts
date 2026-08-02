// src/payments/providers/coingate/coingate.provider.ts
//
// CoinGate payment provider adapter.
//
// All CoinGate SDK/API logic stays in this directory.
// Nothing CoinGate-specific leaks outside src/payments/providers/coingate/.
//
// No CoinGate external API call is made from getCapabilities(), getMetadata(),
// getGatewayGuide(), or getSupportedTestScenarios() — these are all synchronous.
//
// The implemented interfaces reflect genuinely available CoinGate functionality.

import { Injectable } from '@nestjs/common';

import type {
  IPaymentProvider,
  IPaymentConnectionProvider,
  IPaymentListProvider,
  IPaymentUnitProvider,
  IPaymentRefundProvider,
  IGatewayGuideProvider,
  IPaymentTestingProvider,
  IPaymentsPageDefinitionProvider,
} from '../../interfaces/payment-provider.interface';
import type {
  PaymentsPageDefinition,
  PaymentsPageDefinitionContext,
} from '../../contracts/payments-page-definition.contract';
import { buildCoinGatePageDefinition } from './coingate.page-definition';
import type { GatewayGuide } from '../../contracts/payment-gateway-guide.contract';
import type {
  PaymentProviderCapabilities,
  PaymentProviderMetadata,
  PaymentProviderConnectionResult,
  PaymentProviderContext,
} from '../../types/payment.types';
import type { PaymentUnit } from '../../contracts/payment-unit.contract';
import type {
  PaymentListResult,
  PaymentDetail,
  ListPaymentsParams,
} from '../../contracts/payment-list.contract';
import type {
  RefundListResult,
  RefundDetail,
  CreateRefundParams,
  ListRefundsParams,
} from '../../contracts/payment-refund-list.contract';
import type {
  CreatePaymentTestParams,
  PaymentTestResult,
} from '../../types/payment-testing.types';
import { PaymentTestScenario } from '../../enums/payment-test-scenario.enum';
import { COINGATE_CAPABILITIES } from './coingate.capabilities';
import { COINGATE_GATEWAY_GUIDE } from './coingate.gateway-guide';
import { createCoinGateClient } from './coingate.client';
import { listCoinGatePaymentUnits } from './coingate.currencies';
import {
  listCoinGateOrders,
  getCoinGateOrder,
  createCoinGateOrder,
} from './coingate.orders';
import {
  listCoinGateRefunds,
  getCoinGateRefund,
  createCoinGateRefund,
} from './coingate.refunds';
import { mapCoinGateError } from './coingate.errors';

export const COINGATE_PROVIDER_KEY = 'coingate';
export const COINGATE_DISPLAY_NAME = 'CoinGate';
export const COINGATE_DESCRIPTION =
  'CoinGate cryptocurrency payment gateway. Accept Bitcoin, Ethereum, and 70+ other cryptocurrencies.';
export const COINGATE_CONNECTION_TYPE = 'token';

// CoinGate testing: sandbox-only order creation with a small EUR amount.
// Developers open the payment URL to simulate the crypto payment flow.
// CoinGate maps only to Success since the sandbox redirect handles all scenarios.
const COINGATE_TEST_SCENARIOS = [PaymentTestScenario.Success] as const;

@Injectable()
export class CoingatePaymentProvider
  implements
    IPaymentProvider,
    IPaymentConnectionProvider,
    IPaymentListProvider,
    IPaymentUnitProvider,
    IPaymentRefundProvider,
    IGatewayGuideProvider,
    IPaymentTestingProvider,
    IPaymentsPageDefinitionProvider
{
  // ── IPaymentProvider ────────────────────────────────────────────────────────

  readonly providerKey: string = COINGATE_PROVIDER_KEY;
  readonly displayName: string = COINGATE_DISPLAY_NAME;
  readonly description: string = COINGATE_DESCRIPTION;

  getCapabilities(): PaymentProviderCapabilities {
    return COINGATE_CAPABILITIES;
  }

  getMetadata(): PaymentProviderMetadata {
    return {
      providerKey: COINGATE_PROVIDER_KEY,
      displayName: COINGATE_DISPLAY_NAME,
      description: COINGATE_DESCRIPTION,
      connectionType: COINGATE_CONNECTION_TYPE,
    };
  }

  // ── IPaymentConnectionProvider ──────────────────────────────────────────────

  readonly supportsConnection = true as const;

  /**
   * Validates CoinGate credentials using the dedicated auth test endpoint.
   *
   * Validation operation: GET /auth/test
   * This is the safest CoinGate endpoint for authentication validation:
   *   - Requires only a valid API token.
   *   - Makes no side-effects.
   *   - Does not list or create orders.
   *
   * Normalization (including legacy secretKey → token mapping) is handled
   * by createCoinGateClient, which throws PaymentCredentialsInvalidError
   * locally if the token is absent after normalization.
   */
  async validateConnection(
    credentials: Record<string, unknown>,
  ): Promise<PaymentProviderConnectionResult> {
    // createCoinGateClient normalizes legacy field names and throws
    // PaymentCredentialsInvalidError if the token is missing — propagate it.
    const client = createCoinGateClient(credentials);

    // Derive mode from the resolved base URL to avoid duplicating normalization.
    const mode: 'test' | 'live' = client.baseUrl.includes('sandbox')
      ? 'test'
      : 'live';

    try {
      // Use the dedicated authentication test endpoint — no order access needed.
      await client.get('/auth/test');

      return {
        connected: true,
        providerKey: COINGATE_PROVIDER_KEY,
        checkedAt: new Date(),
        message: `CoinGate ${mode} credentials validated successfully.`,
        metadata: {
          environment: mode,
          baseUrl: client.baseUrl,
        },
      };
    } catch (err) {
      try {
        mapCoinGateError(err);
      } catch (mapped: unknown) {
        return {
          connected: false,
          providerKey: COINGATE_PROVIDER_KEY,
          checkedAt: new Date(),
          message:
            mapped instanceof Error
              ? mapped.message
              : 'CoinGate credential validation failed.',
          metadata: { environment: mode },
        };
      }
      return {
        connected: false,
        providerKey: COINGATE_PROVIDER_KEY,
        checkedAt: new Date(),
        message: 'CoinGate credential validation failed.',
        metadata: { environment: mode },
      };
    }
  }

  // ── IPaymentUnitProvider ────────────────────────────────────────────────────

  readonly supportsPaymentUnits = true as const;

  async listPaymentUnits(
    context: PaymentProviderContext,
  ): Promise<PaymentUnit[]> {
    const client = createCoinGateClient(context.credentials);
    return listCoinGatePaymentUnits(client);
  }

  // ── IPaymentListProvider ────────────────────────────────────────────────────

  readonly supportsPaymentListing = true as const;

  async listPayments(
    context: PaymentProviderContext,
    params: ListPaymentsParams,
  ): Promise<PaymentListResult> {
    const client = createCoinGateClient(context.credentials);
    return listCoinGateOrders(client, context.credentialsId, params);
  }

  async getPayment(
    context: PaymentProviderContext,
    paymentId: string,
  ): Promise<PaymentDetail> {
    const client = createCoinGateClient(context.credentials);
    return getCoinGateOrder(client, context.credentialsId, paymentId);
  }

  // ── IPaymentRefundProvider ──────────────────────────────────────────────────

  readonly supportsRefundListing = true as const;

  async listRefunds(
    context: PaymentProviderContext,
    params: ListRefundsParams,
  ): Promise<RefundListResult> {
    const client = createCoinGateClient(context.credentials);
    return listCoinGateRefunds(client, context.credentialsId, params);
  }

  async getRefund(
    context: PaymentProviderContext,
    refundId: string,
  ): Promise<RefundDetail> {
    const client = createCoinGateClient(context.credentials);
    // CoinGate refund requires orderId:refundId — split on ':' if provided.
    const [orderId, rid] = refundId.includes(':')
      ? refundId.split(':', 2)
      : ['', refundId];
    if (!orderId) {
      throw new Error(
        'CoinGate getRefund requires refundId in the format "orderId:refundId"',
      );
    }
    return getCoinGateRefund(client, context.credentialsId, orderId, rid);
  }

  async createRefund(
    context: PaymentProviderContext,
    params: CreateRefundParams & {
      providerExtensions?: Record<string, unknown>;
    },
  ): Promise<RefundDetail> {
    const client = createCoinGateClient(context.credentials);
    return createCoinGateRefund(client, context.credentialsId, params);
  }

  // ── IPaymentTestingProvider ─────────────────────────────────────────────────

  readonly supportsPaymentTesting = true as const;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getSupportedTestScenarios(_paymentMethodKey: string): PaymentTestScenario[] {
    // CoinGate testing uses sandbox environment only.
    // The only supported test scenario is a standard purchase (create sandbox order).
    return [...COINGATE_TEST_SCENARIOS];
  }

  async createPaymentTest(
    context: PaymentProviderContext,
    params: CreatePaymentTestParams,
  ): Promise<PaymentTestResult> {
    const client = createCoinGateClient(context.credentials);
    const mode = context.credentials['mode'] as string;

    const testReference = `graphify-test-${Date.now()}`;

    const { detail, paymentUrl } = await createCoinGateOrder(client, context, {
      amountMinor: params.amountMinor,
      priceCurrency: params.currency,
      externalReference: testReference,
      title: `Graphify Payment Test ${new Date().toISOString()}`,
      description:
        params.description ?? 'Payment Testing — Graphify sandbox order',
    });

    return {
      providerKey: COINGATE_PROVIDER_KEY,
      connectionId: context.credentialsId,
      environment: mode === 'live' ? 'live' : 'test',
      testId: `cg-test-${detail.id}`,
      providerPaymentId: detail.id,
      paymentMethod: params.paymentMethodKey ?? 'crypto',
      amountMinor: params.amountMinor,
      currency: params.currency,
      status: 'requires_action',
      scenario: params.scenario,
      requiresUserAction: true,
      // Safe: payment URL is returned so the developer can open it in the browser.
      // The token in the URL is the checkout URL — not the API token.
      ...(paymentUrl ? { paymentUrl } : {}),
      createdAt: detail.createdAt,
    };
  }

  // ── IGatewayGuideProvider ───────────────────────────────────────────────────

  readonly supportsGatewayGuide = true as const;

  getGatewayGuide(): GatewayGuide {
    return COINGATE_GATEWAY_GUIDE;
  }

  // ── IPaymentsPageDefinitionProvider ─────────────────────────────────────────

  readonly supportsPaymentsPageDefinition = true as const;

  getPaymentsPageDefinition(
    context: PaymentsPageDefinitionContext,
  ): Promise<PaymentsPageDefinition> {
    return buildCoinGatePageDefinition(context);
  }
}

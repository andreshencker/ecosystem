// src/payments/services/payments-testing.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { isTestingProvider } from '../interfaces/payment-provider.interface';
import {
  PaymentCapabilityNotSupportedError,
  PaymentConfigurationInvalidError,
} from '../errors/payment.errors';
import type { PaymentProviderContext } from '../types/payment.types';
import { PaymentTestScenario } from '../enums/payment-test-scenario.enum';
import type { PaymentTestResult } from '../types/payment-testing.types';
import { CreatePaymentTestDto } from '../dto/create-payment-test.dto';
import { PaymentsService } from './payments.service';

@Injectable()
export class PaymentsTestingService {
  private readonly logger = new Logger(PaymentsTestingService.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Returns the test scenarios supported by the provider for the given payment method.
   *
   * Returns an empty array when the provider does not implement IPaymentTestingProvider
   * rather than throwing — callers use this to gate the test form.
   *
   * @param companyId       - From the authenticated JWT; never from request body.
   * @param connectionId    - ProviderCredentials._id.
   * @param paymentMethodKey - Canonical method key (e.g. 'card').
   */
  async getSupportedScenarios(
    companyId: string,
    connectionId: string,
    paymentMethodKey: string,
  ): Promise<PaymentTestScenario[]> {
    const runtime = await this.paymentsService.resolveRuntime(
      companyId,
      connectionId,
    );

    if (!isTestingProvider(runtime.provider)) return [];

    return runtime.provider.getSupportedTestScenarios(paymentMethodKey);
  }

  /**
   * Executes a payment test against the provider in test mode.
   *
   * Flow:
   *   1. Resolve runtime context (company isolation + credential decryption).
   *   2. Assert the provider implements IPaymentTestingProvider.
   *   3. Confirm the credentials belong to a test environment.
   *   4. For Stripe: confirm the payment method supports programmatic testing
   *      and the requested scenario is supported.
   *      For CoinGate: use the default success scenario.
   *   5. Delegate to the provider's createPaymentTest() method.
   *
   * Security invariants:
   *   - No test result is persisted locally — ephemeral by design.
   *   - No credential value appears in the returned PaymentTestResult.
   *
   * @param companyId - From the authenticated JWT; never from request body.
   * @param dto       - Validated DTO from the controller.
   */
  async createPaymentTest(
    companyId: string,
    dto: CreatePaymentTestDto,
  ): Promise<PaymentTestResult> {
    const {
      connectionId,
      paymentMethodKey,
      amountMinor,
      priceCurrency,
      receiveCurrency,
      paymentUnitCode,
      currency,
      scenario,
      description,
      reference,
    } = dto;

    // Effective currency resolution precedence:
    //   priceCurrency (explicit semantic field for CoinGate) >
    //   paymentUnitCode (legacy generic field) >
    //   currency (backward-compatible Stripe field) >
    //   'USD' (fallback — should never be needed with the definition-driven form)
    const effectiveCurrency =
      priceCurrency ?? paymentUnitCode ?? currency ?? 'USD';

    this.logger.debug(
      `[createPaymentTest] companyId=${companyId} connectionId=${connectionId}`,
    );

    const runtime = await this.paymentsService.resolveRuntime(
      companyId,
      connectionId,
    );

    if (!isTestingProvider(runtime.provider)) {
      throw new PaymentCapabilityNotSupportedError(
        runtime.providerKey,
        'paymentTesting',
      );
    }

    const environment = this.extractEnvironment(runtime.credentials);
    if (environment !== 'test') {
      throw new PaymentConfigurationInvalidError(
        'Payment Testing requires a test or sandbox connection. The selected connection uses live credentials.',
      );
    }

    // For providers that use a payment method key (e.g. Stripe), validate the
    // method and scenario. For providers without a method concept (e.g. CoinGate),
    // the provider's getSupportedTestScenarios() returns a single default scenario
    // and the provider handles it internally.
    const effectiveMethodKey = paymentMethodKey ?? '';
    const supportedScenarios =
      runtime.provider.getSupportedTestScenarios(effectiveMethodKey);

    if (supportedScenarios.length === 0) {
      throw new PaymentCapabilityNotSupportedError(
        runtime.providerKey,
        effectiveMethodKey
          ? `paymentTesting.${effectiveMethodKey}`
          : 'paymentTesting',
      );
    }

    // Use the provided scenario, or fall back to the first supported scenario
    // (for providers like CoinGate that have a single implicit default).
    const effectiveScenario = scenario ?? supportedScenarios[0];

    if (!supportedScenarios.includes(effectiveScenario)) {
      throw new PaymentCapabilityNotSupportedError(
        runtime.providerKey,
        `paymentTesting.scenario.${effectiveScenario}`,
      );
    }

    const context: PaymentProviderContext = {
      providerKey: runtime.providerKey,
      connectionType: runtime.provider.getMetadata().connectionType,
      credentialsId: runtime.accountId,
      isActive: true,
      credentials: runtime.credentials,
    };

    // Build the provider callback URL from the configured API base URL.
    // CoinGate: callback_url is a per-order field set at creation time.
    // Other providers (e.g. Stripe) use registered webhook endpoints instead.
    // The URL is passed through providerExtensions to keep canonical params clean.
    const apiBaseUrl = this.config
      .get<string>('API_BASE_URL', '')
      .replace(/\/$/, '');
    const callbackUrl = apiBaseUrl
      ? `${apiBaseUrl}/payments/callbacks/coingate/${connectionId}`
      : undefined;

    if (callbackUrl) {
      this.logger.debug(`[createPaymentTest] callbackUrl=${callbackUrl}`);
    }

    const providerExtensions: Record<string, unknown> = {
      ...(receiveCurrency ? { receiveCurrency } : {}),
      ...(callbackUrl ? { callbackUrl } : {}),
    };

    return runtime.provider.createPaymentTest(context, {
      paymentMethodKey: effectiveMethodKey,
      amountMinor,
      currency: effectiveCurrency,
      scenario: effectiveScenario,
      description,
      reference,
      ...(Object.keys(providerExtensions).length > 0
        ? { providerExtensions }
        : {}),
    });
  }

  /**
   * Extracts the connection environment from the decrypted credentials.
   *
   * Checks in order:
   *   1. credentials.secretKey prefix (Stripe: sk_test_ → test, sk_live_ → live).
   *      When secretKey is present with a recognised prefix it is authoritative —
   *      a live Stripe key always means live regardless of any mode field.
   *   2. credentials.mode field (CoinGate and future providers that use mode
   *      without a secretKey field).
   *
   * Returns null when neither check resolves a known environment.
   */
  private extractEnvironment(
    credentials: Record<string, unknown>,
  ): 'test' | 'live' | null {
    // Stripe: secretKey prefix is authoritative when present.
    const key = credentials['secretKey'];
    if (typeof key === 'string') {
      if (key.startsWith('sk_test_')) return 'test';
      if (key.startsWith('sk_live_')) return 'live';
      // secretKey exists but has an unrecognised prefix — treat as unknown.
      return null;
    }

    // CoinGate (and future providers): use the explicit mode field.
    const mode = credentials['mode'];
    if (mode === 'test' || mode === 'live') return mode;

    return null;
  }
}

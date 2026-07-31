// src/payments/services/payments-testing.service.ts

import { Injectable, Logger } from '@nestjs/common';

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

  constructor(private readonly paymentsService: PaymentsService) {}

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
   *   4. Confirm the payment method supports programmatic testing.
   *   5. Confirm the requested scenario is supported.
   *   6. Delegate to the provider's createPaymentTest() method.
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
      currency,
      scenario,
      description,
      reference,
    } = dto;

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

    const supportedScenarios =
      runtime.provider.getSupportedTestScenarios(paymentMethodKey);

    if (supportedScenarios.length === 0) {
      throw new PaymentCapabilityNotSupportedError(
        runtime.providerKey,
        `paymentTesting.${paymentMethodKey}`,
      );
    }

    if (!supportedScenarios.includes(scenario)) {
      throw new PaymentCapabilityNotSupportedError(
        runtime.providerKey,
        `paymentTesting.scenario.${scenario}`,
      );
    }

    const context: PaymentProviderContext = {
      providerKey: runtime.providerKey,
      connectionType: runtime.provider.getMetadata().connectionType,
      credentialsId: runtime.accountId,
      isActive: true,
      credentials: runtime.credentials,
    };

    return runtime.provider.createPaymentTest(context, {
      paymentMethodKey,
      amountMinor,
      currency,
      scenario,
      description,
      reference,
    });
  }

  private extractEnvironment(
    credentials: Record<string, unknown>,
  ): 'test' | 'live' | null {
    const key = credentials['secretKey'];
    if (typeof key !== 'string') return null;
    if (key.startsWith('sk_test_')) return 'test';
    if (key.startsWith('sk_live_')) return 'live';
    return null;
  }
}

// src/payments/services/payments-payment-methods.service.ts

import { Injectable, Logger } from '@nestjs/common';

import { PaymentCapability } from '../enums/payment.enums';
import type { PaymentMethodConfiguration } from '../contracts/payment-method-configuration.contract';
import type { PaymentProviderContext } from '../types/payment.types';
import { isPaymentMethodConfigurationProvider } from '../interfaces/payment-provider.interface';
import { PaymentCapabilityNotSupportedError } from '../errors/payment.errors';
import { PaymentsService } from './payments.service';

@Injectable()
export class PaymentsPaymentMethodsService {
  private readonly logger = new Logger(PaymentsPaymentMethodsService.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Lists all payment method configurations for a company's payment account.
   *
   * Flow:
   *   1. Resolve runtime context (company isolation + credential decryption).
   *   2. Assert the provider has the PaymentMethods capability declared as available.
   *   3. Confirm the adapter implements IPaymentMethodConfigurationProvider.
   *   4. Delegate to the provider's listPaymentMethodConfigurations() method.
   *
   * @param companyId - From the authenticated JWT; never from request body.
   * @param accountId - ProviderCredentials._id.
   */
  async listPaymentMethodConfigurations(
    companyId: string,
    accountId: string,
  ): Promise<PaymentMethodConfiguration[]> {
    this.logger.debug(
      `[listPaymentMethodConfigurations] companyId=${companyId} accountId=${accountId}`,
    );

    const runtime = await this.paymentsService.resolveRuntime(
      companyId,
      accountId,
    );

    if (!isPaymentMethodConfigurationProvider(runtime.provider)) {
      throw new PaymentCapabilityNotSupportedError(
        runtime.providerKey,
        PaymentCapability.PaymentMethods,
      );
    }

    this.paymentsService.assertCapability(
      runtime.provider,
      PaymentCapability.PaymentMethods,
    );

    const context: PaymentProviderContext = {
      providerKey: runtime.providerKey,
      connectionType: runtime.provider.getMetadata().connectionType,
      credentialsId: runtime.accountId,
      isActive: true,
      credentials: runtime.credentials,
    };

    return runtime.provider.listPaymentMethodConfigurations(context);
  }

  /**
   * Retrieves a single payment method configuration by its canonical id (= Stripe field key).
   *
   * @param companyId - From the authenticated JWT; never from request body.
   * @param accountId - ProviderCredentials._id.
   * @param methodId  - The canonical method id (e.g. 'card', 'apple_pay').
   */
  async getPaymentMethodConfiguration(
    companyId: string,
    accountId: string,
    methodId: string,
  ): Promise<PaymentMethodConfiguration> {
    this.logger.debug(
      `[getPaymentMethodConfiguration] companyId=${companyId} accountId=${accountId} methodId=${methodId}`,
    );

    const runtime = await this.paymentsService.resolveRuntime(
      companyId,
      accountId,
    );

    if (!isPaymentMethodConfigurationProvider(runtime.provider)) {
      throw new PaymentCapabilityNotSupportedError(
        runtime.providerKey,
        PaymentCapability.PaymentMethods,
      );
    }

    this.paymentsService.assertCapability(
      runtime.provider,
      PaymentCapability.PaymentMethods,
    );

    const context: PaymentProviderContext = {
      providerKey: runtime.providerKey,
      connectionType: runtime.provider.getMetadata().connectionType,
      credentialsId: runtime.accountId,
      isActive: true,
      credentials: runtime.credentials,
    };

    return runtime.provider.getPaymentMethodConfiguration(context, methodId);
  }

  /**
   * Updates the enabled state for a single payment method configuration.
   *
   * @param companyId - From the authenticated JWT; never from request body.
   * @param accountId - ProviderCredentials._id.
   * @param methodId  - The canonical method id (e.g. 'card', 'apple_pay').
   * @param enabled   - Whether to enable or disable the method.
   */
  async updatePaymentMethodConfiguration(
    companyId: string,
    accountId: string,
    methodId: string,
    enabled: boolean,
  ): Promise<PaymentMethodConfiguration> {
    this.logger.debug(
      `[updatePaymentMethodConfiguration] companyId=${companyId} accountId=${accountId} methodId=${methodId} enabled=${String(enabled)}`,
    );

    const runtime = await this.paymentsService.resolveRuntime(
      companyId,
      accountId,
    );

    if (!isPaymentMethodConfigurationProvider(runtime.provider)) {
      throw new PaymentCapabilityNotSupportedError(
        runtime.providerKey,
        PaymentCapability.PaymentMethods,
      );
    }

    this.paymentsService.assertCapability(
      runtime.provider,
      PaymentCapability.PaymentMethods,
    );

    const context: PaymentProviderContext = {
      providerKey: runtime.providerKey,
      connectionType: runtime.provider.getMetadata().connectionType,
      credentialsId: runtime.accountId,
      isActive: true,
      credentials: runtime.credentials,
    };

    return runtime.provider.updatePaymentMethodConfiguration(
      context,
      methodId,
      enabled,
    );
  }
}

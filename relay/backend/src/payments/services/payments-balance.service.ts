// src/payments/services/payments-balance.service.ts

import { Injectable, Logger } from '@nestjs/common';

import { PaymentCapability } from '../enums/payment.enums';
import type { PaymentBalance } from '../contracts/payment-balance.contract';
import type { PaymentProviderContext } from '../types/payment.types';
import { isBalanceProvider } from '../interfaces/payment-provider.interface';
import { PaymentCapabilityNotSupportedError } from '../errors/payment.errors';
import { PaymentsService } from './payments.service';

@Injectable()
export class PaymentsBalanceService {
  private readonly logger = new Logger(PaymentsBalanceService.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Retrieves the live balance for a company's payment account.
   *
   * Flow:
   *   1. Resolve runtime context (company isolation + credential decryption).
   *   2. Assert the provider has the Balance capability declared as available.
   *   3. Confirm the adapter implements IPaymentBalanceProvider.
   *   4. Delegate to the provider's getBalance() method.
   *
   * @param companyId - From the authenticated JWT; never from request body.
   * @param accountId - ProviderCredentials._id.
   */
  async getBalance(
    companyId: string,
    accountId: string,
  ): Promise<PaymentBalance> {
    this.logger.debug(
      `[getBalance] companyId=${companyId} accountId=${accountId}`,
    );

    const runtime = await this.paymentsService.resolveRuntime(
      companyId,
      accountId,
    );

    if (!isBalanceProvider(runtime.provider)) {
      throw new PaymentCapabilityNotSupportedError(
        runtime.providerKey,
        PaymentCapability.Balance,
      );
    }

    // After the guard, runtime.provider is narrowed to IPaymentBalanceProvider
    // (which extends IPaymentProvider) — assertCapability() call is valid.
    this.paymentsService.assertCapability(
      runtime.provider,
      PaymentCapability.Balance,
    );

    const context: PaymentProviderContext = {
      providerKey: runtime.providerKey,
      connectionType: runtime.provider.getMetadata().connectionType,
      credentialsId: runtime.accountId,
      isActive: true,
      credentials: runtime.credentials,
    };

    return runtime.provider.getBalance(context);
  }
}

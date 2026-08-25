// src/payments/services/payments-units.service.ts

import { Injectable, Logger } from '@nestjs/common';

import { isPaymentUnitProvider } from '../interfaces/payment-provider.interface';
import { PaymentCapabilityNotSupportedError } from '../errors/payment.errors';
import type { PaymentProviderContext } from '../types/payment.types';
import type { PaymentUnit } from '../contracts/payment-unit.contract';
import { PaymentsService } from './payments.service';

@Injectable()
export class PaymentsUnitsService {
  private readonly logger = new Logger(PaymentsUnitsService.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Returns the canonical set of payment units (currencies / assets) that the
   * provider adapter resolves for the given connection.
   *
   * Flow:
   *   1. Resolve runtime context (company isolation + credential decryption).
   *   2. Assert the provider implements IPaymentUnitProvider.
   *   3. Delegate to the provider's listPaymentUnits() method.
   *
   * @param companyId - From the authenticated JWT; never from request body.
   * @param accountId - ProviderCredentials._id (the Payments "accountId").
   */
  async listPaymentUnits(
    companyId: string,
    accountId: string,
  ): Promise<{ data: PaymentUnit[] }> {
    this.logger.debug(
      `[listPaymentUnits] companyId=${companyId} accountId=${accountId}`,
    );

    const runtime = await this.paymentsService.resolveRuntime(
      companyId,
      accountId,
    );

    if (!isPaymentUnitProvider(runtime.provider)) {
      throw new PaymentCapabilityNotSupportedError(
        runtime.providerKey,
        'paymentUnits',
      );
    }

    const context: PaymentProviderContext = {
      providerKey: runtime.providerKey,
      connectionType: runtime.provider.getMetadata().connectionType,
      credentialsId: runtime.accountId,
      isActive: true,
      credentials: runtime.credentials,
    };

    const units = await runtime.provider.listPaymentUnits(context);
    return { data: units };
  }
}

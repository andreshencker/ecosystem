// src/payments/services/payments-payouts.service.ts

import { Injectable, Logger } from '@nestjs/common';

import { isPayoutProvider } from '../interfaces/payment-provider.interface';
import { PaymentCapabilityNotSupportedError } from '../errors/payment.errors';
import type { PaymentProviderContext } from '../types/payment.types';
import type {
  PayoutListResult,
  PayoutDetail,
  ListPayoutsParams,
} from '../contracts/payment-payout-list.contract';
import type { ListPayoutsQueryDto } from '../dto/list-payouts.dto';
import { PaymentsService } from './payments.service';

@Injectable()
export class PaymentsPayoutsService {
  private readonly logger = new Logger(PaymentsPayoutsService.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Lists payouts from the provider for a company's payment account.
   *
   * Flow:
   *   1. Resolve runtime context (company isolation + credential decryption).
   *   2. Assert the provider implements IPaymentPayoutProvider.
   *   3. Delegate to the provider's listPayouts() method.
   *
   * @param companyId - From the authenticated JWT; never from request body.
   * @param accountId - ProviderCredentials._id.
   * @param query     - Validated query params (cursor, limit, filters).
   */
  async listPayouts(
    companyId: string,
    accountId: string,
    query: ListPayoutsQueryDto,
  ): Promise<PayoutListResult> {
    this.logger.debug(
      `[listPayouts] companyId=${companyId} accountId=${accountId}`,
    );

    const runtime = await this.paymentsService.resolveRuntime(
      companyId,
      accountId,
    );

    if (!isPayoutProvider(runtime.provider)) {
      throw new PaymentCapabilityNotSupportedError(
        runtime.providerKey,
        'payoutListing',
      );
    }

    const context: PaymentProviderContext = {
      providerKey: runtime.providerKey,
      connectionType: runtime.provider.getMetadata().connectionType,
      credentialsId: runtime.accountId,
      isActive: true,
      credentials: runtime.credentials,
    };

    const params: ListPayoutsParams = {
      limit: query.limit,
      cursor: query.cursor,
      status: query.status,
      currency: query.currency,
      createdFrom: query.createdFrom ? new Date(query.createdFrom) : undefined,
      createdTo: query.createdTo ? new Date(query.createdTo) : undefined,
      arrivalFrom: query.arrivalFrom ? new Date(query.arrivalFrom) : undefined,
      arrivalTo: query.arrivalTo ? new Date(query.arrivalTo) : undefined,
      search: query.search,
    };

    return runtime.provider.listPayouts(context, params);
  }

  /**
   * Retrieves a single payout detail from the provider.
   *
   * @param companyId - From the authenticated JWT; never from request body.
   * @param accountId - ProviderCredentials._id.
   * @param payoutId  - Provider payout identifier (e.g. Stripe po_xxx).
   */
  async getPayout(
    companyId: string,
    accountId: string,
    payoutId: string,
  ): Promise<PayoutDetail> {
    this.logger.debug(
      `[getPayout] companyId=${companyId} accountId=${accountId} payoutId=${payoutId}`,
    );

    const runtime = await this.paymentsService.resolveRuntime(
      companyId,
      accountId,
    );

    if (!isPayoutProvider(runtime.provider)) {
      throw new PaymentCapabilityNotSupportedError(
        runtime.providerKey,
        'payoutListing',
      );
    }

    const context: PaymentProviderContext = {
      providerKey: runtime.providerKey,
      connectionType: runtime.provider.getMetadata().connectionType,
      credentialsId: runtime.accountId,
      isActive: true,
      credentials: runtime.credentials,
    };

    return runtime.provider.getPayout(context, payoutId);
  }
}

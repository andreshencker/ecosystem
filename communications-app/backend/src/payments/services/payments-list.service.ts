// src/payments/services/payments-list.service.ts

import { Injectable, Logger } from '@nestjs/common';

import { isPaymentListProvider } from '../interfaces/payment-provider.interface';
import { PaymentCapabilityNotSupportedError } from '../errors/payment.errors';
import type { PaymentProviderContext } from '../types/payment.types';
import type {
  PaymentListResult,
  PaymentDetail,
  ListPaymentsParams,
} from '../contracts/payment-list.contract';
import type { ListPaymentsQueryDto } from '../dto/list-payments.dto';
import { PaymentsService } from './payments.service';

@Injectable()
export class PaymentsListService {
  private readonly logger = new Logger(PaymentsListService.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Lists payments from the provider for a company's payment account.
   *
   * Flow:
   *   1. Resolve runtime context (company isolation + credential decryption).
   *   2. Assert the provider implements IPaymentListProvider.
   *   3. Delegate to the provider's listPayments() method.
   *
   * @param companyId - From the authenticated JWT; never from request body.
   * @param accountId - ProviderCredentials._id.
   * @param query     - Validated query params (cursor, limit, filters).
   */
  async listPayments(
    companyId: string,
    accountId: string,
    query: ListPaymentsQueryDto,
  ): Promise<PaymentListResult> {
    this.logger.debug(
      `[listPayments] companyId=${companyId} accountId=${accountId}`,
    );

    const runtime = await this.paymentsService.resolveRuntime(
      companyId,
      accountId,
    );

    if (!isPaymentListProvider(runtime.provider)) {
      throw new PaymentCapabilityNotSupportedError(
        runtime.providerKey,
        'paymentListing',
      );
    }

    const context: PaymentProviderContext = {
      providerKey: runtime.providerKey,
      connectionType: runtime.provider.getMetadata().connectionType,
      credentialsId: runtime.accountId,
      isActive: true,
      credentials: runtime.credentials,
    };

    const params: ListPaymentsParams = {
      limit: query.limit,
      cursor: query.cursor,
      status: query.status,
      currency: query.currency,
      createdFrom: query.createdFrom ? new Date(query.createdFrom) : undefined,
      createdTo: query.createdTo ? new Date(query.createdTo) : undefined,
      search: query.search,
    };

    return runtime.provider.listPayments(context, params);
  }

  /**
   * Retrieves a single payment from the provider.
   *
   * @param companyId - From the authenticated JWT; never from request body.
   * @param accountId - ProviderCredentials._id.
   * @param paymentId - Provider payment identifier (e.g. Stripe PaymentIntent id).
   */
  async getPayment(
    companyId: string,
    accountId: string,
    paymentId: string,
  ): Promise<PaymentDetail> {
    this.logger.debug(
      `[getPayment] companyId=${companyId} accountId=${accountId} paymentId=${paymentId}`,
    );

    const runtime = await this.paymentsService.resolveRuntime(
      companyId,
      accountId,
    );

    if (!isPaymentListProvider(runtime.provider)) {
      throw new PaymentCapabilityNotSupportedError(
        runtime.providerKey,
        'paymentListing',
      );
    }

    const context: PaymentProviderContext = {
      providerKey: runtime.providerKey,
      connectionType: runtime.provider.getMetadata().connectionType,
      credentialsId: runtime.accountId,
      isActive: true,
      credentials: runtime.credentials,
    };

    return runtime.provider.getPayment(context, paymentId);
  }
}

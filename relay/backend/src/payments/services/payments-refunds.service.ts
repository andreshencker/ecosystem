// src/payments/services/payments-refunds.service.ts

import { Injectable, Logger } from '@nestjs/common';

import { isRefundProvider } from '../interfaces/payment-provider.interface';
import { PaymentCapabilityNotSupportedError } from '../errors/payment.errors';
import type { PaymentProviderContext } from '../types/payment.types';
import type {
  RefundListResult,
  RefundDetail,
  ListRefundsParams,
  CreateRefundParams,
} from '../contracts/payment-refund-list.contract';
import type { ListRefundsQueryDto } from '../dto/list-refunds.dto';
import type { CreateRefundDto } from '../dto/create-refund.dto';
import { PaymentsService } from './payments.service';

@Injectable()
export class PaymentsRefundsService {
  private readonly logger = new Logger(PaymentsRefundsService.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Lists refunds from the provider for a company's payment account.
   *
   * Flow:
   *   1. Resolve runtime context (company isolation + credential decryption).
   *   2. Assert the provider implements IPaymentRefundProvider.
   *   3. Delegate to the provider's listRefunds() method.
   *
   * @param companyId - From the authenticated JWT; never from request body.
   * @param accountId - ProviderCredentials._id.
   * @param query     - Validated query params (cursor, limit, filters).
   */
  async listRefunds(
    companyId: string,
    accountId: string,
    query: ListRefundsQueryDto,
  ): Promise<RefundListResult> {
    this.logger.debug(
      `[listRefunds] companyId=${companyId} accountId=${accountId}`,
    );

    const runtime = await this.paymentsService.resolveRuntime(
      companyId,
      accountId,
    );

    if (!isRefundProvider(runtime.provider)) {
      throw new PaymentCapabilityNotSupportedError(
        runtime.providerKey,
        'refundListing',
      );
    }

    const context: PaymentProviderContext = {
      providerKey: runtime.providerKey,
      connectionType: runtime.provider.getMetadata().connectionType,
      credentialsId: runtime.accountId,
      isActive: true,
      credentials: runtime.credentials,
    };

    const params: ListRefundsParams = {
      limit: query.limit,
      cursor: query.cursor,
      currency: query.currency,
      createdFrom: query.createdFrom ? new Date(query.createdFrom) : undefined,
      createdTo: query.createdTo ? new Date(query.createdTo) : undefined,
      search: query.search,
    };

    return runtime.provider.listRefunds(context, params);
  }

  /**
   * Retrieves a single refund detail from the provider.
   *
   * @param companyId - From the authenticated JWT; never from request body.
   * @param accountId - ProviderCredentials._id.
   * @param refundId  - Provider refund identifier (e.g. Stripe re_xxx).
   */
  async getRefund(
    companyId: string,
    accountId: string,
    refundId: string,
  ): Promise<RefundDetail> {
    this.logger.debug(
      `[getRefund] companyId=${companyId} accountId=${accountId} refundId=${refundId}`,
    );

    const runtime = await this.paymentsService.resolveRuntime(
      companyId,
      accountId,
    );

    if (!isRefundProvider(runtime.provider)) {
      throw new PaymentCapabilityNotSupportedError(
        runtime.providerKey,
        'refundListing',
      );
    }

    const context: PaymentProviderContext = {
      providerKey: runtime.providerKey,
      connectionType: runtime.provider.getMetadata().connectionType,
      credentialsId: runtime.accountId,
      isActive: true,
      credentials: runtime.credentials,
    };

    return runtime.provider.getRefund(context, refundId);
  }

  /**
   * Creates a new refund through the provider.
   *
   * @param companyId - From the authenticated JWT; never from request body.
   * @param accountId - ProviderCredentials._id.
   * @param dto       - Validated refund creation payload.
   */
  async createRefund(
    companyId: string,
    accountId: string,
    dto: CreateRefundDto,
  ): Promise<RefundDetail> {
    this.logger.debug(
      `[createRefund] companyId=${companyId} accountId=${accountId} paymentId=${dto.paymentId}`,
    );

    const runtime = await this.paymentsService.resolveRuntime(
      companyId,
      accountId,
    );

    if (!isRefundProvider(runtime.provider)) {
      throw new PaymentCapabilityNotSupportedError(
        runtime.providerKey,
        'refundCreation',
      );
    }

    const context: PaymentProviderContext = {
      providerKey: runtime.providerKey,
      connectionType: runtime.provider.getMetadata().connectionType,
      credentialsId: runtime.accountId,
      isActive: true,
      credentials: runtime.credentials,
    };

    const params: CreateRefundParams & {
      providerExtensions?: Record<string, unknown>;
    } = {
      paymentId: dto.paymentId,
      amountMinor: dto.amountMinor,
      reason: dto.reason as CreateRefundParams['reason'],
      metadata: dto.metadata,
      ...(dto.providerExtensions
        ? { providerExtensions: dto.providerExtensions }
        : {}),
    };

    return runtime.provider.createRefund(context, params);
  }
}

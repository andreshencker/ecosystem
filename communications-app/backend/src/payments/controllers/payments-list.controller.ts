// src/payments/controllers/payments-list.controller.ts

import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Query,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';

import {
  PaymentCapabilityNotSupportedError,
  PaymentCredentialChannelMismatchError,
  PaymentCredentialsInvalidError,
  PaymentProviderCredentialsUnavailableError,
  PaymentProviderNotConfiguredError,
  PaymentProviderNotFoundError,
  PaymentProviderUnavailableError,
} from '../errors/payment.errors';
import type {
  PaymentSummary,
  PaymentDetail,
  PaymentListResult,
} from '../contracts/payment-list.contract';
import { ListPaymentsQueryDto } from '../dto/list-payments.dto';
import { PaymentsListService } from '../services/payments-list.service';

// ─── HTTP serialisation ───────────────────────────────────────────────────────
// PaymentSummary.createdAt is a Date; HTTP responses use ISO strings.

type PaymentSummaryHttp = Omit<PaymentSummary, 'createdAt'> & {
  createdAt: string;
};
type PaymentDetailHttp = Omit<PaymentDetail, 'createdAt'> & {
  createdAt: string;
};

type PaymentListHttpResult = {
  data: PaymentSummaryHttp[];
  hasMore: boolean;
  nextCursor?: string;
};

function toPaymentSummaryHttp(p: PaymentSummary): PaymentSummaryHttp {
  return { ...p, createdAt: p.createdAt.toISOString() };
}

function toPaymentDetailHttp(p: PaymentDetail): PaymentDetailHttp {
  return { ...p, createdAt: p.createdAt.toISOString() };
}

function toPaymentListHttpResult(
  result: PaymentListResult,
): PaymentListHttpResult {
  return {
    data: result.data.map(toPaymentSummaryHttp),
    hasMore: result.hasMore,
    nextCursor: result.nextCursor,
  };
}

@ApiTags('Payments — List')
@ApiBearerAuth()
@Controller('payments/accounts')
export class PaymentsListController {
  constructor(private readonly listService: PaymentsListService) {}

  // ─── GET /payments/accounts/:accountId/payments ───────────────────────────

  @Get(':accountId/payments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List payments for a payment account',
    description:
      'Fetches a paginated list of PaymentIntents (or equivalent) from the ' +
      'connected payment provider. Supports cursor-based pagination and optional ' +
      'filtering by status, currency, date range, and search term.',
  })
  @ApiParam({
    name: 'accountId',
    description: 'ProviderCredentials._id (the Payments account identifier)',
    example: '6776e4f1a0c1234567890abc',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Pagination cursor',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Max results (1–100)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by canonical status',
  })
  @ApiQuery({
    name: 'currency',
    required: false,
    description: 'ISO 4217 currency code',
  })
  @ApiQuery({
    name: 'createdFrom',
    required: false,
    description: 'ISO date string lower bound',
  })
  @ApiQuery({
    name: 'createdTo',
    required: false,
    description: 'ISO date string upper bound',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Text search (ID or description)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paginated payment list' })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No company context',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Account not found',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description:
      'Provider not configured, credentials invalid, or capability not supported',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Provider API unavailable',
  })
  async listPayments(
    @CurrentUser() ctx: AuthContext,
    @Param('accountId') accountId: string,
    @Query() query: ListPaymentsQueryDto,
  ): Promise<PaymentListHttpResult> {
    const companyId = this.resolveCompanyId(ctx);

    const result = await this.listService
      .listPayments(companyId, accountId, query)
      .catch((err: unknown): never => this.mapDomainError(err));

    return toPaymentListHttpResult(result);
  }

  // ─── GET /payments/accounts/:accountId/payments/:paymentId ───────────────

  @Get(':accountId/payments/:paymentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retrieve a single payment',
    description:
      'Fetches the full detail of a single payment from the provider. ' +
      'Returns extended fields including capture method, amounts, receipt URL, ' +
      'cancellation reason, and provider metadata.',
  })
  @ApiParam({
    name: 'accountId',
    description: 'ProviderCredentials._id',
    example: '6776e4f1a0c1234567890abc',
  })
  @ApiParam({
    name: 'paymentId',
    description: 'Provider payment identifier (e.g. Stripe PaymentIntent ID)',
    example: 'pi_3OxQ1ELkdIwHu7ix0DLkiKpA',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Payment detail' })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No company context',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Account not found',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description:
      'Provider not configured, credentials invalid, or capability not supported',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Provider API unavailable',
  })
  async getPayment(
    @CurrentUser() ctx: AuthContext,
    @Param('accountId') accountId: string,
    @Param('paymentId') paymentId: string,
  ): Promise<PaymentDetailHttp> {
    const companyId = this.resolveCompanyId(ctx);

    const detail = await this.listService
      .getPayment(companyId, accountId, paymentId)
      .catch((err: unknown): never => this.mapDomainError(err));

    return toPaymentDetailHttp(detail);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private resolveCompanyId(ctx: AuthContext): string {
    if (!ctx?.companyId) {
      throw new UnauthorizedException(
        'No company context in authentication token.',
      );
    }
    return ctx.companyId;
  }

  private mapDomainError(err: unknown): never {
    if (err instanceof PaymentProviderNotFoundError) {
      throw new NotFoundException(err.message);
    }
    if (
      err instanceof PaymentProviderNotConfiguredError ||
      err instanceof PaymentProviderCredentialsUnavailableError ||
      err instanceof PaymentCredentialChannelMismatchError ||
      err instanceof PaymentCapabilityNotSupportedError ||
      err instanceof PaymentCredentialsInvalidError
    ) {
      throw new UnprocessableEntityException(err.message);
    }
    if (err instanceof PaymentProviderUnavailableError) {
      throw new ServiceUnavailableException(err.message);
    }
    throw err;
  }
}

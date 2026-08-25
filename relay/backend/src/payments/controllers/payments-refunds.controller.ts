// src/payments/controllers/payments-refunds.controller.ts

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
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
  RefundSummary,
  RefundDetail,
  RefundListResult,
} from '../contracts/payment-refund-list.contract';
import { ListRefundsQueryDto } from '../dto/list-refunds.dto';
import { CreateRefundDto } from '../dto/create-refund.dto';
import { PaymentsRefundsService } from '../services/payments-refunds.service';

// ─── HTTP serialisation ───────────────────────────────────────────────────────
// RefundSummary.createdAt is a Date; HTTP responses use ISO strings.

type RefundSummaryHttp = Omit<RefundSummary, 'createdAt'> & {
  createdAt: string;
};
type RefundDetailHttp = Omit<RefundDetail, 'createdAt'> & {
  createdAt: string;
};

type RefundListHttpResult = {
  data: RefundSummaryHttp[];
  hasMore: boolean;
  nextCursor?: string;
};

function toRefundSummaryHttp(r: RefundSummary): RefundSummaryHttp {
  return { ...r, createdAt: r.createdAt.toISOString() };
}

function toRefundDetailHttp(r: RefundDetail): RefundDetailHttp {
  return { ...r, createdAt: r.createdAt.toISOString() };
}

function toRefundListHttpResult(
  result: RefundListResult,
): RefundListHttpResult {
  return {
    data: result.data.map(toRefundSummaryHttp),
    hasMore: result.hasMore,
    nextCursor: result.nextCursor,
  };
}

@ApiTags('Payments — Refunds')
@ApiBearerAuth()
@Controller('payments/accounts')
export class PaymentsRefundsController {
  constructor(private readonly refundsService: PaymentsRefundsService) {}

  // ─── GET /payments/accounts/:accountId/refunds ────────────────────────────

  @Get(':accountId/refunds')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List refunds for a payment account',
    description:
      'Fetches a paginated list of refunds from the connected payment provider. ' +
      'Supports cursor-based pagination and optional filtering by currency, date range, ' +
      'and search by refund ID (re_), payment ID (pi_), or charge ID (ch_).',
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
    description: 'Search by ID prefix (re_, pi_, ch_)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paginated refund list' })
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
  async listRefunds(
    @CurrentUser() ctx: AuthContext,
    @Param('accountId') accountId: string,
    @Query() query: ListRefundsQueryDto,
  ): Promise<RefundListHttpResult> {
    const companyId = this.resolveCompanyId(ctx);

    const result = await this.refundsService
      .listRefunds(companyId, accountId, query)
      .catch((err: unknown): never => this.mapDomainError(err));

    return toRefundListHttpResult(result);
  }

  // ─── GET /payments/accounts/:accountId/refunds/:refundId ─────────────────

  @Get(':accountId/refunds/:refundId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retrieve a single refund',
    description:
      'Fetches full detail of a single refund from the provider. ' +
      'Returns extended fields including charge-level amounts (original, refunded, remaining).',
  })
  @ApiParam({
    name: 'accountId',
    description: 'ProviderCredentials._id',
    example: '6776e4f1a0c1234567890abc',
  })
  @ApiParam({
    name: 'refundId',
    description: 'Provider refund identifier (e.g. Stripe re_xxx)',
    example: 're_3OxQ1ELkdIwHu7ix0abc',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Refund detail' })
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
  async getRefund(
    @CurrentUser() ctx: AuthContext,
    @Param('accountId') accountId: string,
    @Param('refundId') refundId: string,
  ): Promise<RefundDetailHttp> {
    const companyId = this.resolveCompanyId(ctx);

    const detail = await this.refundsService
      .getRefund(companyId, accountId, refundId)
      .catch((err: unknown): never => this.mapDomainError(err));

    return toRefundDetailHttp(detail);
  }

  // ─── POST /payments/accounts/:accountId/refunds ───────────────────────────

  @Post(':accountId/refunds')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a refund',
    description:
      'Creates a refund against a succeeded payment. ' +
      'Omit amountMinor to issue a full refund. ' +
      'The provider validates that the requested amount does not exceed the remaining refundable amount.',
  })
  @ApiParam({
    name: 'accountId',
    description: 'ProviderCredentials._id',
    example: '6776e4f1a0c1234567890abc',
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Refund created' })
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
      'Provider not configured, credentials invalid, capability not supported, or business rule violation',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Provider API unavailable',
  })
  async createRefund(
    @CurrentUser() ctx: AuthContext,
    @Param('accountId') accountId: string,
    @Body() dto: CreateRefundDto,
  ): Promise<RefundDetailHttp> {
    const companyId = this.resolveCompanyId(ctx);

    const detail = await this.refundsService
      .createRefund(companyId, accountId, dto)
      .catch((err: unknown): never => this.mapDomainError(err));

    return toRefundDetailHttp(detail);
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

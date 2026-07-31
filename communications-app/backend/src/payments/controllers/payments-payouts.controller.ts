// src/payments/controllers/payments-payouts.controller.ts

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
  PayoutSummary,
  PayoutDetail,
} from '../contracts/payment-payout-list.contract';
import { ListPayoutsQueryDto } from '../dto/list-payouts.dto';
import { PaymentsPayoutsService } from '../services/payments-payouts.service';

// ─── HTTP serialisation ───────────────────────────────────────────────────────
// PayoutSummary.createdAt and estimatedArrivalAt are Dates in the service layer.
// HTTP responses use ISO strings.

type PayoutSummaryHttp = Omit<
  PayoutSummary,
  'createdAt' | 'estimatedArrivalAt'
> & {
  createdAt: string;
  estimatedArrivalAt?: string;
};

type PayoutDetailHttp = Omit<
  PayoutDetail,
  'createdAt' | 'estimatedArrivalAt'
> & {
  createdAt: string;
  estimatedArrivalAt?: string;
};

function toPayoutSummaryHttp(p: PayoutSummary): PayoutSummaryHttp {
  return {
    ...p,
    createdAt: p.createdAt.toISOString(),
    estimatedArrivalAt: p.estimatedArrivalAt?.toISOString(),
  };
}

function toPayoutDetailHttp(p: PayoutDetail): PayoutDetailHttp {
  return {
    ...p,
    createdAt: p.createdAt.toISOString(),
    estimatedArrivalAt: p.estimatedArrivalAt?.toISOString(),
  };
}

@ApiTags('Payments — Payouts')
@ApiBearerAuth()
@Controller('payments/accounts')
export class PaymentsPayoutsController {
  constructor(private readonly payoutsService: PaymentsPayoutsService) {}

  // ─── GET /payments/accounts/:accountId/payouts ────────────────────────────

  @Get(':accountId/payouts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List payouts for a payment account',
    description:
      'Fetches a paginated list of payouts from the connected payment provider. ' +
      'A payout represents funds transferred from the provider balance to an external ' +
      'destination such as a bank account. Supports cursor-based pagination and optional ' +
      'filtering by status, currency, created date range, and arrival date range.',
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
    description: 'ISO date lower bound',
  })
  @ApiQuery({
    name: 'createdTo',
    required: false,
    description: 'ISO date upper bound',
  })
  @ApiQuery({
    name: 'arrivalFrom',
    required: false,
    description: 'Estimated arrival date lower bound',
  })
  @ApiQuery({
    name: 'arrivalTo',
    required: false,
    description: 'Estimated arrival date upper bound',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Payout ID search (po_...)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paginated payout list' })
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
  async listPayouts(
    @CurrentUser() ctx: AuthContext,
    @Param('accountId') accountId: string,
    @Query() query: ListPayoutsQueryDto,
  ): Promise<{
    data: PayoutSummaryHttp[];
    hasMore: boolean;
    nextCursor?: string;
  }> {
    const companyId = this.resolveCompanyId(ctx);

    const result = await this.payoutsService
      .listPayouts(companyId, accountId, query)
      .catch((err: unknown): never => this.mapDomainError(err));

    return {
      data: result.data.map(toPayoutSummaryHttp),
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
    };
  }

  // ─── GET /payments/accounts/:accountId/payouts/:payoutId ─────────────────

  @Get(':accountId/payouts/:payoutId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retrieve a single payout',
    description:
      'Fetches the full detail of a single payout from the provider. ' +
      'Returns extended fields including destination info (safely masked), ' +
      'balance transaction ID, statement descriptor, and failure details.',
  })
  @ApiParam({
    name: 'accountId',
    description: 'ProviderCredentials._id',
    example: '6776e4f1a0c1234567890abc',
  })
  @ApiParam({
    name: 'payoutId',
    description: 'Provider payout identifier (e.g. Stripe po_xxx)',
    example: 'po_1OxQ1ELkdIwHu7ix0DLkiKpA',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Payout detail' })
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
  async getPayout(
    @CurrentUser() ctx: AuthContext,
    @Param('accountId') accountId: string,
    @Param('payoutId') payoutId: string,
  ): Promise<PayoutDetailHttp> {
    const companyId = this.resolveCompanyId(ctx);

    const detail = await this.payoutsService
      .getPayout(companyId, accountId, payoutId)
      .catch((err: unknown): never => this.mapDomainError(err));

    return toPayoutDetailHttp(detail);
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

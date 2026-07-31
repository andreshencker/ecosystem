// src/payments/controllers/payments-accounts.controller.ts

import {
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
import type { PaymentAccount } from '../contracts/payment-account.contract';
import type {
  PaymentAccountSummary,
  PaymentAccountVerificationResult,
} from '../types/payment-account-verification.types';
import { PaymentsAccountsService } from '../services/payments-accounts.service';
import { ListPaymentAccountsQueryDto } from '../dto/list-payment-accounts.dto';

// ─── HTTP serialisation helpers ───────────────────────────────────────────────

type PaymentAccountHttpResponse = Omit<
  PaymentAccount,
  'connectedAt' | 'verifiedAt'
> & {
  connectedAt: string | null;
  verifiedAt: string | null;
};

type PaymentAccountSummaryHttpResponse = Omit<
  PaymentAccountSummary,
  'connectedAt'
> & {
  connectedAt: string | null;
};

type VerificationHttpResponse = Omit<
  PaymentAccountVerificationResult,
  'verifiedAt'
> & {
  verifiedAt: string;
};

function toAccountResponse(
  account: PaymentAccount,
): PaymentAccountHttpResponse {
  return {
    ...account,
    connectedAt: account.connectedAt?.toISOString() ?? null,
    verifiedAt: account.verifiedAt?.toISOString() ?? null,
  };
}

function toSummaryResponse(
  summary: PaymentAccountSummary,
): PaymentAccountSummaryHttpResponse {
  return {
    ...summary,
    connectedAt: summary.connectedAt?.toISOString() ?? null,
  };
}

function toVerificationResponse(
  result: PaymentAccountVerificationResult,
): VerificationHttpResponse {
  return {
    ...result,
    verifiedAt: result.verifiedAt.toISOString(),
  };
}

@ApiTags('Payments — Accounts')
@ApiBearerAuth()
@Controller('payments/accounts')
export class PaymentsAccountsController {
  constructor(private readonly accountsService: PaymentsAccountsService) {}

  // ─── GET /payments/accounts ────────────────────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List configured payment accounts for the authenticated company',
    description:
      'Returns local summary data — no live provider API call. ' +
      'Use GET /payments/accounts/:accountId for live provider state.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Account summaries' })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No company context',
  })
  async listAccounts(
    @CurrentUser() ctx: AuthContext,
    @Query() query: ListPaymentAccountsQueryDto,
  ) {
    const companyId = this.resolveCompanyId(ctx);
    const result = await this.accountsService.listAccounts(companyId, query);
    return {
      data: result.data.map(toSummaryResponse),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    };
  }

  // ─── GET /payments/accounts/:accountId ────────────────────────────────────

  @Get(':accountId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get live state of a payment account from the provider',
    description:
      'Performs a live read-only API call to the provider. ' +
      'Creates no resource and triggers no payment.',
  })
  @ApiParam({
    name: 'accountId',
    description: 'ProviderCredentials._id (the Payments account identifier)',
    example: '6776e4f1a0c1234567890abc',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Live account state' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Account not found',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Configuration error',
  })
  async getAccount(
    @CurrentUser() ctx: AuthContext,
    @Param('accountId') accountId: string,
  ): Promise<PaymentAccountHttpResponse> {
    const companyId = this.resolveCompanyId(ctx);
    const account = await this.accountsService
      .getAccount(companyId, accountId)
      .catch((err: unknown): never => this.mapDomainError(err));
    return toAccountResponse(account);
  }

  // ─── POST /payments/accounts/:accountId/verify ────────────────────────────

  @Post(':accountId/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify stored credentials are valid against the provider',
    description:
      'Uses the stored credential configuration only — never accepts credentials in the request body.',
  })
  @ApiParam({
    name: 'accountId',
    description: 'ProviderCredentials._id',
    example: '6776e4f1a0c1234567890abc',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verification result (see valid field)',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No company context',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Account not found',
  })
  async verifyAccount(
    @CurrentUser() ctx: AuthContext,
    @Param('accountId') accountId: string,
  ): Promise<VerificationHttpResponse> {
    const companyId = this.resolveCompanyId(ctx);
    const result = await this.accountsService
      .verifyAccount(companyId, accountId)
      .catch((err: unknown): never => this.mapDomainError(err));
    return toVerificationResponse(result);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

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
      err instanceof PaymentCapabilityNotSupportedError
    ) {
      throw new UnprocessableEntityException(err.message);
    }
    if (err instanceof PaymentCredentialsInvalidError) {
      throw new UnprocessableEntityException(err.message);
    }
    if (err instanceof PaymentProviderUnavailableError) {
      throw new ServiceUnavailableException(err.message);
    }
    throw err;
  }
}

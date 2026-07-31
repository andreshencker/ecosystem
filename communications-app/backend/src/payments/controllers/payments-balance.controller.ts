// src/payments/controllers/payments-balance.controller.ts

import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
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
import type { PaymentBalance } from '../contracts/payment-balance.contract';
import { PaymentsBalanceService } from '../services/payments-balance.service';

// ─── HTTP serialisation ───────────────────────────────────────────────────────
// PaymentBalance.retrievedAt is a Date; HTTP responses use ISO strings.

type BalanceHttpResponse = Omit<PaymentBalance, 'retrievedAt'> & {
  retrievedAt: string;
};

function toBalanceResponse(balance: PaymentBalance): BalanceHttpResponse {
  return { ...balance, retrievedAt: balance.retrievedAt.toISOString() };
}

@ApiTags('Payments — Balance')
@ApiBearerAuth()
@Controller('payments/accounts')
export class PaymentsBalanceController {
  constructor(private readonly balanceService: PaymentsBalanceService) {}

  // ─── GET /payments/accounts/:accountId/balance ───────────────────────────

  @Get(':accountId/balance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retrieve live balance for a payment account',
    description:
      'Performs a real, read-only API call to the provider. ' +
      'Returns the current funds held: available, pending, and reserved. ' +
      'Creates no resource and triggers no payment.',
  })
  @ApiParam({
    name: 'accountId',
    description: 'ProviderCredentials._id (the Payments account identifier)',
    example: '6776e4f1a0c1234567890abc',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Live balance snapshot',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No company context',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Account not found or not accessible',
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
  async getBalance(
    @CurrentUser() ctx: AuthContext,
    @Param('accountId') accountId: string,
  ): Promise<BalanceHttpResponse> {
    const companyId = this.resolveCompanyId(ctx);

    const balance = await this.balanceService
      .getBalance(companyId, accountId)
      .catch((err: unknown): never => this.mapDomainError(err));

    return toBalanceResponse(balance);
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

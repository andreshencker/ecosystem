// src/payments/controllers/payments-units.controller.ts

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
import type { PaymentUnit } from '../contracts/payment-unit.contract';
import { PaymentsUnitsService } from '../services/payments-units.service';

@ApiTags('Payments — Units')
@ApiBearerAuth()
@Controller('payments/accounts')
export class PaymentsUnitsController {
  constructor(private readonly unitsService: PaymentsUnitsService) {}

  // ─── GET /payments/accounts/:accountId/payment-units ──────────────────────

  @Get(':accountId/payment-units')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'List available payment units (currencies / assets) for a connection',
    description:
      'Returns the canonical set of currencies or assets that the connected ' +
      'payment provider can process for this account. ' +
      'For Stripe, returns only currencies present in recent PaymentIntents or the ' +
      'account Balance — not the full ISO 4217 catalogue. ' +
      'For future crypto providers (e.g. Binance), returns asset codes such as USDT, BTC, ETH.',
  })
  @ApiParam({
    name: 'accountId',
    description: 'ProviderCredentials._id (the Payments account identifier)',
    example: '6776e4f1a0c1234567890abc',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of canonical payment units',
    schema: {
      example: {
        data: [
          { code: 'AUD', label: 'AUD', kind: 'fiat' },
          { code: 'USD', label: 'USD', kind: 'fiat' },
        ],
      },
    },
  })
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
  async listPaymentUnits(
    @CurrentUser() ctx: AuthContext,
    @Param('accountId') accountId: string,
  ): Promise<{ data: PaymentUnit[] }> {
    const companyId = this.resolveCompanyId(ctx);

    return this.unitsService
      .listPaymentUnits(companyId, accountId)
      .catch((err: unknown): never => this.mapDomainError(err));
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

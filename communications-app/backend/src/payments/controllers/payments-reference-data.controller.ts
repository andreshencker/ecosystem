// src/payments/controllers/payments-reference-data.controller.ts

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
import { PaymentsReferenceDataService } from '../services/payments-reference-data.service';

@ApiTags('Payments — Reference Data')
@ApiBearerAuth()
@Controller('payments/connections')
export class PaymentsReferenceDataController {
  constructor(
    private readonly referenceDataService: PaymentsReferenceDataService,
  ) {}

  // ─── GET /payments/connections/:connectionId/reference-data/:source ───────

  @Get(':connectionId/reference-data/:source')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get provider-backed reference data for a specific source',
    description:
      'Returns a controlled option list for the declared reference-data source. ' +
      'Each source is a semantically distinct concept: price_currencies returns ' +
      'only fiat currencies valid for price denomination; receive_currencies returns ' +
      'settlement assets; payment_assets returns all buyer-selectable assets. ' +
      'The connection determines the provider — providerKey is never taken from ' +
      'the frontend. Never returns provider credentials or secrets.',
  })
  @ApiParam({
    name: 'connectionId',
    description: 'ProviderCredentials._id (the Payments account identifier)',
    example: '6776e4f1a0c1234567890abc',
  })
  @ApiParam({
    name: 'source',
    description:
      'Controlled reference-data source key. ' +
      'Valid values: price_currencies, receive_currencies, payment_assets, ' +
      'payment_methods, refund_reasons, countries, networks, webhook_events.',
    example: 'price_currencies',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Canonical reference-data option list.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No company context in the JWT.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Connection not found or does not belong to this company.',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description:
      'Source is not supported, provider not configured, or credentials unavailable.',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Provider API temporarily unavailable.',
  })
  async getReferenceData(
    @CurrentUser() ctx: AuthContext,
    @Param('connectionId') connectionId: string,
    @Param('source') source: string,
  ) {
    const companyId = this.resolveCompanyId(ctx);
    return this.referenceDataService
      .getReferenceData(companyId, connectionId, source)
      .catch((err: unknown) => this.mapDomainError(err));
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

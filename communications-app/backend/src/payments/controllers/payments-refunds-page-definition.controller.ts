// src/payments/controllers/payments-refunds-page-definition.controller.ts

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
import { PaymentsRefundsPageDefinitionService } from '../services/payments-refunds-page-definition.service';

@ApiTags('Payments — Refunds Page Definition')
@ApiBearerAuth()
@Controller('payments/connections')
export class PaymentsRefundsPageDefinitionController {
  constructor(
    private readonly refundsPageDefinitionService: PaymentsRefundsPageDefinitionService,
  ) {}

  // ─── GET /payments/connections/:connectionId/refunds/page-definition ──────

  @Get(':connectionId/refunds/page-definition')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get the Refunds page definition for a specific connection',
    description:
      'Returns the canonical definition that drives the Refunds page: ' +
      'toolbar actions, filters, table columns, row actions, create form fields, ' +
      'and list configuration. ' +
      'The definition reflects both provider-level and connection-level capabilities. ' +
      'Never returns provider credentials or secrets.',
  })
  @ApiParam({
    name: 'connectionId',
    description: 'ProviderCredentials._id (the Payments account identifier)',
    example: '6776e4f1a0c1234567890abc',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Canonical refunds page definition for the selected connection.',
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
    description: 'Provider not configured or credentials unavailable.',
  })
  async getRefundsPageDefinition(
    @CurrentUser() ctx: AuthContext,
    @Param('connectionId') connectionId: string,
  ) {
    const companyId = this.resolveCompanyId(ctx);
    return this.refundsPageDefinitionService
      .getRefundsPageDefinition(companyId, connectionId)
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

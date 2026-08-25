// src/payments/controllers/payments-page-definition.controller.ts

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
import { PaymentsPageDefinitionService } from '../services/payments-page-definition.service';

@ApiTags('Payments — Page Definition')
@ApiBearerAuth()
@Controller('payments/connections')
export class PaymentsPageDefinitionController {
  constructor(
    private readonly pageDefinitionService: PaymentsPageDefinitionService,
  ) {}

  // ─── GET /payments/connections/:connectionId/page-definition ──────────────

  @Get(':connectionId/page-definition')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get the Payments page definition for a specific connection',
    description:
      'Returns the canonical definition that drives the Payments list page: ' +
      'summary cards, filters, table columns, row actions, and list configuration. ' +
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
    description: 'Canonical page definition for the selected connection.',
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
  async getPageDefinition(
    @CurrentUser() ctx: AuthContext,
    @Param('connectionId') connectionId: string,
  ) {
    const companyId = this.resolveCompanyId(ctx);
    return this.pageDefinitionService
      .getPageDefinition(companyId, connectionId)
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

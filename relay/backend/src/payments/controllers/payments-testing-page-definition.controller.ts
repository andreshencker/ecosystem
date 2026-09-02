// src/payments/controllers/payments-testing-page-definition.controller.ts

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
import { PaymentsTestingPageDefinitionService } from '../services/payments-testing-page-definition.service';

@ApiTags('Payments — Testing Page Definition')
@ApiBearerAuth()
@Controller('payments/connections')
export class PaymentsTestingPageDefinitionController {
  constructor(
    private readonly testingPageDefinitionService: PaymentsTestingPageDefinitionService,
  ) {}

  // ─── GET /payments/connections/:connectionId/testing/page-definition ──────

  @Get(':connectionId/testing/page-definition')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Get the Payment Testing page definition for a specific connection',
    description:
      'Returns the canonical definition that drives the Payment Testing page: ' +
      'form fields, submit label, result presentation type, instructions, and ' +
      'known limitations. ' +
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
      'Canonical payment testing page definition for the selected connection.',
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
  async getTestingPageDefinition(
    @CurrentUser() ctx: AuthContext,
    @Param('connectionId') connectionId: string,
  ) {
    const companyId = this.resolveCompanyId(ctx);
    return this.testingPageDefinitionService
      .getTestingPageDefinition(companyId, connectionId)
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

// src/payments/controllers/payments-payment-methods.controller.ts

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
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
  PaymentConfigurationInvalidError,
  PaymentCredentialChannelMismatchError,
  PaymentCredentialsInvalidError,
  PaymentMethodNotConfigurableError,
  PaymentMethodNotFoundError,
  PaymentProviderCredentialsUnavailableError,
  PaymentProviderNotConfiguredError,
  PaymentProviderNotFoundError,
  PaymentProviderUnavailableError,
} from '../errors/payment.errors';
import type { PaymentMethodConfiguration } from '../contracts/payment-method-configuration.contract';
import { PaymentsPaymentMethodsService } from '../services/payments-payment-methods.service';
import { UpdatePaymentMethodDto } from '../dto/update-payment-method.dto';

@ApiTags('Payments — Payment Methods')
@ApiBearerAuth()
@Controller('payments/accounts')
export class PaymentsPaymentMethodsController {
  constructor(
    private readonly paymentMethodsService: PaymentsPaymentMethodsService,
  ) {}

  // ─── GET /payments/accounts/:accountId/payment-methods ──────────────────

  @Get(':accountId/payment-methods')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all payment method configurations for a payment account',
    description:
      'Performs a real, read-only API call to the provider. ' +
      'Returns a list of payment methods with their availability, enabled state, ' +
      'and configurability. Creates no resource and triggers no payment.',
  })
  @ApiParam({
    name: 'accountId',
    description: 'ProviderCredentials._id (the Payments account identifier)',
    example: '6776e4f1a0c1234567890abc',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of payment method configurations',
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
      'Provider not configured, credentials invalid, capability not supported, or configuration invalid',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Provider API unavailable',
  })
  async listPaymentMethods(
    @CurrentUser() ctx: AuthContext,
    @Param('accountId') accountId: string,
  ): Promise<{ data: PaymentMethodConfiguration[]; total: number }> {
    const companyId = this.resolveCompanyId(ctx);

    const methods = await this.paymentMethodsService
      .listPaymentMethodConfigurations(companyId, accountId)
      .catch((err: unknown): never => this.mapDomainError(err));

    return { data: methods, total: methods.length };
  }

  // ─── GET /payments/accounts/:accountId/payment-methods/:methodId ────────

  @Get(':accountId/payment-methods/:methodId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retrieve a single payment method configuration',
    description:
      'Returns the configuration for a single payment method identified by its ' +
      'canonical id (Stripe field key, e.g. "card", "apple_pay").',
  })
  @ApiParam({
    name: 'accountId',
    description: 'ProviderCredentials._id (the Payments account identifier)',
    example: '6776e4f1a0c1234567890abc',
  })
  @ApiParam({
    name: 'methodId',
    description: 'Canonical payment method id (= Stripe field key)',
    example: 'card',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment method configuration',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Account or payment method not found',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Provider not configured or capability not supported',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Provider API unavailable',
  })
  async getPaymentMethod(
    @CurrentUser() ctx: AuthContext,
    @Param('accountId') accountId: string,
    @Param('methodId') methodId: string,
  ): Promise<PaymentMethodConfiguration> {
    const companyId = this.resolveCompanyId(ctx);

    return this.paymentMethodsService
      .getPaymentMethodConfiguration(companyId, accountId, methodId)
      .catch((err: unknown): never => this.mapDomainError(err));
  }

  // ─── PATCH /payments/accounts/:accountId/payment-methods/:methodId ──────

  @Patch(':accountId/payment-methods/:methodId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update the enabled state of a payment method',
    description:
      'Enables or disables a payment method by updating its display_preference ' +
      'in the provider configuration. Only configurable methods can be updated.',
  })
  @ApiParam({
    name: 'accountId',
    description: 'ProviderCredentials._id (the Payments account identifier)',
    example: '6776e4f1a0c1234567890abc',
  })
  @ApiParam({
    name: 'methodId',
    description: 'Canonical payment method id (= Stripe field key)',
    example: 'card',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Updated payment method configuration',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Account or payment method not found',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description:
      'Method is not configurable or provider capability not supported',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Provider API unavailable',
  })
  async updatePaymentMethod(
    @CurrentUser() ctx: AuthContext,
    @Param('accountId') accountId: string,
    @Param('methodId') methodId: string,
    @Body() dto: UpdatePaymentMethodDto,
  ): Promise<PaymentMethodConfiguration> {
    const companyId = this.resolveCompanyId(ctx);

    return this.paymentMethodsService
      .updatePaymentMethodConfiguration(
        companyId,
        accountId,
        methodId,
        dto.enabled,
      )
      .catch((err: unknown): never => this.mapDomainError(err));
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
    if (
      err instanceof PaymentProviderNotFoundError ||
      err instanceof PaymentMethodNotFoundError
    ) {
      throw new NotFoundException(err.message);
    }
    if (
      err instanceof PaymentProviderNotConfiguredError ||
      err instanceof PaymentProviderCredentialsUnavailableError ||
      err instanceof PaymentCredentialChannelMismatchError ||
      err instanceof PaymentCapabilityNotSupportedError ||
      err instanceof PaymentCredentialsInvalidError ||
      err instanceof PaymentConfigurationInvalidError ||
      err instanceof PaymentMethodNotConfigurableError
    ) {
      throw new UnprocessableEntityException(err.message);
    }
    if (err instanceof PaymentProviderUnavailableError) {
      throw new ServiceUnavailableException(err.message);
    }
    throw err;
  }
}

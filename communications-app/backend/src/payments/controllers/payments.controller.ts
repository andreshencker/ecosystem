// src/payments/controllers/payments.controller.ts

import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
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

import { PaymentsService } from '../services/payments.service';
import { PaymentsResolverService } from '../services/payments-resolver.service';
import {
  isConnectionProvider,
  isGatewayGuideProvider,
} from '../interfaces/payment-provider.interface';
import {
  PaymentProviderNotFoundError,
  PaymentProviderNotConfiguredError,
  PaymentProviderCredentialsUnavailableError,
  PaymentConnectionTestUnsupportedError,
  PaymentCredentialChannelMismatchError,
} from '../errors/payment.errors';
import type { PaymentProviderConnectionResult } from '../types/payment.types';

// ─── HTTP response serialisation ──────────────────────────────────────────────
// PaymentProviderConnectionResult.checkedAt is a Date; HTTP responses use ISO strings.

type TestConnectionHttpResponse = Omit<
  PaymentProviderConnectionResult,
  'checkedAt'
> & {
  checkedAt: string;
};

function toHttpResponse(
  result: PaymentProviderConnectionResult,
): TestConnectionHttpResponse {
  return { ...result, checkedAt: result.checkedAt.toISOString() };
}

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly service: PaymentsService,
    private readonly resolver: PaymentsResolverService,
  ) {}

  // ─── GET /payments/providers ────────────────────────────────────────────────

  @Get('providers')
  @HttpCode(200)
  @ApiOperation({ summary: 'List registered payment providers' })
  listProviders() {
    return this.service.listProviders();
  }

  // ─── GET /payments/providers/:providerKey/gateway-guide ────────────────────

  @Get('providers/:providerKey/gateway-guide')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Get the integration guide for a payment provider',
    description:
      'Returns the provider-supplied integration guide for the /payments/gateway developer portal. ' +
      'All provider-specific documentation lives in the provider adapter — ' +
      'the generic frontend renders this data without Stripe-specific logic.',
  })
  @ApiParam({ name: 'providerKey', example: 'stripe' })
  @ApiResponse({ status: 200, description: 'Integration guide returned.' })
  @ApiResponse({ status: 404, description: 'Provider not registered.' })
  @ApiResponse({
    status: 422,
    description: 'Provider does not supply a gateway guide.',
  })
  getGatewayGuide(@Param('providerKey') providerKey: string) {
    try {
      const provider = this.service.resolveProvider(providerKey);
      if (!isGatewayGuideProvider(provider)) {
        throw new UnprocessableEntityException(
          `Provider "${providerKey}" does not supply a gateway integration guide.`,
        );
      }
      return provider.getGatewayGuide();
    } catch (err) {
      this.mapDomainError(err);
    }
  }

  // ─── GET /payments/providers/:providerKey/capabilities ─────────────────────

  @Get('providers/:providerKey/capabilities')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get declared capabilities for a payment provider' })
  @ApiParam({ name: 'providerKey', example: 'stripe' })
  getCapabilities(@Param('providerKey') providerKey: string) {
    try {
      return this.service.getCapabilities(providerKey);
    } catch (err) {
      this.mapDomainError(err);
    }
  }

  // ─── POST /payments/providers/:providerKey/validate ─────────────────────────
  // Validates the most-recently-updated active credential for the provider.
  // Kept for backward compatibility and automated health checks.

  @Post('providers/:providerKey/validate')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Validate credentials for a payment provider (uses most-recent active credential)',
    description:
      "Decrypts the company's most recently updated active credential for the provider " +
      "and passes them to the provider's connection validator. " +
      'Use /credentials/:credentialId/test-connection for an explicit credential.',
  })
  @ApiParam({ name: 'providerKey', example: 'stripe' })
  async validateProvider(
    @CurrentUser() ctx: AuthContext,
    @Param('providerKey') providerKey: string,
  ): Promise<TestConnectionHttpResponse> {
    const companyId = this.resolveCompanyId(ctx);

    const { adapter, context } = await this.resolver
      .resolveForCompany(companyId, providerKey)
      .catch((err: unknown): never => this.mapDomainError(err));

    if (!isConnectionProvider(adapter)) {
      return toHttpResponse({
        connected: false,
        providerKey,
        checkedAt: new Date(),
        message:
          `Live connection validation for "${providerKey}" is not yet implemented. ` +
          'Credentials were validated for format when saved.',
      });
    }

    const result = await adapter.validateConnection(context.credentials);
    return toHttpResponse(result);
  }

  // ─── POST /payments/providers/:providerKey/credentials/:credentialId/test-connection
  //
  // Tests a specific, explicitly identified credential set against the real provider API.
  //
  // Route rationale:
  //   A company can hold multiple active credential sets per provider, tagged
  //   "default", "test", "live", etc.  Selecting the most-recent credential
  //   implicitly (as /validate does) is ambiguous when the user wants to test
  //   one specific set.  The Calendar module uses the same explicit /:credId/
  //   pattern (POST /calendar/connections/:credId/test).
  //
  //   The credentialId is always scoped to the authenticated company;
  //   ChannelsRuntimeResolverService throws 404 if it belongs to another company.

  @Post('providers/:providerKey/credentials/:credentialId/test-connection')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Test a specific stored credential set against the real provider API',
    description:
      'Decrypts the identified credential set (scoped to the authenticated company) ' +
      'and performs a real, read-only API request to the provider. ' +
      'For Stripe this calls GET /v1/account. ' +
      'Creates no resource, triggers no payment, produces no charge.',
  })
  @ApiParam({ name: 'providerKey', example: 'stripe' })
  @ApiParam({
    name: 'credentialId',
    description:
      'ProviderCredentials document ID, scoped to the authenticated company.',
    example: '6776e4f1a0c1234567890abc',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Connection tested (see connected field)',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No company context',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Provider not registered',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Provider not configured or credentials unavailable',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Provider does not support connection testing yet',
  })
  async testConnection(
    @CurrentUser() ctx: AuthContext,
    @Param('providerKey') providerKey: string,
    @Param('credentialId') credentialId: string,
  ): Promise<TestConnectionHttpResponse> {
    const companyId = this.resolveCompanyId(ctx);

    const { adapter, context } = await this.resolver
      .resolveByCredentialId(companyId, credentialId)
      .catch((err: unknown): never => this.mapDomainError(err));

    // Guard: credential must belong to the requested providerKey.
    if (context.providerKey !== providerKey) {
      throw new UnprocessableEntityException(
        `Credential "${credentialId}" belongs to provider "${context.providerKey}", ` +
          `not "${providerKey}".`,
      );
    }

    if (!isConnectionProvider(adapter)) {
      throw new ServiceUnavailableException(
        new PaymentConnectionTestUnsupportedError(providerKey).message,
      );
    }

    // The controller knows nothing about Stripe. It only calls the generic
    // validateConnection() contract defined by IPaymentConnectionProvider.
    const result = await adapter.validateConnection(context.credentials);
    return toHttpResponse(result);
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
      err instanceof PaymentCredentialChannelMismatchError
    ) {
      throw new UnprocessableEntityException(err.message);
    }
    throw err;
  }
}

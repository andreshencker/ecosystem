// src/payments/controllers/payments-testing.controller.ts

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Query,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
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
  PaymentProviderCredentialsUnavailableError,
  PaymentProviderNotConfiguredError,
  PaymentProviderNotFoundError,
  PaymentProviderUnavailableError,
} from '../errors/payment.errors';
import type { PaymentTestResult } from '../types/payment-testing.types';
import {
  CreatePaymentTestDto,
  GetTestScenariosQueryDto,
} from '../dto/create-payment-test.dto';
import { PaymentsTestingService } from '../services/payments-testing.service';

// ─── HTTP serialisation ───────────────────────────────────────────────────────
// PaymentTestResult.createdAt is a Date; HTTP responses use ISO strings.

type PaymentTestHttpResponse = Omit<PaymentTestResult, 'createdAt'> & {
  createdAt: string;
};

function toTestResponse(result: PaymentTestResult): PaymentTestHttpResponse {
  return { ...result, createdAt: result.createdAt.toISOString() };
}

@ApiTags('Payments — Testing')
@ApiBearerAuth()
@Controller('payments/testing')
export class PaymentsTestingController {
  constructor(private readonly testingService: PaymentsTestingService) {}

  // ─── GET /payments/testing/scenarios ─────────────────────────────────────────

  @Get('scenarios')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get supported test scenarios for a payment method',
    description:
      'Returns the test scenarios the provider supports for the given payment method. ' +
      'Returns an empty array when the method or provider does not support programmatic testing.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Supported test scenarios',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No company context',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Provider not configured or credentials invalid',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Provider API unavailable',
  })
  async getSupportedScenarios(
    @CurrentUser() ctx: AuthContext,
    @Query() query: GetTestScenariosQueryDto,
  ): Promise<{ scenarios: string[] }> {
    const companyId = this.resolveCompanyId(ctx);

    const scenarios = await this.testingService
      .getSupportedScenarios(companyId, query.connectionId, query.methodKey)
      .catch((err: unknown): never => this.mapDomainError(err));

    return { scenarios };
  }

  // ─── POST /payments/testing ───────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a payment test',
    description:
      'Executes a payment test against the provider using test credentials. ' +
      'Requires a test (sk_test_...) connection. No real money is moved. ' +
      'Creates no persistent record — results are ephemeral.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Payment test result',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No company context',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description:
      'Provider not configured, live connection used, or scenario not supported',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Provider API unavailable',
  })
  async createPaymentTest(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: CreatePaymentTestDto,
  ): Promise<PaymentTestHttpResponse> {
    const companyId = this.resolveCompanyId(ctx);

    const result = await this.testingService
      .createPaymentTest(companyId, dto)
      .catch((err: unknown): never => this.mapDomainError(err));

    return toTestResponse(result);
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
      err instanceof PaymentCredentialsInvalidError ||
      err instanceof PaymentConfigurationInvalidError
    ) {
      throw new UnprocessableEntityException(err.message);
    }
    if (err instanceof PaymentProviderUnavailableError) {
      throw new ServiceUnavailableException(err.message);
    }
    throw err;
  }
}

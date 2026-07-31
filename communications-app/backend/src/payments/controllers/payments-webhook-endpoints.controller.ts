// src/payments/controllers/payments-webhook-endpoints.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
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
import { ListWebhookEndpointsQueryDto } from '../dto/list-webhook-endpoints.dto';
import { CreateWebhookEndpointDto } from '../dto/create-webhook-endpoint.dto';
import { UpdateWebhookEndpointDto } from '../dto/update-webhook-endpoint.dto';
import { PaymentsWebhookEndpointsService } from '../services/payments-webhook-endpoints.service';

type WebhookEndpointHttp<T extends { createdAt: Date }> = Omit<
  T,
  'createdAt'
> & { createdAt: string };

function toEndpointHttp<T extends { createdAt: Date }>(
  e: T,
): WebhookEndpointHttp<T> {
  return { ...e, createdAt: e.createdAt.toISOString() };
}

@ApiTags('Payments — Webhooks')
@ApiBearerAuth()
@Controller('payments/accounts')
export class PaymentsWebhookEndpointsController {
  constructor(
    private readonly endpointsService: PaymentsWebhookEndpointsService,
  ) {}

  @Get(':accountId/webhook-endpoints')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List webhook endpoints for a payment connection' })
  @ApiParam({ name: 'accountId', example: '6776e4f1a0c1234567890abc' })
  @ApiResponse({ status: 200, description: 'Paginated endpoint list' })
  async listEndpoints(
    @CurrentUser() ctx: AuthContext,
    @Param('accountId') accountId: string,
    @Query() query: ListWebhookEndpointsQueryDto,
  ) {
    const companyId = this.resolveCompanyId(ctx);
    const result = await this.endpointsService
      .listEndpoints(companyId, accountId, query)
      .catch((err: unknown): never => this.mapDomainError(err));
    return {
      data: result.data.map(toEndpointHttp),
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
    };
  }

  @Get(':accountId/webhook-endpoints/event-types')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List supported event types for webhook endpoint configuration',
  })
  @ApiParam({ name: 'accountId', example: '6776e4f1a0c1234567890abc' })
  async listEventTypes(
    @CurrentUser() ctx: AuthContext,
    @Param('accountId') accountId: string,
  ) {
    const companyId = this.resolveCompanyId(ctx);
    // Resolve provider from accountId to get the providerKey.
    const runtime = await this.endpointsService['paymentsService']
      .resolveRuntime(companyId, accountId)
      .catch((err: unknown): never => this.mapDomainError(err));
    const eventTypes = this.endpointsService.listSupportedEventTypes(
      runtime.providerKey,
    );
    return { data: eventTypes, total: eventTypes.length };
  }

  @Get(':accountId/webhook-endpoints/:endpointId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve a single webhook endpoint' })
  async getEndpoint(
    @CurrentUser() ctx: AuthContext,
    @Param('accountId') accountId: string,
    @Param('endpointId') endpointId: string,
  ) {
    const companyId = this.resolveCompanyId(ctx);
    const result = await this.endpointsService
      .getEndpoint(companyId, accountId, endpointId)
      .catch((err: unknown): never => this.mapDomainError(err));
    return toEndpointHttp(result);
  }

  @Post(':accountId/webhook-endpoints')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a webhook endpoint',
    description:
      'Creates a provider webhook endpoint. The signing secret is returned ' +
      'exactly once in the response as signingSecretOnce. Store it securely — ' +
      'it cannot be retrieved again.',
  })
  async createEndpoint(
    @CurrentUser() ctx: AuthContext,
    @Param('accountId') accountId: string,
    @Body() dto: CreateWebhookEndpointDto,
  ) {
    const companyId = this.resolveCompanyId(ctx);
    const result = await this.endpointsService
      .createEndpoint(companyId, accountId, dto)
      .catch((err: unknown): never => this.mapDomainError(err));
    return toEndpointHttp(result);
  }

  @Put(':accountId/webhook-endpoints/:endpointId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a webhook endpoint' })
  async updateEndpoint(
    @CurrentUser() ctx: AuthContext,
    @Param('accountId') accountId: string,
    @Param('endpointId') endpointId: string,
    @Body() dto: UpdateWebhookEndpointDto,
  ) {
    const companyId = this.resolveCompanyId(ctx);
    const result = await this.endpointsService
      .updateEndpoint(companyId, accountId, endpointId, dto)
      .catch((err: unknown): never => this.mapDomainError(err));
    return toEndpointHttp(result);
  }

  @Delete(':accountId/webhook-endpoints/:endpointId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a webhook endpoint',
    description:
      'Deletes the provider endpoint and deactivates its stored signing secret. ' +
      'Historical delivery records are preserved.',
  })
  async deleteEndpoint(
    @CurrentUser() ctx: AuthContext,
    @Param('accountId') accountId: string,
    @Param('endpointId') endpointId: string,
  ) {
    const companyId = this.resolveCompanyId(ctx);
    return this.endpointsService
      .deleteEndpoint(companyId, accountId, endpointId)
      .catch((err: unknown): never => this.mapDomainError(err));
  }

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

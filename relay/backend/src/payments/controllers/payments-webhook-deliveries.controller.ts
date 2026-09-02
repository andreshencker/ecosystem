// src/payments/controllers/payments-webhook-deliveries.controller.ts

import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
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
import { ListWebhookDeliveriesQueryDto } from '../dto/list-webhook-deliveries.dto';
import { PaymentsWebhookDeliveriesService } from '../services/payments-webhook-deliveries.service';

function toDeliveryHttp<T extends { receivedAt: Date; processedAt?: Date }>(
  d: T,
) {
  return {
    ...d,
    receivedAt: d.receivedAt.toISOString(),
    processedAt: d.processedAt?.toISOString(),
  };
}

@ApiTags('Payments — Webhook Deliveries')
@ApiBearerAuth()
@Controller('payments/accounts')
export class PaymentsWebhookDeliveriesController {
  constructor(
    private readonly deliveriesService: PaymentsWebhookDeliveriesService,
  ) {}

  @Get(':accountId/webhook-deliveries')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List webhook delivery records for a connection' })
  @ApiParam({ name: 'accountId', example: '6776e4f1a0c1234567890abc' })
  @ApiResponse({ status: 200, description: 'Delivery list' })
  async listDeliveries(
    @CurrentUser() ctx: AuthContext,
    @Param('accountId') accountId: string,
    @Query() query: ListWebhookDeliveriesQueryDto,
  ) {
    const companyId = this.resolveCompanyId(ctx);
    const result = await this.deliveriesService.listDeliveries(
      companyId,
      accountId,
      query,
    );
    return {
      data: result.data.map(toDeliveryHttp),
      hasMore: result.hasMore,
      total: result.total,
    };
  }

  @Get(':accountId/webhook-deliveries/:deliveryId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve a single webhook delivery detail' })
  async getDelivery(
    @CurrentUser() ctx: AuthContext,
    @Param('accountId') accountId: string,
    @Param('deliveryId') deliveryId: string,
  ) {
    const companyId = this.resolveCompanyId(ctx);
    try {
      const detail = await this.deliveriesService.getDelivery(
        companyId,
        accountId,
        deliveryId,
      );
      return toDeliveryHttp(detail);
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  @Post(':accountId/webhook-deliveries/:deliveryId/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retry Graphify internal processing of a delivery',
    description:
      'Only eligible for deliveries with valid signature + failed processing status.',
  })
  async retryDelivery(
    @CurrentUser() ctx: AuthContext,
    @Param('accountId') accountId: string,
    @Param('deliveryId') deliveryId: string,
  ) {
    const companyId = this.resolveCompanyId(ctx);
    try {
      const result = await this.deliveriesService.retryDelivery(
        companyId,
        accountId,
        deliveryId,
      );
      return toDeliveryHttp(result);
    } catch (err) {
      if (err instanceof Error && err.message.includes('not eligible')) {
        throw new UnprocessableEntityException(err.message);
      }
      throw err;
    }
  }

  private resolveCompanyId(ctx: AuthContext): string {
    if (!ctx?.companyId) {
      throw new UnauthorizedException(
        'No company context in authentication token.',
      );
    }
    return ctx.companyId;
  }
}

// src/payments/controllers/payments-coingate-callback.controller.ts
//
// CoinGate-specific callback receiver.
//
// Security model:
//   - CoinGate uses a per-order token for callback validation.
//   - Token = SHA-256(credentialId + ':' + externalReference + ':coingate-callback-v1')[0:32]
//   - Derived deterministically — no external call or secret store needed.
//   - After token validation, the delivery is recorded with authoritative state.
//   - Re-fetching the order from CoinGate for definitive state is a background step
//     that requires credential decryption (queued — not done inline here).
//
// Idempotency key: (credentialId, 'coingate:{orderId}:{status}')
//   Unique per order-status-transition. Duplicate same-status callbacks are ignored.
//
// Route: POST /payments/callbacks/coingate/:credentialId
//
// The @Public() decorator skips JWT validation.
// Security is provided by the token derivation mechanism.

import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { Request } from 'express';
import * as crypto from 'crypto';

import { Public } from '../../infrastructure/security/decorators/public.decorator';
import {
  ProviderCredentials,
  ProviderCredentialsDocument,
} from '../../communication/channels/provider-credentials/schemas/provider-credentials.schema';
import {
  CompanyChannelProvider,
  CompanyChannelProviderDocument,
} from '../../communication/channels/company-channel-providers/schemas/company-channel-provider.schema';
import {
  WebhookDelivery,
  WebhookDeliveryDocument,
} from '../schemas/webhook-delivery.schema';
import { verifyCallbackToken } from '../providers/coingate/coingate.orders';
import { createCoinGateClient } from '../providers/coingate/coingate.client';
import { mapCoinGateOrderStatus } from '../providers/coingate/coingate.mapper';
import type { CoinGateOrder } from '../providers/coingate/coingate.types';
import type { CoinGateCallbackPayload } from '../providers/coingate/coingate.callbacks';
import { ChannelsRuntimeResolverService } from '../../communication/channels/runtime/channels-runtime-resolver.service';

const DELIVERY_RETENTION_DAYS = 30;
const COINGATE_PROVIDER_KEY = 'coingate';

@ApiTags('Payments — CoinGate Callbacks')
@Controller('payments/callbacks')
export class PaymentsCoinGateCallbackController {
  private readonly logger = new Logger(PaymentsCoinGateCallbackController.name);

  constructor(
    @InjectModel(ProviderCredentials.name)
    private readonly credModel: Model<ProviderCredentialsDocument>,
    @InjectModel(CompanyChannelProvider.name)
    private readonly ccpModel: Model<CompanyChannelProviderDocument>,
    @InjectModel(WebhookDelivery.name)
    private readonly deliveryModel: Model<WebhookDeliveryDocument>,
    private readonly runtimeResolver: ChannelsRuntimeResolverService,
  ) {}

  /**
   * POST /payments/callbacks/coingate/:credentialId
   *
   * Receives CoinGate order/refund callbacks.
   * The credentialId is embedded in the callback_url set at order creation.
   * Security: per-order token validation (stateless derivation).
   */
  @Public()
  @Post(`${COINGATE_PROVIDER_KEY}/:credentialId`)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'CoinGate payment callback receiver',
    description:
      'Receives CoinGate order status callbacks. ' +
      'Validates per-order token (derived from credentialId + externalReference). ' +
      'Records the delivery for monitoring. No JWT required.',
  })
  @ApiParam({ name: 'credentialId', example: '6776e4f1a0c1234567890abc' })
  async receiveCoinGateCallback(
    @Param('credentialId') credentialId: string,
    @Req() req: Request,
  ): Promise<{ received: boolean }> {
    if (!Types.ObjectId.isValid(credentialId)) {
      throw new BadRequestException('Invalid connection identifier.');
    }

    const cred = await this.credModel
      .findOne({ _id: new Types.ObjectId(credentialId), isActive: true })
      .populate<{ companyChannelProviderId: CompanyChannelProviderDocument }>(
        'companyChannelProviderId',
      )
      .lean()
      .exec();

    if (!cred) {
      this.logger.warn(
        `[coingate-cb] No active credential for id=${credentialId}`,
      );
      return { received: true };
    }

    const ccp = cred.companyChannelProviderId as unknown as {
      _id: Types.ObjectId;
      companyId: Types.ObjectId;
    };
    const companyId = String(ccp.companyId);

    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
    if (!rawBody || rawBody.length === 0) {
      throw new BadRequestException('Empty request body.');
    }

    const payloadHash = crypto
      .createHash('sha256')
      .update(rawBody)
      .digest('hex');

    // Parse payload.
    let payload: CoinGateCallbackPayload;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as CoinGateCallbackPayload;
    } catch {
      this.logger.warn(
        `[coingate-cb] Invalid JSON from credentialId=${credentialId}`,
      );
      return { received: true };
    }

    const orderId = payload.id !== undefined ? String(payload.id) : undefined;
    const externalReference = payload.order_id;
    const receivedToken = payload.token;
    const status = payload.status ?? 'unknown';

    // Validate the callback token.
    let signatureStatus: 'valid' | 'invalid' | 'missing' = 'missing';

    if (receivedToken && externalReference) {
      const tokenValid = verifyCallbackToken(
        receivedToken,
        credentialId,
        externalReference,
      );
      signatureStatus = tokenValid ? 'valid' : 'invalid';

      if (!tokenValid) {
        this.logger.warn(
          `[coingate-cb] Invalid token for orderId=${orderId} credentialId=${credentialId}`,
        );
      }
    }

    // Build a stable idempotency key per order + status transition.
    const providerEventId = orderId
      ? `coingate:${orderId}:${status}`
      : `coingate:unknown:${payloadHash.slice(0, 16)}`;

    const eventType = resolveEventType(status);

    const expiresAt = new Date(
      Date.now() + DELIVERY_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );

    const safePayload: Record<string, unknown> = {
      orderId,
      externalReference,
      callbackStatus: status,
      priceCurrency: payload.price_currency,
    };

    try {
      await this.deliveryModel.create({
        companyId: new Types.ObjectId(companyId),
        companyChannelProviderId: ccp._id,
        providerCredentialId: new Types.ObjectId(credentialId),
        providerKey: COINGATE_PROVIDER_KEY,
        providerEventId,
        eventType,
        objectType: 'order',
        objectId: orderId,
        payloadHash,
        signatureStatus,
        processingStatus: signatureStatus === 'valid' ? 'verified' : 'received',
        duplicate: false,
        attemptCount: signatureStatus === 'valid' ? 1 : 0,
        receivedAt: new Date(),
        livemode: cred.mode === 'live',
        safePayload,
        expiresAt,
      });
    } catch (err: unknown) {
      const mongoErr = err as { code?: number };
      if (mongoErr?.code === 11000) {
        await this.deliveryModel.updateOne(
          {
            providerCredentialId: new Types.ObjectId(credentialId),
            providerEventId,
          },
          { $set: { duplicate: true } },
        );
        this.logger.debug(
          `[coingate-cb] Duplicate callback orderId=${orderId} status=${status}`,
        );
        return { received: true };
      }
      this.logger.error(
        `[coingate-cb] Failed to record delivery: ${String(err)}`,
      );
      throw new InternalServerErrorException(
        'Failed to record callback delivery.',
      );
    }

    // ── Re-fetch authoritative order state ────────────────────────────────────
    // When the token is valid and we have an orderId, re-fetch the order from
    // CoinGate to confirm the authoritative status rather than trusting the
    // callback payload alone. This is the recommended security practice.
    if (signatureStatus === 'valid' && orderId) {
      this.processCallbackAsync(
        credentialId,
        companyId,
        orderId,
        providerEventId,
        safePayload,
      ).catch((err: unknown) => {
        this.logger.warn(
          `[coingate-cb] Async processing failed for orderId=${orderId}: ${String(err)}`,
        );
      });
    }

    return { received: true };
  }

  /**
   * Async post-processing: re-fetch the order from CoinGate for authoritative
   * state and update the delivery record.
   *
   * Runs after the 200 OK is already sent — callback is never blocked by this.
   * If re-fetch fails, the delivery stays in 'verified' state for manual review.
   */
  private async processCallbackAsync(
    credentialId: string,
    companyId: string,
    orderId: string,
    providerEventId: string,
    initialSafePayload: Record<string, unknown>,
  ): Promise<void> {
    // Decrypt credentials using the existing runtime resolver.
    const resolved = await this.runtimeResolver.resolveByProviderCredentialsId({
      companyId,
      providerCredentialsId: credentialId,
    });

    const client = createCoinGateClient(resolved.credentials);
    const order = await client.get<CoinGateOrder>(`/orders/${orderId}`);

    const canonicalStatus = mapCoinGateOrderStatus(order.status);

    this.logger.log(
      `[coingate-cb] Authoritative status for orderId=${orderId}: ` +
        `providerStatus=${order.status} canonicalStatus=${canonicalStatus}`,
    );

    await this.deliveryModel.updateOne(
      {
        providerCredentialId: new Types.ObjectId(credentialId),
        providerEventId,
      },
      {
        $set: {
          processingStatus: 'processed',
          processedAt: new Date(),
          safePayload: {
            ...initialSafePayload,
            authoritativeStatus: order.status,
            canonicalStatus,
            priceAmount: order.price_amount,
            priceCurrency: order.price_currency,
            receiveAmount: order.receive_amount,
            receiveCurrency: order.receive_currency,
          },
        },
      },
    );
  }
}

function resolveEventType(status: string): string {
  switch (status) {
    case 'paid':
      return 'coingate.order.paid';
    case 'confirming':
      return 'coingate.order.confirming';
    case 'expired':
      return 'coingate.order.expired';
    case 'invalid':
      return 'coingate.order.invalid';
    case 'canceled':
      return 'coingate.order.canceled';
    case 'refunded':
      return 'coingate.order.refunded';
    case 'partially_refunded':
      return 'coingate.order.partially_refunded';
    default:
      return 'coingate.order.status_changed';
  }
}

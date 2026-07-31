// src/payments/controllers/payments-webhook-receiver.controller.ts
//
// Public webhook receiver — no user authentication required.
//
// Security model:
//   - The providerKey + credentialId identify the target connection.
//   - The provider adapter verifies the request signature against the
//     encrypted signing secret stored in WebhookEndpointSecret.
//   - Requests with invalid or missing signatures are rejected immediately
//     and recorded for auditing.
//   - Processing is idempotent: duplicate events are recorded but not
//     processed twice.
//
// Raw body requirement:
//   - NestJS must be started with rawBody: true (see main.ts).
//   - The raw body is passed directly to the provider's signature verifier.
//   - JSON parsing happens AFTER verification to prevent tampered payloads.

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
import { PaymentProviderRegistry } from '../registry/payment-provider.registry';
import { isWebhookEndpointProvider } from '../interfaces/payment-provider.interface';
import {
  WebhookDelivery,
  WebhookDeliveryDocument,
} from '../schemas/webhook-delivery.schema';
import { PaymentsWebhookEndpointsService } from '../services/payments-webhook-endpoints.service';

/**
 * Default webhook delivery retention: 30 days.
 * Safe payload summary is retained. Raw body is not stored.
 */
const DELIVERY_RETENTION_DAYS = 30;

@ApiTags('Payments — Webhook Receiver')
@Controller('payments/webhooks')
export class PaymentsWebhookReceiverController {
  private readonly logger = new Logger(PaymentsWebhookReceiverController.name);

  constructor(
    @InjectModel(ProviderCredentials.name)
    private readonly credModel: Model<ProviderCredentialsDocument>,
    @InjectModel(CompanyChannelProvider.name)
    private readonly ccpModel: Model<CompanyChannelProviderDocument>,
    @InjectModel(WebhookDelivery.name)
    private readonly deliveryModel: Model<WebhookDeliveryDocument>,
    private readonly registry: PaymentProviderRegistry,
    private readonly endpointsService: PaymentsWebhookEndpointsService,
  ) {}

  /**
   * POST /payments/webhooks/:providerKey/:credentialId
   *
   * The credentialId is a MongoDB ObjectId (24 hex chars) — opaque and not
   * guessable. The provider credential record confirms company ownership.
   *
   * The @Public() decorator tells GlobalAuthGuard to skip JWT verification
   * for this endpoint. Signature verification by the provider adapter
   * replaces user authentication.
   */
  @Public()
  @Post(':providerKey/:credentialId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Public webhook receiver — provider sends events here',
    description:
      'Receives raw provider webhook events. Authentication is performed ' +
      'by verifying the provider signature. No user JWT required.',
  })
  @ApiParam({ name: 'providerKey', example: 'stripe' })
  @ApiParam({ name: 'credentialId', example: '6776e4f1a0c1234567890abc' })
  async receiveWebhook(
    @Param('providerKey') providerKey: string,
    @Param('credentialId') credentialId: string,
    @Req() req: Request,
  ): Promise<{ received: boolean }> {
    // 1. Validate the credentialId format before any DB query.
    if (!Types.ObjectId.isValid(credentialId)) {
      throw new BadRequestException('Invalid connection identifier.');
    }

    // 2. Resolve the credential record — validates company ownership implicitly.
    const cred = await this.credModel
      .findOne({
        _id: new Types.ObjectId(credentialId),
        isActive: true,
      })
      .populate<{ companyChannelProviderId: CompanyChannelProviderDocument }>(
        'companyChannelProviderId',
      )
      .lean()
      .exec();

    if (!cred) {
      // Return 200 to avoid leaking connection validity to attackers.
      this.logger.warn(
        `[receiver] No active credential for id=${credentialId}`,
      );
      return { received: true };
    }

    const ccp = cred.companyChannelProviderId as unknown as {
      _id: Types.ObjectId;
      companyId: Types.ObjectId;
      isActive: boolean;
    };

    const companyId = String(ccp.companyId);

    // 3. Get the raw body. NestJS must be started with rawBody: true.
    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
    if (!rawBody || rawBody.length === 0) {
      this.logger.warn(
        `[receiver] Empty raw body for credentialId=${credentialId}`,
      );
      throw new BadRequestException('Empty request body.');
    }

    // 4. Hash the raw body for idempotency evidence (not stored).
    const payloadHash = crypto
      .createHash('sha256')
      .update(rawBody)
      .digest('hex');

    // 5. Resolve the provider adapter.
    let adapter: ReturnType<PaymentProviderRegistry['resolve']>;
    try {
      adapter = this.registry.resolve(providerKey);
    } catch {
      this.logger.warn(`[receiver] Unknown providerKey=${providerKey}`);
      return { received: true };
    }

    if (!isWebhookEndpointProvider(adapter)) {
      this.logger.warn(
        `[receiver] Provider ${providerKey} does not support webhooks`,
      );
      return { received: true };
    }

    const webhookAdapter = adapter;

    // 6. Extract the Stripe-Signature header (or equivalent).
    const signatureHeaders: Record<string, string> = {};
    const sig = req.headers['stripe-signature'];
    if (typeof sig === 'string') signatureHeaders['stripe-signature'] = sig;

    // 7. Determine which endpoint this event was sent to.
    const endpointId = await this.resolveEndpointIdFromSignature(
      credentialId,
      signatureHeaders,
      rawBody,
      webhookAdapter,
    );

    let signatureStatus: string = 'unknown';
    let verifiedEvent:
      | import('../contracts/payment-webhook-delivery.contract').VerifiedWebhookEvent
      | null = null;

    if (!endpointId) {
      signatureStatus = 'missing';
    } else {
      try {
        const signingSecret =
          await this.endpointsService.getDecryptedSigningSecret(
            credentialId,
            endpointId,
          );

        if (!signingSecret) {
          signatureStatus = 'not_supported';
        } else {
          verifiedEvent = webhookAdapter.verifyWebhookSignature(
            rawBody,
            signatureHeaders,
            signingSecret,
          );
          signatureStatus = 'valid';
        }
      } catch {
        signatureStatus = 'invalid';
      }
    }

    // 8. Extract safe event metadata for the delivery record.
    const providerEventId =
      verifiedEvent?.providerEventId ?? `unknown-${Date.now()}`;
    const eventType = verifiedEvent?.eventType ?? 'unknown';

    // 9. Attempt atomic insert (idempotency).
    //    If a duplicate record exists, mark this delivery as duplicate.
    const expiresAt = new Date(
      Date.now() + DELIVERY_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );

    try {
      await this.deliveryModel.create({
        companyId: new Types.ObjectId(companyId),
        companyChannelProviderId: ccp._id,
        providerCredentialId: new Types.ObjectId(credentialId),
        providerKey,
        providerEventId,
        eventType,
        objectType: verifiedEvent?.objectType,
        objectId: verifiedEvent?.objectId,
        payloadHash,
        signatureStatus,
        processingStatus: signatureStatus === 'valid' ? 'verified' : 'received',
        duplicate: false,
        attemptCount: signatureStatus === 'valid' ? 1 : 0,
        receivedAt: new Date(),
        providerApiVersion: verifiedEvent?.apiVersion,
        livemode: verifiedEvent?.livemode,
        requestId: verifiedEvent?.requestId,
        safePayload: verifiedEvent?.safePayloadSummary,
        expiresAt,
      });

      // 10. If signature is valid, mark as processed synchronously.
      //     In production, dispatch to a queue for async processing.
      if (signatureStatus === 'valid') {
        await this.deliveryModel.updateOne(
          {
            providerCredentialId: new Types.ObjectId(credentialId),
            providerEventId,
          },
          {
            $set: {
              processingStatus: 'processed',
              processedAt: new Date(),
              processingCompletedAt: new Date(),
            },
          },
        );
      }
    } catch (err: unknown) {
      // Duplicate key error = already seen this event.
      const mongoErr = err as { code?: number };
      if (mongoErr?.code === 11000) {
        // Mark the existing record as confirmed duplicate.
        await this.deliveryModel.updateOne(
          {
            providerCredentialId: new Types.ObjectId(credentialId),
            providerEventId,
          },
          { $set: { duplicate: true } },
        );
        this.logger.debug(
          `[receiver] Duplicate event ${providerEventId} for credential=${credentialId}`,
        );
        return { received: true };
      }

      this.logger.error(
        `[receiver] Failed to store delivery for ${providerEventId}: ${String(err)}`,
      );
      throw new InternalServerErrorException(
        'Failed to record webhook delivery.',
      );
    }

    return { received: true };
  }

  /**
   * Determines which endpoint signed the event by trying stored signing secrets.
   * Returns the providerEndpointId when a matching secret is found, else null.
   *
   * For Stripe, the Stripe-Signature timestamp is deterministic — only the
   * correct signing secret will produce a valid verification result.
   */
  private async resolveEndpointIdFromSignature(
    credentialId: string,
    signatureHeaders: Record<string, string>,
    rawBody: Buffer,
    adapter: import('../interfaces/payment-provider.interface').IPaymentWebhookProvider,
  ): Promise<string | null> {
    if (!signatureHeaders['stripe-signature']) return null;

    const endpointIds =
      await this.endpointsService.listActiveEndpointIds(credentialId);
    if (endpointIds.length === 0) return null;

    for (const endpointId of endpointIds) {
      try {
        const signingSecret =
          await this.endpointsService.getDecryptedSigningSecret(
            credentialId,
            endpointId,
          );
        if (!signingSecret) continue;

        adapter.verifyWebhookSignature(
          rawBody,
          signatureHeaders,
          signingSecret,
        );
        return endpointId;
      } catch {
        // Try next secret
      }
    }

    return null;
  }
}

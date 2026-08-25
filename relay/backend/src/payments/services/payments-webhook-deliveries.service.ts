// src/payments/services/payments-webhook-deliveries.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import type {
  WebhookDeliveryListResult,
  WebhookDeliverySummary,
  WebhookDeliveryDetail,
  ListWebhookDeliveriesParams,
  WebhookProcessingStatus,
  WebhookSignatureStatus,
} from '../contracts/payment-webhook-delivery.contract';
import type { ListWebhookDeliveriesQueryDto } from '../dto/list-webhook-deliveries.dto';
import {
  WebhookDelivery,
  WebhookDeliveryDocument,
} from '../schemas/webhook-delivery.schema';

/**
 * Lean projection type for WebhookDelivery documents returned by .lean() queries.
 * All ObjectId fields remain as Types.ObjectId in lean results.
 */
type WebhookDeliveryLeanRecord = {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  companyChannelProviderId: Types.ObjectId;
  providerCredentialId: Types.ObjectId;
  providerKey: string;
  providerEventId: string;
  eventType: string;
  objectType?: string;
  objectId?: string;
  payloadHash: string;
  signatureStatus: string;
  processingStatus: string;
  duplicate: boolean;
  attemptCount: number;
  receivedAt: Date;
  processedAt?: Date;
  processingStartedAt?: Date;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  providerApiVersion?: string;
  livemode?: boolean;
  requestId?: string;
  safePayload?: Record<string, unknown>;
  expiresAt?: Date;
};

@Injectable()
export class PaymentsWebhookDeliveriesService {
  private readonly logger = new Logger(PaymentsWebhookDeliveriesService.name);

  constructor(
    @InjectModel(WebhookDelivery.name)
    private readonly deliveryModel: Model<WebhookDeliveryDocument>,
  ) {}

  async listDeliveries(
    companyId: string,
    accountId: string,
    query: ListWebhookDeliveriesQueryDto,
  ): Promise<WebhookDeliveryListResult> {
    this.logger.debug(
      `[listDeliveries] companyId=${companyId} accountId=${accountId}`,
    );

    const params: ListWebhookDeliveriesParams = {
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
      eventType: query.eventType,
      processingStatus: query.processingStatus,
      signatureStatus: query.signatureStatus,
      duplicate: query.duplicate,
      receivedFrom: query.receivedFrom
        ? new Date(query.receivedFrom)
        : undefined,
      receivedTo: query.receivedTo ? new Date(query.receivedTo) : undefined,
      search: query.search,
    };

    return this.queryDeliveries(companyId, accountId, params);
  }

  async getDelivery(
    companyId: string,
    accountId: string,
    deliveryId: string,
  ): Promise<WebhookDeliveryDetail> {
    this.logger.debug(
      `[getDelivery] companyId=${companyId} accountId=${accountId} deliveryId=${deliveryId}`,
    );

    const doc = await this.deliveryModel
      .findOne({
        _id: new Types.ObjectId(deliveryId),
        companyId: new Types.ObjectId(companyId),
        providerCredentialId: new Types.ObjectId(accountId),
      })
      .lean<WebhookDeliveryLeanRecord>()
      .exec();

    if (!doc) {
      throw new Error(`Webhook delivery not found: ${deliveryId}`);
    }

    return this.mapToDetail(doc);
  }

  /**
   * Retries Graphify's internal processing of a delivery.
   *
   * Eligibility:
   *   - signatureStatus must be 'valid'
   *   - processingStatus must be 'failed'
   *
   * The retry re-marks the delivery as 'processing' and increments attemptCount.
   * For now, processing means marking it 'processed' after incrementing.
   * Future work: dispatch to the actual processing pipeline.
   */
  async retryDelivery(
    companyId: string,
    accountId: string,
    deliveryId: string,
  ): Promise<WebhookDeliveryDetail> {
    this.logger.debug(
      `[retryDelivery] companyId=${companyId} accountId=${accountId} deliveryId=${deliveryId}`,
    );

    const doc = await this.deliveryModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(deliveryId),
        companyId: new Types.ObjectId(companyId),
        providerCredentialId: new Types.ObjectId(accountId),
        signatureStatus: 'valid',
        processingStatus: 'failed',
      },
      {
        $set: {
          processingStatus: 'processing',
          processingStartedAt: new Date(),
          lastErrorCode: undefined,
          lastErrorMessage: undefined,
        },
        $inc: { attemptCount: 1 },
      },
      { new: true },
    );

    if (!doc) {
      throw new Error(
        `Delivery ${deliveryId} is not eligible for retry (must be valid signature + failed status).`,
      );
    }

    // Minimal synchronous processing — mark as processed.
    // In a full implementation, dispatch to the processing pipeline here.
    await this.deliveryModel.updateOne(
      { _id: doc._id },
      {
        $set: {
          processingStatus: 'processed',
          processedAt: new Date(),
          processingCompletedAt: new Date(),
        },
      },
    );

    return this.getDelivery(companyId, accountId, deliveryId);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  private async queryDeliveries(
    companyId: string,
    accountId: string,
    params: ListWebhookDeliveriesParams,
  ): Promise<WebhookDeliveryListResult> {
    const filter: Record<string, unknown> = {
      companyId: new Types.ObjectId(companyId),
      providerCredentialId: new Types.ObjectId(accountId),
    };

    if (params.eventType) filter['eventType'] = params.eventType;
    if (params.processingStatus)
      filter['processingStatus'] = params.processingStatus;
    if (params.signatureStatus)
      filter['signatureStatus'] = params.signatureStatus;
    if (params.duplicate !== undefined) filter['duplicate'] = params.duplicate;

    if (params.receivedFrom || params.receivedTo) {
      const dateFilter: Record<string, Date> = {};
      if (params.receivedFrom) dateFilter['$gte'] = params.receivedFrom;
      if (params.receivedTo) dateFilter['$lte'] = params.receivedTo;
      filter['receivedAt'] = dateFilter;
    }

    if (params.search) {
      const s = params.search.trim();
      filter['$or'] = [
        { providerEventId: { $regex: s, $options: 'i' } },
        { objectId: { $regex: s, $options: 'i' } },
        { requestId: { $regex: s, $options: 'i' } },
      ];
    }

    const limit = Math.min(params.limit ?? 20, 100);
    const offset = params.offset ?? 0;

    const [total, docs] = await Promise.all([
      this.deliveryModel.countDocuments(filter),
      this.deliveryModel
        .find(filter)
        .sort({ receivedAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean<WebhookDeliveryLeanRecord[]>()
        .exec(),
    ]);

    return {
      data: docs.map((d) => this.mapToSummary(d)),
      hasMore: offset + docs.length < total,
      total,
    };
  }

  private mapToSummary(doc: WebhookDeliveryLeanRecord): WebhookDeliverySummary {
    return {
      id: doc._id.toHexString(),
      provider: doc.providerKey,
      connectionId: doc.providerCredentialId.toHexString(),
      providerEventId: doc.providerEventId,
      eventType: doc.eventType,
      objectType: doc.objectType,
      objectId: doc.objectId,
      processingStatus:
        (doc.processingStatus as WebhookProcessingStatus) ?? 'received',
      signatureStatus:
        (doc.signatureStatus as WebhookSignatureStatus) ?? 'unknown',
      duplicate: doc.duplicate,
      receivedAt: doc.receivedAt,
      processedAt: doc.processedAt,
      attemptCount: doc.attemptCount,
      lastErrorCode: doc.lastErrorCode,
      lastErrorMessage: doc.lastErrorMessage,
    };
  }

  private mapToDetail(doc: WebhookDeliveryLeanRecord): WebhookDeliveryDetail {
    const summary = this.mapToSummary(doc);
    return {
      ...summary,
      providerApiVersion: doc.providerApiVersion,
      livemode: doc.livemode,
      requestId: doc.requestId,
      payloadHash: doc.payloadHash,
      safePayloadSummary: doc.safePayload,
      rawPayloadAvailable: false,
      processingStartedAt: doc.processingStartedAt,
      processingCompletedAt: doc.processedAt,
    };
  }
}

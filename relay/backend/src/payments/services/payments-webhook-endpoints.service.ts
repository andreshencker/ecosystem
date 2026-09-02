// src/payments/services/payments-webhook-endpoints.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { isWebhookEndpointProvider } from '../interfaces/payment-provider.interface';
import { PaymentCapabilityNotSupportedError } from '../errors/payment.errors';
import type { PaymentProviderContext } from '../types/payment.types';
import type {
  WebhookEndpointListResult,
  WebhookEndpointDetail,
  WebhookEndpointCreateResult,
  CreateWebhookEndpointParams,
  UpdateWebhookEndpointParams,
  ListWebhookEndpointsParams,
} from '../contracts/payment-webhook-endpoint.contract';
import type { CreateWebhookEndpointDto } from '../dto/create-webhook-endpoint.dto';
import type { UpdateWebhookEndpointDto } from '../dto/update-webhook-endpoint.dto';
import type { ListWebhookEndpointsQueryDto } from '../dto/list-webhook-endpoints.dto';
import {
  WebhookEndpointSecret,
  WebhookEndpointSecretDocument,
} from '../schemas/webhook-endpoint-secret.schema';
import { CryptoService } from '../../communication/common/security/crypto.service';
import { PaymentsService } from './payments.service';

@Injectable()
export class PaymentsWebhookEndpointsService {
  private readonly logger = new Logger(PaymentsWebhookEndpointsService.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly crypto: CryptoService,
    @InjectModel(WebhookEndpointSecret.name)
    private readonly secretModel: Model<WebhookEndpointSecretDocument>,
  ) {}

  async listEndpoints(
    companyId: string,
    accountId: string,
    query: ListWebhookEndpointsQueryDto,
  ): Promise<WebhookEndpointListResult> {
    this.logger.debug(
      `[listEndpoints] companyId=${companyId} accountId=${accountId}`,
    );

    const { adapter, context } = await this.resolveWebhookProvider(
      companyId,
      accountId,
    );

    const params: ListWebhookEndpointsParams = {
      limit: query.limit,
      cursor: query.cursor,
    };

    return adapter.listWebhookEndpoints(context, params);
  }

  async getEndpoint(
    companyId: string,
    accountId: string,
    endpointId: string,
  ): Promise<WebhookEndpointDetail> {
    this.logger.debug(
      `[getEndpoint] companyId=${companyId} accountId=${accountId} endpointId=${endpointId}`,
    );

    const { adapter, context } = await this.resolveWebhookProvider(
      companyId,
      accountId,
    );

    return adapter.getWebhookEndpoint(context, endpointId);
  }

  /**
   * Creates a provider webhook endpoint.
   *
   * If the provider returns a signing secret (Stripe), it is encrypted and
   * stored in WebhookEndpointSecret. The raw secret is returned once in the
   * response as signingSecretOnce — it is NEVER logged or returned again.
   */
  async createEndpoint(
    companyId: string,
    accountId: string,
    dto: CreateWebhookEndpointDto,
  ): Promise<WebhookEndpointCreateResult> {
    this.logger.debug(
      `[createEndpoint] companyId=${companyId} accountId=${accountId} url=${dto.url}`,
    );

    const { adapter, context } = await this.resolveWebhookProvider(
      companyId,
      accountId,
    );

    const params: CreateWebhookEndpointParams = {
      url: dto.url,
      enabledEvents: dto.enabledEvents,
      description: dto.description,
      connect: dto.connect,
      metadata: dto.metadata,
    };

    const result = await adapter.createWebhookEndpoint(context, params);

    // Persist the signing secret encrypted — it will not be returned again.
    if (result.signingSecretOnce) {
      await this.storeSigningSecret(
        companyId,
        accountId,
        result.providerEndpointId,
        result.signingSecretOnce,
      );
    }

    return result;
  }

  async updateEndpoint(
    companyId: string,
    accountId: string,
    endpointId: string,
    dto: UpdateWebhookEndpointDto,
  ): Promise<WebhookEndpointDetail> {
    this.logger.debug(
      `[updateEndpoint] companyId=${companyId} accountId=${accountId} endpointId=${endpointId}`,
    );

    const { adapter, context } = await this.resolveWebhookProvider(
      companyId,
      accountId,
    );

    const params: UpdateWebhookEndpointParams = {
      url: dto.url,
      enabledEvents: dto.enabledEvents,
      description: dto.description,
      disabled: dto.disabled,
      metadata: dto.metadata,
    };

    return adapter.updateWebhookEndpoint(context, endpointId, params);
  }

  async deleteEndpoint(
    companyId: string,
    accountId: string,
    endpointId: string,
  ): Promise<{ deleted: boolean; endpointId: string }> {
    this.logger.debug(
      `[deleteEndpoint] companyId=${companyId} accountId=${accountId} endpointId=${endpointId}`,
    );

    const { adapter, context } = await this.resolveWebhookProvider(
      companyId,
      accountId,
    );

    const result = await adapter.deleteWebhookEndpoint(context, endpointId);

    // Deactivate the stored signing secret — delivery verification will still
    // work for existing records but new events for this endpoint will be rejected.
    await this.secretModel
      .updateOne(
        {
          providerCredentialId: new Types.ObjectId(accountId),
          providerEndpointId: endpointId,
        },
        { $set: { isActive: false } },
      )
      .exec();

    return result;
  }

  /**
   * Returns all active provider endpoint IDs for a credential.
   * Used by the receiver to try each signing secret during endpoint resolution.
   */
  async listActiveEndpointIds(providerCredentialId: string): Promise<string[]> {
    const secrets = await this.secretModel
      .find({
        providerCredentialId: new Types.ObjectId(providerCredentialId),
        isActive: true,
      })
      .lean()
      .exec();
    return secrets.map((s) => s.providerEndpointId);
  }

  listSupportedEventTypes(providerKey: string): string[] {
    const adapter = this.paymentsService.resolveProvider(providerKey);
    if (!isWebhookEndpointProvider(adapter)) return [];
    return adapter.listSupportedEventTypes();
  }

  // ─── Secret management ────────────────────────────────────────────────────────

  /**
   * Retrieves and decrypts the signing secret for a given endpoint.
   * Returns null if not found or inactive.
   * Used by the webhook receiver for signature verification.
   */
  async getDecryptedSigningSecret(
    providerCredentialId: string,
    providerEndpointId: string,
  ): Promise<string | null> {
    const secret = await this.secretModel
      .findOne({
        providerCredentialId: new Types.ObjectId(providerCredentialId),
        providerEndpointId,
        isActive: true,
      })
      .lean()
      .exec();

    if (!secret) return null;

    try {
      const decrypted = this.crypto.decryptJson(
        secret.encryptedSecret,
      ) as Record<string, unknown>;
      return typeof decrypted['secret'] === 'string'
        ? decrypted['secret']
        : null;
    } catch (err) {
      this.logger.error(
        `[getDecryptedSigningSecret] Decryption failed for endpointId=${providerEndpointId}: ${String(err)}`,
      );
      return null;
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  private async resolveWebhookProvider(companyId: string, accountId: string) {
    const runtime = await this.paymentsService.resolveRuntime(
      companyId,
      accountId,
    );

    if (!isWebhookEndpointProvider(runtime.provider)) {
      throw new PaymentCapabilityNotSupportedError(
        runtime.providerKey,
        'webhookEndpoints',
      );
    }

    const context: PaymentProviderContext = {
      providerKey: runtime.providerKey,
      connectionType: runtime.provider.getMetadata().connectionType,
      credentialsId: runtime.accountId,
      isActive: true,
      credentials: runtime.credentials,
    };

    return { adapter: runtime.provider, context };
  }

  private async storeSigningSecret(
    companyId: string,
    accountId: string,
    providerEndpointId: string,
    signingSecret: string,
  ): Promise<void> {
    const encryptedSecret = this.crypto.encryptJson({ secret: signingSecret });

    await this.secretModel
      .findOneAndUpdate(
        {
          providerCredentialId: new Types.ObjectId(accountId),
          providerEndpointId,
        },
        {
          $set: {
            providerCredentialId: new Types.ObjectId(accountId),
            companyId: new Types.ObjectId(companyId),
            providerEndpointId,
            encryptedSecret,
            isActive: true,
          },
        },
        { upsert: true, new: true },
      )
      .exec();

    this.logger.debug(
      `[storeSigningSecret] Stored encrypted secret for endpointId=${providerEndpointId}`,
    );
  }
}

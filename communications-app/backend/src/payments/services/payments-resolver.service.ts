// src/payments/services/payments-resolver.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Provider,
  ProviderDocument,
} from '../../communication/channels/providers/schemas/provider.schema';
import {
  CompanyChannelProvider,
  CompanyChannelProviderDocument,
} from '../../communication/channels/company-channel-providers/schemas/company-channel-provider.schema';
import {
  ProviderCredentials,
  ProviderCredentialsDocument,
} from '../../communication/channels/provider-credentials/schemas/provider-credentials.schema';
import { ChannelsRuntimeResolverService } from '../../communication/channels/runtime/channels-runtime-resolver.service';

import { PaymentProviderRegistry } from '../registry/payment-provider.registry';
import type { IPaymentProvider } from '../interfaces/payment-provider.interface';
import type { PaymentProviderContext } from '../types/payment.types';
import {
  PaymentProviderNotConfiguredError,
  PaymentProviderCredentialsUnavailableError,
  PaymentCredentialChannelMismatchError,
} from '../errors/payment.errors';

/**
 * PaymentsResolverService
 *
 * Company-scoped provider resolution for the Payments domain.
 *
 * Integrates with the existing channel/provider/credential infrastructure
 * WITHOUT duplicating it. Specifically:
 *   - Uses ChannelsRuntimeResolverService for credential decryption.
 *   - Queries existing Provider, CompanyChannelProvider and ProviderCredentials
 *     collections directly (same collections used by all other channels).
 *   - Enforces company isolation by always querying with companyId.
 *
 * The resolver does not store credentials beyond the current request scope.
 */
@Injectable()
export class PaymentsResolverService {
  private readonly logger = new Logger(PaymentsResolverService.name);

  constructor(
    @InjectModel(Provider.name)
    private readonly providerModel: Model<ProviderDocument>,
    @InjectModel(CompanyChannelProvider.name)
    private readonly ccpModel: Model<CompanyChannelProviderDocument>,
    @InjectModel(ProviderCredentials.name)
    private readonly credModel: Model<ProviderCredentialsDocument>,
    private readonly runtimeResolver: ChannelsRuntimeResolverService,
    private readonly registry: PaymentProviderRegistry,
  ) {}

  /**
   * Resolves a fully configured payment provider for the given company.
   *
   * Flow:
   *   1. Verify the providerKey is registered in the Payments registry.
   *   2. Look up the Provider catalog record.
   *   3. Find the CompanyChannelProvider link (company scoped).
   *   4. Find active credentials for that link.
   *   5. Decrypt credentials via ChannelsRuntimeResolverService.
   *   6. Return a PaymentProviderContext — never persisted or logged.
   *
   * Throws domain errors (not HTTP exceptions) — the controller maps these.
   */
  async resolveForCompany(
    companyId: string,
    providerKey: string,
  ): Promise<{ adapter: IPaymentProvider; context: PaymentProviderContext }> {
    this.logger.debug(
      `[resolve] companyId=${companyId} providerKey=${providerKey}`,
    );

    // 1. Verify the provider is registered (fails fast for unknown keys).
    //    PaymentProviderNotFoundError is thrown by the registry itself.
    const adapter = this.registry.resolve(providerKey);

    // 2. Find the provider catalog record.
    //    Typed lean<> gives _id as Types.ObjectId without unsafe casts.
    const providerDoc = await this.providerModel
      .findOne({ providerKey, isActive: true })
      .select('_id providerKey connectionType')
      .lean<{ _id: Types.ObjectId }>();

    if (!providerDoc) {
      this.logger.warn(
        `[resolve] provider not in catalog: providerKey=${providerKey}`,
      );
      throw new PaymentProviderNotConfiguredError(providerKey);
    }

    // 3. Find the company-scoped CompanyChannelProvider link.
    //    companyId from JWT — never from request body.
    const ccp = await this.ccpModel
      .findOne({
        companyId: new Types.ObjectId(companyId),
        providerId: providerDoc._id,
        isActive: true,
      })
      .select('_id companyId providerId isActive')
      .lean<{ _id: Types.ObjectId }>();

    if (!ccp) {
      this.logger.warn(
        `[resolve] no CCP for companyId=${companyId} providerKey=${providerKey}`,
      );
      throw new PaymentProviderNotConfiguredError(providerKey);
    }

    // 4. Find the most recently updated active credential for this CCP.
    const credDoc = await this.credModel
      .findOne({ companyChannelProviderId: ccp._id, isActive: true })
      .sort({ updatedAt: -1 })
      .select('_id isActive')
      .lean<{ _id: Types.ObjectId }>();

    if (!credDoc) {
      this.logger.warn(
        `[resolve] no active credential for companyId=${companyId} providerKey=${providerKey}`,
      );
      throw new PaymentProviderCredentialsUnavailableError(providerKey);
    }

    // 5. Decrypt via the existing RuntimeResolver.
    //    This enforces company isolation internally (throws if companyId mismatches).
    const resolved = await this.runtimeResolver.resolveByProviderCredentialsId({
      companyId,
      providerCredentialsId: String(credDoc._id),
    });

    // 6. Build the context — credentials are in-memory only, never logged.
    const context: PaymentProviderContext = {
      providerKey: resolved.providerKey,
      connectionType: resolved.connectionType,
      credentialsId: resolved.providerCredentialsId,
      isActive: resolved.isActive,
      credentials: resolved.credentials,
    };

    this.logger.debug(
      `[resolve] resolved: providerKey=${context.providerKey} ` +
        `credentialsId=${context.credentialsId} isActive=${context.isActive}`,
    );

    return { adapter, context };
  }

  /**
   * Resolves a payment provider by an explicit credential ID.
   *
   * Used by the `test-connection` endpoint where the caller specifies exactly
   * which credential set to test (a company may have multiple sets tagged
   * "default", "test", "live", etc.).
   *
   * Company isolation is enforced by ChannelsRuntimeResolverService:
   * it throws if the credential's companyId does not match the JWT companyId.
   *
   * Validates that the credential belongs to the 'payment' channel to prevent
   * a caller from pointing this endpoint at a Calendar or Email credential.
   */
  async resolveByCredentialId(
    companyId: string,
    credentialId: string,
  ): Promise<{ adapter: IPaymentProvider; context: PaymentProviderContext }> {
    this.logger.debug(
      `[resolve-by-cred] companyId=${companyId} credentialId=${credentialId}`,
    );

    // ChannelsRuntimeResolverService validates company ownership and decrypts.
    // Throws HttpException(404) if the credential does not belong to companyId.
    const resolved = await this.runtimeResolver.resolveByProviderCredentialsId({
      companyId,
      providerCredentialsId: credentialId,
    });

    // Guard: this endpoint is only for payment-channel credentials.
    if (resolved.channelKey !== 'payment') {
      throw new PaymentCredentialChannelMismatchError(credentialId, 'payment');
    }

    // Resolve the adapter from the registry.
    // Throws PaymentProviderNotFoundError if providerKey is not registered.
    const adapter = this.registry.resolve(resolved.providerKey);

    const context: PaymentProviderContext = {
      providerKey: resolved.providerKey,
      connectionType: resolved.connectionType,
      credentialsId: resolved.providerCredentialsId,
      isActive: resolved.isActive,
      credentials: resolved.credentials,
    };

    this.logger.debug(
      `[resolve-by-cred] resolved: providerKey=${context.providerKey} ` +
        `credentialsId=${context.credentialsId} isActive=${context.isActive}`,
    );

    return { adapter, context };
  }
}

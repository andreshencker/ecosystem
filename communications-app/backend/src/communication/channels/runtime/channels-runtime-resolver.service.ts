// src/channels/runtime/channels-runtime-resolver.service.ts
//
// Canonical runtime resolution service for the Communications platform.
//
// Every provider resolution goes through one of these two paths:
//
//   resolveByChannelAndProvider(companyId, channelKey, providerKey)
//     → Company → Channel → Provider → CCP → Credentials
//     → Use when the caller knows the channel and provider key.
//     → This is the preferred path for all domain resolvers.
//
//   resolveByProviderCredentialsId(companyId, providerCredentialsId)
//     → Credential → CCP → Provider + Channel
//     → Use when the caller has an explicit credential ID (e.g. payment list).
//
//   resolveDefault(companyId, channelKey)
//     → Default CCP for the channel → Credentials
//     → Use when no explicit provider or credential is specified.
//
// All three paths return ChannelsRuntimeResolved with identical fields.
// All three paths enforce company isolation before returning anything.

import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Channel,
  ChannelDocument,
} from '../channels-catalogue/schemas/channel-catalog.schema';
import {
  Provider,
  ProviderDocument,
} from '../providers/schemas/provider.schema';
import {
  CompanyChannelProvider,
  CompanyChannelProviderDocument,
} from '../company-channel-providers/schemas/company-channel-provider.schema';
import {
  ProviderCredentials,
  ProviderCredentialsDocument,
} from '../provider-credentials/schemas/provider-credentials.schema';
import { CryptoService } from '../../common/security/crypto.service';
import { ChannelKey, ChannelsRuntimeResolved } from './channels-runtime.types';

// ─── Internal populated shapes ────────────────────────────────────────────────

type PopulatedProvider = {
  _id: any;
  providerKey: string;
  connectionType: string;
  isActive?: boolean;
};

type PopulatedChannel = {
  _id: any;
  channelKey: string;
  isActive?: boolean;
};

type PopulatedCCP = {
  _id: any;
  companyId: any;
  isActive?: boolean;
  isDefault?: boolean;
  providerId: PopulatedProvider;
  channelId: PopulatedChannel;
};

type PopulatedPC = {
  _id: any;
  tag: string;
  isActive?: boolean;
  encrypted: any;
  companyChannelProviderId: PopulatedCCP;
};

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ChannelsRuntimeResolverService {
  private readonly logger = new Logger(ChannelsRuntimeResolverService.name);

  constructor(
    @InjectModel(Channel.name)
    private readonly channelModel: Model<ChannelDocument>,
    @InjectModel(Provider.name)
    private readonly providerModel: Model<ProviderDocument>,
    @InjectModel(CompanyChannelProvider.name)
    private readonly ccpModel: Model<CompanyChannelProviderDocument>,
    @InjectModel(ProviderCredentials.name)
    private readonly credModel: Model<ProviderCredentialsDocument>,
    private readonly crypto: CryptoService,
  ) {}

  // ─── Path 1: Company → Channel → Provider → CCP → Credentials ───────────────

  /**
   * Canonical resolution path: Company → Channel → Provider → Credentials.
   *
   * Resolves by channel and provider key in one atomic DB read chain.
   * Every step enforces that the entity belongs to the requested channel
   * before proceeding to the next step.
   *
   * This is the preferred path for all domain resolvers (Payments, Accounting,
   * Billing, etc.). It guarantees that a provider registered in multiple channels
   * always resolves the correct channel-specific CCP and credential.
   *
   * Throws HTTP 422 on any configuration gap (channel inactive, provider not in
   * channel, no CCP, no active credentials). Throws HTTP 400 when the CCP or
   * credential is inactive. Never returns a partial context.
   */
  async resolveByChannelAndProvider(params: {
    companyId: string;
    channelKey: ChannelKey;
    providerKey: string;
  }): Promise<ChannelsRuntimeResolved> {
    const { companyId, channelKey, providerKey } = params;
    const normalKey = this.toChannelKeyOrThrow(channelKey);

    this.logger.debug(
      `[resolve/channel] companyId=${companyId} channel=${channelKey} provider=${providerKey}`,
    );

    // 1. Look up the Channel — confirm it exists and is active.
    const channelDoc = (await this.channelModel
      .findOne({ channelKey: normalKey, isActive: true })
      .select('_id channelKey isActive')
      .lean()
      .exec()) as { _id: Types.ObjectId; channelKey: string } | null;

    if (!channelDoc) {
      throw new HttpException(
        `Channel '${channelKey}' is not available`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    // 2. Look up the Provider — confirm it belongs to this channel.
    //    Provider.channelIds is an array; MongoDB $elemMatch matches any element.
    const normalProviderKey = this.normalizeKey(providerKey);
    const providerDoc = (await this.providerModel
      .findOne({
        providerKey: normalProviderKey,
        channelIds: channelDoc._id,
        isActive: true,
      })
      .select('_id providerKey connectionType isActive')
      .lean()
      .exec()) as {
      _id: Types.ObjectId;
      providerKey: string;
      connectionType: string;
    } | null;

    if (!providerDoc) {
      throw new HttpException(
        `Provider '${providerKey}' is not registered for the '${channelKey}' channel`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    // 3. Find the company's CCP for this exact channel × provider pair.
    //    The channel filter is the critical isolation step for multi-channel
    //    providers (e.g. Xero in both Accounting and Billing).
    const companyObjId = this.toObjectIdOrThrow(companyId, 'companyId');
    const ccp = (await this.ccpModel
      .findOne({
        companyId: companyObjId,
        providerId: providerDoc._id,
        channelId: channelDoc._id, // ← channel isolation enforced here
        isActive: true,
      })
      .select('_id companyId providerId channelId isActive')
      .lean()
      .exec()) as { _id: Types.ObjectId } | null;

    if (!ccp) {
      throw new HttpException(
        `${providerDoc.providerKey} is not enabled for this company on the ${channelKey} channel. ` +
          `Enable it under Company → Enabled Providers.`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    // 4. Find the most recently updated active credential for this CCP.
    const credDoc = (await this.credModel
      .findOne({ companyChannelProviderId: (ccp as any)._id, isActive: true })
      .sort({ updatedAt: -1 })
      .select('_id tag isActive encrypted')
      .lean()
      .exec()) as {
      _id: Types.ObjectId;
      tag: string;
      isActive?: boolean;
      encrypted: any;
    } | null;

    if (!credDoc) {
      throw new HttpException(
        `No active credentials found for ${providerDoc.providerKey} (${channelKey} channel). ` +
          `Add credentials under Company → Credentials.`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const credentials = this.decryptCredentials(credDoc.encrypted);

    this.logger.debug(
      `[resolve/channel] resolved: channel=${channelKey} provider=${providerDoc.providerKey} ` +
        `ccp=${String((ccp as any)._id)} cred=${String(credDoc._id)}`,
    );

    return {
      channelKey: normalKey,
      channelId: String(channelDoc._id),
      providerKey: this.normalizeKey(providerDoc.providerKey),
      providerId: String(providerDoc._id),
      connectionType: this.normalizeKey(providerDoc.connectionType),
      companyChannelProviderId: String((ccp as any)._id),
      providerCredentialsId: String(credDoc._id),
      tag: String(credDoc.tag),
      isActive: true,
      credentialsIsActive: true,
      credentials,
    };
  }

  // ─── Path 2: Credential ID → CCP → Channel + Provider ───────────────────────

  /**
   * Resolves by an explicit ProviderCredentials ID.
   *
   * Used when the caller already holds a specific credential ID (e.g. from a
   * payment account listing, a webhook callback, or the test-connection endpoint).
   * Traverses Credential → CCP → Provider + Channel in one populate chain.
   *
   * Enforces company isolation: throws 404 if the credential belongs to a
   * different company than `companyId`. Never returns credentials belonging
   * to another company.
   */
  async resolveByProviderCredentialsId(params: {
    companyId: string;
    providerCredentialsId: string;
  }): Promise<ChannelsRuntimeResolved> {
    const companyId = this.toObjectIdOrThrow(params.companyId, 'companyId');
    const providerCredentialsId = this.toObjectIdOrThrow(
      params.providerCredentialsId,
      'providerCredentialsId',
    );

    this.logger.debug(
      `[resolve/cred] credentialsId=${params.providerCredentialsId} companyId=${params.companyId}`,
    );

    const pc = (await this.credModel
      .findById(providerCredentialsId)
      .select('tag isActive encrypted companyChannelProviderId')
      .populate({
        path: 'companyChannelProviderId',
        select: 'companyId providerId channelId isActive isDefault',
        populate: [
          {
            path: 'providerId',
            select: 'providerKey connectionType isActive',
          },
          { path: 'channelId', select: 'channelKey isActive _id' },
        ],
      })
      .lean()
      .exec()) as unknown as PopulatedPC | null;

    if (!pc) {
      this.logger.warn(
        `[resolve/cred] ProviderCredentials not found: id=${params.providerCredentialsId}`,
      );
      throw new HttpException(
        'Provider credential not found — it may have been deleted',
        HttpStatus.NOT_FOUND,
      );
    }

    if (!this.toBool(pc.isActive)) {
      throw new HttpException(
        'Provider credential is inactive — activate it in the Credentials page',
        HttpStatus.BAD_REQUEST,
      );
    }

    const ccp = pc.companyChannelProviderId;
    if (!ccp || typeof ccp !== 'object') {
      throw new HttpException(
        'Enabled provider link is missing — re-save the credential in Provider Credentials',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    this.logger.debug(
      `[resolve/cred] ccp.id=${String(ccp._id)} ccp.companyId=${String(ccp.companyId)} ` +
        `expected companyId=${params.companyId}`,
    );

    if (String(ccp.companyId) !== String(companyId)) {
      this.logger.warn(
        `[resolve/cred] companyId mismatch: credential.ccp.companyId=${String(ccp.companyId)} ` +
          `vs requested companyId=${params.companyId}`,
      );
      throw new HttpException(
        'Provider credential does not belong to this company — check domain configuration',
        HttpStatus.NOT_FOUND,
      );
    }

    if (!this.toBool(ccp.isActive)) {
      throw new HttpException(
        'Enabled provider is inactive — activate it in the Enabled Providers page',
        HttpStatus.BAD_REQUEST,
      );
    }

    const provider = ccp.providerId;
    const channel = ccp.channelId;

    if (!provider?.providerKey || !provider?.connectionType) {
      throw new HttpException(
        'Provider data not populated',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (!channel?.channelKey) {
      throw new HttpException(
        'Channel data not populated',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const credentials = this.decryptCredentials(pc.encrypted);
    const credentialsIsActive = this.toBool(pc.isActive);
    const ccpIsActive = this.toBool(ccp.isActive);
    const runtimeIsActive = credentialsIsActive && ccpIsActive;

    return {
      channelKey: this.toChannelKeyOrThrow(channel.channelKey),
      channelId: (channel as any)._id ? String((channel as any)._id) : '',
      providerKey: this.normalizeKey(provider.providerKey),
      providerId: provider._id ? String(provider._id) : null,
      connectionType: this.normalizeKey(provider.connectionType),
      companyChannelProviderId: String(ccp._id),
      providerCredentialsId: String(pc._id),
      tag: String(pc.tag),
      isActive: runtimeIsActive,
      credentialsIsActive,
      credentials,
    };
  }

  // ─── Path 3: Default CCP for channel ─────────────────────────────────────────

  /**
   * Resolves the default provider for a company's channel.
   *
   * Used when the caller has a company and channel but no explicit provider
   * or credential (e.g. the Notification engine sends an email via the
   * company's default email provider).
   */
  async resolveDefault(params: {
    companyId: string;
    channelKey: ChannelKey;
  }): Promise<ChannelsRuntimeResolved> {
    const companyId = this.toObjectIdOrThrow(params.companyId, 'companyId');
    const channelKey = this.toChannelKeyOrThrow(params.channelKey);

    const ccpList = (await this.ccpModel
      .find({
        companyId,
        isActive: true,
        isDefault: true,
      })
      .populate({ path: 'channelId', select: 'channelKey isActive _id' })
      .populate({
        path: 'providerId',
        select: 'providerKey connectionType isActive',
      })
      .lean()
      .exec()) as unknown as PopulatedCCP[];

    const ccp =
      ccpList.find(
        (item) =>
          item?.channelId &&
          this.normalizeKey(item.channelId.channelKey) === channelKey,
      ) ?? null;

    if (!ccp) {
      throw new HttpException(
        `No default provider configured for channel "${channelKey}"`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const provider = ccp.providerId;
    const channel = ccp.channelId;

    if (!channel?.channelKey) {
      throw new HttpException(
        'Channel not populated',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const populatedChannelKey = this.normalizeKey(channel.channelKey);
    if (populatedChannelKey !== channelKey) {
      throw new HttpException(
        'Default provider found, but channel mismatch',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (!provider?.providerKey || !provider?.connectionType) {
      throw new HttpException(
        'Provider not populated',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (provider.isActive === false) {
      throw new HttpException(
        'Default provider is inactive',
        HttpStatus.BAD_REQUEST,
      );
    }

    const pc = (await this.credModel
      .findOne({ companyChannelProviderId: ccp._id, isActive: true })
      .sort({ updatedAt: -1, createdAt: -1 })
      .select('tag isActive encrypted')
      .lean()
      .exec()) as unknown as {
      _id: any;
      tag: string;
      isActive?: boolean;
      encrypted: any;
    } | null;

    if (!pc) {
      throw new HttpException(
        `No active credentials found for default provider in channel "${channelKey}"`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const credentials = this.decryptCredentials(pc.encrypted);
    const credentialsIsActive = this.toBool(pc.isActive);
    const ccpIsActive = this.toBool(ccp.isActive);
    const runtimeIsActive = credentialsIsActive && ccpIsActive;

    return {
      channelKey,
      channelId: (channel as any)._id ? String((channel as any)._id) : '',
      providerKey: this.normalizeKey(provider.providerKey),
      providerId: (provider as any)._id ? String((provider as any)._id) : null,
      connectionType: this.normalizeKey(provider.connectionType),
      companyChannelProviderId: String(ccp._id),
      providerCredentialsId: String(pc._id),
      tag: String(pc.tag),
      isActive: runtimeIsActive,
      credentialsIsActive,
      credentials,
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private toObjectIdOrThrow(id: string, label: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException(`Invalid ${label}`, HttpStatus.BAD_REQUEST);
    }
    return new Types.ObjectId(id);
  }

  private toChannelKeyOrThrow(v: string): ChannelKey {
    const k = String(v ?? '')
      .toLowerCase()
      .trim();
    if (
      k !== 'email' &&
      k !== 'sms' &&
      k !== 'storage' &&
      k !== 'calendar' &&
      k !== 'payment' &&
      k !== 'accounting' &&
      k !== 'billing'
    ) {
      throw new HttpException(
        `Invalid channelKey "${v}"`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return k as ChannelKey;
  }

  private normalizeKey(v: any): string {
    return String(v ?? '')
      .toLowerCase()
      .trim();
  }

  private decryptCredentials(encrypted: any): Record<string, any> {
    return this.crypto.decryptJson(encrypted);
  }

  /**
   * Normalises any MongoDB `isActive` value to a boolean.
   * null/undefined → true (absent field = default active).
   */
  private toBool(v: any): boolean {
    if (v === null || v === undefined) return true;
    return Boolean(v);
  }
}

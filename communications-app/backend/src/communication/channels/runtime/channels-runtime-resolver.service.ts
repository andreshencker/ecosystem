import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  ProviderCredentials,
  ProviderCredentialsDocument,
} from '../provider-credentials/schemas/provider-credentials.schema';

import {
  CompanyChannelProvider,
  CompanyChannelProviderDocument,
} from '../company-channel-providers/schemas/company-channel-provider.schema';

import { CryptoService } from '../../common/security/crypto.service';
import { ChannelKey, ChannelsRuntimeResolved } from './channels-runtime.types';

type PopulatedProvider = {
  _id: any;
  providerKey: string;
  connectionType: string;
  isActive?: boolean;
};

type PopulatedChannel = {
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

@Injectable()
export class ChannelsRuntimeResolverService {
  private readonly logger = new Logger(ChannelsRuntimeResolverService.name);

  constructor(
    @InjectModel(ProviderCredentials.name)
    private readonly credModel: Model<ProviderCredentialsDocument>,
    @InjectModel(CompanyChannelProvider.name)
    private readonly ccpModel: Model<CompanyChannelProviderDocument>,
    private readonly crypto: CryptoService,
  ) {}

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
      `[resolve] credentialsId=${params.providerCredentialsId} companyId=${params.companyId}`,
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
            select: 'providerKey connectionType isActive channelId',
          },
          { path: 'channelId', select: 'channelKey isActive' },
        ],
      })
      .lean()
      .exec()) as unknown as PopulatedPC | null;

    if (!pc) {
      this.logger.warn(`[resolve] ProviderCredentials not found: id=${params.providerCredentialsId}`);
      throw new HttpException(
        'Provider credential not found — it may have been deleted',
        HttpStatus.NOT_FOUND,
      );
    }

    this.logger.debug(
      `[resolve] pc.isActive=${pc.isActive} (raw type=${typeof pc.isActive})`,
    );

    // toBool is used consistently for both the throw guard and the returned isActive flag.
    // This prevents the race condition where pc.isActive=0 (non-boolean falsy) would pass
    // the strict `=== false` guard but then compute to false in isTrueOrDefaultTrue.
    if (!this.toBool(pc.isActive)) {
      throw new HttpException(
        'Provider credential is inactive — activate it in the Credentials page',
        HttpStatus.BAD_REQUEST,
      );
    }

    const ccp = pc.companyChannelProviderId;
    if (!ccp || typeof ccp !== 'object') {
      this.logger.warn(
        `[resolve] CompanyChannelProvider not populated for credentialsId=${params.providerCredentialsId}`,
      );
      throw new HttpException(
        'Enabled provider link is missing — re-save the credential in Provider Credentials',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    this.logger.debug(
      `[resolve] ccp.id=${String(ccp._id)} ccp.companyId=${String(ccp.companyId)} ` +
      `ccp.isActive=${ccp.isActive} (type=${typeof ccp.isActive}) ` +
      `expected companyId=${params.companyId}`,
    );

    if (String(ccp.companyId) !== String(companyId)) {
      this.logger.warn(
        `[resolve] companyId mismatch: credential.ccp.companyId=${String(ccp.companyId)} ` +
        `vs requested companyId=${params.companyId}`,
      );
      throw new HttpException(
        'Provider credential does not belong to this company — check domain configuration',
        HttpStatus.NOT_FOUND,
      );
    }

    if (!this.toBool(ccp.isActive)) {
      this.logger.warn(
        `[resolve] CompanyChannelProvider inactive: ccp.id=${String(ccp._id)} isActive=${ccp.isActive}`,
      );
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

    this.logger.debug(
      `[resolve] provider=${provider.providerKey} connectionType=${provider.connectionType} ` +
      `channel=${channel.channelKey}`,
    );

    const credentials = this.decryptCredentials(pc.encrypted);

    // Both are guaranteed true by the throw guards above — kept for the runtime DTO contract.
    const credentialsIsActive = this.toBool(pc.isActive);
    const ccpIsActive = this.toBool(ccp.isActive);
    const runtimeIsActive = credentialsIsActive && ccpIsActive;

    return {
      channelKey: this.toChannelKeyOrThrow(channel.channelKey),
      providerKey: this.normalizeKey(provider.providerKey),
      connectionType: this.normalizeKey(provider.connectionType),
      providerCredentialsId: String(pc._id),
      providerId: provider._id ? String(provider._id) : null,
      tag: String(pc.tag),
      isActive: runtimeIsActive,
      credentialsIsActive,
      credentials,
    };
  }

  /**
   * Resolver DEFAULT por company + channelKey
   *
   * Nota:
   * - El schema actual de CompanyChannelProvider NO tiene channelKey denormalizado.
   * - Por eso buscamos defaults de la company y luego filtramos por channelId.channelKey.
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
      .populate({ path: 'channelId', select: 'channelKey isActive' })
      .populate({
        path: 'providerId',
        select: 'providerKey connectionType isActive channelId',
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
      .findOne({
        companyChannelProviderId: ccp._id,
        isActive: true,
      })
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
      providerKey: this.normalizeKey(provider.providerKey),
      connectionType: this.normalizeKey(provider.connectionType),
      providerCredentialsId: String(pc._id),
      providerId: (provider as any)._id ? String((provider as any)._id) : null,
      tag: String(pc.tag),
      isActive: runtimeIsActive,
      credentialsIsActive,
      credentials,
    };
  }

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

    if (k !== 'email' && k !== 'sms' && k !== 'storage' && k !== 'calendar') {
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
    return this.crypto.decryptObject(encrypted);
  }

  /**
   * Normalises any MongoDB `isActive` value to a boolean.
   * null/undefined → true (field absent means default-active).
   * Anything else → Boolean() coercion (handles 0, 1, "false", etc.).
   *
   * This replaces the old `isTrueOrDefaultTrue` whose `(v ?? true) === true`
   * expression incorrectly returned false for truthy non-boolean values like 1.
   */
  private toBool(v: any): boolean {
    if (v === null || v === undefined) return true;
    return Boolean(v);
  }
}

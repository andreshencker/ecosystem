import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
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
      throw new HttpException(
        'ProviderCredentials not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (pc.isActive === false) {
      throw new HttpException(
        'ProviderCredentials inactive',
        HttpStatus.BAD_REQUEST,
      );
    }

    const ccp = pc.companyChannelProviderId;
    if (!ccp || typeof ccp !== 'object') {
      throw new HttpException(
        'CompanyChannelProvider not populated',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (String(ccp.companyId) !== String(companyId)) {
      throw new HttpException(
        'ProviderCredentials does not belong to this company',
        HttpStatus.NOT_FOUND,
      );
    }

    if (ccp.isActive === false) {
      throw new HttpException(
        'CompanyChannelProvider inactive',
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

    const credentialsIsActive = this.isTrueOrDefaultTrue(pc.isActive);
    const ccpIsActive = this.isTrueOrDefaultTrue(ccp.isActive);
    const runtimeIsActive = credentialsIsActive && ccpIsActive;

    return {
      channelKey: this.toChannelKeyOrThrow(channel.channelKey),
      providerKey: this.normalizeKey(provider.providerKey),
      connectionType: this.normalizeKey(provider.connectionType),
      providerCredentialsId: String(pc._id),
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

    const credentialsIsActive = this.isTrueOrDefaultTrue(pc.isActive);
    const ccpIsActive = this.isTrueOrDefaultTrue(ccp.isActive);
    const runtimeIsActive = credentialsIsActive && ccpIsActive;

    return {
      channelKey,
      providerKey: this.normalizeKey(provider.providerKey),
      connectionType: this.normalizeKey(provider.connectionType),
      providerCredentialsId: String(pc._id),
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

    if (k !== 'email' && k !== 'sms' && k !== 'storage') {
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

  private isTrueOrDefaultTrue(v: any): boolean {
    return (v ?? true) === true;
  }
}

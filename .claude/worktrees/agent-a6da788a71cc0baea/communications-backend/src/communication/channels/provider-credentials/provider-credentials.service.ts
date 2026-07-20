// src/channels/provider-credentials/provider-credentials.service.ts

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  ProviderCredentials,
  ProviderCredentialsDocument,
} from './schemas/provider-credentials.schema';

import { CreateProviderCredentialsDto } from './dto/create-provider-credentials.dto';
import { UpdateProviderCredentialsDto } from './dto/update-provider-credentials.dto';

import { ProviderCredentialsResponseDto } from './dto/provider-credentials-response.dto';
import { ProviderCredentialsMapper } from './mappers/provider-credentials.mapper';
import type { PaginatedResponse } from '../../common/pagination/pagination.util';

import {
  CompanyChannelProvider,
  CompanyChannelProviderDocument,
} from '../company-channel-providers/schemas/company-channel-provider.schema';

import { CryptoService } from '../../common/security/crypto.service';
import { ChannelsImplementationFactory } from '../implementation/channels-implementation.factory';

type PopulateOpts = {
  populateCompanyChannelProvider?: boolean;
};

@Injectable()
export class ProviderCredentialsService {
  constructor(
    @InjectModel(ProviderCredentials.name)
    private readonly model: Model<ProviderCredentialsDocument>,
    @InjectModel(CompanyChannelProvider.name)
    private readonly ccpModel: Model<CompanyChannelProviderDocument>,
    private readonly encryption: CryptoService,
    private readonly factory: ChannelsImplementationFactory,
  ) {}

  // =========================================================
  // Helpers
  // =========================================================

  async create(
    dto: CreateProviderCredentialsDto,
  ): Promise<ProviderCredentialsResponseDto> {
    const tag = this.normalizeTag(dto.tag);
    if (!tag) {
      throw new HttpException('tag is required', HttpStatus.BAD_REQUEST);
    }

    // 1) cargar provider/channel desde CompanyChannelProvider
    const { provider, channel } = await this.getCompanyChannelProviderOrFail(
      dto.companyChannelProviderId,
    );

    const credentials = dto.credentials ?? {};
    const providerKey = this.resolveProviderKey({ provider, credentials });

    // 2) ✅ validar credenciales ANTES de guardar
    await this.verifyByImplementation({
      channelKey: channel.channelKey,
      connectionType: provider.connectionType,
      providerKey,
      credentials,
    });

    // 3) ✅ encriptar
    const encrypted = this.encryption.encryptJson(credentials);

    try {
      const created = await this.model.create({
        companyChannelProviderId: this.toObjectIdOrThrow(
          dto.companyChannelProviderId,
          'companyChannelProviderId',
        ),
        tag,
        encrypted,
        isActive: dto.isActive ?? true,
      });

      return ProviderCredentialsMapper.toResponse(created.toObject() as any);
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new HttpException(
          this.duplicateKeyToMessage(err),
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        err?.message ?? 'Failed to create credentials',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(params: {
    companyChannelProviderId: string;
    active?: boolean;
    populate?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<ProviderCredentialsResponseDto>> {
    const companyChannelProviderId = this.toObjectIdOrThrow(
      params.companyChannelProviderId,
      'companyChannelProviderId',
    );

    const filter: any = { companyChannelProviderId };
    if (typeof params.active === 'boolean') filter.isActive = params.active;

    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    const q = this.model.find(filter).sort({ tag: 1 });
    q.select('-encrypted');

    if (params.populate) {
      this.populateForValidation(q, { populateCompanyChannelProvider: true });
    }

    const [list, total] = await Promise.all([
      q.skip(offset).limit(limit).lean(),
      this.model.countDocuments(filter),
    ]);

    return { data: ProviderCredentialsMapper.toResponseList(list as any[]), total, limit, offset };
  }

  async getById(
    id: string,
    populate = false,
  ): Promise<ProviderCredentialsResponseDto> {
    const _id = this.toObjectIdOrThrow(id, 'id');

    const q = this.model.findById(_id);

    q.select('-encrypted');

    if (populate) {
      this.populateForValidation(q, { populateCompanyChannelProvider: true });
    }

    const doc = await q.lean();
    if (!doc)
      throw new HttpException('Credentials not found', HttpStatus.NOT_FOUND);

    return ProviderCredentialsMapper.toResponse(doc as any);
  }

  /**
   * ✅ Método clave para Domain: providerCredentialsId -> (ccp -> provider + channel)
   */
  async getPopulatedForDomain(providerCredentialsId: string) {
    const _id = this.toObjectIdOrThrow(
      providerCredentialsId,
      'providerCredentialsId',
    );

    const q = this.model.findById(_id).select('-encrypted');
    this.populateForValidation(q, { populateCompanyChannelProvider: true });

    const doc: any = await q.lean();

    if (!doc)
      throw new HttpException('Credentials not found', HttpStatus.NOT_FOUND);
    if (doc.isActive === false)
      throw new HttpException('Credentials inactive', HttpStatus.BAD_REQUEST);

    const ccp = doc.companyChannelProviderId;
    if (!ccp)
      throw new HttpException(
        'CompanyChannelProvider not populated',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

    const provider = ccp.providerId;
    const channel = ccp.channelId;

    if (!provider)
      throw new HttpException(
        'Provider not populated',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    if (!channel)
      throw new HttpException(
        'Channel not populated',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

    return { credentials: doc, companyChannelProvider: ccp, provider, channel };
  }

  async update(
    id: string,
    dto: UpdateProviderCredentialsDto,
  ): Promise<ProviderCredentialsResponseDto> {
    const _id = this.toObjectIdOrThrow(id, 'id');

    const existing: any = await this.model.findById(_id).lean();
    if (!existing)
      throw new HttpException('Credentials not found', HttpStatus.NOT_FOUND);

    const $set: any = {};

    if (dto.tag !== undefined) {
      const tag = this.normalizeTag(dto.tag);
      if (!tag)
        throw new HttpException('tag is required', HttpStatus.BAD_REQUEST);
      $set.tag = tag;
    }

    if (dto.isActive !== undefined) $set.isActive = dto.isActive;

    if (dto.credentials !== undefined) {
      // 1) cargar provider/channel
      const ccpId = String(existing.companyChannelProviderId);
      const { provider, channel } =
        await this.getCompanyChannelProviderOrFail(ccpId);

      const credentials = dto.credentials ?? {};
      const providerKey = this.resolveProviderKey({ provider, credentials });

      // 2) ✅ validar ANTES de guardar
      await this.verifyByImplementation({
        channelKey: channel.channelKey,
        connectionType: provider.connectionType,
        providerKey,
        credentials,
      });

      // 3) ✅ encriptar
      $set.encrypted = this.encryption.encryptJson(credentials);
    }

    try {
      const updated = await this.model.findByIdAndUpdate(
        _id,
        { $set },
        { new: true, runValidators: true },
      );

      if (!updated)
        throw new HttpException('Credentials not found', HttpStatus.NOT_FOUND);

      return ProviderCredentialsMapper.toResponse(updated.toObject() as any);
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new HttpException(
          this.duplicateKeyToMessage(err),
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        err?.message ?? 'Failed to update credentials',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const _id = this.toObjectIdOrThrow(id, 'id');

    const res = await this.model.findByIdAndDelete(_id);
    if (!res)
      throw new HttpException('Credentials not found', HttpStatus.NOT_FOUND);

    return { deleted: true };
  }

  // =========================================================
  // CRUD
  // =========================================================

  private normalizeTag(tag: string) {
    return String(tag ?? '')
      .toLowerCase()
      .trim();
  }

  private toObjectIdOrThrow(id: string, label: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException(`Invalid ${label}`, HttpStatus.BAD_REQUEST);
    }
    return new Types.ObjectId(id);
  }

  private duplicateKeyToMessage(err: any) {
    const indexName = err?.keyPattern
      ? Object.keys(err.keyPattern).join('_')
      : (err?.indexName ?? err?.index ?? 'unknown_index');

    const keyValue = err?.keyValue;
    if (keyValue) {
      return `Duplicate credentials (${indexName}): ${JSON.stringify(keyValue)}`;
    }

    const keyPattern = err?.keyPattern;
    if (keyPattern) {
      return `Duplicate credentials (${indexName})`;
    }

    return `Duplicate credentials (${indexName}). Raw: ${err?.message ?? 'duplicate key'}`;
  }

  private populateForValidation(query: any, opts?: PopulateOpts) {
    if (!opts?.populateCompanyChannelProvider) return query;

    return query.populate({
      path: 'companyChannelProviderId',
      populate: [{ path: 'providerId' }, { path: 'channelId' }],
    });
  }

  private async getCompanyChannelProviderOrFail(id: string) {
    const _id = this.toObjectIdOrThrow(id, 'companyChannelProviderId');

    const doc = await this.ccpModel
      .findById(_id)
      .populate('providerId')
      .populate('channelId')
      .lean();

    if (!doc) {
      throw new HttpException(
        'CompanyChannelProvider not found',
        HttpStatus.BAD_REQUEST,
      );
    }

    if ((doc as any).isActive === false) {
      throw new HttpException(
        'CompanyChannelProvider inactive',
        HttpStatus.BAD_REQUEST,
      );
    }

    const provider = (doc as any).providerId;
    const channel = (doc as any).channelId;

    if (!provider) {
      throw new HttpException(
        'Provider not populated',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    if (!channel) {
      throw new HttpException(
        'Channel not populated',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return { doc, provider, channel };
  }

  /**
   * ✅ Verifica credenciales usando el factory (single source of truth)
   * - EMAIL: smtp / oauth / api_key (sendgrid/mailgun)
   * - SMS: api_key (twilio default) / oauth
   * - STORAGE: access_keys / iam_role
   */
  private async verifyByImplementation(params: {
    channelKey: string;
    connectionType: string;
    providerKey?: string;
    credentials: Record<string, any>;
  }): Promise<void> {
    const channelKey = String(params.channelKey ?? '')
      .toLowerCase()
      .trim();
    const connectionType = String(params.connectionType ?? '')
      .toLowerCase()
      .trim();
    const providerKey = params.providerKey
      ? String(params.providerKey).toLowerCase().trim()
      : undefined;
    const credentials = params.credentials ?? {};

    // EMAIL
    if (channelKey === 'email') {
      const emailChannel = this.factory.getEmailChannel(
        connectionType,
        providerKey,
      );
      const res = await emailChannel.verifyCredentials(credentials);
      if (!res?.ok) {
        throw new HttpException(
          res?.message ?? 'EMAIL credentials verification failed',
          HttpStatus.BAD_REQUEST,
        );
      }
      return;
    }

    // SMS
    if (channelKey === 'sms') {
      const smsChannel = this.factory.getSmsChannel(
        connectionType,
        providerKey,
      );
      const res = await smsChannel.verifyCredentials(credentials);
      if (!res?.ok) {
        throw new HttpException(
          res?.message ?? 'SMS credentials verification failed',
          HttpStatus.BAD_REQUEST,
        );
      }
      return;
    }

    // STORAGE
    if (channelKey === 'storage') {
      const storageChannel = this.factory.getStorageChannel(connectionType);
      const res = await storageChannel.verifyCredentials(credentials);
      if (!res?.ok) {
        throw new HttpException(
          res?.message ?? 'STORAGE credentials verification failed',
          HttpStatus.BAD_REQUEST,
        );
      }
      return;
    }

    throw new HttpException(
      `Unsupported channelKey="${channelKey}"`,
      HttpStatus.BAD_REQUEST,
    );
  }

  /**
   * ✅ Si el providerKey es necesario (api_key), lo resolvemos así:
   * - Preferimos el que venga en credentials (providerKey / PROVIDER_KEY)
   * - Si no viene, usamos provider.providerKey (por ejemplo: "sendgrid", "mailgun")
   */
  private resolveProviderKey(params: {
    provider: any;
    credentials: Record<string, any>;
  }): string | undefined {
    const fromCreds = this.factory.pickProviderKeyFromCredentials(
      params.credentials,
    );
    if (fromCreds) return String(fromCreds).toLowerCase().trim();

    const fromProvider = params.provider?.providerKey;
    return fromProvider ? String(fromProvider).toLowerCase().trim() : undefined;
  }

  async options(params: {
    companyId: string;
    channel?: 'email' | 'sms';
    active?: boolean;
  }) {
    const companyId = this.toObjectIdOrThrow(params.companyId, 'companyId');

    const filter: any = {};

    if (typeof params.active === 'boolean') {
      filter.isActive = params.active;
    }

    const list: any[] = await this.model
      .find(filter)
      .select('-encrypted')
      .populate({
        path: 'companyChannelProviderId',
        match: {
          companyId,
          isActive: true,
        },
        populate: [
          {
            path: 'providerId',
            select: 'providerKey displayName connectionType isActive channelId',
          },
          {
            path: 'channelId',
            select: 'channelKey displayName isActive',
          },
        ],
      })
      .sort({ tag: 1 })
      .lean();

    return list
      .filter((cred) => {
        const ccp = cred.companyChannelProviderId;

        if (!ccp) return false;

        const channelKey = String(ccp.channelId?.channelKey ?? '')
          .toLowerCase()
          .trim();

        // ✅ Domain Catalogue solo permite email y sms
        if (channelKey !== 'email' && channelKey !== 'sms') {
          return false;
        }

        if (params.channel && channelKey !== params.channel) {
          return false;
        }

        return true;
      })
      .map((cred) => {
        const ccp = cred.companyChannelProviderId;
        const provider = ccp.providerId;
        const channel = ccp.channelId;

        const channelKey = String(channel?.channelKey ?? '')
          .toLowerCase()
          .trim();

        const providerName =
          provider?.displayName || provider?.providerKey || 'Provider';

        const tag = cred.tag || 'default';

        return {
          id: String(cred._id),
          label: `${channelKey.toUpperCase()} — ${providerName} — ${tag}`,

          channel: channelKey,
          channelKey,
          channelDisplayName: channel?.displayName ?? channelKey,

          providerKey: provider?.providerKey ?? '',
          providerDisplayName: provider?.displayName ?? '',
          connectionType: provider?.connectionType ?? '',

          tag,
          isActive: cred.isActive !== false,

          companyChannelProviderId: String(ccp._id),
        };
      });
  }
}

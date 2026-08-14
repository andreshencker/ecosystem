// src/domain-catalogue/domain-catalogue.service.ts
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  DomainCatalogue,
  DomainCatalogueDocument,
} from './schemas/domain-catalogue.schema';
import { CreateDomainCatalogueDto } from './dto/create-domain-catalogue.dto';
import { UpdateDomainCatalogueDto } from './dto/update-domain-catalogue.dto';
import { DomainCatalogueMapper } from './mappers/domain-catalogue.mapper';
import { DomainCatalogueResponseDto } from './dto/domain-catalogue-response.dto';

// ✅ NUEVO: credentials + ccp
import {
  ProviderCredentials,
  ProviderCredentialsDocument,
} from '../../../channels/provider-credentials/schemas/provider-credentials.schema';

import {
  CompanyChannelProvider,
  CompanyChannelProviderDocument,
} from '../../../channels/company-channel-providers/schemas/company-channel-provider.schema';

type ChannelKey = 'email' | 'sms';

@Injectable()
export class DomainCatalogueService {
  constructor(
    @InjectModel(DomainCatalogue.name)
    private readonly model: Model<DomainCatalogueDocument>,
    // ✅ NUEVO
    @InjectModel(ProviderCredentials.name)
    private readonly credentialsModel: Model<ProviderCredentialsDocument>,
    // ✅ NUEVO
    @InjectModel(CompanyChannelProvider.name)
    private readonly ccpModel: Model<CompanyChannelProviderDocument>,
  ) {}

  // ==========================
  // Helpers
  // ==========================

  async create(
    dto: CreateDomainCatalogueDto,
  ): Promise<DomainCatalogueResponseDto> {
    const companyId = this.toObjectIdOrThrow(dto.companyId, 'companyId');

    const domainKey = this.normalizeKey(dto.domainKey);
    const displayName = String(dto.displayName ?? '').trim();
    const domainCategory = this.normalizeCategory(dto.domainCategory);

    if (!domainKey)
      throw new HttpException('domainKey is required', HttpStatus.BAD_REQUEST);
    if (!displayName)
      throw new HttpException(
        'displayName is required',
        HttpStatus.BAD_REQUEST,
      );
    if (!domainCategory)
      throw new HttpException(
        'domainCategory is required',
        HttpStatus.BAD_REQUEST,
      );

    const channelsToUse = dto.channelsToUse ?? [];
    this.assertUniqueChannelsToUse(channelsToUse);

    try {
      const created = await this.model.create({
        companyId,
        domainKey,
        displayName,
        domainCategory,
        isActive: dto.isActive ?? true,
        channelsToUse: channelsToUse.map((x) => ({
          channel: x.channel,
          providerCredentialsId: new Types.ObjectId(x.providerCredentialsId),
        })),
      });

      return DomainCatalogueMapper.toResponse(created.toObject());
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new HttpException(
          'Domain already exists (companyId + domainKey)',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        err?.message ?? 'Failed to create domain',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(params: {
    companyId: string;
    active?: boolean;
  }): Promise<DomainCatalogueResponseDto[]> {
    const companyId = this.toObjectIdOrThrow(params.companyId, 'companyId');

    const filter: any = { companyId };
    if (typeof params.active === 'boolean') filter.isActive = params.active;

    const list = await this.model.find(filter).sort({ domainKey: 1 }).lean();
    return DomainCatalogueMapper.toResponseList(list as any[]);
  }

  async getById(id: string): Promise<DomainCatalogueResponseDto> {
    const _id = this.toObjectIdOrThrow(id, 'id');

    const doc = await this.model.findById(_id).lean();
    if (!doc) throw new HttpException('Domain not found', HttpStatus.NOT_FOUND);

    return DomainCatalogueMapper.toResponse(doc);
  }

  async update(
    id: string,
    dto: UpdateDomainCatalogueDto,
  ): Promise<DomainCatalogueResponseDto> {
    const _id = this.toObjectIdOrThrow(id, 'id');

    const existing = await this.model.findById(_id).lean();
    if (!existing)
      throw new HttpException('Domain not found', HttpStatus.NOT_FOUND);

    const $set: any = {};

    if (dto.companyId !== undefined)
      $set.companyId = this.toObjectIdOrThrow(dto.companyId, 'companyId');

    if (dto.domainKey !== undefined) {
      const domainKey = this.normalizeKey(dto.domainKey);
      if (!domainKey)
        throw new HttpException(
          'domainKey is required',
          HttpStatus.BAD_REQUEST,
        );
      $set.domainKey = domainKey;
    }

    if (dto.displayName !== undefined) {
      const displayName = String(dto.displayName ?? '').trim();
      if (!displayName)
        throw new HttpException(
          'displayName is required',
          HttpStatus.BAD_REQUEST,
        );
      $set.displayName = displayName;
    }

    if (dto.domainCategory !== undefined) {
      const domainCategory = this.normalizeCategory(dto.domainCategory);
      if (!domainCategory)
        throw new HttpException(
          'domainCategory is required',
          HttpStatus.BAD_REQUEST,
        );
      $set.domainCategory = domainCategory;
    }

    if (dto.isActive !== undefined) $set.isActive = dto.isActive;

    if (dto.channelsToUse !== undefined) {
      const channelsToUse = dto.channelsToUse ?? [];
      this.assertUniqueChannelsToUse(channelsToUse);

      $set.channelsToUse = channelsToUse.map((x) => ({
        channel: x.channel,
        providerCredentialsId: new Types.ObjectId(x.providerCredentialsId),
      }));
    }

    try {
      const updated = await this.model.findByIdAndUpdate(
        _id,
        { $set },
        { new: true, runValidators: true },
      );
      if (!updated)
        throw new HttpException('Domain not found', HttpStatus.NOT_FOUND);
      return DomainCatalogueMapper.toResponse(updated.toObject());
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new HttpException(
          'Domain already exists (companyId + domainKey)',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        err?.message ?? 'Failed to update domain',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const _id = this.toObjectIdOrThrow(id, 'id');
    const res = await this.model.findByIdAndDelete(_id);
    if (!res) throw new HttpException('Domain not found', HttpStatus.NOT_FOUND);
    return { deleted: true };
  }

  async getByCompanyAndDomainKey(params: {
    companyId: string;
    domainKey: string;
  }) {
    const companyId = this.toObjectIdOrThrow(params.companyId, 'companyId');
    const domainKey = this.normalizeKey(params.domainKey);

    if (!domainKey)
      throw new HttpException('domainKey is required', HttpStatus.BAD_REQUEST);

    const doc = await this.model.findOne({ companyId, domainKey }).lean();
    if (!doc) throw new HttpException('Domain not found', HttpStatus.NOT_FOUND);

    return DomainCatalogueMapper.toResponse(doc);
  }

  async getDomainCredentials(domainId: string) {
    const _id = this.toObjectIdOrThrow(domainId, 'domainId');

    let q = this.model
      .findById(_id)
      .select('companyId domainKey displayName channelsToUse isActive');
    q = this.populateChannelsCredentials(q);

    const domain: any = await q.lean();
    if (!domain)
      throw new HttpException('Domain not found', HttpStatus.NOT_FOUND);

    // Respuesta amigable para UI:
    const channels = (domain.channelsToUse ?? []).map((x: any) => {
      const cred = x.providerCredentialsId; // populated
      const ccp = cred?.companyChannelProviderId;
      const provider = ccp?.providerId;
      const channel = ccp?.channelId;

      return {
        channel: String(x.channel),
        providerCredentialsId: cred?._id
          ? String(cred._id)
          : String(x.providerCredentialsId),
        tag: cred?.tag ?? null,
        credentialsIsActive: cred?.isActive ?? null,

        // info útil para UI
        companyChannelProviderId: ccp?._id ? String(ccp._id) : null,
        companyId: ccp?.companyId ? String(ccp.companyId) : null,
        providerKey: provider?.providerKey ?? null,
        providerDisplayName: provider?.displayName ?? null,
        connectionType: provider?.connectionType ?? null,
        channelKey: channel?.channelKey ?? null,
        channelDisplayName: channel?.displayName ?? null,
      };
    });

    return {
      domain: {
        id: String(domain._id),
        companyId: String(domain.companyId),
        domainKey: domain.domainKey,
        displayName: domain.displayName,
        isActive: domain.isActive,
      },
      channels,
    };
  }

  async updateDomainCredential(params: {
    domainId: string;
    channel: ChannelKey;
    providerCredentialsId: string;
  }) {
    const domain = await this.getDomainOrThrow(params.domainId);

    const channel = this.normalizeChannel(params.channel);

    // valida credencial vs company + canal
    await this.validateCredentialForDomain({
      companyId: String(domain.companyId),
      channel,
      providerCredentialsId: params.providerCredentialsId,
    });

    // actualiza SOLO el item del canal
    const res = await this.model.updateOne(
      { _id: domain._id, 'channelsToUse.channel': channel },
      {
        $set: {
          'channelsToUse.$.providerCredentialsId': this.toObjectIdOrThrow(
            params.providerCredentialsId,
            'providerCredentialsId',
          ),
        },
      },
    );

    // si el canal no existía en el array, lo agregamos (opcional)
    if (res.matchedCount === 0) {
      await this.model.updateOne(
        { _id: domain._id },
        {
          $push: {
            channelsToUse: {
              channel,
              providerCredentialsId: this.toObjectIdOrThrow(
                params.providerCredentialsId,
                'providerCredentialsId',
              ),
            },
          },
        },
      );
    }

    return this.getDomainCredentials(String(domain._id));
  }

  // ==========================
  // CRUD existente
  // ==========================

  async bulkUpdateDomainsCredential(params: {
    companyId: string;
    domainIds: string[];
    channel: ChannelKey;
    providerCredentialsId: string;
  }) {
    const companyId = this.toObjectIdOrThrow(params.companyId, 'companyId');
    const channel = this.normalizeChannel(params.channel);

    const domainIds = Array.isArray(params.domainIds) ? params.domainIds : [];
    if (domainIds.length === 0) {
      throw new HttpException(
        'domainIds must be a non-empty array',
        HttpStatus.BAD_REQUEST,
      );
    }

    // valida credencial vs company + canal (una sola vez)
    await this.validateCredentialForDomain({
      companyId: String(companyId),
      channel,
      providerCredentialsId: params.providerCredentialsId,
    });

    const ids = domainIds.map((id) => this.toObjectIdOrThrow(id, 'domainId'));

    // actualiza dominios que ya tengan ese canal
    await this.model.updateMany(
      { _id: { $in: ids }, companyId, 'channelsToUse.channel': channel },
      {
        $set: {
          'channelsToUse.$.providerCredentialsId': this.toObjectIdOrThrow(
            params.providerCredentialsId,
            'providerCredentialsId',
          ),
        },
      },
    );

    // agrega canal a los dominios que no lo tenían
    await this.model.updateMany(
      {
        _id: { $in: ids },
        companyId,
        'channelsToUse.channel': { $ne: channel },
      },
      {
        $push: {
          channelsToUse: {
            channel,
            providerCredentialsId: this.toObjectIdOrThrow(
              params.providerCredentialsId,
              'providerCredentialsId',
            ),
          },
        },
      },
    );

    return {
      updated: true,
      domainIds: domainIds.map(String),
      channel,
      providerCredentialsId: params.providerCredentialsId,
    };
  }

  private toObjectIdOrThrow(id: string, label: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException(`Invalid ${label}`, HttpStatus.BAD_REQUEST);
    }
    return new Types.ObjectId(id);
  }

  private normalizeKey(v: string) {
    return String(v ?? '')
      .toLowerCase()
      .trim();
  }

  private normalizeCategory(v: string) {
    return String(v ?? '')
      .toLowerCase()
      .trim();
  }

  private normalizeChannel(v: string): ChannelKey {
    const ch = String(v ?? '')
      .toLowerCase()
      .trim();
    if (ch !== 'email' && ch !== 'sms') {
      throw new HttpException(
        'channel must be "email" or "sms"',
        HttpStatus.BAD_REQUEST,
      );
    }
    return ch;
  }

  // ✅ regla: no puede repetirse el mismo channel en channelsToUse
  private assertUniqueChannelsToUse(channelsToUse: any[]) {
    const allowed = new Set<ChannelKey>(['email', 'sms']);
    const seen = new Set<string>();

    for (const [idx, item] of (channelsToUse ?? []).entries()) {
      if (!item || typeof item !== 'object') {
        throw new HttpException(
          `channelsToUse[${idx}] must be an object`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const ch = String(item.channel ?? '')
        .toLowerCase()
        .trim();
      if (!allowed.has(ch as any)) {
        throw new HttpException(
          `channelsToUse[${idx}].channel invalid`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (seen.has(ch)) {
        throw new HttpException(
          `Duplicate channel "${ch}" in channelsToUse`,
          HttpStatus.BAD_REQUEST,
        );
      }
      seen.add(ch);

      if (!Types.ObjectId.isValid(item.providerCredentialsId)) {
        throw new HttpException(
          `channelsToUse[${idx}].providerCredentialsId invalid`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  // =========================================================
  // ✅ NUEVO: Ver credenciales asociadas a un dominio
  // =========================================================

  /**
   * ✅ Populate para mostrar credenciales desde Domain:
   * domain.channelsToUse[].providerCredentialsId -> ProviderCredentials(tag,isActive,companyChannelProviderId)
   * -> companyChannelProviderId -> providerId + channelId
   */
  private populateChannelsCredentials(q: any) {
    return q.populate({
      path: 'channelsToUse.providerCredentialsId',
      select: 'tag isActive companyChannelProviderId', // ✅ sin encrypted
      populate: {
        path: 'companyChannelProviderId',
        select: 'companyId providerId channelId isActive',
        populate: [
          {
            path: 'providerId',
            select: 'providerKey displayName connectionType isActive',
          },
          { path: 'channelId', select: 'channelKey displayName isActive' },
        ],
      },
    });
  }

  // =========================================================
  // ✅ NUEVO: Cambiar la credencial de UN dominio (por canal)
  // =========================================================

  private async getDomainOrThrow(domainId: string) {
    const _id = this.toObjectIdOrThrow(domainId, 'domainId');

    const doc: any = await this.model.findById(_id).lean();
    if (!doc) throw new HttpException('Domain not found', HttpStatus.NOT_FOUND);

    return doc as any;
  }

  // =========================================================
  // ✅ NUEVO: Cambiar credencial para VARIOS dominios (bulk)
  // =========================================================

  /**
   * ✅ Valida credencial:
   * - existe
   * - activa
   * - pertenece a la misma companyId del dominio (via CompanyChannelProvider.companyId)
   * - el channelKey del CCP coincide con el channel que estás asignando (email/sms)
   */
  private async validateCredentialForDomain(params: {
    companyId: string;
    channel: ChannelKey;
    providerCredentialsId: string;
  }) {
    const companyId = this.toObjectIdOrThrow(params.companyId, 'companyId');
    const credId = this.toObjectIdOrThrow(
      params.providerCredentialsId,
      'providerCredentialsId',
    );
    const channel = this.normalizeChannel(params.channel);

    const cred: any = await this.credentialsModel
      .findById(credId)
      .select('isActive tag companyChannelProviderId')
      .populate({
        path: 'companyChannelProviderId',
        select: 'companyId providerId channelId isActive',
        populate: [
          {
            path: 'providerId',
            select: 'providerKey displayName connectionType isActive',
          },
          { path: 'channelId', select: 'channelKey displayName isActive' },
        ],
      })
      .lean();

    if (!cred)
      throw new HttpException('Credentials not found', HttpStatus.NOT_FOUND);
    if (cred.isActive === false)
      throw new HttpException('Credentials inactive', HttpStatus.BAD_REQUEST);

    const ccp: any = cred.companyChannelProviderId;
    if (!ccp) {
      throw new HttpException(
        'CompanyChannelProvider not populated',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    if (ccp.isActive === false)
      throw new HttpException(
        'CompanyChannelProvider inactive',
        HttpStatus.BAD_REQUEST,
      );

    if (String(ccp.companyId) !== String(companyId)) {
      throw new HttpException(
        'Credentials do not belong to this company',
        HttpStatus.BAD_REQUEST,
      );
    }

    const ch: any = ccp.channelId;
    if (!ch?.channelKey)
      throw new HttpException(
        'Channel not populated',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

    const ccpChannelKey = String(ch.channelKey).toLowerCase().trim();
    if (ccpChannelKey !== channel) {
      throw new HttpException(
        `Credentials channel mismatch. Expected "${channel}" but credentials are "${ccpChannelKey}"`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return cred;
  }
}

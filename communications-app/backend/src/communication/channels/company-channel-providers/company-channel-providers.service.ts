// src/company-channel-providers/company-channel-providers.service.ts
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  CompanyChannelProvider,
  CompanyChannelProviderDocument,
} from './schemas/company-channel-provider.schema';

import { CreateCompanyChannelProviderDto } from './dto/create-company-channel-provider.dto';
import { UpdateCompanyChannelProviderDto } from './dto/update-company-channel-provider.dto';
import { CompanyChannelProviderResponseDto } from './dto/company-channel-provider-response.dto';
import { CompanyChannelProviderMapper } from './mappers/company-channel-provider.mapper';
import type { PaginatedResponse } from '../../common/pagination/pagination.util';
import {
  Company,
  CompanyDocument,
} from '../../company/company-info/schemas/company.schema';

type ProviderTenant = {
  companyId: Types.ObjectId;
  grapiflyOrganizationId: string | null;
};

// ✅ modelos existentes
import {
  Provider,
  ProviderDocument,
} from '../providers/schemas/provider.schema';
import {
  Channel,
  ChannelDocument,
} from '../channels-catalogue/schemas/channel-catalog.schema';
import {
  ProviderCredentials,
  ProviderCredentialsDocument,
} from '../provider-credentials/schemas/provider-credentials.schema';

@Injectable()
export class CompanyChannelProvidersService {
  constructor(
    @InjectModel(CompanyChannelProvider.name)
    private readonly model: Model<CompanyChannelProviderDocument>,
    @InjectModel(Provider.name)
    private readonly providersModel: Model<ProviderDocument>,
    @InjectModel(Channel.name)
    private readonly channelsModel: Model<ChannelDocument>,
    @InjectModel(ProviderCredentials.name)
    private readonly credentialsModel: Model<ProviderCredentialsDocument>,
    @InjectModel(Company.name)
    private readonly companiesModel: Model<CompanyDocument>,
  ) {}

  // ==========================
  // Helpers
  // ==========================

  async findAll(params: {
    companyId: string;
    channelId?: string;
    active?: boolean;
    isDefault?: boolean;
    populate?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<CompanyChannelProviderResponseDto>> {
    const tenant = await this.resolveTenant(params.companyId);
    const filter: any = this.tenantFilter(tenant);
    if (params.channelId)
      filter.channelId = this.toObjectId(params.channelId, 'channelId');
    if (typeof params.active === 'boolean') filter.isActive = params.active;
    if (typeof params.isDefault === 'boolean')
      filter.isDefault = params.isDefault;

    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    const q = this.model.find(filter).sort({ createdAt: -1 });

    if (params.populate) {
      q.populate({
        path: 'providerId',
        select: 'providerKey displayName connectionType isActive channelIds',
      });
      q.populate({
        path: 'channelId',
        select: 'channelKey displayName isActive',
      });
    }

    const [list, total] = await Promise.all([
      q.skip(offset).limit(limit).lean(),
      this.model.countDocuments(filter),
    ]);

    return {
      data: CompanyChannelProviderMapper.toResponseList(list as any[]),
      total,
      limit,
      offset,
    };
  }

  async findById(
    id: string,
    populate = true,
  ): Promise<CompanyChannelProviderResponseDto> {
    const _id = this.toObjectId(id, 'id');

    const q = this.model.findById(_id);

    if (populate) {
      q.populate({
        path: 'providerId',
        select: 'providerKey displayName connectionType isActive channelIds',
      });
      q.populate({
        path: 'channelId',
        select: 'channelKey displayName isActive',
      });
    }

    const doc = await q.lean();
    if (!doc)
      throw new HttpException(
        'CompanyChannelProvider not found',
        HttpStatus.NOT_FOUND,
      );

    return CompanyChannelProviderMapper.toResponse(doc as any);
  }

  /**
   * ✅ NUEVO: Buscar el default por channel
   * - Puede usarse por Files/Storage (sin eventos)
   * - O por cualquier otro flujo que requiera "default provider"
   */
  async findDefaultByChannel(params: {
    companyId: string;
    channelId: string;
    populate?: boolean;
  }): Promise<CompanyChannelProviderResponseDto> {
    const tenant = await this.resolveTenant(params.companyId);
    const channelId = this.toObjectId(params.channelId, 'channelId');

    const q = this.model.findOne({
      ...this.tenantFilter(tenant),
      channelId,
      isActive: true,
      isDefault: true,
    });

    if (params.populate ?? true) {
      q.populate({
        path: 'providerId',
        select: 'providerKey displayName connectionType isActive channelIds',
      });
      q.populate({
        path: 'channelId',
        select: 'channelKey displayName isActive',
      });
    }

    const doc = await q.lean();
    if (!doc) {
      throw new HttpException(
        'Default provider not configured for this channel',
        HttpStatus.NOT_FOUND,
      );
    }

    return CompanyChannelProviderMapper.toResponse(doc as any);
  }

  async create(
    dto: CreateCompanyChannelProviderDto,
  ): Promise<CompanyChannelProviderResponseDto> {
    try {
      const tenant = await this.resolveTenant(dto.companyId);
      const companyId = tenant.companyId;
      const providerId = this.toObjectId(dto.providerId, 'providerId');
      const channelId = this.toObjectId(dto.channelId, 'channelId');

      // Explicit duplicate check — gives a clear 409 instead of a cryptic 11000
      const existingLink = await this.model
        .findOne({ ...this.tenantFilter(tenant), providerId, channelId })
        .lean();
      if (existingLink) {
        throw new HttpException(
          'This provider is already enabled for this company.',
          HttpStatus.CONFLICT,
        );
      }

      const provider = await this.assertProviderExistsActive(dto.providerId);
      await this.assertChannelExistsActive(dto.channelId);

      this.assertProviderMatchesChannel(provider, dto.channelId);

      const isDefault = this.toBool(dto.isDefault) ?? false;

      // ✅ si se va a setear como default, desmarcar el anterior default del canal
      if (isDefault) {
        await this.unsetPreviousDefault({ tenant, channelId });
      }

      const created = await this.model.create({
        companyId,
        grapiflyOrganizationId: tenant.grapiflyOrganizationId,
        providerId,
        channelId,
        isDefault,
        isActive: dto.isActive ?? true,
      });

      const populated = await this.model
        .findById(created._id)
        .populate({
          path: 'providerId',
          select: 'providerKey displayName connectionType isActive channelIds',
        })
        .populate({
          path: 'channelId',
          select: 'channelKey displayName isActive',
        })
        .lean();

      return CompanyChannelProviderMapper.toResponse(populated as any);
    } catch (err: any) {
      if (err?.code === 11000) {
        // puede ser uniq_company_provider o uniq_default_provider_per_channel
        throw new HttpException(
          'Duplicate link (company+provider) OR default already exists for this channel',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        err?.message ?? 'Failed to create company channel provider',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    id: string,
    dto: UpdateCompanyChannelProviderDto,
  ): Promise<CompanyChannelProviderResponseDto> {
    try {
      const _id = this.toObjectId(id, 'id');

      const existing: any = await this.model.findById(_id).lean();
      if (!existing)
        throw new HttpException(
          'CompanyChannelProvider not found',
          HttpStatus.NOT_FOUND,
        );

      const $set: any = {};
      const tenant = await this.resolveTenant(String(existing.companyId));
      if (tenant.grapiflyOrganizationId) {
        $set.grapiflyOrganizationId = tenant.grapiflyOrganizationId;
      }

      if (dto.isActive !== undefined) $set.isActive = dto.isActive;

      // si se cambia provider o channel, validar ambos y la consistencia
      const nextProviderId = dto.providerId ?? String(existing.providerId);
      const nextChannelId = dto.channelId ?? String(existing.channelId);

      if (dto.providerId !== undefined)
        $set.providerId = this.toObjectId(dto.providerId, 'providerId');
      if (dto.channelId !== undefined)
        $set.channelId = this.toObjectId(dto.channelId, 'channelId');

      if (dto.providerId !== undefined || dto.channelId !== undefined) {
        const provider = await this.assertProviderExistsActive(nextProviderId);
        await this.assertChannelExistsActive(nextChannelId);
        this.assertProviderMatchesChannel(provider, nextChannelId);
      }

      // ✅ default handling
      if (dto.isDefault !== undefined) {
        const isDefault = this.toBool(dto.isDefault) ?? false;

        if (isDefault) {
          const channelIdObj = this.toObjectId(nextChannelId, 'channelId');

          await this.unsetPreviousDefault({
            tenant,
            channelId: channelIdObj,
            excludeId: _id,
          });

          $set.isDefault = true;
        } else {
          $set.isDefault = false;
        }
      }

      const updated = await this.model
        .findByIdAndUpdate(_id, { $set }, { new: true, runValidators: true })
        .populate({
          path: 'providerId',
          select: 'providerKey displayName connectionType isActive channelIds',
        })
        .populate({
          path: 'channelId',
          select: 'channelKey displayName isActive',
        })
        .lean();

      if (!updated)
        throw new HttpException(
          'CompanyChannelProvider not found',
          HttpStatus.NOT_FOUND,
        );

      return CompanyChannelProviderMapper.toResponse(updated as any);
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new HttpException(
          'Duplicate link (company+provider) OR default already exists for this channel',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        err?.message ?? 'Failed to update company channel provider',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(
    id: string,
    force = false,
  ): Promise<{ deleted: boolean; cascaded: number }> {
    const _id = this.toObjectId(id, 'id');

    const doc = await this.model.findById(_id).lean();
    if (!doc)
      throw new HttpException(
        'CompanyChannelProvider not found',
        HttpStatus.NOT_FOUND,
      );

    // Check for linked credentials
    const credentialCount = await this.credentialsModel.countDocuments({
      companyChannelProviderId: _id,
    });

    if (credentialCount > 0 && !force) {
      throw new HttpException(
        {
          message: `This provider has ${credentialCount} credential(s) configured. Deleting it will also remove its credentials.`,
          hasCredentials: true,
          credentialCount,
        },
        HttpStatus.CONFLICT,
      );
    }

    // Cascade: remove linked credentials before deleting the provider config
    let cascaded = 0;
    if (credentialCount > 0) {
      const result = await this.credentialsModel.deleteMany({
        companyChannelProviderId: _id,
      });
      cascaded = result.deletedCount ?? 0;
    }

    await this.model.findByIdAndDelete(_id);
    return { deleted: true, cascaded };
  }

  // ==========================
  // Queries
  // ==========================

  private toObjectId(id: string, fieldName: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException(`Invalid ${fieldName}`, HttpStatus.BAD_REQUEST);
    }
    return new Types.ObjectId(id);
  }

  private toBool(v?: any): boolean | undefined {
    if (v === undefined) return undefined;
    if (typeof v === 'boolean') return v;
    const s = String(v).toLowerCase().trim();
    return s === 'true' || s === '1';
  }

  private async assertProviderExistsActive(providerId: string) {
    const _id = this.toObjectId(providerId, 'providerId');
    const provider = await this.providersModel
      .findOne({ _id, isActive: true })
      .lean();

    if (!provider) {
      throw new HttpException(
        'Provider not found or inactive',
        HttpStatus.BAD_REQUEST,
      );
    }
    return provider as any;
  }

  // ==========================
  // CRUD
  // ==========================

  private async assertChannelExistsActive(channelId: string) {
    const _id = this.toObjectId(channelId, 'channelId');
    const channel = await this.channelsModel
      .findOne({ _id, isActive: true })
      .lean();

    if (!channel) {
      throw new HttpException(
        'Channel not found or inactive',
        HttpStatus.BAD_REQUEST,
      );
    }
    return channel as any;
  }

  private assertProviderMatchesChannel(provider: any, channelId: string) {
    const channelIds: any[] = provider.channelIds ?? [];
    const belongs = channelIds.some(
      (id: any) => String(id) === String(channelId),
    );
    if (!belongs) {
      throw new HttpException(
        'providerId does not belong to the given channelId',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * ✅ Si vas a setear default=true, primero apaga cualquier default anterior
   * para esa (companyId + channelId).
   */
  private async unsetPreviousDefault(params: {
    tenant: ProviderTenant;
    channelId: Types.ObjectId;
    excludeId?: Types.ObjectId;
  }) {
    const filter: any = {
      ...this.tenantFilter(params.tenant),
      channelId: params.channelId,
      isDefault: true,
    };

    if (params.excludeId) filter._id = { $ne: params.excludeId };

    await this.model.updateMany(filter, { $set: { isDefault: false } });
  }

  private async resolveTenant(companyIdValue: string): Promise<ProviderTenant> {
    const companyId = this.toObjectId(companyIdValue, 'companyId');
    const company = await this.companiesModel
      .findById(companyId)
      .select({ grapiflyOrganizationId: 1 })
      .lean();

    if (!company) {
      throw new HttpException('Company not found', HttpStatus.NOT_FOUND);
    }

    return {
      companyId,
      grapiflyOrganizationId: company.grapiflyOrganizationId ?? null,
    };
  }

  private tenantFilter(tenant: ProviderTenant): Record<string, unknown> {
    if (!tenant.grapiflyOrganizationId) return { companyId: tenant.companyId };

    return {
      $or: [
        { grapiflyOrganizationId: tenant.grapiflyOrganizationId },
        {
          companyId: tenant.companyId,
          $or: [
            { grapiflyOrganizationId: null },
            { grapiflyOrganizationId: { $exists: false } },
          ],
        },
      ],
    };
  }
}

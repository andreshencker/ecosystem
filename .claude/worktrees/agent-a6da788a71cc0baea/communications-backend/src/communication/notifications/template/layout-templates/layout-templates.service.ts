import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  LayoutTemplate,
  LayoutTemplateDocument,
  TemplateType,
} from './schemas/layout-template.schema';

import { CreateLayoutTemplateDto } from './dto/create-layout-template.dto';
import { UpdateLayoutTemplateDto } from './dto/update-layout-template.dto';

import { LayoutTemplateMapper } from './mappers/layout-template.mapper';
import type { PaginatedResponse } from '../../../common/pagination/pagination.util';
import {
  LayoutTemplateContextResponseDto,
  LayoutTemplateResponseDto,
} from './dto/layout-template-response.dto';

import {
  CompanyTheme,
  CompanyThemeDocument,
} from '../../../company/company-theme/schemas/company-theme.schema';

import {
  Company,
  CompanyDocument,
} from '../../../company/company-info/schemas/company.schema';

type PopulateOpts = {
  populateTheme?: boolean;
  populateCompany?: boolean;
};

@Injectable()
export class LayoutTemplatesService {
  constructor(
    @InjectModel(LayoutTemplate.name)
    private readonly model: Model<LayoutTemplateDocument>,
    @InjectModel(CompanyTheme.name)
    private readonly themeModel: Model<CompanyThemeDocument>,
    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,
  ) {}

  // ─────────────────────────────
  // Helpers

  /**
   * ✅ Runtime/Report:
   * companyId + templateType -> theme default activo -> layout default activo
   * Retorna CONTEXT (layout + theme + company).
   */
  async getDefaultByCompanyWithContext(params: {
    companyId: string;
    templateType: TemplateType; // "email" | "pdf"
    populateTheme?: boolean;
    populateCompany?: boolean;
  }): Promise<LayoutTemplateContextResponseDto> {
    const companyId = this.toObjectIdOrThrow(params.companyId, 'companyId');

    // 1) theme default activo
    const theme = await this.getDefaultActiveThemeOrThrow(companyId);

    // 2) layout default activo
    let q = this.model.findOne({
      companyThemeId: theme._id,
      templateType: params.templateType,
      isDefault: true,
      isActive: true,
    });

    q = this.applyPopulate(q, {
      populateTheme: params.populateTheme ?? true,
      populateCompany: params.populateCompany ?? true,
    });

    const doc: any = await q.lean();
    if (!doc) {
      throw new HttpException(
        `Default layout not found for type=${params.templateType}`,
        HttpStatus.NOT_FOUND,
      );
    }

    return LayoutTemplateMapper.toContext(doc);
  }

  /**
   * ✅ Backwards-compat (legacy):
   * Antes: getDefaultWithContext({ companyThemeId, templateType })
   * Sigue funcionando por si algún módulo lo usa.
   */
  async getDefaultWithContext(params: {
    companyThemeId: string;
    templateType: TemplateType;
    populateTheme?: boolean;
    populateCompany?: boolean;
  }): Promise<LayoutTemplateContextResponseDto> {
    const companyThemeId = this.toObjectIdOrThrow(
      params.companyThemeId,
      'companyThemeId',
    );

    let q = this.model.findOne({
      companyThemeId,
      templateType: params.templateType,
      isDefault: true,
      isActive: true,
    });

    q = this.applyPopulate(q, {
      populateTheme: params.populateTheme ?? true,
      populateCompany: params.populateCompany ?? true,
    });

    const doc: any = await q.lean();
    if (!doc)
      throw new HttpException('Default layout not found', HttpStatus.NOT_FOUND);

    return LayoutTemplateMapper.toContext(doc);
  }

  async getByIdWithContext(params: {
    id: string;
    populateTheme?: boolean;
    populateCompany?: boolean;
  }): Promise<LayoutTemplateContextResponseDto> {
    const _id = this.toObjectIdOrThrow(params.id, 'id');

    let q = this.model.findById(_id);

    q = this.applyPopulate(q, {
      populateTheme: params.populateTheme ?? true,
      populateCompany: params.populateCompany ?? true,
    });

    const doc: any = await q.lean();
    if (!doc) throw new HttpException('Layout not found', HttpStatus.NOT_FOUND);

    return LayoutTemplateMapper.toContext(doc);
  }

  async findAllByCompanyFlat(params: {
    companyId: string;
    templateType?: TemplateType;
    active?: boolean;
    includeHtml?: boolean;
    populateTheme?: boolean;
    populateCompany?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ companyId: string; themes: any[]; templates: any[]; total: number; limit: number; offset: number }> {
    const companyId = this.toObjectIdOrThrow(params.companyId, 'companyId');
    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    // 1) themes de la company
    const themes = await this.themeModel
      .find({ companyId })
      .select('_id name isActive isDefault companyId')
      .lean();

    const themeIds = themes.map((t: any) => t._id);
    if (themeIds.length === 0) {
      return {
        companyId: params.companyId,
        themes: [],
        templates: [],
        total: 0,
        limit,
        offset,
      };
    }

    // 2) layouts por esos themes
    const filter: any = { companyThemeId: { $in: themeIds } };
    if (params.templateType) filter.templateType = params.templateType;
    if (typeof params.active === 'boolean') filter.isActive = params.active;

    const baseQuery = this.model
      .find(filter)
      .sort({ companyThemeId: 1, templateType: 1, key: 1 });
    const selectedQuery = params.includeHtml
      ? baseQuery
      : baseQuery.select('-html -css');

    const finalQuery = this.applyPopulate(selectedQuery, {
      populateTheme: params.populateTheme ?? true,
      populateCompany: params.populateCompany ?? true,
    });

    const [list, total] = await Promise.all([
      finalQuery.skip(offset).limit(limit).lean(),
      this.model.countDocuments(filter),
    ]);

    // Normaliza companyThemeId para mapper (si viene populated)
    const normalized = (list as any[]).map((doc) => {
      const themeObj =
        doc?.companyThemeId && typeof doc.companyThemeId === 'object'
          ? (doc.companyThemeId as any)
          : undefined;
      return { ...doc, companyThemeId: themeObj?._id ?? doc.companyThemeId };
    });

    return {
      companyId: params.companyId,
      themes: themes.map((t: any) => ({
        themeId: String(t._id),
        name: t.name ?? '',
        isActive: t.isActive !== false,
        isDefault: t.isDefault === true,
      })),
      templates: LayoutTemplateMapper.toLayoutList(normalized as any[]),
      total,
      limit,
      offset,
    };
  }

  async findAll(params: {
    companyThemeId: string;
    templateType?: TemplateType;
    active?: boolean;
    populateTheme?: boolean;
    populateCompany?: boolean;
  }): Promise<LayoutTemplateResponseDto[]> {
    const companyThemeId = this.toObjectIdOrThrow(
      params.companyThemeId,
      'companyThemeId',
    );

    const filter: any = { companyThemeId };
    if (params.templateType) filter.templateType = params.templateType;
    if (typeof params.active === 'boolean') filter.isActive = params.active;

    let q = this.model.find(filter).sort({ templateType: 1, key: 1 });
    q = this.applyPopulate(q, {
      populateTheme: params.populateTheme,
      populateCompany: params.populateCompany,
    });

    const list = await q.lean();
    return LayoutTemplateMapper.toLayoutList(list as any[]);
  }

  // ─────────────────────────────
  // ✅ Runtime / Report (companyId -> theme default -> layout default)
  // ─────────────────────────────

  async getByKey(params: {
    companyThemeId: string;
    templateType: TemplateType;
    key: string;
    populateTheme?: boolean;
    populateCompany?: boolean;
  }): Promise<LayoutTemplateResponseDto> {
    const companyThemeId = this.toObjectIdOrThrow(
      params.companyThemeId,
      'companyThemeId',
    );
    const key = this.normalizeKey(params.key);

    let q = this.model.findOne({
      companyThemeId,
      templateType: params.templateType,
      key,
      isActive: true,
    });

    q = this.applyPopulate(q, {
      populateTheme: params.populateTheme,
      populateCompany: params.populateCompany,
    });

    const doc = await q.lean();
    if (!doc) throw new HttpException('Layout not found', HttpStatus.NOT_FOUND);

    const themeObj =
      doc?.companyThemeId && typeof doc.companyThemeId === 'object'
        ? (doc.companyThemeId as any)
        : undefined;

    const layoutRaw = {
      ...doc,
      companyThemeId: themeObj?._id ?? doc.companyThemeId,
    };
    return LayoutTemplateMapper.toLayout(layoutRaw);
  }

  // ─────────────────────────────
  // ✅ Legacy alias (para no romper código viejo)
  // ─────────────────────────────

  async getDefault(params: {
    companyThemeId: string;
    templateType: TemplateType;
    populateTheme?: boolean;
    populateCompany?: boolean;
  }): Promise<LayoutTemplateResponseDto> {
    const companyThemeId = this.toObjectIdOrThrow(
      params.companyThemeId,
      'companyThemeId',
    );

    let q = this.model.findOne({
      companyThemeId,
      templateType: params.templateType,
      isDefault: true,
      isActive: true,
    });

    q = this.applyPopulate(q, {
      populateTheme: params.populateTheme,
      populateCompany: params.populateCompany,
    });

    const doc = await q.lean();
    if (!doc)
      throw new HttpException('Default layout not found', HttpStatus.NOT_FOUND);

    const themeObj =
      doc?.companyThemeId && typeof doc.companyThemeId === 'object'
        ? (doc.companyThemeId as any)
        : undefined;

    const layoutRaw = {
      ...doc,
      companyThemeId: themeObj?._id ?? doc.companyThemeId,
    };
    return LayoutTemplateMapper.toLayout(layoutRaw);
  }

  // ─────────────────────────────
  // ✅ Preview / By ID
  // ─────────────────────────────

  async create(
    dto: CreateLayoutTemplateDto,
  ): Promise<LayoutTemplateResponseDto> {
    const companyThemeId = this.toObjectIdOrThrow(
      dto.companyThemeId,
      'companyThemeId',
    );
    await this.assertThemeExistsAndActive(companyThemeId);

    const key = this.normalizeKey(dto.key);
    const name = String(dto.name ?? '').trim();

    if (!key)
      throw new HttpException('key is required', HttpStatus.BAD_REQUEST);
    if (!name)
      throw new HttpException('name is required', HttpStatus.BAD_REQUEST);

    if (dto.isDefault === true) {
      await this.model.updateMany(
        { companyThemeId, templateType: dto.templateType, isDefault: true },
        { $set: { isDefault: false } },
      );
    }

    try {
      const created = await this.model.create({
        companyThemeId,
        templateType: dto.templateType,
        key,
        name,
        html: dto.html,
        css: dto.css ?? '',
        requiredVariables: dto.requiredVariables ?? [],
        optionalVariables: dto.optionalVariables ?? [],
        isDefault: dto.isDefault ?? false,
        isActive: dto.isActive ?? true,
      });

      return LayoutTemplateMapper.toLayout(created.toObject() as any);
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new HttpException(
          'Duplicate layout key for this theme/type OR default already exists',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        err?.message ?? 'Failed to create layout',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─────────────────────────────
  // ✅ FLAT: listar layouts por company (todos los themes)
  // ─────────────────────────────

  async update(
    id: string,
    dto: UpdateLayoutTemplateDto,
  ): Promise<LayoutTemplateResponseDto> {
    const _id = this.toObjectIdOrThrow(id, 'id');

    const existing: any = await this.model.findById(_id).lean();
    if (!existing)
      throw new HttpException('Layout not found', HttpStatus.NOT_FOUND);

    const update: any = {};

    if (dto.companyThemeId !== undefined) {
      const companyThemeId = this.toObjectIdOrThrow(
        dto.companyThemeId,
        'companyThemeId',
      );
      await this.assertThemeExistsAndActive(companyThemeId);
      update.companyThemeId = companyThemeId;
    }

    if (dto.templateType !== undefined) update.templateType = dto.templateType;
    if (dto.key !== undefined) update.key = this.normalizeKey(dto.key);
    if (dto.name !== undefined) update.name = String(dto.name ?? '').trim();

    if (dto.html !== undefined) update.html = dto.html;
    if (dto.css !== undefined) update.css = dto.css ?? '';

    if (dto.requiredVariables !== undefined)
      update.requiredVariables = dto.requiredVariables ?? [];
    if (dto.optionalVariables !== undefined)
      update.optionalVariables = dto.optionalVariables ?? [];

    if (dto.isActive !== undefined) update.isActive = dto.isActive;
    if (dto.isDefault !== undefined) update.isDefault = dto.isDefault;

    const finalThemeId = update.companyThemeId ?? existing.companyThemeId;
    const finalType = update.templateType ?? existing.templateType;

    if (dto.isDefault === true) {
      await this.model.updateMany(
        {
          companyThemeId: finalThemeId,
          templateType: finalType,
          isDefault: true,
          _id: { $ne: _id },
        },
        { $set: { isDefault: false } },
      );
    }

    try {
      const doc = await this.model.findByIdAndUpdate(_id, update, {
        new: true,
        runValidators: true,
      });

      if (!doc)
        throw new HttpException('Layout not found', HttpStatus.NOT_FOUND);
      return LayoutTemplateMapper.toLayout(doc.toObject() as any);
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new HttpException(
          'Duplicate layout key for this theme/type OR default already exists',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        err?.message ?? 'Failed to update layout',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─────────────────────────────
  // CRUD / Queries
  // ─────────────────────────────

  async remove(id: string): Promise<{ deleted: boolean }> {
    const _id = this.toObjectIdOrThrow(id, 'id');

    const doc = await this.model.findByIdAndDelete(_id);
    if (!doc) throw new HttpException('Layout not found', HttpStatus.NOT_FOUND);

    return { deleted: true };
  }

  // ─────────────────────────────
  async getCompanyOverview(params: {
    companyId: string;
    includeHtml?: boolean;
  }) {
    const companyId = this.toObjectIdOrThrow(params.companyId, 'companyId');

    const themes = await this.themeModel
      .find({ companyId })
      .select('_id name isActive isDefault companyId')
      .lean();

    const themeIds = themes.map((t: any) => t._id);
    if (themeIds.length === 0) {
      return { companyId: params.companyId, themes: [] };
    }

    const baseQuery = this.model
      .find({ companyThemeId: { $in: themeIds } })
      .sort({ companyThemeId: 1, templateType: 1, key: 1 });

    const selectedQuery = params.includeHtml
      ? baseQuery
      : baseQuery.select('-html -css');
    const layouts: any[] = await selectedQuery.lean();

    const byTheme: Record<string, any> = {};

    for (const t of themes as any[]) {
      byTheme[String(t._id)] = {
        themeId: String(t._id),
        themeName: t.name ?? '',
        isActive: t.isActive !== false,
        isDefault: t.isDefault === true,
        templates: {
          email: {
            default: null,
            activeCount: 0,
            inactiveCount: 0,
            others: [],
          },
          pdf: { default: null, activeCount: 0, inactiveCount: 0, others: [] },
        },
      };
    }

    for (const l of layouts) {
      const themeId = String(l.companyThemeId);
      const bucket = byTheme[themeId];
      if (!bucket) continue;

      const type = l.templateType as 'email' | 'pdf';
      if (type !== 'email' && type !== 'pdf') continue;

      const target = bucket.templates[type];

      const item = {
        id: String(l._id),
        key: l.key,
        name: l.name,
        isDefault: !!l.isDefault,
        isActive: l.isActive !== false,
        updatedAt: l.updatedAt ?? null,
        ...(params.includeHtml
          ? { html: l.html ?? null, css: l.css ?? null }
          : {}),
      };

      if (item.isActive) target.activeCount += 1;
      else target.inactiveCount += 1;

      if (item.isDefault) target.default = item;
      else target.others.push(item);
    }

    return {
      companyId: params.companyId,
      themes: Object.values(byTheme),
    };
  }

  // ─────────────────────────────
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

  private applyPopulate(q: any, opts?: PopulateOpts) {
    const populateTheme = opts?.populateTheme ?? true;
    const populateCompany = opts?.populateCompany ?? true;

    if (!populateTheme && !populateCompany) return q;

    return q.populate({
      path: 'companyThemeId',
      populate: populateCompany ? { path: 'companyId' } : undefined,
    });
  }

  private async assertThemeExistsAndActive(companyThemeId: Types.ObjectId) {
    const theme = await this.themeModel
      .findById(companyThemeId)
      .select('_id companyId isActive isDefault')
      .lean();

    if (!theme)
      throw new HttpException('CompanyTheme not found', HttpStatus.BAD_REQUEST);
    if ((theme as any).isActive === false)
      throw new HttpException('CompanyTheme inactive', HttpStatus.BAD_REQUEST);

    return theme as any;
  }

  // ─────────────────────────────
  // Company Overview (auditoría)

  /**
   * ✅ DADO companyId -> retorna el theme DEFAULT + ACTIVE
   */
  private async getDefaultActiveThemeOrThrow(companyId: Types.ObjectId) {
    const theme = await this.themeModel
      .findOne({
        companyId,
        isDefault: true,
        isActive: true,
      })
      .select('_id companyId isActive isDefault name')
      .lean();

    if (!theme) {
      throw new HttpException(
        'Default active theme not found for this company',
        HttpStatus.NOT_FOUND,
      );
    }

    return theme as any;
  }
}

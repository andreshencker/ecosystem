import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  CompanyTheme,
  CompanyThemeDocument,
} from './schemas/company-theme.schema';
import { CreateCompanyThemeDto } from './dto/create-company-theme.dto';
import { UpdateCompanyThemeDto } from './dto/update-company-theme.dto';
import { CompanyThemeResponseDto } from './dto/company-theme-response.dto';
import { CompanyThemeMapper } from './mappers/company-theme.mapper';
import type { PaginatedResponse } from '../../common/pagination/pagination.util';

@Injectable()
export class CompanyThemeService {
  constructor(
    @InjectModel(CompanyTheme.name)
    private readonly model: Model<CompanyThemeDocument>,
  ) {}

  async findAll(params: {
    companyId: string;
    active?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<CompanyThemeResponseDto>> {
    const companyId = this.toObjectId(params.companyId, 'companyId');
    const filter: any = { companyId };
    if (typeof params.active === 'boolean') filter.isActive = params.active;

    const limit = Math.min(Number(params.limit ?? 50), 200);
    const offset = Math.max(0, Number(params.offset ?? 0));

    const [list, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ isDefault: -1, isActive: -1, createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      this.model.countDocuments(filter),
    ]);

    return {
      data: CompanyThemeMapper.toResponseList(list as any[]),
      total,
      limit,
      offset,
    };
  }

  async findById(
    companyId: string,
    id: string,
  ): Promise<CompanyThemeResponseDto> {
    const doc = await this.model
      .findOne({
        _id: this.toObjectId(id, 'themeId'),
        companyId: this.toObjectId(companyId, 'companyId'),
      })
      .lean();
    if (!doc) throw new NotFoundException('Theme not found');
    return CompanyThemeMapper.toResponse(doc as any);
  }

  async getDefaultByCompanyId(
    companyId: string,
  ): Promise<CompanyThemeResponseDto | null> {
    if (!Types.ObjectId.isValid(companyId)) {
      throw new HttpException('Invalid companyId', HttpStatus.BAD_REQUEST);
    }
    const _companyId = new Types.ObjectId(companyId);

    // 1) default activo
    const def = await this.model
      .findOne({ companyId: _companyId, isDefault: true, isActive: true })
      .sort({ createdAt: -1 })
      .lean();

    if (def) return CompanyThemeMapper.toResponse(def as any);

    // 2) fallback: último activo
    const lastActive = await this.model
      .findOne({ companyId: _companyId, isActive: true })
      .sort({ createdAt: -1 })
      .lean();

    return lastActive ? CompanyThemeMapper.toResponse(lastActive as any) : null;
  }

  async create(
    companyIdValue: string,
    dto: CreateCompanyThemeDto,
  ): Promise<CompanyThemeResponseDto> {
    const companyId = this.toObjectId(companyIdValue, 'companyId');
    const makeDefault = dto.isDefault === true;

    if (makeDefault && dto.isActive === false) {
      throw new BadRequestException('The default theme must be active');
    }

    const session = await this.model.db.startSession();
    try {
      let createdDoc: any;

      await session.withTransaction(async () => {
        if (makeDefault) {
          await this.model.updateMany(
            { companyId, isDefault: true },
            { $set: { isDefault: false } },
            { session },
          );
        }

        createdDoc = await this.model.create(
          [
            {
              companyId,
              label: dto.label,
              primaryColor: dto.primaryColor,
              secondaryColor: dto.secondaryColor,
              backgroundColor: dto.backgroundColor,
              surfaceColor: dto.surfaceColor,
              textColor: dto.textColor,
              mutedTextColor: dto.mutedTextColor,
              borderColor: dto.borderColor,
              linkColor: dto.linkColor,

              fontFamily: dto.fontFamily,
              fontSizeBase: dto.fontSizeBase,
              fontWeightNormal: dto.fontWeightNormal,
              fontWeightBold: dto.fontWeightBold,

              isDefault: makeDefault,
              isActive: dto.isActive ?? true,
            },
          ],
          { session },
        );
      });

      const doc = Array.isArray(createdDoc) ? createdDoc[0] : createdDoc;
      return CompanyThemeMapper.toResponse(doc.toObject());
    } catch (err: any) {
      throw new HttpException(
        err?.message ?? 'Failed to create theme',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      session.endSession();
    }
  }

  async updateById(
    companyIdValue: string,
    id: string,
    dto: UpdateCompanyThemeDto,
  ): Promise<CompanyThemeResponseDto> {
    const companyId = this.toObjectId(companyIdValue, 'companyId');
    const themeId = this.toObjectId(id, 'themeId');
    const existing = await this.model.findOne({ _id: themeId, companyId });
    if (!existing)
      throw new NotFoundException('Theme not found');

    if (existing.isDefault && dto.isDefault === false) {
      throw new ConflictException(
        'Set another theme as default instead of unsetting the current default',
      );
    }
    if (
      (existing.isDefault || dto.isDefault === true) &&
      dto.isActive === false
    ) {
      throw new ConflictException('The default theme must remain active');
    }

    const makeDefault = dto.isDefault === true;

    const session = await this.model.db.startSession();
    try {
      let updated: any;

      await session.withTransaction(async () => {
        if (makeDefault) {
          await this.model.updateMany(
            {
              companyId: existing.companyId,
              isDefault: true,
              _id: { $ne: existing._id },
            },
            { $set: { isDefault: false } },
            { session },
          );
        }

        updated = await this.model.findOneAndUpdate(
          { _id: existing._id, companyId },
          { $set: { ...dto, ...(makeDefault ? { isActive: true } : {}) } },
          { new: true, runValidators: true, session },
        );
      });

      return CompanyThemeMapper.toResponse(updated.toObject());
    } catch (err: any) {
      throw new HttpException(
        err?.message ?? 'Failed to update theme',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      session.endSession();
    }
  }

  async removeById(
    companyIdValue: string,
    id: string,
  ): Promise<{ deleted: boolean }> {
    const companyId = this.toObjectId(companyIdValue, 'companyId');
    const themeId = this.toObjectId(id, 'themeId');
    const doc = await this.model.findOne({ _id: themeId, companyId }).lean();
    if (!doc) throw new NotFoundException('Theme not found');
    if ((doc as any).isDefault) {
      throw new ConflictException(
        'Cannot delete the default theme. Set another theme as default first.',
      );
    }

    const referencedLayouts = await this.model.db
      .collection('layout_templates')
      .countDocuments({ companyThemeId: themeId }, { limit: 1 });
    if (referencedLayouts > 0) {
      throw new ConflictException(
        'Cannot delete a theme that is used by layout templates',
      );
    }

    await this.model.deleteOne({ _id: themeId, companyId });
    return { deleted: true };
  }

  private toObjectId(value: string | undefined, label: string): Types.ObjectId {
    if (!value || !Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`Invalid ${label}`);
    }
    return new Types.ObjectId(value);
  }
}

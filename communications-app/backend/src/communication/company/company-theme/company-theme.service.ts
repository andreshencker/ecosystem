import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
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

  async findAll(params?: {
    companyId?: string;
    active?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<CompanyThemeResponseDto>> {
    const filter: any = {};
    if (params?.companyId)
      filter.companyId = new Types.ObjectId(params.companyId);
    if (typeof params?.active === 'boolean') filter.isActive = params.active;

    const limit = Math.min(Number(params?.limit ?? 50), 200);
    const offset = Math.max(0, Number(params?.offset ?? 0));

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

  async findById(id: string): Promise<CompanyThemeResponseDto> {
    const doc = await this.model.findById(id).lean();
    if (!doc) throw new HttpException('Theme not found', HttpStatus.NOT_FOUND);
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

  async create(dto: CreateCompanyThemeDto): Promise<CompanyThemeResponseDto> {
    const companyId = new Types.ObjectId(dto.companyId);
    const makeDefault = dto.isDefault === true;

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
    id: string,
    dto: UpdateCompanyThemeDto,
  ): Promise<CompanyThemeResponseDto> {
    const existing = await this.model.findById(id);
    if (!existing)
      throw new HttpException('Theme not found', HttpStatus.NOT_FOUND);

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

        updated = await this.model.findByIdAndUpdate(
          existing._id,
          { $set: { ...dto } },
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

  async removeById(id: string): Promise<{ deleted: boolean }> {
    const doc = await this.model.findById(id).lean();
    if (!doc) throw new HttpException('Theme not found', HttpStatus.NOT_FOUND);
    if ((doc as any).isDefault) {
      throw new HttpException(
        'Cannot delete the default theme. Set another theme as default first.',
        HttpStatus.CONFLICT,
      );
    }
    await this.model.findByIdAndDelete(id);
    return { deleted: true };
  }
}

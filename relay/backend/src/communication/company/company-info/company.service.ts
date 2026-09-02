// src/company-info/company.service.ts
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Company, CompanyDocument } from './schemas/company.schema';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CompanyResponseDto } from './dto/company-response.dto';
import { CompanyMapper } from './mappers/company.mapper';
import type { PaginatedResponse } from '../../common/pagination/pagination.util';

@Injectable()
export class CompanyService {
  constructor(
    @InjectModel(Company.name)
    private readonly model: Model<CompanyDocument>,
  ) {}

  // ==========================
  // Helpers

  // ==========================
  async findAll(params?: {
    active?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<CompanyResponseDto>> {
    const filter: Record<string, any> = {};
    if (typeof params?.active === 'boolean') filter.isActive = params.active;

    const limit = Math.min(Number(params?.limit ?? 50), 200);
    const offset = Math.max(0, Number(params?.offset ?? 0));

    const [list, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ companyKey: 1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      this.model.countDocuments(filter),
    ]);

    return {
      data: CompanyMapper.toResponseList(list as any[]),
      total,
      limit,
      offset,
    };
  }

  async findById(companyId: string): Promise<CompanyResponseDto> {
    const _id = this.toObjectIdOrThrow(companyId, 'companyId');

    const doc = await this.model.findById(_id).lean();
    if (!doc)
      throw new HttpException('Company not found', HttpStatus.NOT_FOUND);

    return CompanyMapper.toResponse(doc as any);
  }

  async findByKey(companyKey: string): Promise<CompanyResponseDto> {
    const key = this.normalizeKey(companyKey);
    if (!key)
      throw new HttpException('companyKey is required', HttpStatus.BAD_REQUEST);

    const doc = await this.model.findOne({ companyKey: key }).lean();
    if (!doc)
      throw new HttpException('Company not found', HttpStatus.NOT_FOUND);

    return CompanyMapper.toResponse(doc as any);
  }

  // ==========================
  async create(dto: CreateCompanyDto): Promise<CompanyResponseDto> {
    try {
      const payload: Partial<Company> = {
        ...dto,

        companyKey: this.normalizeKey(dto.companyKey),
        displayName: this.trimStr(dto.displayName),
        legalName: this.trimOrEmpty(dto.legalName),
        tagline: this.trimOrEmpty(dto.tagline),
        timezone: this.trimStr(dto.timezone, 'Australia/Sydney'),

        // ✅ URLs opcionales (pueden venir por URL directa o luego por media upload)
        logoIconUrl: this.trimOrEmpty((dto as any).logoIconUrl),
        logoFullUrl: this.trimOrEmpty((dto as any).logoFullUrl),

        isActive: (dto as any).isActive ?? true,
      };

      if (!payload.companyKey) {
        throw new HttpException(
          'companyKey is required',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (!payload.displayName) {
        throw new HttpException(
          'displayName is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const saved = await this.model.create(payload);
      return CompanyMapper.toResponse(saved.toObject() as any);
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new HttpException(
          'companyKey already exists',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        err?.message ?? 'Failed to create company',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==========================
  // Queries

  // ==========================
  async updateByKey(
    companyKey: string,
    dto: UpdateCompanyDto,
  ): Promise<CompanyResponseDto> {
    try {
      const key = this.normalizeKey(companyKey);
      if (!key)
        throw new HttpException(
          'companyKey is required',
          HttpStatus.BAD_REQUEST,
        );

      const $set: Record<string, any> = { ...dto };

      if ($set.companyKey !== undefined)
        $set.companyKey = this.normalizeKey($set.companyKey);
      if ($set.displayName !== undefined)
        $set.displayName = this.trimStr($set.displayName);
      if ($set.legalName !== undefined)
        $set.legalName = this.trimOrEmpty($set.legalName);
      if ($set.tagline !== undefined)
        $set.tagline = this.trimOrEmpty($set.tagline);
      if ($set.timezone !== undefined)
        $set.timezone = this.trimStr($set.timezone, 'Australia/Sydney');

      // ✅ URLs (si las actualizas por patch)
      if ($set.logoIconUrl !== undefined)
        $set.logoIconUrl = this.trimOrEmpty($set.logoIconUrl);
      if ($set.logoFullUrl !== undefined)
        $set.logoFullUrl = this.trimOrEmpty($set.logoFullUrl);

      const doc = await this.model.findOneAndUpdate(
        { companyKey: key },
        { $set },
        { new: true, runValidators: true },
      );

      if (!doc)
        throw new HttpException('Company not found', HttpStatus.NOT_FOUND);

      return CompanyMapper.toResponse(doc.toObject() as any);
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new HttpException(
          'companyKey already exists',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        err?.message ?? 'Failed to update company',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==========================
  async updateById(
    companyId: string,
    dto: Partial<UpdateCompanyDto>,
  ): Promise<CompanyResponseDto> {
    const _id = this.toObjectIdOrThrow(companyId, 'companyId');

    const $set: Record<string, any> = { ...dto };

    if ($set.companyKey !== undefined)
      $set.companyKey = this.normalizeKey($set.companyKey);
    if ($set.displayName !== undefined)
      $set.displayName = this.trimStr($set.displayName);
    if ($set.legalName !== undefined)
      $set.legalName = this.trimOrEmpty($set.legalName);
    if ($set.tagline !== undefined)
      $set.tagline = this.trimOrEmpty($set.tagline);
    if ($set.timezone !== undefined)
      $set.timezone = this.trimStr($set.timezone, 'Australia/Sydney');

    if ($set.logoIconUrl !== undefined)
      $set.logoIconUrl = this.trimOrEmpty($set.logoIconUrl);
    if ($set.logoFullUrl !== undefined)
      $set.logoFullUrl = this.trimOrEmpty($set.logoFullUrl);

    const doc = await this.model.findByIdAndUpdate(
      _id,
      { $set },
      { new: true, runValidators: true },
    );

    if (!doc)
      throw new HttpException('Company not found', HttpStatus.NOT_FOUND);

    return CompanyMapper.toResponse(doc.toObject() as any);
  }

  // ==========================
  async removeByKey(companyKey: string): Promise<{ deleted: boolean }> {
    const key = this.normalizeKey(companyKey);
    if (!key)
      throw new HttpException('companyKey is required', HttpStatus.BAD_REQUEST);

    const res = await this.model.findOneAndDelete({ companyKey: key });
    if (!res)
      throw new HttpException('Company not found', HttpStatus.NOT_FOUND);

    return { deleted: true };
  }

  // ==========================
  // Create

  // ==========================
  private toObjectIdOrThrow(id: string, label: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException(`Invalid ${label}`, HttpStatus.BAD_REQUEST);
    }
    return new Types.ObjectId(id);
  }

  // ==========================
  // Update (by key)

  private normalizeKey(v: string) {
    return String(v ?? '')
      .toLowerCase()
      .trim();
  }

  // ==========================
  // Update (by id) ✅ usado por create multipart cuando sube media

  private trimStr(v: any, fallback = ''): string {
    const s = String(v ?? '').trim();
    return s || fallback;
  }

  // ==========================
  // Remove

  private trimOrEmpty(v: any): string {
    return String(v ?? '').trim();
  }
}

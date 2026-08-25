import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  DocumentDomainCatalogue,
  DocumentDomainCatalogueDocument,
  SUPPORTED_DOCUMENT_FORMATS,
} from './schemas/document-domain-catalogue.schema';
import { CreateDocumentDomainCatalogueDto } from './dto/create-document-domain-catalogue.dto';
import { UpdateDocumentDomainCatalogueDto } from './dto/update-document-domain-catalogue.dto';
import { DocumentDomainCatalogueMapper } from './mappers/document-domain-catalogue.mapper';
import { DocumentDomainCatalogueResponseDto } from './dto/document-domain-catalogue-response.dto';
import type { PaginatedResponse } from '../../communication/common/pagination/pagination.util';

@Injectable()
export class DocumentDomainCatalogueService {
  constructor(
    @InjectModel(DocumentDomainCatalogue.name)
    private readonly model: Model<DocumentDomainCatalogueDocument>,
  ) {}

  async create(
    dto: CreateDocumentDomainCatalogueDto,
  ): Promise<DocumentDomainCatalogueResponseDto> {
    const companyId = this.toObjectIdOrThrow(dto.companyId, 'companyId');
    const domainKey = this.normalizeKey(dto.domainKey);
    const displayName = String(dto.displayName ?? '').trim();
    const domainCategory = this.normalizeCategory(dto.domainCategory);
    const description = String(dto.description ?? '').trim();

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

    const allowedFormats = this.assertValidFormats(dto.allowedFormats ?? []);

    try {
      const docs = await this.model.create([
        {
          companyId,
          domainKey,
          displayName,
          description,
          domainCategory,
          allowedFormats: allowedFormats as any,
          isActive: dto.isActive ?? true,
        },
      ]);
      const created = docs[0];
      return DocumentDomainCatalogueMapper.toResponse(created.toObject());
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new HttpException(
          'Document domain already exists (companyId + domainKey)',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        err?.message ?? 'Failed to create document domain',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(params: {
    companyId: string;
    active?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<DocumentDomainCatalogueResponseDto>> {
    const companyId = this.toObjectIdOrThrow(params.companyId, 'companyId');
    const filter: any = { companyId };
    if (typeof params.active === 'boolean') filter.isActive = params.active;

    const limit = Math.min(Number(params?.limit ?? 50), 200);
    const offset = Math.max(0, Number(params?.offset ?? 0));

    const [list, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ domainKey: 1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      this.model.countDocuments(filter),
    ]);

    return {
      data: DocumentDomainCatalogueMapper.toResponseList(list as any[]),
      total,
      limit,
      offset,
    };
  }

  async getById(id: string): Promise<DocumentDomainCatalogueResponseDto> {
    const _id = this.toObjectIdOrThrow(id, 'id');
    const doc = await this.model.findById(_id).lean();
    if (!doc)
      throw new HttpException(
        'Document domain not found',
        HttpStatus.NOT_FOUND,
      );
    return DocumentDomainCatalogueMapper.toResponse(doc);
  }

  /**
   * Ownership guard for :id-based endpoints. When `companyId` is provided
   * (i.e. the caller is a Grapifly session user, not an api-key caller),
   * verifies the document domain belongs to that company — 404s otherwise
   * so tenant boundaries are not leaked via a 403.
   */
  async assertDocumentDomainBelongsToCompany(
    id: string,
    companyId?: string,
  ): Promise<void> {
    const domain = (await this.model
      .findById(this.toObjectIdOrThrow(id, 'id'))
      .select('companyId')
      .lean()) as any;
    if (!domain)
      throw new HttpException(
        'Document domain not found',
        HttpStatus.NOT_FOUND,
      );
    if (companyId && String(domain.companyId) !== String(companyId)) {
      throw new HttpException(
        'Document domain not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async getByCompanyAndDomainKey(params: {
    companyId: string;
    domainKey: string;
  }): Promise<DocumentDomainCatalogueResponseDto> {
    const companyId = this.toObjectIdOrThrow(params.companyId, 'companyId');
    const domainKey = this.normalizeKey(params.domainKey);
    if (!domainKey)
      throw new HttpException('domainKey is required', HttpStatus.BAD_REQUEST);
    const doc = await this.model.findOne({ companyId, domainKey }).lean();
    if (!doc)
      throw new HttpException(
        'Document domain not found',
        HttpStatus.NOT_FOUND,
      );
    return DocumentDomainCatalogueMapper.toResponse(doc);
  }

  async update(
    id: string,
    dto: UpdateDocumentDomainCatalogueDto,
  ): Promise<DocumentDomainCatalogueResponseDto> {
    const _id = this.toObjectIdOrThrow(id, 'id');
    const existing = await this.model.findById(_id).lean();
    if (!existing)
      throw new HttpException(
        'Document domain not found',
        HttpStatus.NOT_FOUND,
      );

    if ((existing as any).isSystem) {
      const protected_fields = [
        'domainKey',
        'displayName',
        'domainCategory',
        'companyId',
      ] as const;
      const attempted = protected_fields.filter(
        (f) => (dto as any)[f] !== undefined,
      );
      if (attempted.length > 0) {
        throw new HttpException(
          `System domain — the following fields cannot be changed: ${attempted.join(', ')}`,
          HttpStatus.FORBIDDEN,
        );
      }
    }

    const $set: any = {};

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
    if (dto.description !== undefined)
      $set.description = String(dto.description ?? '').trim();
    if (dto.domainCategory !== undefined) {
      const domainCategory = this.normalizeCategory(dto.domainCategory);
      if (!domainCategory)
        throw new HttpException(
          'domainCategory is required',
          HttpStatus.BAD_REQUEST,
        );
      $set.domainCategory = domainCategory;
    }
    if (dto.allowedFormats !== undefined)
      $set.allowedFormats = this.assertValidFormats(dto.allowedFormats);
    if (dto.isActive !== undefined) $set.isActive = dto.isActive;

    try {
      const updated = await this.model.findByIdAndUpdate(
        _id,
        { $set },
        { new: true, runValidators: true },
      );
      if (!updated)
        throw new HttpException(
          'Document domain not found',
          HttpStatus.NOT_FOUND,
        );
      return DocumentDomainCatalogueMapper.toResponse(updated.toObject());
    } catch (err: any) {
      if (err?.code === 11000)
        throw new HttpException(
          'Document domain already exists (companyId + domainKey)',
          HttpStatus.BAD_REQUEST,
        );
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        err?.message ?? 'Failed to update document domain',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const _id = this.toObjectIdOrThrow(id, 'id');
    const existing = await this.model.findById(_id).lean();
    if (!existing)
      throw new HttpException(
        'Document domain not found',
        HttpStatus.NOT_FOUND,
      );
    if ((existing as any).isSystem)
      throw new HttpException(
        'System domains cannot be deleted',
        HttpStatus.FORBIDDEN,
      );
    await this.model.findByIdAndDelete(_id);
    return { deleted: true };
  }

  private toObjectIdOrThrow(id: string, label: string) {
    if (!Types.ObjectId.isValid(id))
      throw new HttpException(`Invalid ${label}`, HttpStatus.BAD_REQUEST);
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

  private assertValidFormats(formats: string[]): string[] {
    for (const f of formats) {
      if (!SUPPORTED_DOCUMENT_FORMATS.includes(f as any)) {
        throw new HttpException(
          `Unsupported format "${f}". Allowed: ${SUPPORTED_DOCUMENT_FORMATS.join(', ')}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    const unique = [...new Set(formats)];
    if (unique.length !== formats.length)
      throw new HttpException(
        'Duplicate formats in allowedFormats',
        HttpStatus.BAD_REQUEST,
      );
    return unique;
  }
}

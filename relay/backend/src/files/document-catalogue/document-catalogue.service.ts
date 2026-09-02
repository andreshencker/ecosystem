import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  DocumentCatalogue,
  DocumentCatalogueDocument,
} from './schemas/document-catalogue.schema';
import {
  DocumentDomainCatalogue,
  DocumentDomainCatalogueDocument,
} from '../document-domain-catalogue/schemas/document-domain-catalogue.schema';
import { CreateDocumentCatalogueDto } from './dto/create-document-catalogue.dto';
import { UpdateDocumentCatalogueDto } from './dto/update-document-catalogue.dto';
import { DocumentCatalogueMapper } from './mappers/document-catalogue.mapper';
import { DocumentCatalogueResponseDto } from './dto/document-catalogue-response.dto';
import { assertFormatContractsValid } from './validators/document-catalogue.validator';
import type { PaginatedResponse } from '../../communication/common/pagination/pagination.util';

type PopulateOpts = { populateDocumentDomain?: boolean };

@Injectable()
export class DocumentCatalogueService {
  constructor(
    @InjectModel(DocumentCatalogue.name)
    private readonly model: Model<DocumentCatalogueDocument>,
    @InjectModel(DocumentDomainCatalogue.name)
    private readonly domainModel: Model<DocumentDomainCatalogueDocument>,
  ) {}

  /** Resolve by canonical key: "domainKey.documentKey.format" */
  async findByCompanyAndCanonicalKey(
    companyId: string,
    canonicalKey: string,
  ): Promise<
    DocumentCatalogueResponseDto & {
      resolvedFormat: string;
      resolvedContract: any;
    }
  > {
    const normalized = this.normalizeKey(canonicalKey);
    const parts = normalized.split('.');

    if (parts.length !== 3 || parts.some((p) => !p)) {
      throw new HttpException(
        'canonicalKey must be in the format "domainKey.documentKey.format"',
        HttpStatus.BAD_REQUEST,
      );
    }

    const [domainKey, documentKey, format] = parts;
    const companyObjId = this.toObjectIdOrThrow(companyId, 'companyId');

    // 1. Resolve domain
    const domain: any = await this.domainModel
      .findOne({ companyId: companyObjId, domainKey })
      .select('_id domainKey isActive allowedFormats')
      .lean();

    if (!domain) {
      throw new HttpException(
        `Document domain "${domainKey}" not found for this company`,
        HttpStatus.NOT_FOUND,
      );
    }
    if (!domain.isActive) {
      throw new HttpException(
        `Document domain "${domainKey}" is inactive`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // 2. Verify format allowed by domain
    if (
      !Array.isArray(domain.allowedFormats) ||
      !domain.allowedFormats.includes(format)
    ) {
      throw new HttpException(
        `Format "${format}" is not allowed by domain "${domainKey}". Allowed: ${(domain.allowedFormats ?? []).join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // 3. Resolve document
    const doc: any = await this.model
      .findOne({
        documentDomainCatalogueId: domain._id,
        documentKey,
        isActive: true,
      })
      .populate({
        path: 'documentDomainCatalogueId',
        select:
          'companyId domainKey displayName domainCategory allowedFormats isActive',
      })
      .lean();

    if (!doc) {
      throw new HttpException(
        `Document "${documentKey}" not found in domain "${domainKey}"`,
        HttpStatus.NOT_FOUND,
      );
    }

    // 4. Resolve format contract
    const formatContract = doc.formatContracts?.[format];
    if (!formatContract) {
      throw new HttpException(
        `No contract configured for format "${format}" on document "${documentKey}"`,
        HttpStatus.NOT_FOUND,
      );
    }
    if (formatContract.enabled === false) {
      throw new HttpException(
        `Format "${format}" contract is disabled for document "${documentKey}"`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      ...DocumentCatalogueMapper.toResponse(doc),
      resolvedFormat: format,
      resolvedContract: formatContract,
    };
  }

  async create(
    dto: CreateDocumentCatalogueDto,
  ): Promise<DocumentCatalogueResponseDto> {
    const domainObjId = this.toObjectIdOrThrow(
      dto.documentDomainCatalogueId,
      'documentDomainCatalogueId',
    );
    const domain = await this.getDomainOrThrow(domainObjId);

    const documentKey = this.normalizeKey(dto.documentKey);
    const displayName = String(dto.displayName ?? '').trim();

    if (!documentKey)
      throw new HttpException(
        'documentKey is required',
        HttpStatus.BAD_REQUEST,
      );
    if (!displayName)
      throw new HttpException(
        'displayName is required',
        HttpStatus.BAD_REQUEST,
      );

    const formatContracts = dto.formatContracts ?? {};
    assertFormatContractsValid(
      formatContracts as any,
      domain.allowedFormats ?? [],
    );

    try {
      const created = await this.model.create({
        documentDomainCatalogueId: domainObjId,
        documentKey,
        displayName,
        description: String(dto.description ?? ''),
        formatContracts,
        isActive: dto.isActive ?? true,
      });
      return DocumentCatalogueMapper.toResponse(created.toObject());
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new HttpException(
          'Document already exists in this domain (documentDomainCatalogueId + documentKey)',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        err?.message ?? 'Failed to create document',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(params: {
    documentDomainCatalogueId: string;
    active?: boolean;
    populateDocumentDomain?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<DocumentCatalogueResponseDto>> {
    const domainId = this.toObjectIdOrThrow(
      params.documentDomainCatalogueId,
      'documentDomainCatalogueId',
    );
    const filter: any = { documentDomainCatalogueId: domainId };
    if (typeof params.active === 'boolean') filter.isActive = params.active;

    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    let q = this.model.find(filter).sort({ documentKey: 1 });
    q = this.applyPopulate(q, {
      populateDocumentDomain: params.populateDocumentDomain ?? true,
    });

    const [list, total] = await Promise.all([
      q.skip(offset).limit(limit).lean(),
      this.model.countDocuments(filter),
    ]);
    return {
      data: DocumentCatalogueMapper.toResponseList(list as any[]),
      total,
      limit,
      offset,
    };
  }

  async getById(
    id: string,
    opts?: PopulateOpts,
  ): Promise<DocumentCatalogueResponseDto> {
    const _id = this.toObjectIdOrThrow(id, 'id');
    let q = this.model.findById(_id);
    q = this.applyPopulate(q, opts);
    const doc: any = await q.lean();
    if (!doc)
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    return DocumentCatalogueMapper.toResponse(doc);
  }

  async update(
    id: string,
    dto: UpdateDocumentCatalogueDto,
  ): Promise<DocumentCatalogueResponseDto> {
    const _id = this.toObjectIdOrThrow(id, 'id');
    const existing: any = await this.model.findById(_id).lean();
    if (!existing)
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);

    const domain = await this.getDomainOrThrow(
      existing.documentDomainCatalogueId,
    );
    const $set: any = {};

    if (dto.documentKey !== undefined) {
      const documentKey = this.normalizeKey(dto.documentKey);
      if (!documentKey)
        throw new HttpException(
          'documentKey is required',
          HttpStatus.BAD_REQUEST,
        );
      $set.documentKey = documentKey;
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
      $set.description = String(dto.description ?? '');
    if (dto.formatContracts !== undefined) {
      assertFormatContractsValid(
        dto.formatContracts as any,
        domain.allowedFormats ?? [],
      );
      $set.formatContracts = dto.formatContracts;
    }
    if (dto.isActive !== undefined) $set.isActive = dto.isActive;

    try {
      const updated = await this.model.findByIdAndUpdate(
        _id,
        { $set },
        { new: true, runValidators: true },
      );
      if (!updated)
        throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
      return DocumentCatalogueMapper.toResponse(updated.toObject());
    } catch (err: any) {
      if (err?.code === 11000)
        throw new HttpException(
          'Document already exists in this domain',
          HttpStatus.BAD_REQUEST,
        );
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        err?.message ?? 'Failed to update document',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const _id = this.toObjectIdOrThrow(id, 'id');
    const res = await this.model.findByIdAndDelete(_id);
    if (!res)
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
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

  private applyPopulate(q: any, opts?: PopulateOpts) {
    if (!opts?.populateDocumentDomain) return q;
    return q.populate({
      path: 'documentDomainCatalogueId',
      select:
        'companyId domainKey displayName domainCategory allowedFormats isActive',
    });
  }

  /** Throws 404 if the domain does not exist or does not belong to companyId. */
  async assertDomainBelongsToCompany(
    documentDomainCatalogueId: string,
    companyId: string,
  ): Promise<void> {
    const domainId = this.toObjectIdOrThrow(
      documentDomainCatalogueId,
      'documentDomainCatalogueId',
    );
    const companyObjId = this.toObjectIdOrThrow(companyId, 'companyId');

    const domain = await this.domainModel
      .findOne({ _id: domainId, companyId: companyObjId })
      .select('_id')
      .lean();

    if (!domain) {
      throw new HttpException(
        'DocumentDomainCatalogue not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * Verifies that a document-catalogue entry belongs to companyId by joining
   * through its parent DocumentDomainCatalogue. Throws 404 on mismatch.
   */
  async assertBelongsToCompany(id: string, companyId: string): Promise<void> {
    const _id = this.toObjectIdOrThrow(id, 'id');

    const doc: any = await this.model
      .findById(_id)
      .select('documentDomainCatalogueId')
      .lean();

    if (!doc) {
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    }

    await this.assertDomainBelongsToCompany(
      String(doc.documentDomainCatalogueId),
      companyId,
    );
  }

  private async getDomainOrThrow(documentDomainCatalogueId: Types.ObjectId) {
    const domain: any = await this.domainModel
      .findById(documentDomainCatalogueId)
      .select('isActive allowedFormats companyId domainKey')
      .lean();
    if (!domain)
      throw new HttpException(
        'DocumentDomainCatalogue not found',
        HttpStatus.BAD_REQUEST,
      );
    if (!domain.isActive)
      throw new HttpException(
        'DocumentDomainCatalogue is inactive',
        HttpStatus.BAD_REQUEST,
      );
    return domain;
  }
}

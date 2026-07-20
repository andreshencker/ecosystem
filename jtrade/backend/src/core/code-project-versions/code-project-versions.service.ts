import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  CodeProjectVersion,
  CodeProjectVersionDocument,
} from './schemas/code-project-version.schema';

import {
  ProjectCodePlatform,
  ProjectCodePlatformDocument,
} from '../project-code-platform/schemas/project-code-platform.schema';

import {
  CodeProject,
  CodeProjectDocument,
} from '../code-projects/schemas/code-project.schema';

import {
  CompanyProvider,
  CompanyProviderDocument,
} from '../company-provider/schemas/company-provider.schema';

import {
  Platform,
  PlatformDocument,
} from '../platforms/schemas/platform.schema';

import { CreateCodeProjectVersionDto } from './dto/create-code-project-version.dto';
import { UpdateCodeProjectVersionDto } from './dto/update-code-project-version.dto';
import { ReplaceCodeProjectVersionFileDto } from './dto/replace-code-project-version-file.dto';
import { CodeProjectVersionResponseDto } from './dto/code-project-version-response.dto';
import { CodeProjectVersionMapper } from './mappers/code-project-version.mapper';

import { StorageCommunicationsClient } from '../../microservices/communications-client/storage/storage-client';
import type { HttpResult } from '../../microservices/communications-client/communications-http.client';

@Injectable()
export class CodeProjectVersionsService {
  constructor(
    private readonly config: ConfigService,

    @InjectModel(CodeProjectVersion.name)
    private readonly versionModel: Model<CodeProjectVersionDocument>,

    @InjectModel(ProjectCodePlatform.name)
    private readonly projectCodePlatformModel: Model<ProjectCodePlatformDocument>,

    @InjectModel(CodeProject.name)
    private readonly codeProjectModel: Model<CodeProjectDocument>,

    @InjectModel(CompanyProvider.name)
    private readonly companyProviderModel: Model<CompanyProviderDocument>,

    @InjectModel(Platform.name)
    private readonly platformModel: Model<PlatformDocument>,

    private readonly storageClient: StorageCommunicationsClient,
  ) {}

  private populateQuery(query: any) {
    return query.populate([
      {
        path: 'projectCodePlatformId',
        select: 'deliveryMode runtimeMode status isActive',
      },
      {
        path: 'codeProjectId',
        select: 'projectKey name status isActive',
      },
      {
        path: 'companyProviderId',
        select: 'companyName',
      },
      {
        path: 'platformId',
        select: 'name category connectionType imageUrl isActive isSupported',
      },
    ]);
  }

  async findAll(params?: {
    projectCodePlatformId?: string;
    codeProjectId?: string;
    companyProviderId?: string;
    platformId?: string;
    active?: boolean;
    current?: boolean;
    populate?: boolean;
  }): Promise<CodeProjectVersionResponseDto[]> {
    const filter: any = {};

    if (params?.projectCodePlatformId) {
      filter.projectCodePlatformId = this.toObjectId(
        params.projectCodePlatformId,
        'projectCodePlatformId',
      );
    }

    if (params?.codeProjectId) {
      filter.codeProjectId = this.toObjectId(
        params.codeProjectId,
        'codeProjectId',
      );
    }

    if (params?.companyProviderId) {
      filter.companyProviderId = this.toObjectId(
        params.companyProviderId,
        'companyProviderId',
      );
    }

    if (params?.platformId) {
      filter.platformId = this.toObjectId(params.platformId, 'platformId');
    }

    if (typeof params?.active === 'boolean') {
      filter.isActive = params.active;
    }

    if (typeof params?.current === 'boolean') {
      filter.isCurrentVersion = params.current;
    }

    let q = this.versionModel.find(filter).sort({ createdAt: -1 });

    if (params?.populate !== false) {
      q = this.populateQuery(q);
    }

    const list = await q.lean();

    return CodeProjectVersionMapper.toResponseList(list as any[]);
  }

  async findById(
    id: string,
    populate = true,
  ): Promise<CodeProjectVersionResponseDto> {
    const _id = this.toObjectId(id, 'id');

    let q = this.versionModel.findById(_id);

    if (populate) {
      q = this.populateQuery(q);
    }

    const doc = await q.lean();

    if (!doc) {
      throw new HttpException(
        'CodeProjectVersion not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return CodeProjectVersionMapper.toResponse(doc as any);
  }

  async findMyVersions(
    userId: string,
    params?: {
      projectCodePlatformId?: string;
      codeProjectId?: string;
      platformId?: string;
      active?: boolean;
      current?: boolean;
    },
  ): Promise<CodeProjectVersionResponseDto[]> {
    const company = await this.getMyCompanyProvider(userId);

    const filter: any = {
      companyProviderId: company._id,
    };

    if (params?.projectCodePlatformId) {
      filter.projectCodePlatformId = this.toObjectId(
        params.projectCodePlatformId,
        'projectCodePlatformId',
      );
    }

    if (params?.codeProjectId) {
      filter.codeProjectId = this.toObjectId(
        params.codeProjectId,
        'codeProjectId',
      );
    }

    if (params?.platformId) {
      filter.platformId = this.toObjectId(params.platformId, 'platformId');
    }

    if (typeof params?.active === 'boolean') {
      filter.isActive = params.active;
    }

    if (typeof params?.current === 'boolean') {
      filter.isCurrentVersion = params.current;
    }

    const list = await this.populateQuery(
      this.versionModel.find(filter).sort({ createdAt: -1 }),
    ).lean();

    return CodeProjectVersionMapper.toResponseList(list as any[]);
  }

  async findMyVersionById(
    userId: string,
    id: string,
  ): Promise<CodeProjectVersionResponseDto> {
    const company = await this.getMyCompanyProvider(userId);
    const _id = this.toObjectId(id, 'id');

    const doc = await this.populateQuery(
      this.versionModel.findOne({
        _id,
        companyProviderId: company._id,
      }),
    ).lean();

    if (!doc) {
      throw new HttpException(
        'CodeProjectVersion not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return CodeProjectVersionMapper.toResponse(doc as any);
  }

  async createMyWithFile(
    userId: string,
    file: Express.Multer.File,
    dto: CreateCodeProjectVersionDto,
    authHeader?: string,
  ): Promise<CodeProjectVersionResponseDto> {
    try {
      if (!file) {
        throw new HttpException('file is required', HttpStatus.BAD_REQUEST);
      }

      const relation = await this.getMyProjectCodePlatform(
        userId,
        dto.projectCodePlatformId,
      );

      const ext = this.getExtensionFromOriginalName(file.originalname);

      if (!ext) {
        throw new HttpException(
          'Could not detect file extension',
          HttpStatus.BAD_REQUEST,
        );
      }

      const normalizedVersion = String(dto.version ?? '').trim();

      if (!normalizedVersion) {
        throw new HttpException('version is required', HttpStatus.BAD_REQUEST);
      }

      const systemCompanyId = this.getSystemCompanyId();
      const projectKey = String(relation.codeProjectId.projectKey ?? '').trim();
      const platformId = relation.platformId._id ?? relation.platformId;
      const finalFileName = `${normalizedVersion}.${ext}`;

      const uploadRes = await this.storageClient.upload(
        file,
        {
          companyId: systemCompanyId,
          folder: `${projectKey}/${String(platformId)}`,
          fileName: finalFileName,
          isPublic: false,
        },
        authHeader,
      );

      const uploaded = this.unwrapOrThrow(uploadRes);

      const projectCodePlatformId = relation._id;
      const codeProjectId = relation.codeProjectId._id;
      const companyProviderId = relation.codeProjectId.companyProviderId;
      const platformObjectId = relation.platformId._id;

      const isCurrentVersion = dto.isCurrentVersion ?? false;

      if (isCurrentVersion) {
        await this.unsetCurrentVersion(projectCodePlatformId);
      }

      const created = await this.versionModel.create({
        projectCodePlatformId,
        codeProjectId,
        companyProviderId,
        platformId: platformObjectId,
        projectKey,
        version: normalizedVersion,
        fileName: String(uploaded.fileName ?? finalFileName).trim(),
        originalFileName: String(file.originalname ?? '').trim(),
        extension: ext,
        fileKey: String(uploaded.key ?? '').trim(),
        size: Number(uploaded.size ?? 0),
        contentType: String(
          uploaded.contentType ?? 'application/octet-stream',
        ).trim(),
        comments: String(dto.comments ?? '').trim(),
        isCurrentVersion,
        isActive: dto.isActive ?? true,
      });

      const populated = await this.populateQuery(
        this.versionModel.findById(created._id),
      ).lean();

      return CodeProjectVersionMapper.toResponse(populated as any);
    } catch (err: any) {
      console.error('CREATE VERSION ERROR:', err);
      this.handleWriteError(err, 'Failed to create code project version');
    }
  }

  async replaceMyFile(
    userId: string,
    id: string,
    file: Express.Multer.File,
    dto: ReplaceCodeProjectVersionFileDto,
    authHeader?: string,
  ): Promise<CodeProjectVersionResponseDto> {
    try {
      const company = await this.getMyCompanyProvider(userId);
      const _id = this.toObjectId(id, 'id');

      const existing = await this.versionModel
        .findOne({
          _id,
          companyProviderId: company._id,
        })
        .lean();

      if (!existing) {
        throw new HttpException(
          'CodeProjectVersion not found',
          HttpStatus.NOT_FOUND,
        );
      }

      if (!file) {
        throw new HttpException('file is required', HttpStatus.BAD_REQUEST);
      }

      let relation: any;

      if (dto.projectCodePlatformId) {
        relation = await this.getMyProjectCodePlatform(
          userId,
          dto.projectCodePlatformId,
        );
      } else {
        relation = await this.getMyProjectCodePlatform(
          userId,
          String(existing.projectCodePlatformId),
        );
      }

      const ext = this.getExtensionFromOriginalName(file.originalname);

      if (!ext) {
        throw new HttpException(
          'Could not detect file extension',
          HttpStatus.BAD_REQUEST,
        );
      }

      const normalizedVersion = String(
        dto.version ?? existing.version ?? '',
      ).trim();

      if (!normalizedVersion) {
        throw new HttpException('version is required', HttpStatus.BAD_REQUEST);
      }

      const projectKey = String(relation.codeProjectId.projectKey ?? '').trim();
      const platformId = relation.platformId._id ?? relation.platformId;
      const finalFileName = `${normalizedVersion}.${ext}`;

      const replaceRes = await this.storageClient.replace(
        file,
        {
          companyId: this.getSystemCompanyId(),
          key: String(existing.fileKey ?? '').trim() || undefined,
          folder: `${projectKey}/${String(platformId)}`,
          fileName: finalFileName,
          isPublic: false,
        },
        authHeader,
      );

      const replaced = this.unwrapOrThrow(replaceRes);

      const projectCodePlatformId = relation._id;
      const codeProjectId = relation.codeProjectId._id;
      const companyProviderId = relation.codeProjectId.companyProviderId;
      const platformObjectId = relation.platformId._id;

      const isCurrentVersion =
        dto.isCurrentVersion ?? existing.isCurrentVersion ?? false;

      if (isCurrentVersion) {
        await this.unsetCurrentVersion(projectCodePlatformId, _id);
      }

      const updated = await this.populateQuery(
        this.versionModel.findOneAndUpdate(
          {
            _id,
            companyProviderId: company._id,
          },
          {
            $set: {
              projectCodePlatformId,
              codeProjectId,
              companyProviderId,
              platformId: platformObjectId,
              projectKey,
              version: normalizedVersion,
              fileName: String(replaced.fileName ?? finalFileName).trim(),
              originalFileName: String(file.originalname ?? '').trim(),
              extension: ext,
              fileKey: String(replaced.key ?? existing.fileKey ?? '').trim(),
              size: Number(replaced.size ?? 0),
              contentType: String(
                replaced.contentType ?? 'application/octet-stream',
              ).trim(),
              comments:
                dto.comments !== undefined
                  ? String(dto.comments ?? '').trim()
                  : String(existing.comments ?? '').trim(),
              isCurrentVersion,
              isActive: dto.isActive ?? existing.isActive ?? true,
            },
          },
          {
            new: true,
            runValidators: true,
          },
        ),
      ).lean();

      if (!updated) {
        throw new HttpException(
          'CodeProjectVersion not found',
          HttpStatus.NOT_FOUND,
        );
      }

      return CodeProjectVersionMapper.toResponse(updated as any);
    } catch (err: any) {
      this.handleWriteError(err, 'Failed to replace code project version file');
    }
  }

  async updateMy(
    userId: string,
    id: string,
    dto: UpdateCodeProjectVersionDto,
  ): Promise<CodeProjectVersionResponseDto> {
    try {
      const company = await this.getMyCompanyProvider(userId);
      const _id = this.toObjectId(id, 'id');

      const existing = await this.versionModel
        .findOne({
          _id,
          companyProviderId: company._id,
        })
        .lean();

      if (!existing) {
        throw new HttpException(
          'CodeProjectVersion not found',
          HttpStatus.NOT_FOUND,
        );
      }

      const $set: any = {};

      let projectCodePlatformId =
        existing.projectCodePlatformId as Types.ObjectId;

      if (dto.projectCodePlatformId) {
        const relation = await this.getMyProjectCodePlatform(
          userId,
          dto.projectCodePlatformId,
        );

        projectCodePlatformId = relation._id;

        $set.projectCodePlatformId = relation._id;
        $set.codeProjectId = relation.codeProjectId._id;
        $set.companyProviderId = relation.codeProjectId.companyProviderId;
        $set.platformId = relation.platformId._id;
        $set.projectKey = String(
          relation.codeProjectId.projectKey ?? '',
        ).trim();
      }

      if (dto.version !== undefined) {
        $set.version = String(dto.version ?? '').trim();
      }

      if (dto.comments !== undefined) {
        $set.comments = String(dto.comments ?? '').trim();
      }

      if (dto.isActive !== undefined) {
        $set.isActive = dto.isActive;
      }

      if (dto.isCurrentVersion !== undefined) {
        if (dto.isCurrentVersion === true) {
          await this.unsetCurrentVersion(projectCodePlatformId, _id);
          $set.isCurrentVersion = true;
        } else {
          $set.isCurrentVersion = false;
        }
      }

      const updated = await this.populateQuery(
        this.versionModel.findOneAndUpdate(
          {
            _id,
            companyProviderId: company._id,
          },
          { $set },
          { new: true, runValidators: true },
        ),
      ).lean();

      if (!updated) {
        throw new HttpException(
          'CodeProjectVersion not found',
          HttpStatus.NOT_FOUND,
        );
      }

      return CodeProjectVersionMapper.toResponse(updated as any);
    } catch (err: any) {
      this.handleWriteError(err, 'Failed to update code project version');
    }
  }

  async removeMy(userId: string, id: string): Promise<{ deleted: boolean }> {
    const company = await this.getMyCompanyProvider(userId);
    const _id = this.toObjectId(id, 'id');

    const deleted = await this.versionModel.findOneAndDelete({
      _id,
      companyProviderId: company._id,
    });

    if (!deleted) {
      throw new HttpException(
        'CodeProjectVersion not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return { deleted: true };
  }

  async downloadCurrentByProjectCodePlatform(
    projectCodePlatformId: string,
    expiresInSeconds = 60,
    authHeader?: string,
  ): Promise<{
    projectCodePlatformId: string;
    projectKey: string;
    version: string;
    fileName: string;
    fileKey: string;
    downloadUrl: string;
    expiresInSeconds: number;
  }> {
    const relationId = this.toObjectId(
      projectCodePlatformId,
      'projectCodePlatformId',
    );

    const versionDoc = await this.versionModel
      .findOne({
        projectCodePlatformId: relationId,
        isCurrentVersion: true,
        isActive: true,
      })
      .populate([
        {
          path: 'codeProjectId',
          select: 'projectKey name status isActive',
        },
        {
          path: 'platformId',
          select: 'name category connectionType imageUrl isActive isSupported',
        },
      ])
      .select(
        'projectCodePlatformId codeProjectId platformId projectKey version fileName fileKey extension',
      )
      .lean();

    if (!versionDoc) {
      throw new HttpException(
        'Current version not found for project platform',
        HttpStatus.NOT_FOUND,
      );
    }

    const downloadFileName = this.buildDownloadFileName({
      projectName: String((versionDoc as any)?.codeProjectId?.name ?? ''),
      platformName: String((versionDoc as any)?.platformId?.name ?? ''),
      projectKey: String(versionDoc.projectKey ?? ''),
      version: String(versionDoc.version ?? ''),
      extension:
        String(versionDoc.extension ?? '').trim() ||
        this.getExtensionFromOriginalName(String(versionDoc.fileName ?? '')),
    });

    const downloadRes = await this.storageClient.download(
      {
        companyId: this.getSystemCompanyId(),
        key: String(versionDoc.fileKey),
        expiresInSeconds,
        fileName: downloadFileName,
      },
      authHeader,
    );

    const signed = this.unwrapOrThrow(downloadRes);

    return {
      projectCodePlatformId: String(versionDoc.projectCodePlatformId),
      projectKey: String(versionDoc.projectKey ?? ''),
      version: String(versionDoc.version ?? ''),
      fileName: String(signed.fileName ?? downloadFileName),
      fileKey: String(versionDoc.fileKey ?? ''),
      downloadUrl: String(signed.downloadUrl ?? ''),
      expiresInSeconds: Number(signed.expiresInSeconds ?? expiresInSeconds),
    };
  }

  async downloadById(
    id: string,
    expiresInSeconds = 60,
    authHeader?: string,
  ): Promise<{
    id: string;
    projectKey: string;
    version: string;
    fileName: string;
    fileKey: string;
    downloadUrl: string;
    expiresInSeconds: number;
  }> {
    const _id = this.toObjectId(id, 'id');

    const versionDoc = await this.versionModel
      .findById(_id)
      .populate([
        {
          path: 'codeProjectId',
          select: 'projectKey name status isActive',
        },
        {
          path: 'platformId',
          select: 'name category connectionType imageUrl isActive isSupported',
        },
      ])
      .select(
        'codeProjectId platformId projectKey version fileName fileKey extension',
      )
      .lean();

    if (!versionDoc) {
      throw new HttpException(
        'CodeProjectVersion not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const downloadFileName = this.buildDownloadFileName({
      projectName: String((versionDoc as any)?.codeProjectId?.name ?? ''),
      platformName: String((versionDoc as any)?.platformId?.name ?? ''),
      projectKey: String(versionDoc.projectKey ?? ''),
      version: String(versionDoc.version ?? ''),
      extension:
        String(versionDoc.extension ?? '').trim() ||
        this.getExtensionFromOriginalName(String(versionDoc.fileName ?? '')),
    });

    const downloadRes = await this.storageClient.download(
      {
        companyId: this.getSystemCompanyId(),
        key: String(versionDoc.fileKey),
        expiresInSeconds,
        fileName: downloadFileName,
      },
      authHeader,
    );

    const signed = this.unwrapOrThrow(downloadRes);

    return {
      id: String(versionDoc._id),
      projectKey: String(versionDoc.projectKey ?? ''),
      version: String(versionDoc.version ?? ''),
      fileName: String(signed.fileName ?? downloadFileName),
      fileKey: String(versionDoc.fileKey ?? ''),
      downloadUrl: String(signed.downloadUrl ?? ''),
      expiresInSeconds: Number(signed.expiresInSeconds ?? expiresInSeconds),
    };
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const _id = this.toObjectId(id, 'id');

    const deleted = await this.versionModel.findByIdAndDelete(_id);

    if (!deleted) {
      throw new HttpException(
        'CodeProjectVersion not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return { deleted: true };
  }

  private async getMyCompanyProvider(userId: string): Promise<any> {
    const ownerUserId = this.toObjectId(userId, 'userId');

    const company = await this.companyProviderModel
      .findOne({
        ownerUserId,
        isActive: true,
      })
      .lean();

    if (!company) {
      throw new ForbiddenException(
        'Provider company not found. Create your company profile first.',
      );
    }

    return company;
  }

  private async getMyProjectCodePlatform(
    userId: string,
    projectCodePlatformId: string,
  ): Promise<any> {
    const company = await this.getMyCompanyProvider(userId);
    const _id = this.toObjectId(projectCodePlatformId, 'projectCodePlatformId');

    const relation = await this.projectCodePlatformModel
      .findOne({
        _id,
        isActive: true,
      })
      .populate([
        {
          path: 'codeProjectId',
          select: 'projectKey name companyProviderId status isActive',
          match: {
            companyProviderId: company._id,
            isActive: true,
          },
        },
        {
          path: 'platformId',
          select: 'name category connectionType imageUrl isActive isSupported',
        },
      ])
      .lean();

    if (!relation || !(relation as any).codeProjectId) {
      throw new HttpException(
        'Project platform not found for this provider',
        HttpStatus.NOT_FOUND,
      );
    }

    if ((relation as any).platformId?.isActive === false) {
      throw new HttpException('Platform is inactive', HttpStatus.BAD_REQUEST);
    }

    return relation;
  }

  private getSystemCompanyId(): string {
    const companyId =
      this.config.get<string>('SYSTEM_COMPANY_ID') ??
      process.env.SYSTEM_COMPANY_ID;

    if (!companyId) {
      throw new HttpException(
        'SYSTEM_COMPANY_ID is not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (!Types.ObjectId.isValid(companyId)) {
      throw new HttpException(
        'SYSTEM_COMPANY_ID is invalid',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return companyId;
  }

  private toObjectId(id: string, fieldName: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException(`Invalid ${fieldName}`, HttpStatus.BAD_REQUEST);
    }

    return new Types.ObjectId(id);
  }

  private getExtensionFromOriginalName(fileName?: string): string | undefined {
    const clean = String(fileName ?? '').trim();
    const idx = clean.lastIndexOf('.');

    if (idx <= 0 || idx === clean.length - 1) {
      return undefined;
    }

    return clean
      .slice(idx + 1)
      .toLowerCase()
      .trim();
  }

  private buildDownloadFileName(params: {
    projectName?: string;
    platformName?: string;
    projectKey: string;
    version: string;
    extension?: string;
  }): string {
    const rawBase = params.projectName?.trim() || params.projectKey;
    const rawPlatform = params.platformName?.trim() || '';

    const base = rawBase
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    const platform = rawPlatform
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    const version = String(params.version ?? '')
      .trim()
      .replace(/\s+/g, '-');

    const ext = String(params.extension ?? '')
      .trim()
      .replace(/^\.+/, '')
      .toLowerCase();

    const finalBase = platform ? `${base}-${platform}` : base;

    return ext ? `${finalBase}-${version}.${ext}` : `${finalBase}-${version}`;
  }

  private async unsetCurrentVersion(
    projectCodePlatformId: Types.ObjectId,
    excludeId?: Types.ObjectId,
  ) {
    const filter: any = {
      projectCodePlatformId,
      isCurrentVersion: true,
    };

    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    await this.versionModel.updateMany(filter, {
      $set: { isCurrentVersion: false },
    });
  }

  private unwrapOrThrow<T>(res: HttpResult<T>): T {
    if (res.ok) {
      return res.data as T;
    }

    throw new HttpException(res.message ?? 'Upstream error', res.status || 502);
  }

  private handleWriteError(err: any, fallbackMessage: string): never {
    console.error('WRITE ERROR DETAILS:', {
      message: err?.message,
      status: err?.status,
      response: err?.response,
      stack: err?.stack,
    });

    if (err?.code === 11000) {
      throw new HttpException(
        'Duplicate version for this project platform OR current version conflict',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (err instanceof HttpException) {
      throw err;
    }

    throw new HttpException(
      err?.message ?? fallbackMessage,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

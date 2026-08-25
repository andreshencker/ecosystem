import { BadRequestException, Injectable } from '@nestjs/common';

import type { UploadStorageFileDto } from '../dto/upload-storage-file.dto';
import type { ReplaceStorageFileDto } from '../dto/replace-storage-file.dto';
import type { StorageFileInfoDto } from '../dto/storage-file-info.dto';

import { StorageKeyService } from './storage-key.service';
import { StorageValidatorService } from './storage-validator.service';

import { ChannelsRuntimeResolverService } from '../../../communication/channels/runtime/channels-runtime-resolver.service';
import { ChannelsImplementationFactory } from '../../../communication/channels/implementation/channels-implementation.factory';
import type { ChannelsRuntimeResolved } from '../../../communication/channels/runtime/channels-runtime.types';

@Injectable()
export class StorageService {
  constructor(
    private readonly runtime: ChannelsRuntimeResolverService,
    private readonly implFactory: ChannelsImplementationFactory,
    private readonly keys: StorageKeyService,
    private readonly validator: StorageValidatorService,
  ) {}

  async uploadInternal(params: {
    companyId: string;
    folder: string;
    fileName: string;
    file: Express.Multer.File;
    isPublic?: boolean;
  }): Promise<StorageFileInfoDto> {
    if (!params.companyId) {
      throw new BadRequestException('companyId is required');
    }

    this.validator.validateFolder(params.folder);
    this.validator.validateFile(params.file);

    const runtime = await this.getDefaultStorage(params.companyId);
    const storage = this.implFactory.getStorageChannel(
      String(runtime.connectionType),
    );

    const contentType = this.validator.detectContentType(params.file);
    const finalFileName = this.keys.cleanFileName(params.fileName);

    this.validator.validateFileName(finalFileName);

    const key = this.keys.buildKey({
      visibility: this.visibilityFromBoolean(params.isPublic),
      folder: params.folder,
      fileName: finalFileName,
      prefix: String(runtime.credentials?.prefix ?? '').trim() || undefined,
    });

    await storage.putObject({
      credentials: runtime.credentials,
      key,
      body: params.file.buffer,
      contentType,
      aclPublicRead: params.isPublic === true,
    });

    return {
      key,
      url: this.toUrl(runtime, key),
      bucket: String(runtime.credentials?.bucket ?? ''),
      region: String(runtime.credentials?.region ?? ''),
      contentType,
      size: params.file.size,
      fileName: finalFileName,
    };
  }

  async upload(
    file: Express.Multer.File,
    dto: UploadStorageFileDto,
  ): Promise<StorageFileInfoDto> {
    return this.uploadInternal({
      companyId: dto.companyId,
      folder: dto.folder,
      fileName:
        dto.fileName?.trim() || this.keys.cleanFileName(file.originalname),
      file,
      isPublic: dto.isPublic,
    });
  }

  async replace(
    file: Express.Multer.File,
    dto: ReplaceStorageFileDto,
  ): Promise<StorageFileInfoDto> {
    if (!dto.companyId) {
      throw new BadRequestException('companyId is required');
    }

    const runtime = await this.getDefaultStorage(dto.companyId);
    const storage = this.implFactory.getStorageChannel(
      String(runtime.connectionType),
    );

    this.validator.validateFile(file);

    const key = dto.key
      ? this.keys.ensureSafeKey(dto.key)
      : this.keys.buildKey({
          visibility: this.visibilityFromBoolean(dto.isPublic),
          folder: dto.folder!,
          fileName:
            dto.fileName?.trim() || this.keys.cleanFileName(file.originalname),
          prefix: String(runtime.credentials?.prefix ?? '').trim() || undefined,
        });

    const contentType = this.validator.detectContentType(file);

    await storage.putObject({
      credentials: runtime.credentials,
      key,
      body: file.buffer,
      contentType,
      aclPublicRead: dto.isPublic === true,
    });

    return {
      key,
      url: this.toUrl(runtime, key),
      bucket: String(runtime.credentials?.bucket ?? ''),
      region: String(runtime.credentials?.region ?? ''),
      contentType,
      size: file.size,
      fileName: this.keys.extractFileNameFromKey(key),
    };
  }

  async remove(companyId: string, key: string) {
    if (!companyId) {
      throw new BadRequestException('companyId is required');
    }

    const safeKey = this.keys.ensureSafeKey(key);

    const runtime = await this.getDefaultStorage(companyId);
    const storage = this.implFactory.getStorageChannel(
      String(runtime.connectionType),
    );

    await storage.deleteObject({
      credentials: runtime.credentials,
      key: safeKey,
    });

    return { deleted: true, key: safeKey };
  }

  async info(companyId: string, key: string): Promise<StorageFileInfoDto> {
    if (!companyId) {
      throw new BadRequestException('companyId is required');
    }

    const safeKey = this.keys.ensureSafeKey(key);

    const runtime = await this.getDefaultStorage(companyId);
    const storage = this.implFactory.getStorageChannel(
      String(runtime.connectionType),
    );

    const head = await storage.headObject({
      credentials: runtime.credentials,
      key: safeKey,
    });

    return {
      key: safeKey,
      url: this.toUrl(runtime, safeKey),
      bucket: String(runtime.credentials?.bucket ?? ''),
      region: String(runtime.credentials?.region ?? ''),
      contentType: String(head?.contentType ?? 'application/octet-stream'),
      size: Number(head?.size ?? 0),
      fileName: this.keys.extractFileNameFromKey(safeKey),
      lastModified: head?.lastModified,
      etag: head?.etag,
    };
  }

  async downloadUrl(
    companyId: string,
    key: string,
    expiresInSeconds = 60,
    fileName?: string,
  ) {
    if (!companyId) {
      throw new BadRequestException('companyId is required');
    }

    const safeKey = this.keys.ensureSafeKey(key);

    const runtime = await this.getDefaultStorage(companyId);
    const storage = this.implFactory.getStorageChannel(
      String(runtime.connectionType),
    );

    const finalFileName = fileName?.trim()
      ? this.keys.cleanFileName(fileName)
      : this.keys.extractFileNameFromKey(safeKey);

    this.validator.validateFileName(finalFileName);

    const signed = await storage.getSignedDownloadUrl({
      credentials: runtime.credentials,
      key: safeKey,
      expiresInSeconds,
      fileName: finalFileName,
    });

    return {
      key: safeKey,
      fileName: finalFileName,
      downloadUrl: signed.url,
      expiresInSeconds: signed.expiresInSeconds,
    };
  }

  private visibilityFromBoolean(isPublic?: boolean): 'public' | 'private' {
    return isPublic ? 'public' : 'private';
  }

  private async getDefaultStorage(
    companyId: string,
  ): Promise<ChannelsRuntimeResolved> {
    return this.runtime.resolveDefault({
      companyId,
      channelKey: 'storage',
    });
  }

  private toUrl(runtime: ChannelsRuntimeResolved, key: string): string {
    const cleanKey = key.replace(/^\/+/, '');

    const publicBaseUrl = String(runtime.credentials?.publicBaseUrl ?? '')
      .trim()
      .replace(/\/+$/, '');

    if (publicBaseUrl) {
      return `${publicBaseUrl}/${cleanKey}`;
    }

    const bucket = String(runtime.credentials?.bucket ?? '').trim();
    const region = String(runtime.credentials?.region ?? '').trim();

    if (bucket && region) {
      return `https://${bucket}.s3.${region}.amazonaws.com/${cleanKey}`;
    }

    return cleanKey;
  }
}

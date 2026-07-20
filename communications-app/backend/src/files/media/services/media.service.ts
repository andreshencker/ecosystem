// src/files/media/services/media.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';

import { MediaKeyService } from './media-key.service';
import { MediaValidatorService } from './media-validator.service';

import type { UploadMediaDto } from '../dto/upload-media.dto';
import type { ReplaceMediaDto } from '../dto/replace-media.dto';
import type { MediaResultDto } from '../dto/media-result.dto';

import { ChannelsRuntimeResolverService } from '../../../communication/channels/runtime/channels-runtime-resolver.service';
import { ChannelsImplementationFactory } from '../../../communication/channels/implementation/channels-implementation.factory';
import type { ChannelsRuntimeResolved } from '../../../communication/channels/runtime/channels-runtime.types';

@Injectable()
export class MediaService {
  constructor(
    private readonly runtime: ChannelsRuntimeResolverService,
    private readonly implFactory: ChannelsImplementationFactory,
    private readonly keys: MediaKeyService,
    private readonly validator: MediaValidatorService,
  ) {}

  // ==========================
  async upload(
    file: Express.Multer.File,
    dto: UploadMediaDto,
  ): Promise<MediaResultDto> {
    this.validator.validateFile(file);

    if (!dto.companyId) {
      throw new BadRequestException('companyId is required');
    }

    const runtime = await this.getDefaultStorage(dto.companyId);

    // ✅ Factory alineado
    const storage = this.implFactory.getStorageChannel(
      String(runtime.connectionType),
    );

    const contentType = this.validator.detectContentType(file);
    const ext =
      dto.ext?.trim().toLowerCase() ||
      this.validator.detectExtFromMime(contentType);

    const visibility = this.visibilityFromBoolean(dto.public);

    const key = this.keys.buildKey({
      visibility,
      domain: dto.domain,
      kind: dto.kind,
      entityId: dto.entityId,
      ext,
      folder: dto.folder,
      prefix: String(runtime.credentials?.prefix ?? '').trim() || undefined,
    });

    await storage.putObject({
      credentials: runtime.credentials,
      key,
      body: file.buffer,
      contentType,
      aclPublicRead: dto.public === true,
    });

    return {
      key,
      url: this.toUrl(runtime, key),
      bucket: String(runtime.credentials?.bucket ?? ''),
      region: String(runtime.credentials?.region ?? ''),
      contentType,
      size: file.size,
    };
  }

  async replace(
    file: Express.Multer.File,
    dto: ReplaceMediaDto & { companyId: string }, // por si tu dto no lo tiene tipado aún
  ): Promise<MediaResultDto> {
    this.validator.validateFile(file);

    if (!dto.companyId) {
      throw new BadRequestException('companyId is required');
    }

    const runtime = await this.getDefaultStorage(dto.companyId);
    const storage = this.implFactory.getStorageChannel(
      String(runtime.connectionType),
    );

    const contentType = this.validator.detectContentType(file);
    const prefix =
      String(runtime.credentials?.prefix ?? '').trim() || undefined;

    const key = this.buildKeyFromReplace(dto, contentType, prefix);

    await storage.putObject({
      credentials: runtime.credentials,
      key,
      body: file.buffer,
      contentType,
      aclPublicRead: dto.public === true,
    });

    return {
      key,
      url: this.toUrl(runtime, key),
      bucket: String(runtime.credentials?.bucket ?? ''),
      region: String(runtime.credentials?.region ?? ''),
      contentType,
      size: file.size,
    };
  }

  // ==========================
  async remove(
    companyId: string,
    key: string,
  ): Promise<{ deleted: true; key: string }> {
    if (!companyId) throw new BadRequestException('companyId is required');

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

  // ==========================
  async info(companyId: string, key: string) {
    if (!companyId) throw new BadRequestException('companyId is required');

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
      contentType: head?.contentType,
      size: head?.size,
      lastModified: head?.lastModified,
      etag: head?.etag,
    };
  }

  // ==========================
  // CREATE (UPLOAD)

  private visibilityFromBoolean(isPublic?: boolean): 'public' | 'private' {
    return isPublic ? 'public' : 'private';
  }

  // ==========================
  // UPDATE (REPLACE)

  /**
   * ✅ Obtiene el DEFAULT provider/credentials para STORAGE de la company
   * (connectionType lo trae el runtime desde el provider default)
   */
  private async getDefaultStorage(
    companyId: string,
  ): Promise<ChannelsRuntimeResolved> {
    return this.runtime.resolveDefault({
      companyId,
      channelKey: 'storage',
    });
  }

  private normalizeUrlBase(v?: string): string {
    const s = String(v ?? '').trim();
    return s.replace(/\/+$/, '');
  }

  // ==========================
  // DELETE

  /**
   * ✅ Construye URL pública si hay publicBaseUrl.
   * Fallback: AWS url si hay bucket/region.
   */
  private toUrl(runtime: ChannelsRuntimeResolved, key: string): string {
    const cleanKey = key.replace(/^\/+/, '');

    const publicBaseUrl = this.normalizeUrlBase(
      runtime.credentials?.publicBaseUrl,
    );
    if (publicBaseUrl) return `${publicBaseUrl}/${cleanKey}`;

    const bucket = String(runtime.credentials?.bucket ?? '').trim();
    const region = String(runtime.credentials?.region ?? '').trim();
    if (bucket && region) {
      return `https://${bucket}.s3.${region}.amazonaws.com/${cleanKey}`;
    }

    return cleanKey;
  }

  // ==========================
  // READ (INFO)

  // ==========================
  private buildKeyFromReplace(
    dto: ReplaceMediaDto,
    contentType: string,
    prefix?: string,
  ): string {
    if (dto.key?.trim()) return this.keys.ensureSafeKey(dto.key);

    if (!dto.domain || !dto.kind || !dto.entityId) {
      throw new BadRequestException(
        'Provide either "key" OR (domain, kind, entityId)',
      );
    }

    const ext =
      dto.ext?.trim().toLowerCase() ||
      this.validator.detectExtFromMime(contentType);

    const visibility = this.visibilityFromBoolean(dto.public);

    return this.keys.buildKey({
      visibility,
      domain: dto.domain,
      kind: dto.kind,
      entityId: dto.entityId,
      ext,
      folder: dto.folder,
      prefix,
    });
  }
}

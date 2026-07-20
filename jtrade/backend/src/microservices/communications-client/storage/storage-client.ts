import { Injectable } from '@nestjs/common';
import FormData from 'form-data';

import {
  CommunicationsHttpClient,
  type HttpResult,
} from '../communications-http.client';

export type UploadStorageFileDto = {
  companyId: string;
  folder: string;
  fileName?: string;
  isPublic?: boolean;
  maxBytes?: number;
  allowedExtensions?: string[];
  allowedMimeTypes?: string[];
};

export type ReplaceStorageFileDto = {
  companyId: string;
  key?: string;
  folder?: string;
  fileName?: string;
  isPublic?: boolean;
  maxBytes?: number;
  allowedExtensions?: string[];
  allowedMimeTypes?: string[];
};

export type StorageFileInfoDto = {
  key: string;
  url: string;
  bucket: string;
  region: string;
  contentType: string;
  size: number;
  fileName: string;
  lastModified?: string;
  etag?: string;
};

export type StorageDownloadDto = {
  companyId: string;
  key: string;
  expiresInSeconds?: number;
  fileName?: string;
};

@Injectable()
export class StorageCommunicationsClient extends CommunicationsHttpClient {
  private readonly base = '/files/storage';

  constructor() {
    super({
      baseURL: process.env.COMMUNICATION_BASE_URL ?? 'http://54.166.195.143:3001',
      timeoutMs: 60_000,
    });
  }

  async upload(
    file: Express.Multer.File,
    dto: UploadStorageFileDto,
    authHeader?: string,
  ): Promise<HttpResult<StorageFileInfoDto>> {
    const form = new FormData();

    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    form.append('companyId', dto.companyId);
    form.append('folder', dto.folder);

    if (dto.fileName !== undefined) {
      form.append('fileName', dto.fileName);
    }

    if (dto.isPublic !== undefined) {
      form.append('isPublic', String(dto.isPublic));
    }

    if (dto.maxBytes !== undefined) {
      form.append('maxBytes', String(dto.maxBytes));
    }

    if (dto.allowedExtensions?.length) {
      form.append('allowedExtensions', dto.allowedExtensions.join(','));
    }

    if (dto.allowedMimeTypes?.length) {
      form.append('allowedMimeTypes', dto.allowedMimeTypes.join(','));
    }

    const res = await this.http.post(this.base, form, {
      headers: {
        ...this.buildHeaders(authHeader),
        ...form.getHeaders(),
      },
      validateStatus: () => true,
    });

    return this.normalize<StorageFileInfoDto>(res);
  }

  async replace(
    file: Express.Multer.File,
    dto: ReplaceStorageFileDto,
    authHeader?: string,
  ): Promise<HttpResult<StorageFileInfoDto>> {
    const form = new FormData();

    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    form.append('companyId', dto.companyId);

    if (dto.key !== undefined) {
      form.append('key', dto.key);
    }

    if (dto.folder !== undefined) {
      form.append('folder', dto.folder);
    }

    if (dto.fileName !== undefined) {
      form.append('fileName', dto.fileName);
    }

    if (dto.isPublic !== undefined) {
      form.append('isPublic', String(dto.isPublic));
    }

    if (dto.maxBytes !== undefined) {
      form.append('maxBytes', String(dto.maxBytes));
    }

    if (dto.allowedExtensions?.length) {
      form.append('allowedExtensions', dto.allowedExtensions.join(','));
    }

    if (dto.allowedMimeTypes?.length) {
      form.append('allowedMimeTypes', dto.allowedMimeTypes.join(','));
    }

    const res = await this.http.put(this.base, form, {
      headers: {
        ...this.buildHeaders(authHeader),
        ...form.getHeaders(),
      },
      validateStatus: () => true,
    });

    return this.normalize<StorageFileInfoDto>(res);
  }

  async remove(
    params: { companyId: string; key: string },
    authHeader?: string,
  ): Promise<HttpResult<{ deleted: true; key: string }>> {
    const res = await this.http.delete(this.base, {
      params,
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    return this.normalize<{ deleted: true; key: string }>(res);
  }

  async info(
    params: { companyId: string; key: string },
    authHeader?: string,
  ): Promise<HttpResult<StorageFileInfoDto>> {
    const res = await this.http.get(`${this.base}/info`, {
      params,
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    return this.normalize<StorageFileInfoDto>(res);
  }

  async download(
    params: StorageDownloadDto,
    authHeader?: string,
  ): Promise<
    HttpResult<{
      key: string;
      fileName: string;
      downloadUrl: string;
      expiresInSeconds: number;
    }>
  > {
    const res = await this.http.get(`${this.base}/download`, {
      params,
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    return this.normalize<{
      key: string;
      fileName: string;
      downloadUrl: string;
      expiresInSeconds: number;
    }>(res);
  }
}

import type { VerifyResult } from '../shared/credentials.types';

export type StoragePutResult = { ok: true; key: string; url?: string };

export type StorageDeleteResult = {
  ok: true;
  deleted: boolean;
  key: string;
};

export type StorageHeadResult = {
  ok: true;
  key: string;
  url?: string;
  bucket?: string;
  region?: string;
  contentType?: string;
  size?: number;
  lastModified?: string;
  etag?: string;
};

export type StorageSignedDownloadResult = {
  ok: true;
  key: string;
  url: string;
  expiresInSeconds: number;
};

export type StorageListItem = {
  key: string;
  size: number;
  lastModified?: string;
  etag?: string;
};

export type StorageListResult = {
  ok: true;
  items: StorageListItem[];
  nextToken?: string;
};

export interface IStorageChannel {
  verifyCredentials(credentials: Record<string, any>): Promise<VerifyResult>;

  putObject(params: {
    credentials: Record<string, any>;
    key: string;
    contentType: string;
    body: Buffer;
    aclPublicRead?: boolean;
  }): Promise<StoragePutResult>;

  deleteObject(params: {
    credentials: Record<string, any>;
    key: string;
  }): Promise<StorageDeleteResult>;

  headObject(params: {
    credentials: Record<string, any>;
    key: string;
  }): Promise<StorageHeadResult>;

  getSignedDownloadUrl(params: {
    credentials: Record<string, any>;
    key: string;
    expiresInSeconds?: number;
    fileName?: string;
  }): Promise<StorageSignedDownloadResult>;

  listObjects(params: {
    credentials: Record<string, any>;
    prefix: string;
    continuationToken?: string;
  }): Promise<StorageListResult>;
}

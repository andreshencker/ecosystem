import { Injectable, Logger } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import type { VerifyResult } from '../../shared/credentials.types';
import type { IStorageChannel } from '../storage-channel.interface';
import { S3AccessKeysCredentialsContract } from './s3-credentials.contract';
import type { S3AccessKeysCredentials } from './s3-storage.types';

@Injectable()
export class S3StorageChannel implements IStorageChannel {
  private readonly logger = new Logger(S3StorageChannel.name);

  async verifyCredentials(
    credentials: Record<string, any>,
  ): Promise<VerifyResult> {
    try {
      const normalized = S3AccessKeysCredentialsContract.normalize(credentials);
      S3AccessKeysCredentialsContract.validate(normalized.value);

      if (S3AccessKeysCredentialsContract.verify) {
        return await S3AccessKeysCredentialsContract.verify(normalized.value);
      }

      return {
        ok: true,
        message: 'S3 credentials validated (no remote verify configured)',
      };
    } catch (err: any) {
      this.logger.error(`❌ S3 verify failed: ${err?.message}`);
      return { ok: false, message: err?.message ?? 'S3 verify failed' };
    }
  }

  async putObject(params: {
    credentials: Record<string, any>;
    key: string;
    contentType: string;
    body: Buffer;
    aclPublicRead?: boolean;
  }) {
    const creds = this.getCreds(params.credentials);
    const client = this.createClient(creds);
    const key = this.ensureSafeKey(params.key);

    await client.send(
      new PutObjectCommand({
        Bucket: creds.bucket,
        Key: key,
        Body: params.body,
        ContentType: params.contentType,
        ...(params.aclPublicRead ? { ACL: 'public-read' as any } : {}),
      }),
    );

    const url = this.buildPublicUrl(creds, key);
    return { ok: true as const, key, url };
  }

  async deleteObject(params: {
    credentials: Record<string, any>;
    key: string;
  }) {
    const creds = this.getCreds(params.credentials);
    const client = this.createClient(creds);
    const key = this.ensureSafeKey(params.key);

    await client.send(
      new DeleteObjectCommand({ Bucket: creds.bucket, Key: key }),
    );

    return { ok: true as const, deleted: true, key };
  }

  async headObject(params: { credentials: Record<string, any>; key: string }) {
    const creds = this.getCreds(params.credentials);
    const client = this.createClient(creds);
    const key = this.ensureSafeKey(params.key);

    const head = await client.send(
      new HeadObjectCommand({ Bucket: creds.bucket, Key: key }),
    );

    const url = this.buildPublicUrl(creds, key);

    return {
      ok: true as const,
      key,
      url,
      bucket: creds.bucket,
      region: creds.region,
      contentType: head.ContentType,
      size: head.ContentLength,
      lastModified: head.LastModified
        ? new Date(head.LastModified).toISOString()
        : undefined,
      etag: head.ETag ? String(head.ETag).replace(/"/g, '') : undefined,
    };
  }

  async getSignedDownloadUrl(params: {
    credentials: Record<string, any>;
    key: string;
    expiresInSeconds?: number;
    fileName?: string;
  }) {
    const creds = this.getCreds(params.credentials);
    const client = this.createClient(creds);
    const key = this.ensureSafeKey(params.key);
    const expiresInSeconds = Math.max(10, params.expiresInSeconds ?? 60);

    const command = new GetObjectCommand({
      Bucket: creds.bucket,
      Key: key,
      ...(params.fileName
        ? {
            ResponseContentDisposition: `attachment; filename="${params.fileName}"`,
          }
        : {}),
    });

    const url = await getSignedUrl(client, command, {
      expiresIn: expiresInSeconds,
    });

    return {
      ok: true as const,
      key,
      url,
      expiresInSeconds,
    };
  }

  async listObjects(params: {
    credentials: Record<string, any>;
    prefix: string;
    continuationToken?: string;
  }) {
    const creds = this.getCreds(params.credentials);
    const client = this.createClient(creds);

    const result = await client.send(
      new ListObjectsV2Command({
        Bucket: creds.bucket,
        Prefix: params.prefix,
        MaxKeys: 1000,
        ...(params.continuationToken ? { ContinuationToken: params.continuationToken } : {}),
      }),
    );

    const items = (result.Contents ?? [])
      // ListObjectsV2 includes the prefix "folder" itself as a zero-byte key
      // when it was created explicitly — not a real file, skip it.
      .filter((obj) => obj.Key && obj.Key !== params.prefix && obj.Size !== undefined)
      .map((obj) => ({
        key: obj.Key!,
        size: obj.Size ?? 0,
        lastModified: obj.LastModified ? new Date(obj.LastModified).toISOString() : undefined,
        etag: obj.ETag ? String(obj.ETag).replace(/"/g, '') : undefined,
      }));

    return {
      ok: true as const,
      items,
      nextToken: result.IsTruncated ? result.NextContinuationToken : undefined,
    };
  }

  private getCreds(input: Record<string, any>): S3AccessKeysCredentials {
    const normalized = S3AccessKeysCredentialsContract.normalize(input);
    S3AccessKeysCredentialsContract.validate(normalized.value);
    return normalized.value;
  }

  private createClient(creds: S3AccessKeysCredentials) {
    return new S3Client({
      region: creds.region,
      credentials: {
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
      },
      ...(creds.endpoint ? { endpoint: creds.endpoint } : {}),
      ...(creds.forcePathStyle !== undefined
        ? { forcePathStyle: creds.forcePathStyle }
        : {}),
    });
  }

  private ensureSafeKey(key: string): string {
    const k = String(key ?? '')
      .trim()
      .replace(/^\/+/, '');

    if (!k) throw new Error('Empty key');
    if (k.includes('..')) throw new Error('Invalid key path');

    return k;
  }

  private buildPublicUrl(
    creds: S3AccessKeysCredentials,
    key: string,
  ): string | undefined {
    if (!creds.publicBaseUrl) return undefined;

    const base = creds.publicBaseUrl.replace(/\/+$/, '');
    const safeKey = key.replace(/^\/+/, '');

    return `${base}/${safeKey}`;
  }
}

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

import { S3IamRoleCredentialsContract } from './s3-iam-role-credentials.contract';
import type { S3IamRoleCredentials } from './s3-iam-role-storage.types';

@Injectable()
export class S3IamRoleStorageChannel implements IStorageChannel {
  private readonly logger = new Logger(S3IamRoleStorageChannel.name);

  async verifyCredentials(
    credentials: Record<string, any>,
  ): Promise<VerifyResult> {
    try {
      const normalized = S3IamRoleCredentialsContract.normalize(credentials);
      S3IamRoleCredentialsContract.validate(normalized.value);

      if (S3IamRoleCredentialsContract.verify) {
        return await S3IamRoleCredentialsContract.verify(normalized.value);
      }

      return {
        ok: true,
        message: 'IAM role credentials validated (no remote verify configured)',
      };
    } catch (err: any) {
      this.logger.error(`❌ S3 IAM verify failed: ${err?.message}`);
      return { ok: false, message: err?.message ?? 'S3 IAM verify failed' };
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
      new DeleteObjectCommand({
        Bucket: creds.bucket,
        Key: key,
      }),
    );

    return { ok: true as const, deleted: true, key };
  }

  async headObject(params: { credentials: Record<string, any>; key: string }) {
    const creds = this.getCreds(params.credentials);
    const client = this.createClient(creds);
    const key = this.ensureSafeKey(params.key);

    const head = await client.send(
      new HeadObjectCommand({
        Bucket: creds.bucket,
        Key: key,
      }),
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
      url,
      key,
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

  // ==========================
  // Helpers
  // ==========================

  private getCreds(input: Record<string, any>): S3IamRoleCredentials {
    const normalized = S3IamRoleCredentialsContract.normalize(input);
    S3IamRoleCredentialsContract.validate(normalized.value);
    return normalized.value;
  }

  private createClient(creds: S3IamRoleCredentials) {
    return new S3Client({
      region: creds.region,
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
    creds: S3IamRoleCredentials,
    key: string,
  ): string | undefined {
    if (!creds.publicBaseUrl) return undefined;

    const base = creds.publicBaseUrl.replace(/\/+$/, '');
    const safeKey = key.replace(/^\/+/, '');

    return `${base}/${safeKey}`;
  }
}

// src/channels/implementation/storage/access_keys/s3-credentials.contract.ts

import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';

import type { ContractSpec } from '../../shared/credentials.types';
import {
  bool,
  pick,
  requireField,
  strTrim,
} from '../../shared/credentials.utils';
import { CredentialsValidationError } from '../../shared/credentials.errors';

import type { S3AccessKeysCredentials } from './s3-storage.types';

const ALLOWED: (keyof S3AccessKeysCredentials)[] = [
  'providerKey',
  'region',
  'bucket',
  'accessKeyId',
  'secretAccessKey',
  'endpoint',
  'forcePathStyle',
  'publicBaseUrl',
];

function normalizeUrlOrUndef(v: any): string | undefined {
  const s = strTrim(v);
  if (!s) return undefined;
  // muy básico: permitir http(s)
  if (!/^https?:\/\//i.test(s)) return s; // allow bare host:port endpoints (e.g. for local Minio)
  return s;
}

export const S3AccessKeysCredentialsContract: ContractSpec<S3AccessKeysCredentials> =
  {
    channelKey: 'storage',
    connectionType: 'access_keys',

    normalize(input) {
      const c: any = input ?? {};

      // soportar legacy keys
      const region = strTrim(c.region ?? c.AWS_REGION);
      const bucket = strTrim(c.bucket ?? c.AWS_S3_BUCKET ?? c.S3_BUCKET);

      const accessKeyId = strTrim(
        c.accessKeyId ?? c.AWS_ACCESS_KEY_ID ?? c.awsAccessKeyId,
      );
      const secretAccessKey = strTrim(
        c.secretAccessKey ?? c.AWS_SECRET_ACCESS_KEY ?? c.awsSecretAccessKey,
      );

      const endpoint = normalizeUrlOrUndef(c.endpoint ?? c.S3_ENDPOINT);
      const forcePathStyle = bool(c.forcePathStyle ?? c.S3_FORCE_PATH_STYLE);

      const publicBaseUrl = normalizeUrlOrUndef(
        c.publicBaseUrl ?? c.PUBLIC_BASE_URL,
      );

      const providerKey = strTrim(c.providerKey ?? c.PROVIDER_KEY) || undefined;

      const normalized: S3AccessKeysCredentials = {
        providerKey,
        region,
        bucket,
        accessKeyId,
        secretAccessKey,
        endpoint,
        forcePathStyle,
        publicBaseUrl,
      };

      // whitelist (evita guardar basura)
      return {
        value: pick<S3AccessKeysCredentials>(
          normalized,
          ALLOWED,
        ) as S3AccessKeysCredentials,
      };
    },

    validate(value) {
      requireField(value.region, 'region');
      requireField(value.bucket, 'bucket');
      requireField(value.accessKeyId, 'accessKeyId');
      requireField(value.secretAccessKey, 'secretAccessKey');

      // validación mínima bucket
      const b = String(value.bucket || '');
      if (b.length < 3 || b.length > 63) {
        throw new CredentialsValidationError('Invalid bucket length', 'bucket');
      }
    },

    async verify(value) {
      try {
        const client = new S3Client({
          region: value.region,
          credentials: {
            accessKeyId: value.accessKeyId,
            secretAccessKey: value.secretAccessKey,
          },
          ...(value.endpoint ? { endpoint: value.endpoint } : {}),
          ...(value.forcePathStyle !== undefined
            ? { forcePathStyle: value.forcePathStyle }
            : {}),
        });

        await client.send(new HeadBucketCommand({ Bucket: value.bucket }));

        return {
          ok: true,
          message:
            'S3 access_keys credentials are valid and bucket is accessible',
        };
      } catch (err: any) {
        return { ok: false, message: err?.message ?? 'S3 verify failed' };
      }
    },
  };

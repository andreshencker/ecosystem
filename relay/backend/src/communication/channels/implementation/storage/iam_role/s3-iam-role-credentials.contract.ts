// src/channels/implementation/storage/iam_role/s3-iam-role-credentials.contract.ts

import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';

import type { ContractSpec } from '../../shared/credentials.types';
import {
  bool,
  pick,
  requireField,
  strTrim,
} from '../../shared/credentials.utils';
import { CredentialsValidationError } from '../../shared/credentials.errors';
import type { S3IamRoleCredentials } from './s3-iam-role-storage.types';

const ALLOWED: (keyof S3IamRoleCredentials)[] = [
  'providerKey',
  'region',
  'bucket',
  'endpoint',
  'forcePathStyle',
  'publicBaseUrl',
  'roleArn',
];

function normalizeUrlOrUndef(v: any): string | undefined {
  const s = strTrim(v);
  return s ? s : undefined;
}

export const S3IamRoleCredentialsContract: ContractSpec<S3IamRoleCredentials> =
  {
    channelKey: 'storage',
    connectionType: 'iam_role',

    normalize(input) {
      const c: any = input ?? {};

      const region = strTrim(c.region ?? c.AWS_REGION);
      const bucket = strTrim(c.bucket ?? c.AWS_S3_BUCKET ?? c.S3_BUCKET);

      const endpoint = normalizeUrlOrUndef(c.endpoint ?? c.S3_ENDPOINT);
      const forcePathStyle = bool(c.forcePathStyle ?? c.S3_FORCE_PATH_STYLE);

      const publicBaseUrl = normalizeUrlOrUndef(
        c.publicBaseUrl ?? c.PUBLIC_BASE_URL,
      );

      const providerKey = strTrim(c.providerKey ?? c.PROVIDER_KEY) || undefined;
      const roleArn = strTrim(c.roleArn ?? c.ROLE_ARN) || undefined;

      const normalized: S3IamRoleCredentials = {
        providerKey,
        region,
        bucket,
        endpoint,
        forcePathStyle,
        publicBaseUrl,
        roleArn,
      };

      return {
        value: pick<S3IamRoleCredentials>(
          normalized,
          ALLOWED,
        ) as S3IamRoleCredentials,
      };
    },

    validate(value) {
      requireField(value.region, 'region');
      requireField(value.bucket, 'bucket');

      const b = String(value.bucket || '');
      if (b.length < 3 || b.length > 63) {
        throw new CredentialsValidationError('Invalid bucket length', 'bucket');
      }

      // Nota: roleArn es opcional. Si lo mandan, solo validación mínima.
      if (value.roleArn) {
        const arn = String(value.roleArn);
        if (!arn.startsWith('arn:aws:iam::') || !arn.includes(':role/')) {
          throw new CredentialsValidationError(
            'Invalid roleArn format',
            'roleArn',
          );
        }
      }
    },

    async verify(value) {
      try {
        /**
         * ✅ Importante:
         * - NO pasamos "credentials" aquí.
         * - AWS SDK usará default credential provider chain:
         *   ECS task role, EC2 instance profile, IRSA, env vars, etc.
         */
        const client = new S3Client({
          region: value.region,
          ...(value.endpoint ? { endpoint: value.endpoint } : {}),
          ...(value.forcePathStyle !== undefined
            ? { forcePathStyle: value.forcePathStyle }
            : {}),
        });

        await client.send(new HeadBucketCommand({ Bucket: value.bucket }));
        return {
          ok: true,
          message: 'S3 IAM role credentials are valid and bucket is accessible',
        };
      } catch (err: any) {
        return {
          ok: false,
          message: err?.message ?? 'S3 IAM role verify failed',
        };
      }
    },
  };

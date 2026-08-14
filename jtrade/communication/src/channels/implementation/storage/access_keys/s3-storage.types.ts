// src/channels/implementation/storage/access_keys/s3-storage.types.ts

export type S3ProviderKey =
  | 'aws'
  | 'minio'
  | 'wasabi'
  | 'digitalocean'
  | string;

export type S3AccessKeysCredentials = {
  providerKey?: S3ProviderKey;

  /** ✅ requeridos */
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;

  /** ✅ opcionales (S3 compatibles / custom) */
  endpoint?: string; // https://s3.ap-southeast-2.amazonaws.com | http://54.166.195.143:9000 (minio)
  forcePathStyle?: boolean; // minio suele necesitar true

  /** ✅ opcional: para construir URL pública */
  publicBaseUrl?: string; // https://cdn.tu-dominio.com
};

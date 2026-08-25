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
  endpoint?: string; // e.g. https://s3.amazonaws.com or http://localhost:9000 (minio)
  forcePathStyle?: boolean; // minio suele necesitar true

  /** ✅ opcional: para construir URL pública */
  publicBaseUrl?: string; // https://cdn.tu-dominio.com
};

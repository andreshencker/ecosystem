// src/channels/implementation/storage/iam_role/s3-iam-role-storage.types.ts

export type S3IamRoleProviderKey = 'aws' | string;

/**
 * IAM ROLE / IRSA / ECS Task Role / EC2 Instance Profile
 * ✅ NO guardas accessKey/secretKey.
 * ✅ El runtime obtiene credenciales del entorno (AWS SDK default provider chain).
 */
export type S3IamRoleCredentials = {
  providerKey?: S3IamRoleProviderKey;

  /** ✅ requeridos */
  region: string;
  bucket: string;

  /** ✅ opcionales */
  endpoint?: string; // para S3 compatibles (raro en IAM Role, pero lo dejamos)
  forcePathStyle?: boolean;

  /** opcional: construir URL pública */
  publicBaseUrl?: string;

  /**
   * opcional: ayuda de verificación y debugging (NO es secreto)
   * - roleArn: si quieres dejar explícito qué role se espera (informativo)
   * - externalId / sessionName: si tu flujo fuera AssumeRole (eso sería otro connectionType),
   *   pero aquí lo dejamos solo como "metadata", NO se usa.
   */
  roleArn?: string;
};

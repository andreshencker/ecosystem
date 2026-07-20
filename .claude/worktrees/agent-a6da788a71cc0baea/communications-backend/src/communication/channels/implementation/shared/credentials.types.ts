// src/channels/implementation/shared/credentials.types.ts

export type ChannelKey = 'email' | 'sms' | 'storage';

export type EmailConnectionType = 'smtp' | 'oauth' | 'api_key';
export type SmsConnectionType = 'api_key' | 'oauth';
export type StorageConnectionType = 'access_keys' | 'iam_role';

export type ConnectionType =
  | EmailConnectionType
  | SmsConnectionType
  | StorageConnectionType;

export type CredentialsVerifyResult = {
  ok: boolean;
  message?: string;
  details?: any;
};

// ✅ Alias para que tus channels usen "VerifyResult" si te gusta ese nombre
export type VerifyResult = CredentialsVerifyResult;

export type NormalizeResult<T> = {
  value: T;
  warnings?: string[];
};

export type ContractSpec<T extends Record<string, any>> = {
  /** channelKey + connectionType target */
  channelKey: ChannelKey;
  connectionType: string;

  /** Normaliza (mapea legacy keys), y hace whitelist */
  normalize: (input: Record<string, any>) => NormalizeResult<T>;

  /** Valida required/format/rules (sin tocar red) */
  validate: (value: T) => void;

  /** Opcional: verificación real (handshake / api call) */
  verify?: (value: T) => Promise<CredentialsVerifyResult>;
};

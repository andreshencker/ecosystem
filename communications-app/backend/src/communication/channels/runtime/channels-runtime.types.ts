// src/channels/runtime/channels-runtime.types.ts
export type ChannelKey = 'email' | 'sms' | 'storage' | 'calendar';

export type ChannelsRuntimeResolved = {
  channelKey: ChannelKey;

  providerKey: string; // gmail, twilio, aws, etc
  connectionType: string; // smtp, api_key, oauth, access_keys, etc

  providerCredentialsId: string;
  providerId: string | null; // MongoDB ObjectId of the Platform Provider (DEC-018 §10.3)
  tag: string;

  /**
   * ✅ runtime actives
   * - isActive = CCP activo AND credentials activo
   * - credentialsIsActive = credentials activo
   */
  isActive: boolean;
  credentialsIsActive: boolean;

  /**
   * Credenciales YA desencriptadas.
   * ⚠️ Solo existen en memoria (runtime), nunca se guardan ni se exponen.
   */
  credentials: Record<string, any>;
};

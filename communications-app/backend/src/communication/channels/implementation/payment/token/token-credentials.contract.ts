// src/communication/channels/implementation/payment/token/token-credentials.contract.ts
//
// Generic credential contract for the 'token' connection type.
//
// Storage: uses the existing generic provider_credentials collection via
// ProviderCredentials schema + CryptoService — no new collection or entity.
//
// This contract is driven by connectionType='token', not by any specific
// providerKey. Any provider configured with connectionType='token' reuses it.

import type { ContractSpec } from '../../shared/credentials.types';
import { CredentialsValidationError } from '../../shared/credentials.errors';
import { strTrim, pick } from '../../shared/credentials.utils';

export interface TokenCredentials {
  token: string;
  providerKey?: string;
}

const ALLOWED: (keyof TokenCredentials)[] = ['token', 'providerKey'];

export const TokenCredentialsContract: ContractSpec<TokenCredentials> = {
  channelKey: 'payment',
  connectionType: 'token',

  normalize(input) {
    const c = input ?? {};
    const normalized: TokenCredentials = {
      token: strTrim(c['token']),
      providerKey: strTrim(c['providerKey']) || undefined,
    };
    return {
      value: pick<TokenCredentials>(normalized, ALLOWED) as TokenCredentials,
    };
  },

  validate(value) {
    if (!value.token) {
      throw new CredentialsValidationError('token is required', 'token');
    }
    if (value.token.length < 1) {
      throw new CredentialsValidationError('token cannot be empty', 'token');
    }
  },

  // No verify — no external API call is made during credential save.
  // The token is encrypted at rest and decrypted only at runtime.
};

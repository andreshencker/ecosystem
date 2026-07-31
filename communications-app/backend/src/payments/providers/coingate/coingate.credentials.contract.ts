// src/payments/providers/coingate/coingate.credentials.contract.ts
//
// CoinGate-specific credential contract.
// Stored in the generic provider_credentials collection via ProviderCredentials
// schema — no new entity created.
//
// CoinGate uses a single API token for all operations. The mode field records
// whether the token belongs to the sandbox or production environment.
//
// Production tokens are generated at https://coingate.com (Dashboard → API)
// Sandbox tokens are generated at https://sandbox.coingate.com (Dashboard → API)
//
// Tokens from one environment do NOT work in the other. The mode field is the
// canonical source of truth and determines which base URL the adapter uses.

import type { ContractSpec } from '../../../communication/channels/implementation/shared/credentials.types';
import {
  pick,
  requireField,
  requireOneOf,
  strTrim,
} from '../../../communication/channels/implementation/shared/credentials.utils';
import { CredentialsValidationError } from '../../../communication/channels/implementation/shared/credentials.errors';

export interface CoinGateCredentials {
  /** CoinGate API authentication token. Encrypted at rest. */
  token: string;
  /** Execution environment — drives base URL selection. */
  mode: 'test' | 'live';
}

const ALLOWED: (keyof CoinGateCredentials)[] = ['token', 'mode'];

export const CoinGateCredentialsContract: ContractSpec<CoinGateCredentials> = {
  channelKey: 'payment',
  connectionType: 'token',

  normalize(input) {
    const c: Record<string, unknown> = (input as Record<string, unknown>) ?? {};

    const token = strTrim(c['token'] ?? c['COINGATE_TOKEN'] ?? c['apiToken']);
    const rawMode = strTrim(c['mode'] ?? c['COINGATE_MODE']) || 'test';
    const mode: 'test' | 'live' = rawMode === 'live' ? 'live' : 'test';

    const normalized: CoinGateCredentials = { token, mode };

    return {
      value: pick<CoinGateCredentials>(normalized, ALLOWED) as CoinGateCredentials,
    };
  },

  validate(value) {
    requireField(value.token, 'token');
    requireOneOf(value.mode, 'mode', ['test', 'live']);

    if (value.token.length < 8) {
      throw new CredentialsValidationError(
        'token must be a valid CoinGate API token (minimum 8 characters)',
        'token',
      );
    }
  },
};

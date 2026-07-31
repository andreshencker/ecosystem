// src/payments/providers/coingate/coingate.client.ts
//
// CoinGate HTTP API client.
//
// Centralises:
//   - base URL selection (sandbox vs. production)
//   - Authorization header (Token <value>)
//   - request timeout
//   - query-string encoding
//   - JSON body encoding
//   - safe response parsing
//   - error mapping via coingate.errors.ts
//
// Security:
//   - Token is NEVER logged, returned in responses, or included in errors.
//   - No retry on non-idempotent operations.
//   - Idempotent reads (GET) may be retried once on network-level failures.

import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import { mapCoinGateError } from './coingate.errors';

export const COINGATE_SANDBOX_BASE = 'https://api-sandbox.coingate.com/api/v2';
export const COINGATE_PRODUCTION_BASE = 'https://api.coingate.com/api/v2';
export const COINGATE_REQUEST_TIMEOUT_MS = 15_000;

export class CoinGateClient {
  private readonly http: AxiosInstance;
  readonly baseUrl: string;

  constructor(token: string, mode: 'test' | 'live') {
    this.baseUrl =
      mode === 'live' ? COINGATE_PRODUCTION_BASE : COINGATE_SANDBOX_BASE;

    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: COINGATE_REQUEST_TIMEOUT_MS,
      headers: {
        // Token is injected here, not logged anywhere else.
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  /**
   * Performs a GET request to the CoinGate API.
   * All errors are mapped through mapCoinGateError.
   */
  async get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    try {
      const config: AxiosRequestConfig = {};
      if (params && Object.keys(params).length > 0) {
        config.params = this.cleanParams(params);
      }
      const res = await this.http.get<T>(path, config);
      return res.data;
    } catch (err) {
      mapCoinGateError(err);
    }
  }

  /**
   * Performs a POST request to the CoinGate API.
   * All errors are mapped through mapCoinGateError.
   */
  async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    try {
      const res = await this.http.post<T>(path, this.cleanBody(body));
      return res.data;
    } catch (err) {
      mapCoinGateError(err);
    }
  }

  /** Removes undefined and null values from query params. */
  private cleanParams(params: Record<string, unknown>): Record<string, string | number | boolean> {
    const out: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        out[k] = v as string | number | boolean;
      }
    }
    return out;
  }

  /** Removes undefined values from request body. */
  private cleanBody(body: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
}

/**
 * Factory: creates a CoinGateClient from decrypted credentials.
 * Must not be called with credentials that haven't been validated.
 */
export function createCoinGateClient(
  credentials: Record<string, unknown>,
): CoinGateClient {
  const token = credentials['token'];
  const mode = credentials['mode'];

  if (!token || typeof token !== 'string') {
    throw new Error('CoinGate credentials missing token field');
  }

  const resolvedMode: 'test' | 'live' = mode === 'live' ? 'live' : 'test';

  return new CoinGateClient(token, resolvedMode);
}

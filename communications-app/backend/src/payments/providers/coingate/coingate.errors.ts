// src/payments/providers/coingate/coingate.errors.ts
//
// Canonical CoinGate error mapping.
// Maps raw CoinGate HTTP errors into the canonical Payment domain errors.
// Token values are never included in error messages or metadata.

import type { AxiosError } from 'axios';
import type { CoinGateErrorBody } from './coingate.types';
import {
  PaymentCredentialsInvalidError,
  PaymentProviderUnavailableError,
  PaymentProviderNotFoundError,
  PaymentCapabilityNotSupportedError,
} from '../../errors/payment.errors';

// ─── CoinGate-specific domain errors ─────────────────────────────────────────

export class CoinGateValidationError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly providerMessage: string,
    public readonly providerErrors: string[],
    public readonly providerReason?: string,
  ) {
    super(`CoinGate validation error: ${providerMessage}`);
    this.name = 'CoinGateValidationError';
  }
}

export class CoinGatePaymentStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CoinGatePaymentStateError';
  }
}

export class CoinGateRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds?: number) {
    super('CoinGate rate limit exceeded. Please wait before retrying.');
    this.name = 'CoinGateRateLimitError';
  }
}

// ─── Extraction helpers ───────────────────────────────────────────────────────

function extractBody(err: AxiosError): CoinGateErrorBody {
  const data = err.response?.data;
  if (data && typeof data === 'object') return data as CoinGateErrorBody;
  return {};
}

function extractErrors(body: CoinGateErrorBody): string[] {
  if (!body.errors) return [];
  if (Array.isArray(body.errors)) {
    return body.errors.map((e) =>
      typeof e === 'string' ? e : (e.message ?? String(e)),
    );
  }
  return [];
}

function safeMessage(body: CoinGateErrorBody): string {
  return body.message ?? body.reason ?? 'Unknown provider error';
}

// ─── Main mapping function ────────────────────────────────────────────────────

/**
 * Maps a raw axios error from CoinGate into a canonical Payment domain error.
 *
 * Security:
 *   - No API token, raw body, or HTTP headers are included in the thrown error.
 *   - Only the safe provider message and error codes are preserved.
 */
export function mapCoinGateError(err: unknown, providerKey = 'coingate'): never {
  if (!isAxiosError(err)) {
    if (err instanceof Error) throw err;
    throw new PaymentProviderUnavailableError(providerKey, String(err));
  }

  const status = err.response?.status ?? 0;
  const body = extractBody(err);
  const msg = safeMessage(body);
  const errors = extractErrors(body);

  switch (status) {
    case 401:
    case 403:
      throw new PaymentCredentialsInvalidError(
        'CoinGate authentication failed. Check that your API token is valid and belongs to the correct environment (sandbox vs. production).',
      );

    case 404:
      throw new PaymentProviderNotFoundError(`CoinGate resource not found: ${msg}`);

    case 422: {
      const detail = errors.length > 0 ? ` — ${errors.join('; ')}` : '';
      throw new CoinGateValidationError(422, msg, errors, body.reason);
    }

    case 429: {
      const retryAfter = Number(err.response?.headers?.['retry-after']) || undefined;
      throw new CoinGateRateLimitError(retryAfter);
    }

    case 503:
    case 502:
    case 500:
      throw new PaymentProviderUnavailableError(
        providerKey,
        `CoinGate API error (${status}): ${msg}`,
      );

    default:
      if (status === 0) {
        throw new PaymentProviderUnavailableError(
          providerKey,
          'Could not reach CoinGate API. Check your network connection.',
        );
      }
      throw new PaymentProviderUnavailableError(
        providerKey,
        `CoinGate returned HTTP ${status}: ${msg}`,
      );
  }
}

function isAxiosError(err: unknown): err is AxiosError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'isAxiosError' in err &&
    (err as AxiosError).isAxiosError === true
  );
}

/**
 * Returns a safe human-readable message from a CoinGate validation error.
 * Used by controllers mapping to HTTP 422.
 */
export function getCoinGateValidationMessage(err: CoinGateValidationError): string {
  const parts = [err.providerMessage];
  if (err.providerReason) parts.push(err.providerReason);
  if (err.providerErrors.length > 0) parts.push(err.providerErrors.join('; '));
  return parts.filter(Boolean).join(' — ');
}

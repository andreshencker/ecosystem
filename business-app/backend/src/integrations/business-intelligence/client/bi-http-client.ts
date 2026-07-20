import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import axios from 'axios';
import { BIUnavailableError } from '../errors/bi-unavailable.error';

/**
 * Low-level HTTP client for the Business Intelligence service.
 *
 * Handles:
 * - Base URL and auth header resolution from config
 * - Timeout enforcement
 * - Diagnostic logging (method, path, status, duration) — never logs secrets
 * - Error classification into BIUnavailableError with category and statusCode
 */
@Injectable()
export class BIHttpClient {
  private readonly logger = new Logger(BIHttpClient.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  get baseUrl(): string {
    return (
      this.config.get<string>('BI_SERVICE_URL') ?? 'http://localhost:8000'
    ).replace(/\/$/, '');
  }

  private get serviceToken(): string {
    return this.config.get<string>('BI_INTERNAL_SERVICE_TOKEN') ?? '';
  }

  private headers(): Record<string, string> {
    return { 'x-internal-service-token': this.serviceToken };
  }

  /** Classify an axios error into a BIUnavailableError with category and statusCode. */
  private classifyError(err: unknown, method: string, path: string): BIUnavailableError {
    if (!axios.isAxiosError(err)) {
      const msg = err instanceof Error ? err.message : 'unknown error';
      this.logger.error(`[BI] ${method} ${path} — non-axios error: ${msg}`);
      return new BIUnavailableError(`BI ${method} ${path} failed: ${msg}`);
    }

    if (!err.response) {
      // No response — transport-level failure
      const code = (err as any).code as string | undefined;
      if (code === 'ECONNREFUSED') {
        this.logger.error(`[BI] ${method} ${path} — connection refused (${this.baseUrl})`);
        return new BIUnavailableError(
          `BI service refused connection at ${this.baseUrl}`,
          undefined,
          'connection_refused',
        );
      }
      if (code === 'ECONNABORTED' || code === 'ETIMEDOUT' || err.message.includes('timeout')) {
        this.logger.error(`[BI] ${method} ${path} — request timed out`);
        return new BIUnavailableError(
          'BI service request timed out',
          undefined,
          'timeout',
        );
      }
      this.logger.error(`[BI] ${method} ${path} — no response (code=${code ?? 'unknown'}): ${err.message}`);
      return new BIUnavailableError(`BI ${method} ${path} failed: ${err.message}`);
    }

    const status = err.response.status;
    const detail =
      (err.response.data as { detail?: string } | undefined)?.detail ??
      err.message;

    this.logger.error(`[BI] ${method} ${path} — HTTP ${status}: ${detail}`);

    if (status === 401 || status === 403) {
      return new BIUnavailableError(
        `BI integration authentication error (HTTP ${status}): ${detail}`,
        status,
        'auth_error',
      );
    }
    if (status === 404) {
      return new BIUnavailableError(
        `BI endpoint not found: ${method} ${path}`,
        status,
        'not_found',
      );
    }
    if (status === 422) {
      return new BIUnavailableError(
        `BI rejected query parameters (HTTP 422): ${detail}`,
        status,
        'validation_error',
      );
    }
    if (status >= 500) {
      return new BIUnavailableError(
        `BI internal processing error (HTTP ${status}): ${detail}`,
        status,
        'bi_internal_error',
      );
    }
    return new BIUnavailableError(
      `BI ${method} ${path} returned HTTP ${status}: ${detail}`,
      status,
    );
  }

  /**
   * Perform a GET request against a BI service endpoint.
   * Logs: route called, base URL, resolved URL, params, status, duration.
   */
  async get<T>(
    path: string,
    params: Record<string, string> = {},
    timeoutMs = 10_000,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const paramSummary = Object.keys(params).length
      ? JSON.stringify(params)
      : '(none)';
    const start = Date.now();

    this.logger.log(`[BI] GET ${path} — base: ${this.baseUrl} | params: ${paramSummary}`);

    try {
      const res = await firstValueFrom(
        this.http.get<T>(url, {
          headers: this.headers(),
          params,
          timeout: timeoutMs,
        }),
      );
      this.logger.log(
        `[BI] GET ${path} → ${res.status} (${Date.now() - start}ms)`,
      );
      return res.data;
    } catch (err: unknown) {
      this.logger.error(
        `[BI] GET ${path} failed after ${Date.now() - start}ms`,
      );
      throw this.classifyError(err, 'GET', path);
    }
  }

  /**
   * Perform a POST request against a BI service endpoint.
   */
  async post<TReq, TRes>(
    path: string,
    body: TReq,
    timeoutMs = 60_000,
  ): Promise<TRes> {
    const url = `${this.baseUrl}${path}`;
    const start = Date.now();

    this.logger.log(`[BI] POST ${path} — base: ${this.baseUrl}`);

    try {
      const res = await firstValueFrom(
        this.http.post<TRes>(url, body, {
          headers: this.headers(),
          timeout: timeoutMs,
        }),
      );
      this.logger.log(
        `[BI] POST ${path} → ${res.status} (${Date.now() - start}ms)`,
      );
      return res.data;
    } catch (err: unknown) {
      this.logger.error(
        `[BI] POST ${path} failed after ${Date.now() - start}ms`,
      );
      throw this.classifyError(err, 'POST', path);
    }
  }
}

import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import axios, { AxiosError } from 'axios';
import { BIHttpClient } from '../client/bi-http-client';
import { BIUnavailableError } from '../errors/bi-unavailable.error';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeAxiosError(
  status?: number,
  data?: unknown,
  code?: string,
): AxiosError {
  const err = new axios.AxiosError('Axios error');
  if (status !== undefined) {
    err.response = {
      status,
      data: data ?? {},
      statusText: String(status),
      headers: {},
      config: {} as any,
    };
  }
  if (code) err.code = code;
  return err;
}

// ── Module setup ──────────────────────────────────────────────────────────────

const mockHttpService = { get: jest.fn(), post: jest.fn() };
const mockConfig = { get: jest.fn() };

async function buildClient(): Promise<BIHttpClient> {
  const module = await Test.createTestingModule({
    providers: [
      BIHttpClient,
      { provide: HttpService, useValue: mockHttpService },
      { provide: ConfigService, useValue: mockConfig },
    ],
  }).compile();
  return module.get(BIHttpClient);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BIHttpClient', () => {
  let client: BIHttpClient;

  beforeEach(async () => {
    client = await buildClient();
    jest.clearAllMocks();
    mockConfig.get.mockImplementation((key: string) => {
      if (key === 'BI_SERVICE_URL') return 'http://localhost:8000';
      if (key === 'BI_INTERNAL_SERVICE_TOKEN') return 'test-token';
      return undefined;
    });
  });

  // ── Base URL resolution ───────────────────────────────────────────────────

  describe('baseUrl', () => {
    it('uses BI_SERVICE_URL from config', () => {
      expect(client.baseUrl).toBe('http://localhost:8000');
    });

    it('strips trailing slash from BI_SERVICE_URL', () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'BI_SERVICE_URL') return 'http://localhost:8000/';
        return undefined;
      });
      expect(client.baseUrl).toBe('http://localhost:8000');
    });

    it('falls back to localhost:8000 when BI_SERVICE_URL is not set', () => {
      mockConfig.get.mockReturnValue(undefined);
      expect(client.baseUrl).toBe('http://localhost:8000');
    });
  });

  // ── Successful GET ────────────────────────────────────────────────────────

  describe('get — success', () => {
    it('returns response data', async () => {
      const mockData = { items: [], total: 0 };
      mockHttpService.get.mockReturnValue(of({ data: mockData, status: 200 }));
      const result = await client.get('/internal/customers');
      expect(result).toEqual(mockData);
    });

    it('sends x-internal-service-token header', async () => {
      mockHttpService.get.mockReturnValue(of({ data: {}, status: 200 }));
      await client.get('/internal/customers');
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'http://localhost:8000/internal/customers',
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-internal-service-token': 'test-token',
          }),
        }),
      );
    });

    it('forwards query params to BI', async () => {
      mockHttpService.get.mockReturnValue(of({ data: {}, status: 200 }));
      await client.get('/internal/customers', { page: '1', businessId: 'biz1' });
      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ params: { page: '1', businessId: 'biz1' } }),
      );
    });

    it('constructs the correct customer list URL', async () => {
      mockHttpService.get.mockReturnValue(of({ data: {}, status: 200 }));
      await client.get('/internal/customers');
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'http://localhost:8000/internal/customers',
        expect.anything(),
      );
    });

    it('constructs the correct customer detail URL', async () => {
      mockHttpService.get.mockReturnValue(of({ data: {}, status: 200 }));
      await client.get('/internal/customers/cust1');
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'http://localhost:8000/internal/customers/cust1',
        expect.anything(),
      );
    });
  });

  // ── Error classification ──────────────────────────────────────────────────

  describe('get — error classification', () => {
    async function getError(axErr: AxiosError): Promise<BIUnavailableError> {
      mockHttpService.get.mockReturnValue(throwError(() => axErr));
      try {
        await client.get('/internal/customers');
        throw new Error('Expected error not thrown');
      } catch (e) {
        return e as BIUnavailableError;
      }
    }

    it('ECONNREFUSED → category=connection_refused', async () => {
      const err = await getError(makeAxiosError(undefined, undefined, 'ECONNREFUSED'));
      expect(err).toBeInstanceOf(BIUnavailableError);
      expect(err.category).toBe('connection_refused');
      expect(err.statusCode).toBeUndefined();
    });

    it('ECONNABORTED (timeout) → category=timeout', async () => {
      const err = await getError(makeAxiosError(undefined, undefined, 'ECONNABORTED'));
      expect(err).toBeInstanceOf(BIUnavailableError);
      expect(err.category).toBe('timeout');
    });

    it('HTTP 401 → category=auth_error, statusCode=401', async () => {
      const err = await getError(makeAxiosError(401, { detail: 'Invalid service token' }));
      expect(err).toBeInstanceOf(BIUnavailableError);
      expect(err.category).toBe('auth_error');
      expect(err.statusCode).toBe(401);
    });

    it('HTTP 403 → category=auth_error, statusCode=403', async () => {
      const err = await getError(makeAxiosError(403, { detail: 'Forbidden' }));
      expect(err.category).toBe('auth_error');
      expect(err.statusCode).toBe(403);
    });

    it('HTTP 404 → category=not_found, statusCode=404', async () => {
      const err = await getError(makeAxiosError(404, { detail: 'Not Found' }));
      expect(err.category).toBe('not_found');
      expect(err.statusCode).toBe(404);
    });

    it('HTTP 422 → category=validation_error, statusCode=422', async () => {
      const err = await getError(makeAxiosError(422, { detail: 'Validation error' }));
      expect(err.category).toBe('validation_error');
      expect(err.statusCode).toBe(422);
    });

    it('HTTP 500 → category=bi_internal_error, statusCode=500', async () => {
      const err = await getError(makeAxiosError(500, { detail: 'Internal Server Error' }));
      expect(err.category).toBe('bi_internal_error');
      expect(err.statusCode).toBe(500);
    });

    it('HTTP 500 with BI_INTERNAL_SERVICE_TOKEN not configured → bi_internal_error', async () => {
      const err = await getError(
        makeAxiosError(500, { detail: 'BI_INTERNAL_SERVICE_TOKEN not configured' }),
      );
      expect(err.category).toBe('bi_internal_error');
      expect(err.statusCode).toBe(500);
    });

    it('does not include token in error message', async () => {
      const err = await getError(makeAxiosError(401));
      expect(err.message).not.toContain('test-token');
    });
  });

  // ── BIUnavailableError static categorization ──────────────────────────────

  describe('BIUnavailableError.categorize via constructor', () => {
    it('undefined statusCode → unknown', () => {
      const err = new BIUnavailableError('msg');
      expect(err.category).toBe('unknown');
    });

    it('401 → auth_error', () => {
      const err = new BIUnavailableError('msg', 401);
      expect(err.category).toBe('auth_error');
    });

    it('403 → auth_error', () => {
      const err = new BIUnavailableError('msg', 403);
      expect(err.category).toBe('auth_error');
    });

    it('404 → not_found', () => {
      const err = new BIUnavailableError('msg', 404);
      expect(err.category).toBe('not_found');
    });

    it('422 → validation_error', () => {
      const err = new BIUnavailableError('msg', 422);
      expect(err.category).toBe('validation_error');
    });

    it('500 → bi_internal_error', () => {
      const err = new BIUnavailableError('msg', 500);
      expect(err.category).toBe('bi_internal_error');
    });

    it('explicit category overrides status inference', () => {
      const err = new BIUnavailableError('msg', 500, 'timeout');
      expect(err.category).toBe('timeout');
    });
  });
});

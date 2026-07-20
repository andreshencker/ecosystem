/**
 * BI service connection configuration.
 *
 * Reads from environment variables:
 *   BI_SERVICE_URL             — base URL of the BI FastAPI service (default: http://localhost:8000)
 *   BI_INTERNAL_SERVICE_TOKEN  — shared secret for x-internal-service-token header
 */

export interface BiConnectionConfig {
  baseUrl: string;
  serviceToken: string;
}

/**
 * Resolve BI connection config from environment variables.
 * Returns defaults when variables are not set (safe for development).
 */
export function resolveBiConnectionConfig(): BiConnectionConfig {
  return {
    baseUrl: (process.env['BI_SERVICE_URL'] ?? 'http://localhost:8000').replace(/\/$/, ''),
    serviceToken: process.env['BI_INTERNAL_SERVICE_TOKEN'] ?? '',
  };
}

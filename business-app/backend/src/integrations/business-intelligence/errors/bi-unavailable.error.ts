/**
 * Error thrown when the Business Intelligence service is unreachable
 * or returns an unexpected error.
 *
 * `statusCode` carries the upstream HTTP status when available (401, 403,
 * 404, 422, 500…). When it is undefined the failure was a transport-level
 * problem (connection refused, timeout, DNS failure).
 */
export class BIUnavailableError extends Error {
  /** Upstream HTTP status code from BI, if the request reached the service. */
  readonly statusCode?: number;

  /** Error category for structured logging and downstream mapping. */
  readonly category:
    | 'connection_refused'
    | 'timeout'
    | 'auth_error'
    | 'not_found'
    | 'validation_error'
    | 'bi_internal_error'
    | 'unknown';

  constructor(
    message = 'Business Intelligence service is unavailable',
    statusCode?: number,
    category?: BIUnavailableError['category'],
  ) {
    super(message);
    this.name = 'BIUnavailableError';
    this.statusCode = statusCode;
    this.category = category ?? BIUnavailableError.categorize(statusCode);
  }

  private static categorize(
    statusCode?: number,
  ): BIUnavailableError['category'] {
    if (!statusCode) return 'unknown';
    if (statusCode === 401 || statusCode === 403) return 'auth_error';
    if (statusCode === 404) return 'not_found';
    if (statusCode === 422) return 'validation_error';
    if (statusCode >= 500) return 'bi_internal_error';
    return 'unknown';
  }
}

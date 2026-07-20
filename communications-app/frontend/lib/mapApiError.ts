import axios from 'axios';

/**
 * Extracts the `message` field from an Axios error response body.
 * Falls back to `fallback` when the body is absent or malformed.
 * Joins array messages (NestJS validation errors) with ", ".
 */
export function extractApiMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback;
  const msg = (error.response?.data as { message?: unknown } | undefined)?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  return typeof msg === 'string' && msg ? msg : fallback;
}

/**
 * Returns the recommended snackbar auto-hide duration for a given error.
 *
 * Business/validation errors (4xx) are less alarming and auto-hide faster.
 * Server/network errors stay longer since the user may need to read them
 * and decide whether to retry.
 *
 * Duration table (Form-Behaviour.md §5.4):
 *   4xx  →  6 000 ms
 *   5xx  →  8 000 ms
 *   network / unknown  →  8 000 ms
 */
export function mapApiErrorDuration(error: unknown): number {
  if (!axios.isAxiosError(error)) return 8000;
  if (!error.response) return 8000; // network error
  const status = error.response.status;
  if (status >= 400 && status < 500) return 6000;
  return 8000;
}

/**
 * Translates any API error into a user-facing message.
 *
 * Pass context='login' for login-specific 401/403 messages (Form-Behaviour.md §3.1).
 * All other callers omit context and receive the general messages from §5.1.
 */
export function mapApiError(error: unknown, context?: 'login'): string {
  if (!axios.isAxiosError(error)) {
    return 'An unexpected error occurred. Please try again.';
  }

  if (!error.response) {
    // Network error — request sent but no response received
    return context === 'login'
      ? 'Cannot reach the server. Please try again.'
      : 'Cannot reach the server. Please check your connection and try again.';
  }

  const status = error.response.status;
  // Use the server's message for 409 conflicts (backend provides entity-specific text)
  const serverMessage = (error.response.data as { message?: string } | undefined)?.message;

  switch (status) {
    case 400:
      return 'The request could not be processed. Please check your input.';
    case 401:
      return context === 'login'
        ? 'Invalid email or password.'
        : 'Your session has expired. Please sign in again.';
    case 403:
      return context === 'login'
        ? 'Please verify your email before logging in.'
        : 'You do not have permission to perform this action.';
    case 404:
      return 'The requested item could not be found.';
    case 409:
      return typeof serverMessage === 'string' && serverMessage
        ? serverMessage
        : 'This already exists. Please use a different value.';
    case 422:
      return 'Some fields are invalid. Please review and resubmit.';
    case 500:
      return context === 'login'
        ? 'Something went wrong. Please try again later.'
        : 'Something went wrong on our end. Please try again later.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

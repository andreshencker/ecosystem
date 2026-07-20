import axios from 'axios';

export interface ApiValidationError {
  field: string;
  message: string;
}

/**
 * Converts a 422 errors array into an RHF-compatible field-error map.
 *
 * Fields that exist in the form → keyed by field name.
 * Fields not in the form, or errors without a field → collected under '_form'
 * for display in the form-level error zone.
 *
 * See Form-Behaviour.md §5.3.
 */
export function mapValidationErrors(
  errors: ApiValidationError[],
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const e of errors) {
    if (!e.field || e.field === '_form') {
      result['_form'] = result['_form']
        ? `${result['_form']}; ${e.message}`
        : e.message;
    } else {
      result[e.field] = e.message;
    }
  }
  return result;
}

/**
 * Extracts the validation errors array from an Axios 422 response.
 * Returns null if the error is not a 422 or has no structured errors array.
 */
export function extractValidationErrors(
  error: unknown,
): ApiValidationError[] | null {
  if (!axios.isAxiosError(error)) return null;
  if (error.response?.status !== 422) return null;
  const data = error.response.data as { errors?: ApiValidationError[] } | undefined;
  if (!Array.isArray(data?.errors) || data.errors.length === 0) return null;
  return data.errors;
}

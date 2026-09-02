'use client';

import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useUIStore } from '@/stores/ui.store';
import { mapApiError } from '@/lib/mapApiError';

interface CrudFeedbackOptions {
  /** Shown in the success snackbar, e.g. "Company created". */
  successMessage: string;
  /** Query keys to invalidate on success. Each key is passed to invalidateQueries. */
  queryKeys: QueryKey[];
  /** Called after snackbar and invalidation — typically closes the drawer. */
  onSuccess?: () => void;
}

/**
 * Encapsulates success snackbar, query invalidation, and drawer-close logic
 * for create / update / delete mutations. See Form-Behaviour.md §8.3.
 *
 * Usage:
 *   const { onSuccess, onError } = useCrudFeedback({
 *     successMessage: 'Company created',
 *     queryKeys: [['companies']],
 *     onSuccess: closeDrawer,
 *   });
 *
 *   const mutation = useMutation({
 *     mutationFn: createCompany,
 *     onSuccess,
 *     onError: (error) => setFormError(onError(error)),
 *   });
 */
export function useCrudFeedback(options: CrudFeedbackOptions) {
  const queryClient = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  function onSuccess() {
    pushSnack({ type: 'success', message: options.successMessage });
    for (const key of options.queryKeys) {
      queryClient.invalidateQueries({ queryKey: key as readonly unknown[] });
    }
    options.onSuccess?.();
  }

  function onError(error: unknown): string {
    // The global mutationCache.onError shows an error snack automatically.
    // Return the mapped string so the caller can set it in the form-level error zone.
    return mapApiError(error);
  }

  return { onSuccess, onError };
}

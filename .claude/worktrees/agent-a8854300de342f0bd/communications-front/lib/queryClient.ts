import { QueryClient, MutationCache } from '@tanstack/react-query';
import { mapApiError, mapApiErrorDuration } from '@/lib/mapApiError';
import { useUIStore } from '@/stores/ui.store';

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 300_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
    // Global fallback: any useMutation that doesn't handle its own onError
    // still gets a canonical error toast via mapApiError.
    // Mutations can set meta: { suppressGlobalError: true } to opt out
    // when they handle errors locally (e.g. two-stage delete flows).
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        if ((mutation.meta as Record<string, unknown> | undefined)?.suppressGlobalError) return;
        useUIStore.getState().pushSnack({
          type: 'error',
          message: mapApiError(error),
          duration: mapApiErrorDuration(error),
        });
      },
    }),
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

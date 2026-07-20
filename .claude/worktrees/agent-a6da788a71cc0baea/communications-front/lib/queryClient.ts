import { QueryClient, MutationCache } from '@tanstack/react-query';
import axios from 'axios';
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
    mutationCache: new MutationCache({
      onError: (error) => {
        const message = axios.isAxiosError(error)
          ? ((error.response?.data as { message?: string })?.message ?? error.message)
          : 'An unexpected error occurred.';
        useUIStore.getState().pushSnack({ type: 'error', message });
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

import {QueryClient} from '@tanstack/react-query';
import type {ApiError} from './http';

/**
 * Crea un QueryClient con defaults razonables para dashboards.
 * Ajusta según tus necesidades (staleTime, retries, etc.)
 */
export function createQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: (failureCount, error) => {
                    // Evita reintentar ante errores 4xx
                    const e = error as ApiError;
                    if (e?.status && e.status >= 400 && e.status < 500) return false;
                    return failureCount < 1;
                },
                refetchOnWindowFocus: false,
                staleTime: 30_000, // 30s
            },
            mutations: {
                retry: 0,
            },
        },
    });
}

// Instancia por defecto si prefieres importar directamente
export const queryClient = createQueryClient();
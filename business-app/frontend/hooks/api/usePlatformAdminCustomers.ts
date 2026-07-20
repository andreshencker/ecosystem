'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import type {
  PlatformAdminCustomerListResponse,
  BiCustomerDetailResponse,
  PlatformAdminCustomersParams,
} from '@/types/platform-admin-customer';

// ─── Queries ──────────────────────────────────────────────────────────────────

export function usePlatformAdminCustomers(params: PlatformAdminCustomersParams = {}) {
  return useQuery({
    queryKey: ['platform-admin', 'customers', params],
    queryFn: () =>
      apiClient
        .get<PlatformAdminCustomerListResponse>('/platform-admin/customers', { params })
        .then((r) => r.data),
  });
}

export function usePlatformAdminCustomer(
  customerId: string,
  options?: { businessId?: string; enabled?: boolean },
) {
  return useQuery({
    queryKey: ['platform-admin', 'customers', customerId, options?.businessId],
    queryFn: () =>
      apiClient
        .get<BiCustomerDetailResponse>(`/platform-admin/customers/${customerId}`, {
          params: options?.businessId ? { businessId: options.businessId } : undefined,
        })
        .then((r) => r.data),
    enabled: options?.enabled ?? !!customerId,
  });
}

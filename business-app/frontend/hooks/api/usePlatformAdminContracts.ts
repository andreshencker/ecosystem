'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import type {
  BiContractAdminSummaryResponse,
  BiContractAdminListResponse,
  BiContractAdminDetail,
  BiContractSupportIssueListResponse,
  PlatformAdminContractListParams,
  PlatformAdminContractSummaryParams,
} from '@/types/platform-admin-contract';

export function usePlatformAdminContractSummary(
  params: PlatformAdminContractSummaryParams = {},
) {
  return useQuery({
    queryKey: ['platform-admin', 'contracts', 'summary', params],
    queryFn: () =>
      apiClient
        .get<BiContractAdminSummaryResponse>('/platform-admin/contracts/summary', { params })
        .then((r) => r.data),
  });
}

export function usePlatformAdminContracts(
  params: PlatformAdminContractListParams = {},
) {
  return useQuery({
    queryKey: ['platform-admin', 'contracts', 'list', params],
    queryFn: () =>
      apiClient
        .get<BiContractAdminListResponse>('/platform-admin/contracts', { params })
        .then((r) => r.data),
  });
}

export function usePlatformAdminContract(
  contractId: string,
  options?: { businessId?: string; enabled?: boolean },
) {
  return useQuery({
    queryKey: ['platform-admin', 'contracts', contractId, options?.businessId],
    queryFn: () =>
      apiClient
        .get<BiContractAdminDetail>(`/platform-admin/contracts/${contractId}`, {
          params: options?.businessId ? { businessId: options.businessId } : undefined,
        })
        .then((r) => r.data),
    enabled: options?.enabled ?? !!contractId,
  });
}

export function usePlatformAdminContractIssues(
  contractId: string,
  options?: { businessId?: string; enabled?: boolean },
) {
  return useQuery({
    queryKey: ['platform-admin', 'contracts', contractId, 'issues', options?.businessId],
    queryFn: () =>
      apiClient
        .get<BiContractSupportIssueListResponse>(
          `/platform-admin/contracts/${contractId}/issues`,
          { params: options?.businessId ? { businessId: options.businessId } : undefined },
        )
        .then((r) => r.data),
    enabled: options?.enabled ?? !!contractId,
  });
}

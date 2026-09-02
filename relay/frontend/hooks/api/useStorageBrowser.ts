'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';

export interface StorageBrowserFile {
  key: string;
  fileName: string;
  visibility: 'public' | 'private';
  size: number;
  lastModified?: string;
  etag?: string;
  url: string | null;
}

export interface StorageBrowserResult {
  domain: string;
  visibility: 'public' | 'private';
  items: StorageBrowserFile[];
}

export function useDomainFiles(companyId: string | null | undefined, domain: string | null | undefined) {
  return useQuery({
    queryKey: ['storage-browser', companyId, domain],
    queryFn: () =>
      apiClient
        .get<StorageBrowserResult>('/files/storage/browse', { params: { companyId, domain } })
        .then((r) => r.data),
    enabled: Boolean(companyId) && Boolean(domain),
  });
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import { useAuthStore } from '@/stores/auth.store';

export interface SwitchableOrganization {
  organizationId: string;
  name: string;
  slug: string;
  isPlatform: boolean;
  isDefault: boolean;
  membership?: { role: 'owner' | 'admin' | 'member' };
  applicationRole?: 'owner' | 'admin' | 'operator' | 'viewer';
}

export interface SwitchableOrganizationsResponse {
  organizations: SwitchableOrganization[];
  currentOrganizationId: string | null;
}

// Populates the global organization switcher — every Grapifly organization
// this user has active 'relay' access to, plus which one is active now.
export function useSwitchableOrganizations() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['auth', 'organizations'],
    queryFn: () =>
      apiClient
        .get<SwitchableOrganizationsResponse>('/auth/organizations')
        .then((r) => r.data),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1_000,
  });
}

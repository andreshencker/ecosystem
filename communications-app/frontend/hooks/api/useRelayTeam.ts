'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import { useUIStore } from '@/stores/ui.store';
import { extractApiMessage } from '@/lib/mapApiError';
import type { User } from '@/types/api';
import type { UpdateUserFormData } from '@/lib/schemas/user.schema';

interface TeamResponse { items: User[]; total: number; invitations: unknown[] }

const feedback = (fallback: string) => (error: unknown) =>
  useUIStore.getState().pushSnack({ type: 'error', message: extractApiMessage(error, fallback) });

export function useRelayTeamUsers() {
  return useQuery({
    queryKey: ['relay-team'],
    queryFn: () => apiClient.get<TeamResponse>('/team').then((response) => ({
      items: response.data.items,
      total: response.data.total,
      page: 1,
      limit: response.data.total || 25,
    })),
  });
}

export function useUpdateRelayTeamMemberMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string } & UpdateUserFormData) =>
      apiClient.patch(`/team/members/${id}`, { role }).then((response) => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relay-team'] });
      useUIStore.getState().pushSnack({ type: 'success', message: 'Relay role updated in Grapifly' });
    },
    onError: feedback('Failed to update Relay access'),
  });
}

function useStatusMutation(status: 'active' | 'suspended' | 'revoked', successMessage: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`/team/members/${id}`, { status }).then((response) => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relay-team'] });
      useUIStore.getState().pushSnack({ type: 'success', message: successMessage });
    },
    onError: feedback('Failed to update Relay access'),
  });
}

export function useSuspendRelayTeamMemberMutation() { return useStatusMutation('suspended', 'Relay access suspended'); }
export function useActivateRelayTeamMemberMutation() { return useStatusMutation('active', 'Relay access restored'); }
export function useRevokeRelayTeamMemberMutation() { return useStatusMutation('revoked', 'Relay access revoked'); }

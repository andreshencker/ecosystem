'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import type { Invitation, InviteUserResult } from '@/types/api';
import { useUIStore } from '@/stores/ui.store';
import { extractApiMessage } from '@/lib/mapApiError';
import type { InviteUserFormData } from '@/lib/schemas/user.schema';

export interface InvitationsResponse {
  items: Invitation[];
}

export function useInvitations() {
  return useQuery({
    queryKey: ['invitations'],
    queryFn: () =>
      apiClient
        .get<InvitationsResponse>('/users/invitations')
        .then((r) => r.data),
  });
}

export function useInviteUserMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: (dto: InviteUserFormData) => {
      // Strip optional fields if empty so the backend never receives "" for targetCompanyId/Key.
      const body: Record<string, unknown> = {
        email:     dto.email,
        firstName: dto.firstName,
        lastName:  dto.lastName,
        role:      dto.role,
      };
      if (dto.targetCompanyId?.trim())   body.targetCompanyId  = dto.targetCompanyId.trim();
      if (dto.targetBusinessKey?.trim()) body.targetBusinessKey = dto.targetBusinessKey.trim();

      return apiClient
        .post<InviteUserResult>('/users/invite', body)
        .then((r) => r.data);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['invitations'] });
      if (data.emailDelivered) {
        pushSnack({ type: 'success', message: data.message });
      } else {
        pushSnack({ type: 'warning', message: data.message });
      }
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to create user') }),
  });
}

export function useResendInvitationMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);
  return useMutation({
    mutationFn: (id: string) =>
      apiClient
        .post<{ message: string; emailDelivered: boolean }>(`/users/invitations/${id}/resend`)
        .then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['invitations'] });
      pushSnack({
        type: data.emailDelivered ? 'success' : 'warning',
        message: data.message,
      });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to resend invitation') }),
  });
}

export function useCancelInvitationMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch(`/users/invitations/${id}/cancel`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invitations'] });
      pushSnack({ type: 'success', message: 'Invitation cancelled' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to cancel invitation') }),
  });
}

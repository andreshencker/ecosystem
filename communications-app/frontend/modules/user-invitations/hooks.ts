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
        .get<{ invitations: Invitation[] }>('/team')
        .then((r) => ({ items: r.data.invitations })),
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
        role:      dto.role,
      };
      if (dto.targetCompanyId?.trim())  body.targetCompanyId  = dto.targetCompanyId.trim();
      if (dto.targetCompanyKey?.trim()) body.targetCompanyKey = dto.targetCompanyKey.trim();

      console.log('[useInviteUserMutation] endpoint: POST /team/invitations');
      console.log('[useInviteUserMutation] payload:', body);

      return apiClient
        .post<InviteUserResult & { inviteUrl?: string | null }>('/team/invitations', body)
        .then((r) => {
          console.log('[useInviteUserMutation] response:', r.data);
          return r.data;
        })
        .catch((err) => {
          console.error('[useInviteUserMutation] error response:', err?.response?.data ?? err?.message);
          throw err;
        });
    },
    onSuccess: (data: InviteUserResult & { inviteUrl?: string | null }) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['invitations'] });
      qc.invalidateQueries({ queryKey: ['relay-team'] });
      if (data.inviteUrl && typeof navigator !== 'undefined') navigator.clipboard?.writeText(data.inviteUrl).catch(() => undefined);
      if (data.emailDelivered) {
        pushSnack({ type: 'success', message: data.message });
      } else {
        pushSnack({ type: 'warning', message: `${data.message}${data.inviteUrl ? ' and copied to your clipboard' : ''}` });
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
        .post<{ message?: string; emailDelivered?: boolean; inviteUrl?: string | null }>(`/team/invitations/${id}/regenerate`)
        .then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['invitations'] });
      qc.invalidateQueries({ queryKey: ['relay-team'] });
      if (data.inviteUrl && typeof navigator !== 'undefined') navigator.clipboard?.writeText(data.inviteUrl).catch(() => undefined);
      pushSnack({
        type: data.emailDelivered ? 'success' : 'warning',
        message: `${data.message ?? 'A new Grapifly invitation link was generated'}${data.inviteUrl ? ' and copied to your clipboard' : ''}`,
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
      apiClient.post(`/team/invitations/${id}/cancel`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invitations'] });
      qc.invalidateQueries({ queryKey: ['relay-team'] });
      pushSnack({ type: 'success', message: 'Invitation cancelled' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to cancel invitation') }),
  });
}

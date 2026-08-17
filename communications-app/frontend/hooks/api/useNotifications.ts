'use client';
import { extractApiMessage } from '@/lib/mapApiError';

import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import type { NotificationResponse } from '@/types/api';
import { useUIStore } from '@/stores/ui.store';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TriggerNotificationDto {
  companyId: string;
  event: string;
  email?: string;
  phone?: string;
  variables?: Record<string, string>;
  payload?: Record<string, unknown>;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useTriggerNotificationMutation() {
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (dto: TriggerNotificationDto) =>
      apiClient.post<NotificationResponse>('/notifications/event', dto).then((r) => r.data),
    onSuccess: (data) => {
      const allOk = data.results.every((r) => r.success);
      if (allOk) {
        pushSnack({ type: 'success', message: 'Notification sent successfully' });
      } else {
        const failed = data.results.filter((r) => !r.success).map((r) => r.channel).join(', ');
        pushSnack({ type: 'warning', message: `Partial send — failed channels: ${failed}` });
      }
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to send notification') }),
  });
}

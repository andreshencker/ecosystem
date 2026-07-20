// src/channels/implementation/shared/channel-timeout.util.ts

import type { NotificationResultDto } from '../../../notifications/dto/notification-result.dto';
import type { SmsSendResult } from '../sms/sms-channel.interface';

const DEFAULT_TIMEOUT_MS = 10_000;

function getTimeoutMs(): number {
  const ms = Number(process.env.CHANNEL_TIMEOUT_MS);
  return ms > 0 ? ms : DEFAULT_TIMEOUT_MS;
}

/**
 * Returns a Promise that resolves with a timeout error result after CHANNEL_TIMEOUT_MS ms.
 * Use with Promise.race() in email channel send methods.
 */
export function emailSendTimeout(provider: string): Promise<NotificationResultDto> {
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          channel: 'EMAIL',
          provider,
          success: false,
          error: 'Provider timeout',
        }),
      getTimeoutMs(),
    ),
  );
}

/**
 * Returns a Promise that resolves with a timeout error result after CHANNEL_TIMEOUT_MS ms.
 * Use with Promise.race() in SMS channel send methods.
 */
export function smsSendTimeout(provider: string): Promise<SmsSendResult> {
  return new Promise((resolve) =>
    setTimeout(
      () => resolve({ success: false, provider, error: 'Provider timeout' }),
      getTimeoutMs(),
    ),
  );
}

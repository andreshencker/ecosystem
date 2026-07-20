// src/communications/notifications/dto/notification-result.dto.ts
export class NotificationResultDto {
  channel!: 'EMAIL' | 'SMS' | 'STORAGE';
  success!: boolean;
  provider!: string;
  error?: string | null;
}

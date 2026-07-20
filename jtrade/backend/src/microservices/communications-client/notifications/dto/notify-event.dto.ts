// src/communications/notifications/dto/notify-event.dto.ts
export class NotifyEventDto {
  companyId!: string;
  event!: string;

  email?: string;
  phone?: string;

  variables?: Record<string, any>;
  payload?: Record<string, any>;
}

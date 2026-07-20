// src/notifications/dto/send-email.dto.ts
export type EmailAttachmentDto = {
  filename: string;
  contentBase64: string;
  contentType?: string;
};

export class SendEmailDto {
  to!: string;
  subject!: string;
  html!: string;
  from?: string;
  attachments?: EmailAttachmentDto[];
}

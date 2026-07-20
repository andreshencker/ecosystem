// src/channels/implementation/email/smtp/smtp-email.types.ts

export type SmtpProviderKey =
  | 'gmail'
  | 'outlook'
  | 'office365'
  | 'zoho'
  | 'sendgrid'
  | 'mailgun'
  | string;

export type SmtpCredentials = {
  // ✅ Requeridos (contrato estándar)
  host: string; // smtp.gmail.com | smtp.office365.com | etc
  port: number; // 465 | 587 | ...
  secure: boolean;

  user: string; // email/usuario
  pass: string; // app password / smtp password

  // ✅ Opcionales
  fromEmail?: string;
  fromName?: string;
  replyTo?: string;

  tlsRejectUnauthorized?: boolean; // default true
  providerKey?: SmtpProviderKey; // ayuda para logs/UI
};

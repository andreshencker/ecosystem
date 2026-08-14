// src/channels/implementation/email/api_key/sendgrid-email.types.ts

export type SendGridProviderKey = 'sendgrid' | string;

export type SendGridEmailCredentials = {
  providerKey?: SendGridProviderKey;

  /** ✅ requerido */
  apiKey: string;

  /** ✅ opcional (defaults para from) */
  fromEmail?: string;
  fromName?: string;

  /** ✅ opcional */
  replyTo?: string;
};

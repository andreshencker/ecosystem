// src/channels/implementation/email/api_key/mailgun-email.types.ts

export type MailgunProviderKey = 'mailgun' | string;

export type MailgunEmailCredentials = {
  providerKey?: MailgunProviderKey;

  /** ✅ requeridos */
  apiKey: string;
  domain: string;

  /** ✅ opcional (si usas EU o custom) */
  baseUrl?: string; // e.g. https://api.mailgun.net (US) | https://api.eu.mailgun.net (EU)

  /** ✅ opcional (defaults para from) */
  fromEmail?: string;
  fromName?: string;

  /** ✅ opcional */
  replyTo?: string;
};

// src/channels/implementation/sms/api_key/twilio-sms.types.ts

export type TwilioProviderKey = 'twilio' | string;

export type TwilioSmsCredentials = {
  providerKey?: TwilioProviderKey;

  /** ✅ requeridos */
  accountSid: string;
  authToken: string;
  fromNumber: string;
};

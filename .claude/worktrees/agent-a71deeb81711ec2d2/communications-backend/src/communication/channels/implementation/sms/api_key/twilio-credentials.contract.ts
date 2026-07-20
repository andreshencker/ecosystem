// src/channels/implementation/sms/api_key/twilio-credentials.contract.ts

import type { ContractSpec } from '../../shared/credentials.types';
import { pick, requireField, strTrim } from '../../shared/credentials.utils';
import type { TwilioSmsCredentials } from './twilio-sms.types';

const ALLOWED: (keyof TwilioSmsCredentials)[] = [
  'providerKey',
  'accountSid',
  'authToken',
  'fromNumber',
];

function normalizePhone(v: any): string {
  // mínimo: trim + remover espacios internos comunes
  return strTrim(v).replace(/\s+/g, '');
}

export const TwilioCredentialsContract: ContractSpec<TwilioSmsCredentials> = {
  channelKey: 'sms',
  connectionType: 'api_key',

  normalize(input) {
    const c: any = input ?? {};

    // soportar legacy keys
    const accountSid = strTrim(
      c.accountSid ?? c.TWILIO_ACCOUNT_SID ?? c.sid ?? c.SID,
    );
    const authToken = strTrim(
      c.authToken ?? c.TWILIO_AUTH_TOKEN ?? c.token ?? c.AUTH_TOKEN,
    );
    const fromNumber = normalizePhone(
      c.fromNumber ?? c.TWILIO_FROM_NUMBER ?? c.from ?? c.FROM_NUMBER,
    );

    const providerKey =
      strTrim(c.providerKey ?? c.PROVIDER_KEY ?? 'twilio') || 'twilio';

    const normalized: TwilioSmsCredentials = {
      providerKey,
      accountSid,
      authToken,
      fromNumber,
    };

    // whitelist
    return {
      value: pick<TwilioSmsCredentials>(
        normalized,
        ALLOWED,
      ) as TwilioSmsCredentials,
    };
  },

  validate(value) {
    requireField(value.accountSid, 'accountSid');
    requireField(value.authToken, 'authToken');
    requireField(value.fromNumber, 'fromNumber');

    // validación liviana (evita regex estricta para no romper casos)
    if (!value.fromNumber.startsWith('+')) {
      // Twilio normalmente usa E.164 con +
      // si quieres permitir sin '+', quita esto
      // (pero es un buen guard rail)
      throw new Error('fromNumber must be in E.164 format, e.g. +614xxxxxxxx');
    }
  },

  // verify: opcional (requiere llamada real a Twilio). Lo dejamos sin red por ahora.
};

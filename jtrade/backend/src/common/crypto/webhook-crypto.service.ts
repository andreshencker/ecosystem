import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export type EncryptedSecret = {
  enc: string; // base64
  iv: string; // base64
  tag: string; // base64
};

@Injectable()
export class WebhookCryptoService {
  private readonly key: Buffer;

  constructor() {
    const b64 = process.env.WEBHOOK_ENC_KEY_B64;
    if (!b64) throw new Error('Missing WEBHOOK_ENC_KEY_B64');

    const raw = Buffer.from(b64, 'base64');
    if (raw.length !== 32) {
      throw new Error('WEBHOOK_ENC_KEY_B64 must decode to 32 bytes (AES-256)');
    }

    this.key = raw;
  }

  generateWebhookKey(): string {
    return randomBytes(16).toString('hex'); // 32 chars hex
  }

  generateWebhookSecret(): string {
    return randomBytes(32).toString('hex');
  }

  encrypt(plain: string): EncryptedSecret {
    const iv = randomBytes(12); // GCM recommended
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);

    const encBuf = Buffer.concat([
      cipher.update(plain, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return {
      enc: encBuf.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
    };
  }

  decrypt(payload: EncryptedSecret): string {
    const iv = Buffer.from(payload.iv, 'base64');
    const tag = Buffer.from(payload.tag, 'base64');
    const enc = Buffer.from(payload.enc, 'base64');

    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);

    const plainBuf = Buffer.concat([decipher.update(enc), decipher.final()]);
    return plainBuf.toString('utf8');
  }
}

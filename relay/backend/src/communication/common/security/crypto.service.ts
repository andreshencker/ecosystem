import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export type EncryptedPayload = {
  alg: 'aes-256-gcm';
  ivBase64: string;
  tagBase64: string;
  dataBase64: string;
};

@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(private readonly config: ConfigService) {
    const b64 =
      this.config.get<string>('CREDENTIALS_MASTER_KEY_BASE64') ??
      process.env.CREDENTIALS_MASTER_KEY_BASE64 ??
      '';

    if (!b64) throw new Error('CREDENTIALS_MASTER_KEY_BASE64 is required');

    const key = Buffer.from(b64, 'base64');
    if (key.length !== 32) {
      throw new Error(
        'CREDENTIALS_MASTER_KEY_BASE64 must decode to 32 bytes (AES-256 key)',
      );
    }

    this.key = key;
  }

  encryptJson(obj: any): EncryptedPayload {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);

    const plaintext = Buffer.from(JSON.stringify(obj ?? {}), 'utf8');
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      alg: 'aes-256-gcm',
      ivBase64: iv.toString('base64'),
      tagBase64: tag.toString('base64'),
      dataBase64: encrypted.toString('base64'),
    };
  }

  decryptJson(payload: EncryptedPayload): any {
    if (!payload?.ivBase64 || !payload?.tagBase64 || !payload?.dataBase64) {
      throw new Error('Invalid encrypted payload');
    }

    const iv = Buffer.from(payload.ivBase64, 'base64');
    const tag = Buffer.from(payload.tagBase64, 'base64');
    const data = Buffer.from(payload.dataBase64, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  }

  // ✅ Aliases para tu service actual (evita cambiar mil líneas)
  encryptObject(obj: any): EncryptedPayload {
    return this.encryptJson(obj);
  }

  decryptObject(payload: EncryptedPayload): any {
    return this.decryptJson(payload);
  }
}

import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * AES-256-GCM con clave derivada de APP_ENC_KEY (hex o utf8).
 * Formato de salida: base64(url-safe) => iv:ciphertext:tag
 */
@Injectable()
export class EncryptionService {
  private readonly key: Buffer;
  private readonly ALG = 'aes-256-gcm'; // 32 bytes

  constructor() {
    const raw = process.env.APP_ENC_KEY || process.env.APP_ENC_KEY?.trim();
    if (!raw) {
      throw new Error('APP_ENC_KEY is required');
    }
    // Permite pasar la clave en hex (64 chars) o utf8 (se deriva a 32 bytes)
    this.key = /^[0-9a-fA-F]{64}$/.test(raw)
      ? Buffer.from(raw, 'hex')
      : crypto.createHash('sha256').update(raw, 'utf8').digest();
    if (this.key.length !== 32) {
      throw new Error('APP_ENC_KEY must result in 32 bytes key');
    }
  }

  /** Alias convenientes */
  encode(plain: string): string {
    return this.encrypt(plain);
  }

  decode(payload: string): string {
    return this.decrypt(payload);
  }

  /** Encripta un string -> string (base64 url-safe) */
  encrypt(plain: string): string {
    const iv = crypto.randomBytes(12); // 96-bit IV recomendado para GCM
    const cipher = crypto.createCipheriv(this.ALG, this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plain, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    // guardamos iv:ciphertext:tag (base64url) para simplicidad
    const b64 = (buf: Buffer) => buf.toString('base64url');
    return `${b64(iv)}:${b64(ciphertext)}:${b64(tag)}`;
  }

  /** Desencripta lo generado por encrypt */
  decrypt(payload: string): string {
    if (!payload || typeof payload !== 'string' || !payload.includes(':')) {
      throw new Error('Invalid encrypted payload');
    }
    const [ivB64, dataB64, tagB64] = payload.split(':');
    const iv = Buffer.from(ivB64, 'base64url');
    const data = Buffer.from(dataB64, 'base64url');
    const tag = Buffer.from(tagB64, 'base64url');

    const decipher = crypto.createDecipheriv(this.ALG, this.key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(data), decipher.final()]);
    return plain.toString('utf8');
  }
}

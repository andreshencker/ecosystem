import { Injectable } from '@nestjs/common';

type BuildKeyInput = {
  visibility: 'public' | 'private';
  domain: string;
  kind: string;
  entityId: string;
  ext: string; // "png"
  prefix?: string; // opcional
  folder?: string; // opcional
};

@Injectable()
export class MediaKeyService {
  buildKey(input: BuildKeyInput): string {
    const visibility = input.visibility; // NO lo “limpiamos” para evitar errores
    const domain = this.cleanPart(input.domain);
    const kind = this.cleanPart(input.kind);
    const entityId = this.cleanPart(input.entityId);
    const folder = input.folder ? this.cleanPart(input.folder) : '';
    const prefix = input.prefix ? this.cleanPart(input.prefix) : '';

    const parts = [
      visibility,
      prefix,
      domain,
      kind,
      folder,
      `${entityId}.${input.ext}`,
    ].filter(Boolean);
    return parts.join('/');
  }

  ensureSafeKey(key: string): string {
    const k = (key ?? '').trim();
    if (!k) throw new Error('Empty key');
    if (k.includes('..')) throw new Error('Invalid key path');
    return k.replace(/^\/+/, '');
  }

  private cleanPart(v: string): string {
    return (v ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9/_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^[-/]+|[-/]+$/g, '');
  }
}

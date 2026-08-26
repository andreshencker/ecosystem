import { Injectable } from '@nestjs/common';

@Injectable()
export class StorageKeyService {
  cleanFolder(folder?: string): string {
    return String(folder ?? '')
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '')
      .replace(/\/{2,}/g, '/');
  }

  cleanFileName(fileName?: string): string {
    return String(fileName ?? '')
      .trim()
      .replace(/[/\\]/g, '-')
      .replace(/\s+/g, ' ')
      .replace(/^\.+/, '');
  }

  getExtensionFromFileName(fileName?: string): string | undefined {
    const clean = this.cleanFileName(fileName);
    const idx = clean.lastIndexOf('.');

    if (idx <= 0 || idx === clean.length - 1) {
      return undefined;
    }

    return clean
      .slice(idx + 1)
      .toLowerCase()
      .trim();
  }

  extractFileNameFromKey(key: string): string {
    const safeKey = this.ensureSafeKey(key);
    const parts = safeKey.split('/');
    return parts[parts.length - 1] || '';
  }

  ensureSafeKey(key?: string): string {
    return String(key ?? '')
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/\/{2,}/g, '/');
  }

  buildKey(params: {
    visibility: 'public' | 'private';
    domain: string;
    folder?: string;
    fileName: string;
    prefix?: string;
  }): string {
    const parts = [
      params.prefix ? this.cleanFolder(params.prefix) : '',
      params.visibility,
      this.cleanFolder(params.domain),
      params.folder ? this.cleanFolder(params.folder) : '',
      this.cleanFileName(params.fileName),
    ].filter(Boolean);

    return parts.join('/');
  }
}

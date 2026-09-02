import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type { GrapiflyAppConfig } from './contracts/grapifly-app-config.contract';

export const RELAY_APP_CONFIG_FALLBACK: GrapiflyAppConfig = {
  contractVersion: 1,
  key: 'relay',
  name: 'Relay',
  description: 'Secure connections and automation across external services.',
  launchUrl: 'http://localhost:3000',
  theme: {
    icon: 'R',
    logoUrl: null,
    logoUrlDark: null,
    faviconUrl: null,
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif',
    light: { primaryColor: '#F4733D', primaryContrastText: '#FFFFFF', backgroundColor: '#F7F7F9', textColor: '#111116' },
    dark: { primaryColor: '#FF8A5B', primaryContrastText: '#FFFFFF', backgroundColor: '#17151F', textColor: '#F5F4FA' },
  },
};

@Injectable()
export class GrapiflyAppConfigService {
  private readonly logger = new Logger(GrapiflyAppConfigService.name);
  private cached: { value: GrapiflyAppConfig; expiresAt: number } | null = null;

  constructor(private readonly http: HttpService, private readonly config: ConfigService) {}

  async getConfig(): Promise<GrapiflyAppConfig> {
    if (this.cached && this.cached.expiresAt > Date.now()) return this.cached.value;
    const baseUrl = this.config.get<string>('GRAPIFLY_ID_API_URL') ?? 'http://localhost:3101';
    try {
      const response = await firstValueFrom(this.http.get<GrapiflyAppConfig>(
        `${baseUrl.replace(/\/$/, '')}/catalog/apps/relay/public-config`,
        { timeout: 3000 },
      ));
      const value = this.validate(response.data);
      this.cached = { value, expiresAt: Date.now() + this.cacheTtlMs() };
      return value;
    } catch (error) {
      this.logger.warn(`Using local Relay brand fallback: ${(error as Error).message}`);
      return this.cached?.value ?? RELAY_APP_CONFIG_FALLBACK;
    }
  }

  private validate(value: GrapiflyAppConfig): GrapiflyAppConfig {
    if (value?.contractVersion !== 1 || value.key !== 'relay' || !value.name?.trim() || !value.theme) {
      throw new Error('Invalid Grapifly app-config contract');
    }
    const colors = [value.theme.light, value.theme.dark].flatMap((palette) =>
      [palette?.primaryColor, palette?.backgroundColor, palette?.textColor],
    );
    if (colors.some((color) => !/^#[0-9a-f]{6}$/i.test(color ?? ''))) {
      throw new Error('Invalid Grapifly app-config colors');
    }
    return value;
  }

  private cacheTtlMs(): number {
    const seconds = Number(this.config.get<string>('GRAPIFLY_APP_CONFIG_CACHE_SECONDS') ?? 15);
    return (Number.isFinite(seconds) && seconds > 0 ? seconds : 15) * 1000;
  }
}

import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type { GrapiflyAppConfig } from './contracts/grapifly-app-config.contract';

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
        `${baseUrl.replace(/\/$/, '')}/catalog/apps/jtrade/public-config`,
        { timeout: 3000 },
      ));
      const value = this.validate(response.data);
      this.cached = { value, expiresAt: Date.now() + 15_000 };
      return value;
    } catch (error) {
      if (this.cached?.value) {
        this.logger.warn(`Grapifly app-config unavailable; using the last centrally loaded value: ${(error as Error).message}`);
        return this.cached.value;
      }
      this.logger.error(`Grapifly app-config unavailable: ${(error as Error).message}`);
      throw new ServiceUnavailableException('Application identity is unavailable from Grapifly');
    }
  }

  private validate(value: GrapiflyAppConfig): GrapiflyAppConfig {
    if (value?.contractVersion !== 1 || value.key !== 'jtrade' || !value.theme) {
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
}

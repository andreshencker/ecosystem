import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import FormData from 'form-data';
import { firstValueFrom } from 'rxjs';
import type {
  CreateRelayPlatformInput,
  RelayPlatform,
  UpdateRelayPlatformInput,
} from './contracts/relay-platform.contract';

const STORAGE_DOMAIN = 'platform-logos';

@Injectable()
export class RelayPlatformsService {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async list(active?: boolean): Promise<RelayPlatform[]> {
    const query = typeof active === 'boolean' ? `?active=${active}` : '';
    return this.request<RelayPlatform[]>('get', `${query}`);
  }

  async getById(id: string): Promise<RelayPlatform> {
    return this.request<RelayPlatform>('get', `/${encodeURIComponent(id)}`);
  }

  async create(dto: CreateRelayPlatformInput): Promise<RelayPlatform> {
    return this.request<RelayPlatform>('post', '', dto, true);
  }

  async update(id: string, dto: UpdateRelayPlatformInput): Promise<RelayPlatform> {
    return this.request<RelayPlatform>('patch', `/${encodeURIComponent(id)}`, dto, true);
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    return this.request<{ deleted: boolean }>('delete', `/${encodeURIComponent(id)}`, undefined, true);
  }

  async uploadLogo(file: Express.Multer.File): Promise<string> {
    const secret = this.requireApiKey();
    const companyId = this.requireCompanyId();
    const base = this.baseUrl();

    const form = new FormData();
    form.append('file', file.buffer, { filename: file.originalname, contentType: file.mimetype });
    form.append('companyId', companyId);
    form.append('domain', STORAGE_DOMAIN);

    try {
      const response = await firstValueFrom(
        this.http.post<{ url: string }>(`${base}/files/storage`, form, {
          headers: { ...form.getHeaders(), 'x-api-key': secret },
          timeout: 15000,
          maxBodyLength: Infinity,
        }),
      );
      return response.data.url;
    } catch (error: any) {
      throw this.toHttpError(error, 'Relay storage upload failed');
    }
  }

  private async request<T>(
    method: 'get' | 'post' | 'patch' | 'delete',
    subpath: string,
    data?: unknown,
    authenticated = false,
  ): Promise<T> {
    const base = this.baseUrl();
    const headers: Record<string, string> = {};
    if (authenticated) headers['x-api-key'] = this.requireApiKey();

    try {
      const response = await firstValueFrom(
        this.http.request<T>({
          method,
          url: `${base}/platforms${subpath}`,
          data,
          headers,
          timeout: 5000,
        }),
      );
      return response.data;
    } catch (error: any) {
      throw this.toHttpError(error, 'Relay platforms service is unavailable');
    }
  }

  private toHttpError(error: any, fallbackMessage: string) {
    const status = error?.response?.status;
    const message = error?.response?.data?.message;
    if (status && status < 500) return new BadRequestException(message ?? 'Relay rejected the request');
    return new ServiceUnavailableException(fallbackMessage);
  }

  private baseUrl(): string {
    return (this.config.get<string>('RELAY_API_URL') ?? 'http://localhost:3001').replace(/\/$/, '');
  }

  private requireApiKey(): string {
    const key = this.config.get<string>('RELAY_API_KEY');
    if (!key) throw new BadGatewayException('Relay integration is not configured');
    return key;
  }

  private requireCompanyId(): string {
    const companyId = this.config.get<string>('RELAY_GRAPIFLY_COMPANY_ID');
    if (!companyId) throw new BadGatewayException('Relay integration is not configured');
    return companyId;
  }
}

import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import FormData from 'form-data';
import { firstValueFrom } from 'rxjs';

const LOGO_DOMAIN = 'platform-logos';
const PRODUCT_MEDIA_DOMAIN = 'product-media';
const TYPE_PRODUCT_ICON_DOMAIN = 'type-product-icons';
const PRODUCT_VERSIONS_DOMAIN = 'product-versions';

export type RelayStorageFileInfo = {
  key: string;
  url: string;
  size: number;
  contentType: string;
  fileName: string;
};

export type RelayStorageDownload = {
  downloadUrl: string;
  fileName: string;
  expiresInSeconds: number;
};

/**
 * jtrade owns no S3/R2 credentials of its own — Relay does (via Grapifly's
 * Cloudflare provider). This is the only thing jtrade needs from Relay for
 * file storage: upload/replace/get-a-signed-download-url, always against
 * Grapifly's shared platform company + credentials.
 */
@Injectable()
export class RelayStorageService {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async uploadLogo(file: Express.Multer.File): Promise<string> {
    const form = new FormData();
    form.append('file', file.buffer, { filename: file.originalname, contentType: file.mimetype });
    form.append('companyId', this.requireCompanyId());
    form.append('domain', LOGO_DOMAIN);

    const response = await this.post<{ url: string }>(form);
    return response.url;
  }

  /** Official product-type icon (admin catalogue). Returns the public URL. */
  async uploadTypeProductIcon(file: Express.Multer.File): Promise<string> {
    const form = new FormData();
    form.append('file', file.buffer, { filename: file.originalname, contentType: file.mimetype });
    form.append('companyId', this.requireCompanyId());
    form.append('domain', TYPE_PRODUCT_ICON_DOMAIN);

    const response = await this.post<{ url: string }>(form);
    return response.url;
  }

  /** Commercial product media (logo / cover). Returns the public URL. */
  async uploadProductImage(file: Express.Multer.File, organizationId: string): Promise<string> {
    const form = new FormData();
    form.append('file', file.buffer, { filename: file.originalname, contentType: file.mimetype });
    form.append('companyId', this.requireCompanyId());
    form.append('domain', PRODUCT_MEDIA_DOMAIN);
    form.append('folder', organizationId);

    const response = await this.post<{ url: string }>(form);
    return response.url;
  }

  /** organizationId is the provider's own Grapifly organization id — files land under {organizationId}/{platformId}/. */
  async uploadProductVersionFile(
    file: Express.Multer.File,
    organizationId: string,
    platformId: string,
    fileName: string,
  ): Promise<RelayStorageFileInfo> {
    const form = new FormData();
    form.append('file', file.buffer, { filename: file.originalname, contentType: file.mimetype });
    form.append('companyId', this.requireCompanyId());
    form.append('domain', PRODUCT_VERSIONS_DOMAIN);
    form.append('folder', `${organizationId}/${platformId}`);
    form.append('fileName', fileName);

    return this.post<RelayStorageFileInfo>(form);
  }

  async replaceProductVersionFile(
    file: Express.Multer.File,
    existingKey: string,
    organizationId: string,
    platformId: string,
    fileName: string,
  ): Promise<RelayStorageFileInfo> {
    const form = new FormData();
    form.append('file', file.buffer, { filename: file.originalname, contentType: file.mimetype });
    form.append('companyId', this.requireCompanyId());
    form.append('key', existingKey);
    form.append('domain', PRODUCT_VERSIONS_DOMAIN);
    form.append('folder', `${organizationId}/${platformId}`);
    form.append('fileName', fileName);

    const secret = this.requireApiKey();
    const base = this.baseUrl();
    try {
      const response = await firstValueFrom(
        this.http.put<RelayStorageFileInfo>(`${base}/files/storage`, form, {
          headers: { ...form.getHeaders(), 'x-api-key': secret },
          timeout: 15000,
          maxBodyLength: Infinity,
        }),
      );
      return response.data;
    } catch (error: any) {
      throw this.toHttpError(error);
    }
  }

  async getProductVersionDownloadUrl(
    key: string,
    expiresInSeconds = 60,
    fileName?: string,
  ): Promise<RelayStorageDownload> {
    const secret = this.requireApiKey();
    const base = this.baseUrl();
    try {
      const response = await firstValueFrom(
        this.http.get<RelayStorageDownload>(`${base}/files/storage/download`, {
          params: { companyId: this.requireCompanyId(), key, expiresInSeconds, fileName },
          headers: { 'x-api-key': secret },
          timeout: 15000,
        }),
      );
      return response.data;
    } catch (error: any) {
      throw this.toHttpError(error);
    }
  }

  private async post<T>(form: FormData): Promise<T> {
    const secret = this.requireApiKey();
    const base = this.baseUrl();
    try {
      const response = await firstValueFrom(
        this.http.post<T>(`${base}/files/storage`, form, {
          headers: { ...form.getHeaders(), 'x-api-key': secret },
          timeout: 15000,
          maxBodyLength: Infinity,
        }),
      );
      return response.data;
    } catch (error: any) {
      throw this.toHttpError(error);
    }
  }

  private toHttpError(error: any) {
    const status = error?.response?.status;
    if (status && status < 500) return new BadGatewayException(error?.response?.data?.message ?? 'Relay rejected the request');
    return new ServiceUnavailableException('Relay storage request failed');
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

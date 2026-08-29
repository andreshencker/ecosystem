import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import FormData from 'form-data';
import { firstValueFrom } from 'rxjs';

const STORAGE_DOMAIN = 'platform-logos';

/**
 * jtrade owns no S3/R2 credentials of its own — Relay does (via Grapifly's
 * Cloudflare provider). This is the only thing jtrade needs from Relay for
 * platform logos: upload the file, get back a public URL.
 */
@Injectable()
export class RelayStorageService {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

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
      const status = error?.response?.status;
      if (status && status < 500) throw new BadGatewayException(error?.response?.data?.message ?? 'Relay rejected the upload');
      throw new ServiceUnavailableException('Relay storage upload failed');
    }
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

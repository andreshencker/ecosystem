import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import FormData from 'form-data';
import { firstValueFrom } from 'rxjs';
import { Organization, OrganizationDocument } from '../organizations/schemas/organization.schema';

interface MediaUploadResult {
  key: string;
  url: string;
  bucket: string;
  region: string;
  contentType: string;
  size: number;
}

/**
 * Grapifly's outbound leg for uploading media (application logos, etc.) to
 * Relay's files/media API — same x-grapifly-service-secret trust mechanism
 * RelayNotificationService already uses, so Relay resolves the right
 * companyId itself from the platform organization; Grapifly never needs to
 * know Relay's internal company id.
 */
@Injectable()
export class RelayMediaService {
  private readonly logger = new Logger(RelayMediaService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    @InjectModel(Organization.name)
    private readonly organizations: Model<OrganizationDocument>,
  ) {}

  async uploadApplicationLogo(
    file: Express.Multer.File,
    applicationKey: string,
  ): Promise<MediaUploadResult> {
    const baseUrl = this.config.get<string>('RELAY_API_URL') ?? 'http://localhost:3001';
    const serviceSecret =
      this.config.get<string>('RELAY_SERVICE_SECRET') ??
      this.config.get<string>('GRAPIFLY_SSO_CLIENT_SECRET');

    if (!serviceSecret) {
      throw new InternalServerErrorException('RELAY_SERVICE_SECRET is not configured');
    }

    const platformOrg = await this.organizations
      .findOne({ isPlatform: true, status: 'active' })
      .lean();
    if (!platformOrg) {
      throw new InternalServerErrorException('Platform organization is unavailable');
    }

    const form = new FormData();
    form.append('domain', 'grapifly');
    form.append('kind', 'application-logo');
    form.append('entityId', applicationKey);
    form.append('folder', 'branding');
    form.append('public', 'true');
    form.append('file', file.buffer, { filename: file.originalname, contentType: file.mimetype });

    try {
      const response = await firstValueFrom(
        this.http.post<MediaUploadResult>(
          `${baseUrl.replace(/\/$/, '')}/files/media`,
          form,
          {
            timeout: 15000,
            headers: {
              ...form.getHeaders(),
              'x-grapifly-service-secret': serviceSecret,
              'x-grapifly-organization-id': platformOrg.organizationId,
              'x-grapifly-organization-name': platformOrg.name,
            },
          },
        ),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `[uploadApplicationLogo] applicationKey=${applicationKey} failed — ${error?.response?.status ?? error?.message ?? 'unknown error'}`,
      );
      throw new InternalServerErrorException(
        error?.response?.data?.message ?? 'Failed to upload logo to Relay',
      );
    }
  }
}

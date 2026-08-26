import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
// form-data is CommonJS-only and this project doesn't have esModuleInterop
// enabled — a default import compiles to a broken `.default` reference here.
import FormData = require('form-data');
import { firstValueFrom } from 'rxjs';
import { Organization, OrganizationDocument } from '../organizations/schemas/organization.schema';

interface StorageUploadResult {
  key: string;
  url: string;
  bucket: string;
  region: string;
  contentType: string;
  size: number;
  fileName: string;
}

const MIME_EXTENSIONS: Record<string, string> = {
  'image/svg+xml': 'svg',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/x-icon': 'ico',
};

/**
 * Grapifly's outbound leg for uploading files to Relay's files/storage API —
 * same x-grapifly-service-secret trust mechanism RelayNotificationService
 * already uses, so Relay resolves the right companyId itself from the
 * platform organization; Grapifly never needs to know Relay's internal
 * company id or storage credentials.
 */
@Injectable()
export class RelayStorageService {
  private readonly logger = new Logger(RelayStorageService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    @InjectModel(Organization.name)
    private readonly organizations: Model<OrganizationDocument>,
  ) {}

  /**
   * Uploads into the "logos" storage domain — a real StorageDomainCatalogue
   * entry (tied to a specific credential/bucket), not a free-text field —
   * so the result shows up in Relay's Files (Storage) browser too, not just
   * as an opaque theme.logoUrl value.
   */
  async uploadApplicationLogo(
    file: Express.Multer.File,
    applicationKey: string,
  ): Promise<StorageUploadResult> {
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

    const ext = this.extensionFor(file);
    const fileName = `${applicationKey}${ext ? `.${ext}` : ''}`;

    const form = new FormData();
    // Relay's DTO requires a syntactically valid companyId, but GlobalAuthGuard
    // always overrides it with the company resolved from the service secret +
    // x-grapifly-organization-id header — this value is never actually used.
    form.append('companyId', '000000000000000000000000');
    form.append('domain', 'logos');
    form.append('fileName', fileName);
    form.append('isPublic', 'true');
    form.append('file', file.buffer, { filename: fileName, contentType: file.mimetype });

    try {
      const response = await firstValueFrom(
        this.http.post<StorageUploadResult>(
          `${baseUrl.replace(/\/$/, '')}/files/storage`,
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

  private extensionFor(file: Express.Multer.File): string | undefined {
    const fromName = file.originalname?.split('.').pop()?.toLowerCase();
    if (fromName && fromName !== file.originalname?.toLowerCase()) return fromName;
    return MIME_EXTENSIONS[file.mimetype];
  }
}

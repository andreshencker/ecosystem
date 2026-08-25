import { HttpService } from '@nestjs/axios';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { EcosystemIdentityService } from '../identity/ecosystem-identity.service';
import { Company, CompanyDocument } from '../../communication/company/company-info/schemas/company.schema';

interface GrapiflyValidateResponse {
  organizationId: string;
  organizationName: string;
  tokenId: string;
}

/**
 * Replaces the old CompanyIntegrationsService — Relay no longer issues or
 * stores its own external-communication tokens. Grapifly is the sole
 * source of truth: every token presented by an external caller (e.g.
 * Business App) is validated live against Grapifly's catalogue, and the
 * resolved Grapifly organization is mapped to Relay's local Company.
 */
@Injectable()
export class CommunicationTokenValidatorService {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly identity: EcosystemIdentityService,
    @InjectModel(Company.name) private readonly companyModel: Model<CompanyDocument>,
  ) {}

  /** Same return shape as the old CompanyIntegrationsService.resolveCompanyByToken — callers are unchanged. */
  async resolveCompanyByToken(rawToken: string): Promise<{
    companyId: string;
    companyKey: string;
    companyName: string;
  }> {
    const baseUrl = this.config.get<string>('GRAPIFLY_ID_API_URL') ?? 'http://localhost:3101';
    let validated: GrapiflyValidateResponse;
    try {
      const response = await firstValueFrom(
        this.http.post<GrapiflyValidateResponse>(
          `${baseUrl.replace(/\/$/, '')}/internal/communication-tokens/validate`,
          { token: rawToken },
          { timeout: 5000 },
        ),
      );
      validated = response.data;
    } catch {
      throw new UnauthorizedException('Invalid or expired integration token');
    }

    const company = await this.identity.resolveGrapiflyCompanyByOrganization({
      organizationId: validated.organizationId,
      name: validated.organizationName,
    });

    return {
      companyId: String(company._id),
      companyKey: company.companyKey,
      companyName: company.displayName,
    };
  }

  /** Unrelated to tokens — relocated from CompanyIntegrationsService, used by GlobalAuthGuard's RELAY_API_KEY admin branch. */
  async resolvePlatformCompany(): Promise<{
    companyId: string;
    companyKey: string;
    companyName: string;
    isPlatformCompany: true;
  } | null> {
    const company = (await this.companyModel
      .findOne({ isPlatformCompany: true })
      .select('_id companyKey displayName')
      .lean()) as any;
    if (!company) return null;
    return {
      companyId: String(company._id),
      companyKey: company.companyKey ?? '',
      companyName: company.displayName ?? '',
      isPlatformCompany: true,
    };
  }
}

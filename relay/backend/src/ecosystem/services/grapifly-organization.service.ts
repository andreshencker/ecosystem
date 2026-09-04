import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
import { EcosystemIdentityService } from '../identity/ecosystem-identity.service';
import type { GrapiflyOrganizationContract } from '../contracts/grapifly-ecosystem.contract';

interface OrganizationResponse {
  contractVersion: 2;
  organization: GrapiflyOrganizationContract;
}

export interface GrapiflyEnabledApplication {
  key: string;
  name: string;
  description: string;
  launchUrl: string;
  theme: {
    icon: string;
    logoUrl: string | null;
    light: { primaryColor: string; primaryContrastText: string; backgroundColor: string; textColor: string };
    dark: { primaryColor: string; primaryContrastText: string; backgroundColor: string; textColor: string };
  };
  tier: 'trial' | 'free' | 'paid';
}

interface EnabledAppsResponse {
  contractVersion: 2;
  applications: GrapiflyEnabledApplication[];
  total: number;
}

@Injectable()
export class GrapiflyOrganizationService {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly identity: EcosystemIdentityService,
  ) {}

  async get(ctx: AuthContext) {
    const response = await this.request(ctx, 'get');
    return this.toRelayCompany(response.organization);
  }

  async update(ctx: AuthContext, input: Record<string, unknown>) {
    const response = await this.request(ctx, 'patch', this.toGrapiflyUpdate(input));
    return this.toRelayCompany(response.organization);
  }

  /** Powers Relay's own "switch apps" (Google-waffle-style) menu — apps enabled for the active organization. */
  async listEnabledApps(ctx: AuthContext): Promise<GrapiflyEnabledApplication[]> {
    const response = await this.request<EnabledAppsResponse>(ctx, 'get', undefined, '/enabled-apps');
    return response.applications;
  }

  private async request<T extends { contractVersion: 2 } = OrganizationResponse>(
    ctx: AuthContext,
    method: 'get' | 'patch',
    data?: Record<string, unknown>,
    subpath = '',
  ): Promise<T> {
    const actor = await this.identity.findByIdOrThrow(ctx.userId!);
    if (!actor.grapiflyUserId || !ctx.grapiflyOrganizationId) {
      throw new UnauthorizedException('An active Grapifly organization session is required');
    }
    // Relay's own service-to-service secret, falling back to the legacy shared
    // SSO secret for deployments that haven't set RELAY_SERVICE_SECRET yet —
    // must match whichever value Grapifly hashed for the 'relay' app entry
    // (grapifly/backend/src/applications/applications.service.ts).
    const secret =
      this.config.get<string>('RELAY_SERVICE_SECRET') ??
      this.config.get<string>('GRAPIFLY_SSO_CLIENT_SECRET');
    if (!secret) throw new BadGatewayException('Grapifly integration is not configured');
    const base = (this.config.get<string>('GRAPIFLY_ID_API_URL') ?? 'http://localhost:3101').replace(/\/$/, '');
    try {
      const response = await firstValueFrom(this.http.request<T>({
        method,
        url: `${base}/internal/apps/relay/organizations/${encodeURIComponent(ctx.grapiflyOrganizationId)}${subpath}`,
        data,
        headers: {
          'x-ecosystem-app': 'relay',
          'x-ecosystem-secret': secret,
          'x-ecosystem-actor': actor.grapiflyUserId,
        },
        timeout: 5000,
      }));
      if (response.data.contractVersion !== 2) throw new BadGatewayException('Unsupported Grapifly organization contract');
      return response.data;
    } catch (error: any) {
      if (error instanceof BadGatewayException) throw error;
      const status = error?.response?.status;
      const message = error?.response?.data?.message;
      if (status && status < 500) throw new BadRequestException(message ?? 'Grapifly rejected the organization request');
      throw new BadGatewayException('Grapifly organization service is unavailable');
    }
  }

  private toGrapiflyUpdate(input: Record<string, unknown>) {
    const fieldMap: Record<string, string> = { displayName: 'name', companyEmail: 'officialEmail', webBaseUrl: 'websiteUrl' };
    return Object.fromEntries(Object.entries(input).map(([key, value]) => [fieldMap[key] ?? key, value]));
  }

  private toRelayCompany(organization: GrapiflyOrganizationContract) {
    return {
      id: organization.organizationId,
      grapiflyOrganizationId: organization.organizationId,
      companyKey: organization.slug,
      displayName: organization.name,
      legalName: organization.legalName,
      tagline: organization.tagline,
      timezone: organization.timezone,
      companyEmail: organization.officialEmail,
      supportEmail: organization.supportEmail,
      supportPhone: organization.supportPhone,
      supportHours: organization.supportHours,
      addressLine1: organization.addressLine1,
      addressLine2: organization.addressLine2,
      addressCity: organization.addressCity,
      addressState: organization.addressState,
      addressPostalCode: organization.addressPostalCode,
      addressCountry: organization.addressCountry,
      webBaseUrl: organization.websiteUrl,
      apiBaseUrl: organization.apiBaseUrl,
      helpCenterUrl: organization.helpCenterUrl,
      privacyPolicyUrl: organization.privacyPolicyUrl,
      termsUrl: organization.termsUrl,
      unsubscribeUrl: organization.unsubscribeUrl,
      facebook: organization.facebook,
      instagram: organization.instagram,
      linkedin: organization.linkedin,
      x: organization.x,
      youtube: organization.youtube,
      tiktok: organization.tiktok,
      whatsapp: organization.whatsapp,
      telegram: organization.telegram,
      copyrightText: organization.copyrightText,
      disclaimerShort: organization.disclaimerShort,
      disclaimerLong: organization.disclaimerLong,
      logoIconUrl: organization.logoIconUrl,
      logoFullUrl: organization.logoFullUrl,
      bankAccountHolder: organization.bankAccountHolder,
      bankName: organization.bankName,
      bankAccountNumber: organization.bankAccountNumber,
      bankSwiftBic: organization.bankSwiftBic,
      bankCountry: organization.bankCountry,
      usdtWalletAddress: organization.usdtWalletAddress,
      usdtNetwork: organization.usdtNetwork,
      isActive: organization.status === 'active',
    };
  }
}

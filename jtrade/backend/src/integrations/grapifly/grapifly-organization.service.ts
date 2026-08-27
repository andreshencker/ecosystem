import { HttpService } from '@nestjs/axios';
import { BadGatewayException, BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface GrapiflyOrganizationSummary {
  organizationId: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'archived';
  membership?: { role: 'owner' | 'admin' | 'member' };
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

/**
 * jtrade's own leg of the same server-to-server pattern Relay already uses
 * (relay/backend/src/ecosystem/services/grapifly-organization.service.ts) —
 * jtrade has no local Organization collection, so this is the only source
 * of organization display data and of the ecosystem app-switcher list.
 */
@Injectable()
export class GrapiflyOrganizationService {
  constructor(private readonly http: HttpService, private readonly config: ConfigService) {}

  async listOrganizations(grapiflyUserId: string): Promise<GrapiflyOrganizationSummary[]> {
    const response = await this.request<{ contractVersion: 2; organizations: GrapiflyOrganizationSummary[] }>(
      grapiflyUserId,
      '',
    );
    return response.organizations;
  }

  async listEnabledApps(organizationId: string, grapiflyUserId: string): Promise<GrapiflyEnabledApplication[]> {
    const response = await this.request<{ contractVersion: 2; applications: GrapiflyEnabledApplication[] }>(
      grapiflyUserId,
      `/${encodeURIComponent(organizationId)}/enabled-apps`,
    );
    return response.applications;
  }

  private async request<T extends { contractVersion: 2 }>(grapiflyUserId: string, subpath: string): Promise<T> {
    const secret = this.config.get<string>('JTRADE_SERVICE_SECRET');
    if (!secret) throw new BadGatewayException('Grapifly integration is not configured');
    const base = (this.config.get<string>('GRAPIFLY_ID_API_URL') ?? 'http://localhost:3101').replace(/\/$/, '');
    try {
      const response = await firstValueFrom(this.http.get<T>(
        `${base}/internal/apps/jtrade/organizations${subpath}`,
        {
          headers: { 'x-grapifly-sso-secret': secret, 'x-grapifly-user-id': grapiflyUserId },
          timeout: 5000,
        },
      ));
      if (response.data.contractVersion !== 2) throw new BadGatewayException('Unsupported Grapifly organization contract');
      return response.data;
    } catch (error: any) {
      if (error instanceof BadGatewayException) throw error;
      const status = error?.response?.status;
      const message = error?.response?.data?.message;
      if (status && status < 500) throw new BadRequestException(message ?? 'Grapifly rejected the organization request');
      throw new ServiceUnavailableException('Grapifly organization service is unavailable');
    }
  }
}

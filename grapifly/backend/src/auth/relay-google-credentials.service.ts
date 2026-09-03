import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';

import { Organization, OrganizationDocument } from '../organizations/schemas/organization.schema';

export interface GoogleClientCredentials {
  clientId: string;
  clientSecret: string;
}

/**
 * Sources Grapifly's "Sign in with Google" credentials from Relay's OAuth
 * application store (the platform company's `google` registration) instead of
 * duplicating them into Grapifly's own env. Same `x-grapifly-service-secret`
 * trust the other outbound Relay calls (notifications, storage) already use.
 *
 * Resolved once at startup by the GoogleStrategy factory and cached; falls
 * back to the env values (or nothing) when Relay has no registration or is
 * unreachable, so local dev and degraded mode still work.
 */
@Injectable()
export class RelayGoogleCredentialsService {
  private readonly logger = new Logger(RelayGoogleCredentialsService.name);
  private cache: { value: GoogleClientCredentials | null; at: number } | null = null;
  private readonly ttlMs = 10 * 60 * 1000;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    @InjectModel(Organization.name)
    private readonly organizations: Model<OrganizationDocument>,
  ) {}

  async getGoogleClient(): Promise<GoogleClientCredentials | null> {
    if (this.cache && Date.now() - this.cache.at < this.ttlMs) {
      return this.cache.value;
    }
    const value = await this.fetch();
    this.cache = { value, at: Date.now() };
    return value;
  }

  private async fetch(): Promise<GoogleClientCredentials | null> {
    const baseUrl = this.config.get<string>('RELAY_API_URL') ?? 'http://localhost:3001';
    const serviceSecret =
      this.config.get<string>('RELAY_SERVICE_SECRET') ??
      this.config.get<string>('GRAPIFLY_SSO_CLIENT_SECRET');
    if (!serviceSecret) {
      this.logger.warn('[fetch] no RELAY_SERVICE_SECRET — using env Google credentials');
      return null;
    }

    const platformOrg = await this.organizations
      .findOne({ isPlatform: true, status: 'active' })
      .lean();
    if (!platformOrg) {
      this.logger.warn('[fetch] platform organization unavailable — using env Google credentials');
      return null;
    }

    try {
      const res = await firstValueFrom(
        this.http.get<GoogleClientCredentials>(
          `${baseUrl.replace(/\/$/, '')}/oauth-applications/platform/google/credentials`,
          {
            timeout: 5000,
            headers: {
              'x-grapifly-service-secret': serviceSecret,
              'x-grapifly-organization-id': (platformOrg as any).organizationId,
              'x-grapifly-organization-name': (platformOrg as any).name,
            },
          },
        ),
      );
      if (res.data?.clientId && res.data?.clientSecret) {
        this.logger.log('[fetch] Google login credentials loaded from Relay');
        return { clientId: res.data.clientId, clientSecret: res.data.clientSecret };
      }
      this.logger.warn('[fetch] Relay response missing clientId/clientSecret — using env');
      return null;
    } catch (error: any) {
      const reason = error?.response?.status ?? error?.message ?? 'error';
      this.logger.warn(
        `[fetch] could not load Google credentials from Relay (${reason}) — using env`,
      );
      return null;
    }
  }
}

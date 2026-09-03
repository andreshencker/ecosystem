import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

/**
 * The only thing jtrade uses to talk to Relay's payment window.
 *
 * Auth is the shared internal key (same as file storage). With it Relay
 * resolves the ecosystem's platform company automatically, so jtrade never
 * sends a companyId and never sees any credential. Relay does the Stripe /
 * CoinGate plumbing; jtrade passes references and reads back state.
 */
@Injectable()
export class RelayPaymentsClient {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  // ─── catalogue / discovery ────────────────────────────────────────────────

  /** Payment providers Relay supports (the method catalogue). */
  listProviders(): Promise<RelayProvider[]> {
    return this.get<{ data?: RelayProvider[] } | RelayProvider[]>(
      '/payments/providers',
    ).then((r) => (Array.isArray(r) ? r : (r.data ?? [])));
  }

  /** The platform company's configured payment connections. */
  listConnections(): Promise<RelayConnection[]> {
    return this.get<{ data?: RelayConnection[] } | RelayConnection[]>(
      '/payments/accounts',
    ).then((r) => (Array.isArray(r) ? r : (r.data ?? [])));
  }

  // ─── connect: accounts ───────────────────────────────────────────────────

  createConnectedAccount(
    body: CreateConnectedAccountBody,
  ): Promise<RelayConnectedAccount> {
    return this.post<RelayConnectedAccount>('/payments/connect/accounts', body);
  }

  refreshConnectedAccount(
    relayAccountId: string,
  ): Promise<RelayConnectedAccount> {
    return this.post<RelayConnectedAccount>(
      `/payments/connect/accounts/${relayAccountId}/refresh`,
      {},
    );
  }

  createOnboardingLink(
    relayAccountId: string,
    body: { refreshUrl: string; returnUrl: string },
  ): Promise<RelayOnboardingLink> {
    return this.post<RelayOnboardingLink>(
      `/payments/connect/accounts/${relayAccountId}/onboarding`,
      body,
    );
  }

  // ─── transport ───────────────────────────────────────────────────────────

  private async get<T>(path: string): Promise<T> {
    try {
      const res = await firstValueFrom(
        this.http.get(`${this.baseUrl()}${path}`, {
          headers: { 'x-api-key': this.apiKey() },
          timeout: 15000,
        }),
      );
      return this.unwrap<T>(res.data);
    } catch (error) {
      throw this.toHttpError(error);
    }
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    try {
      const res = await firstValueFrom(
        this.http.post(`${this.baseUrl()}${path}`, body, {
          headers: { 'x-api-key': this.apiKey() },
          timeout: 15000,
        }),
      );
      return this.unwrap<T>(res.data);
    } catch (error) {
      throw this.toHttpError(error);
    }
  }

  /** Relay wraps responses as `{ status, data }` — unwrap when present. */
  private unwrap<T>(payload: unknown): T {
    if (
      payload &&
      typeof payload === 'object' &&
      'data' in (payload as Record<string, unknown>) &&
      'status' in (payload as Record<string, unknown>)
    ) {
      return (payload as { data: T }).data;
    }
    return payload as T;
  }

  private baseUrl(): string {
    return (
      this.config.get<string>('RELAY_API_URL') ?? 'http://localhost:3001'
    ).replace(/\/$/, '');
  }

  private apiKey(): string {
    const key = this.config.get<string>('RELAY_API_KEY');
    if (!key) throw new BadGatewayException('Relay integration is not configured');
    return key;
  }

  private toHttpError(error: any) {
    const status = error?.response?.status;
    const message =
      error?.response?.data?.message ?? 'Relay rejected the payment request';
    if (status && status < 500) return new BadGatewayException(message);
    return new ServiceUnavailableException('Relay payment request failed');
  }
}

// ─── Relay response shapes (only the fields jtrade reads) ───────────────────

export interface RelayProvider {
  providerKey: string;
  displayName: string;
  description?: string;
  connectionType?: string;
}

export interface RelayConnection {
  id: string;
  providerKey: string;
  isActive: boolean;
  environment: 'test' | 'live' | null;
  tag?: string;
}

export interface CreateConnectedAccountBody {
  connectionId: string;
  connectedOrganizationId: string;
  country?: string;
  email?: string;
  businessName?: string;
}

export interface RelayConnectedAccount {
  id: string;
  connectionId: string;
  connectedOrganizationId: string;
  providerKey: string;
  providerAccountId: string;
  environment: 'test' | 'live';
  status: 'pending' | 'enabled' | 'restricted' | 'disabled';
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  country: string | null;
  defaultCurrency: string | null;
  requirementsCurrentlyDue: string[];
  requirementsEventuallyDue: string[];
  disabledReason: string | null;
}

export interface RelayOnboardingLink {
  url: string;
  expiresAt: string;
}

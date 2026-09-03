import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RelayPaymentsClient, type RelayProvider } from './relay-payments.client';

const CACHE_MS = 5 * 60 * 1000;

/**
 * jtrade never hard-codes the list of payment methods — it reads the catalogue
 * from Relay. This service also resolves which Relay connection backs each
 * method (the ecosystem's credentials).
 */
@Injectable()
export class PaymentsCatalogService {
  private readonly log = new Logger(PaymentsCatalogService.name);
  private providersCache: { at: number; value: RelayProvider[] } | null = null;
  private connectionCache = new Map<string, { at: number; id: string }>();

  constructor(
    private readonly relay: RelayPaymentsClient,
    private readonly config: ConfigService,
  ) {}

  /** Every payment method Relay supports. */
  async listMethods(): Promise<RelayProvider[]> {
    if (this.providersCache && Date.now() - this.providersCache.at < CACHE_MS) {
      return this.providersCache.value;
    }
    const value = await this.relay.listProviders();
    this.providersCache = { at: Date.now(), value };
    return value;
  }

  /** true when Relay advertises this method. */
  async isSupported(method: string): Promise<boolean> {
    const methods = await this.listMethods();
    return methods.some((m) => m.providerKey === method);
  }

  /**
   * The Relay payment connection id that backs `method` for the ecosystem.
   * Prefers an explicit env override, otherwise discovers the active
   * connection of that provider on the platform company.
   */
  async resolveConnectionId(method: string): Promise<string> {
    const override = this.config.get<string>(
      `RELAY_${method.toUpperCase()}_CONNECTION_ID`,
    );
    if (override) return override;

    const cached = this.connectionCache.get(method);
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.id;

    const connections = await this.relay.listConnections();
    const match = connections.find(
      (c) => c.providerKey === method && c.isActive,
    );
    if (!match) {
      this.log.error(
        `No active Relay connection for "${method}" on the platform company`,
      );
      throw new NotFoundException(
        `Payments are not configured for "${method}" in the ecosystem`,
      );
    }
    this.connectionCache.set(method, { at: Date.now(), id: match.id });
    return match.id;
  }
}

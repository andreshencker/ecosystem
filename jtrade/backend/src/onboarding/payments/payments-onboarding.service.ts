import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';

import {
  ProviderPayment,
  ProviderPaymentDocument,
} from './schemas/provider-payment.schema';
import type { MethodOnboarding } from './contracts/method-onboarding.contract';
import type { StartMethodDto } from './dto/payments-onboarding.dto';
import { PaymentsCatalogService } from './payments-catalog.service';
import type { RelayProvider } from './relay-payments.client';
import { StripeOnboardingService } from './stripe/stripe-onboarding.service';

/** Stripe is the mandatory base method for every jtrade provider. */
const BASE_METHOD = 'stripe';

/**
 * The orchestrator. It does not know what Stripe or CoinGate are — it reads
 * `provider_payments`, routes to the right method folder, and persists the
 * result. It also owns jtrade's rules around the methods (Stripe first, then
 * the rest). It never decides whether a provider can sell — that belongs to
 * whoever combines this with the provider/product onboardings.
 */
@Injectable()
export class PaymentsOnboardingService {
  private readonly log = new Logger(PaymentsOnboardingService.name);
  private readonly methods = new Map<string, MethodOnboarding>();

  constructor(
    @InjectModel(ProviderPayment.name)
    private readonly model: Model<ProviderPaymentDocument>,
    private readonly catalog: PaymentsCatalogService,
    private readonly config: ConfigService,
    stripe: StripeOnboardingService,
  ) {
    this.register(stripe);
  }

  private register(method: MethodOnboarding) {
    this.methods.set(method.method, method);
  }

  // ─── read ────────────────────────────────────────────────────────────────

  /** Everything the provider's "Payouts" screen needs. */
  async getStatus(providerOrganizationId: string) {
    const rows = await this.model
      .find({ providerOrganizationId })
      .sort({ isBase: -1, createdAt: 1 })
      .lean();

    const base = rows.find((r) => r.method === BASE_METHOD);
    const baseComplete = base?.status === 'complete';

    const configured = new Set(rows.map((r) => r.method));
    const catalogue: RelayProvider[] = await this.catalog
      .listMethods()
      .catch(() => [] as RelayProvider[]);

    return {
      baseMethod: BASE_METHOD,
      baseStatus: base?.status ?? null,
      baseComplete,
      /** other methods can only be added once the base is complete */
      canAddMore: baseComplete,
      methods: rows.map((r) => this.toDto(r)),
      availableToAdd: baseComplete
        ? catalogue
            .filter((m) => !configured.has(m.providerKey))
            .map((m) => ({
              method: m.providerKey,
              displayName: m.displayName,
              description: m.description ?? '',
            }))
        : [],
    };
  }

  // ─── write ───────────────────────────────────────────────────────────────

  /**
   * "Configure this method" — the button the provider presses. Starts a fresh
   * flow, or resumes an unfinished one, and returns the URL to send them to.
   */
  async startMethod(
    providerOrganizationId: string,
    method: string,
    dto: StartMethodDto,
  ): Promise<{ onboardingUrl: string; status: string; resumed: boolean }> {
    const onboarding = this.methods.get(method);
    if (!onboarding) throw new NotFoundException(`Unknown method "${method}"`);

    if (method !== BASE_METHOD) {
      const base = await this.model
        .findOne({ providerOrganizationId, method: BASE_METHOD })
        .lean();
      if (base?.status !== 'complete') {
        throw new ConflictException(
          'Configure Stripe before adding another payment method',
        );
      }
    }

    const existing = await this.model.findOne({
      providerOrganizationId,
      method,
    });

    if (existing?.status === 'complete') {
      throw new ConflictException(`"${method}" is already configured`);
    }

    let relayAccountId: string;
    let resumed: boolean;

    if (existing) {
      relayAccountId = existing.relayAccountId;
      resumed = true;
    } else {
      const started = await onboarding.start({
        providerOrganizationId,
        country: dto.country,
        email: dto.email,
        businessName: dto.businessName,
      });
      await this.model.create({
        providerOrganizationId,
        method,
        relayConnectionId: started.relayConnectionId,
        relayAccountId: started.relayAccountId,
        providerAccountId: started.providerAccountId,
        status: started.state.status,
        requirementsDue: started.state.requirementsDue,
        disabledReason: started.state.disabledReason,
        isBase: method === BASE_METHOD,
        lastCheckedAt: new Date(),
      });
      relayAccountId = started.relayAccountId;
      resumed = false;
    }

    const link = await onboarding.configurationLink(
      relayAccountId,
      this.buildUrls(method),
    );

    const row = await this.model
      .findOne({ providerOrganizationId, method })
      .lean();
    return {
      onboardingUrl: link.url,
      status: row?.status ?? 'pending',
      resumed,
    };
  }

  /** Ask Relay for the latest state and update the row. */
  async refreshMethod(providerOrganizationId: string, method: string) {
    const onboarding = this.methods.get(method);
    if (!onboarding) throw new NotFoundException(`Unknown method "${method}"`);

    const row = await this.model.findOne({ providerOrganizationId, method });
    if (!row) throw new NotFoundException(`"${method}" onboarding not started`);

    const state = await onboarding.refreshState(row.relayAccountId);
    row.status = state.status;
    row.providerAccountId = state.providerAccountId;
    row.requirementsDue = state.requirementsDue;
    row.disabledReason = state.disabledReason;
    row.lastCheckedAt = new Date();
    await row.save();

    this.log.log(
      `[refresh] org=${providerOrganizationId} method=${method} -> ${state.status}`,
    );
    return this.toDto(row.toObject());
  }

  // ─── helpers ─────────────────────────────────────────────────────────────

  private buildUrls(method: string) {
    const base = (
      this.config.get<string>('FRONTEND_BASE_URL') ?? 'http://localhost:5173'
    ).replace(/\/$/, '');
    return {
      returnUrl: `${base}/provider/payouts?method=${method}&from=return`,
      refreshUrl: `${base}/provider/payouts?method=${method}&from=refresh`,
    };
  }

  private toDto(row: ProviderPayment) {
    return {
      method: row.method,
      status: row.status,
      isBase: row.isBase,
      providerAccountId: row.providerAccountId ?? null,
      requirementsDue: row.requirementsDue ?? [],
      disabledReason: row.disabledReason ?? null,
      lastCheckedAt: row.lastCheckedAt ?? null,
    };
  }
}

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
import {
  PaymentMethodConfig,
  PaymentMethodConfigDocument,
} from './config/schemas/payment-method-config.schema';
import type { MethodOnboarding } from './contracts/method-onboarding.contract';
import type { MethodConfigurable } from './contracts/method-settings.contract';
import type { StartMethodDto } from './dto/payments-onboarding.dto';
import { StripeConnectOnboardingService } from './stripe-connect/stripe-connect-onboarding.service';

/** Used only when the admin hasn't configured anything yet. */
const FALLBACK_REQUIRED_METHOD = 'stripe-connect';

/**
 * The orchestrator. Reads the admin's payment config + `provider_payments`,
 * routes to the right method folder, persists the result. It owns jtrade's
 * rules (which method is required, which are offered). It never decides
 * whether a provider can sell.
 */
@Injectable()
export class PaymentsOnboardingService {
  private readonly log = new Logger(PaymentsOnboardingService.name);
  private readonly methods = new Map<string, MethodOnboarding>();
  private readonly configurable = new Map<string, MethodConfigurable>();

  constructor(
    @InjectModel(ProviderPayment.name)
    private readonly model: Model<ProviderPaymentDocument>,
    @InjectModel(PaymentMethodConfig.name)
    private readonly configModel: Model<PaymentMethodConfigDocument>,
    private readonly config: ConfigService,
    stripe: StripeConnectOnboardingService,
  ) {
    this.methods.set(stripe.method, stripe);
    this.configurable.set(stripe.method, stripe);
  }

  // ─── admin config lookup ─────────────────────────────────────────────────

  private async enabledMethods() {
    return this.configModel
      .find({ enabled: true })
      .sort({ displayOrder: 1, method: 1 })
      .lean();
  }

  private async requiredMethod(): Promise<string> {
    const req = await this.configModel
      .findOne({ enabled: true, isRequired: true })
      .lean();
    return req?.method ?? FALLBACK_REQUIRED_METHOD;
  }

  private async methodConfig(method: string) {
    return this.configModel.findOne({ method }).lean();
  }

  // ─── read ────────────────────────────────────────────────────────────────

  async getStatus(providerOrganizationId: string) {
    const [rows, enabled, requiredMethod] = await Promise.all([
      this.model
        .find({ providerOrganizationId })
        .sort({ isBase: -1, createdAt: 1 })
        .lean(),
      this.enabledMethods(),
      this.requiredMethod(),
    ]);

    const base = rows.find((r) => r.method === requiredMethod);
    const baseComplete = base?.status === 'complete';
    const configured = new Set(rows.map((r) => r.method));

    const baseCfg = enabled.find((c) => c.method === requiredMethod);
    // Required method not offered / not configured by the admin yet.
    const configReady = !!baseCfg && this.settingsUsable(requiredMethod, baseCfg.settings);

    return {
      baseMethod: requiredMethod,
      baseStatus: base?.status ?? null,
      baseComplete,
      configReady,
      canAddMore: baseComplete,
      methods: rows.map((r) => this.toDto(r)),
      requiredCountryChoice: this.countryChoice(requiredMethod, baseCfg?.settings),
      availableToAdd: baseComplete
        ? enabled
            .filter((c) => c.method !== requiredMethod && !configured.has(c.method))
            .map((c) => ({
              method: c.method,
              displayName: c.displayName || c.method,
            }))
        : [],
    };
  }

  private settingsUsable(method: string, settings: unknown) {
    const spec = this.configurable.get(method);
    if (!spec) return true;
    try {
      spec.validateSettings((settings ?? {}) as Record<string, unknown>);
      return true;
    } catch {
      return false;
    }
  }

  /** For the provider form: [] = no choice needed, [..] = pick one. */
  private countryChoice(method: string, settings: unknown): string[] {
    const list = (settings as { allowedCountries?: unknown } | undefined)
      ?.allowedCountries;
    if (!Array.isArray(list) || list.length <= 1) return [];
    return list.map((c) => String(c));
  }

  // ─── write ───────────────────────────────────────────────────────────────

  async startMethod(
    providerOrganizationId: string,
    method: string,
    dto: StartMethodDto,
    actorEmail?: string,
  ): Promise<{ onboardingUrl: string; status: string; resumed: boolean }> {
    const onboarding = this.methods.get(method);
    if (!onboarding) throw new NotFoundException(`Unknown method "${method}"`);

    const requiredMethod = await this.requiredMethod();
    const cfg = await this.methodConfig(method);

    // The method must be offered (fallback: the required method may run before
    // the admin has saved anything).
    const offered = cfg?.enabled || method === requiredMethod;
    if (!offered) {
      throw new ConflictException(`"${method}" is not available`);
    }

    if (method !== requiredMethod) {
      const base = await this.model
        .findOne({ providerOrganizationId, method: requiredMethod })
        .lean();
      if (base?.status !== 'complete') {
        throw new ConflictException(
          `Configure ${requiredMethod} before adding another payment method`,
        );
      }
    }

    const existing = await this.model.findOne({ providerOrganizationId, method });
    if (existing?.status === 'complete') {
      throw new ConflictException(`"${method}" is already configured`);
    }

    let relayAccountId: string;
    let resumed: boolean;

    if (existing) {
      relayAccountId = existing.relayAccountId;
      resumed = true;
    } else {
      const relayConnectionId = await this.resolveConnectionId(method, cfg);
      const country = this.resolveCountry(method, cfg?.settings, dto.country);

      const started = await onboarding.start({
        providerOrganizationId,
        relayConnectionId,
        country,
        email: dto.email ?? actorEmail,
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
        isBase: method === requiredMethod,
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
    return { onboardingUrl: link.url, status: row?.status ?? 'pending', resumed };
  }

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

  private async resolveConnectionId(
    method: string,
    cfg: PaymentMethodConfig | null,
  ): Promise<string> {
    if (cfg?.relayConnectionId) return cfg.relayConnectionId;
    throw new ConflictException(
      `${method} payouts are not configured — ask an administrator.`,
    );
  }

  private resolveCountry(
    method: string,
    settings: unknown,
    providerChoice?: string,
  ): string | undefined {
    const spec = this.configurable.get(method);
    if (!spec) return providerChoice;
    return spec.resolveCountry(
      (settings ?? {}) as Record<string, unknown>,
      providerChoice,
    );
  }

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

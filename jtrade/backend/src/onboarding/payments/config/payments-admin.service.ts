import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  PaymentMethodConfig,
  PaymentMethodConfigDocument,
} from './schemas/payment-method-config.schema';
import type { MethodConfigurable } from '../contracts/method-settings.contract';
import type { UpsertMethodConfigDto } from './dto/payments-admin.dto';
import { PaymentsCatalogService } from '../payments-catalog.service';
import type { RelayProvider } from '../relay-payments.client';
import { StripeOnboardingService } from '../stripe/stripe-onboarding.service';

/**
 * The admin's control panel for payments: which of Relay's methods jtrade
 * offers, and the settings each one needs. Nothing here talks to a gateway —
 * it just curates config that the provider onboarding reads.
 */
@Injectable()
export class PaymentsAdminService {
  private readonly configurable = new Map<string, MethodConfigurable>();

  constructor(
    @InjectModel(PaymentMethodConfig.name)
    private readonly model: Model<PaymentMethodConfigDocument>,
    private readonly catalog: PaymentsCatalogService,
    stripe: StripeOnboardingService,
  ) {
    this.configurable.set(stripe.method, stripe);
  }

  /** Relay's full catalogue merged with jtrade's config rows. */
  async list() {
    const [catalogue, rows] = await Promise.all([
      this.catalog.listMethods().catch(() => [] as RelayProvider[]),
      this.model.find().sort({ displayOrder: 1, method: 1 }).lean(),
    ]);
    const byMethod = new Map(rows.map((r) => [r.method, r]));

    // Include methods Relay advertises + any config rows for methods it doesn't.
    const keys = new Set<string>([
      ...catalogue.map((m) => m.providerKey),
      ...rows.map((r) => r.method),
    ]);

    return [...keys].map((method) => {
      const cat = catalogue.find((m) => m.providerKey === method);
      const row = byMethod.get(method);
      const spec = this.configurable.get(method);
      return {
        method,
        displayName: row?.displayName || cat?.displayName || method,
        description: cat?.description ?? '',
        supportedByRelay: !!cat,
        configurable: !!spec,
        enabled: row?.enabled ?? false,
        isRequired: row?.isRequired ?? false,
        displayOrder: row?.displayOrder ?? 0,
        relayConnectionId: row?.relayConnectionId ?? null,
        settings: row?.settings ?? {},
        settingsFields: spec?.settingsFields() ?? [],
      };
    });
  }

  async upsert(method: string, dto: UpsertMethodConfigDto) {
    const key = method.toLowerCase();
    const spec = this.configurable.get(key);
    const existing = await this.model.findOne({ method: key });

    const patch: Record<string, unknown> = {};
    if (dto.displayName !== undefined) patch.displayName = dto.displayName.trim();
    if (dto.displayOrder !== undefined) patch.displayOrder = dto.displayOrder;

    if (dto.relayConnectionId !== undefined) {
      patch.relayConnectionId = dto.relayConnectionId.trim() || null;
    }

    if (dto.settings !== undefined) {
      patch.settings = spec
        ? spec.validateSettings(dto.settings)
        : dto.settings;
    }

    if (dto.isRequired !== undefined) patch.isRequired = dto.isRequired;

    if (dto.enabled !== undefined) {
      if (dto.enabled) {
        const settings = (patch.settings ??
          existing?.settings ??
          {}) as Record<string, unknown>;
        if (spec) spec.validateSettings(settings); // must be complete to enable
        if (!(patch.relayConnectionId ?? existing?.relayConnectionId)) {
          patch.relayConnectionId = await this.catalog
            .resolveConnectionId(key)
            .catch(() => {
              throw new BadRequestException(
                `No Relay connection available for "${key}".`,
              );
            });
        }
      }
      patch.enabled = dto.enabled;
    }

    const saved = await this.model.findOneAndUpdate(
      { method: key },
      { $set: patch, $setOnInsert: { method: key } },
      { new: true, upsert: true },
    );

    // Exactly one required method among the enabled ones.
    if (patch.isRequired === true) {
      await this.model.updateMany(
        { method: { $ne: key }, isRequired: true },
        { $set: { isRequired: false } },
      );
    }

    return saved!.toObject();
  }
}

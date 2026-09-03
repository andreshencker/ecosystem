import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  PaymentMethodConfig,
  PaymentMethodConfigDocument,
} from './schemas/payment-method-config.schema';
import {
  ProviderPayment,
  ProviderPaymentDocument,
} from '../schemas/provider-payment.schema';
import type { MethodConfigurable } from '../contracts/method-settings.contract';
import type { UpsertMethodConfigDto } from './dto/payments-admin.dto';
import { PaymentsCatalogService } from '../payments-catalog.service';
import type { RelayProvider } from '../relay-payments.client';
import { StripeOnboardingService } from '../stripe/stripe-onboarding.service';

/**
 * The admin's control panel for payments: which of Relay's methods jtrade
 * offers and the settings each one needs. Nothing here talks to a gateway.
 */
@Injectable()
export class PaymentsAdminService {
  private readonly configurable = new Map<string, MethodConfigurable>();

  constructor(
    @InjectModel(PaymentMethodConfig.name)
    private readonly model: Model<PaymentMethodConfigDocument>,
    @InjectModel(ProviderPayment.name)
    private readonly providerPayments: Model<ProviderPaymentDocument>,
    private readonly catalog: PaymentsCatalogService,
    stripe: StripeOnboardingService,
  ) {
    this.configurable.set(stripe.method, stripe);
  }

  private async catalogue(): Promise<RelayProvider[]> {
    return this.catalog.listMethods().catch(() => [] as RelayProvider[]);
  }

  /** The methods jtrade has added — the table. */
  async listConfigured() {
    const [catalogue, rows] = await Promise.all([
      this.catalogue(),
      this.model.find().sort({ displayOrder: 1, method: 1 }).lean(),
    ]);
    return rows.map((row) => {
      const cat = catalogue.find((m) => m.providerKey === row.method);
      const spec = this.configurable.get(row.method);
      return {
        method: row.method,
        displayName: row.displayName || cat?.displayName || row.method,
        description: cat?.description ?? '',
        supportedByRelay: !!cat,
        configurable: !!spec,
        enabled: row.enabled,
        isRequired: row.isRequired,
        displayOrder: row.displayOrder,
        relayConnectionId: row.relayConnectionId,
        settings: row.settings ?? {},
        settingsFields: spec?.settingsFields() ?? [],
      };
    });
  }

  /** Relay methods jtrade hasn't added yet — the "Add" select. */
  async listAvailable() {
    const [catalogue, rows] = await Promise.all([
      this.catalogue(),
      this.model.find().select('method').lean(),
    ]);
    const added = new Set(rows.map((r) => r.method));
    return catalogue
      .filter((m) => !added.has(m.providerKey))
      .map((m) => ({
        method: m.providerKey,
        displayName: m.displayName,
        description: m.description ?? '',
      }));
  }

  async add(method: string) {
    const key = method.toLowerCase().trim();
    if (!(await this.catalog.isSupported(key))) {
      throw new BadRequestException(`"${key}" is not a Relay payment method.`);
    }
    if (await this.model.exists({ method: key })) {
      throw new ConflictException(`"${key}" is already added.`);
    }
    const created = await this.model.create({
      method: key,
      enabled: false,
      settings: {},
    });
    return created.toObject();
  }

  async update(method: string, dto: UpsertMethodConfigDto) {
    const key = method.toLowerCase();
    const row = await this.model.findOne({ method: key });
    if (!row) throw new NotFoundException(`"${key}" is not added.`);
    const spec = this.configurable.get(key);

    if (dto.displayName !== undefined) row.displayName = dto.displayName.trim();
    if (dto.displayOrder !== undefined) row.displayOrder = dto.displayOrder;
    if (dto.relayConnectionId !== undefined) {
      row.relayConnectionId = dto.relayConnectionId.trim() || null;
    }
    if (dto.settings !== undefined) {
      row.settings = spec ? spec.validateSettings(dto.settings) : dto.settings;
    }
    if (dto.isRequired !== undefined) row.isRequired = dto.isRequired;

    if (dto.enabled !== undefined) {
      if (dto.enabled) {
        if (spec) spec.validateSettings(row.settings ?? {}); // must be complete
        if (!row.relayConnectionId) {
          row.relayConnectionId = await this.catalog
            .resolveConnectionId(key)
            .catch(() => {
              throw new BadRequestException(
                `No Relay connection available for "${key}".`,
              );
            });
        }
      } else if (row.isRequired) {
        row.isRequired = false;
      }
      row.enabled = dto.enabled;
    }

    await row.save();

    if (row.isRequired) {
      await this.model.updateMany(
        { method: { $ne: key }, isRequired: true },
        { $set: { isRequired: false } },
      );
    }
    return row.toObject();
  }

  async remove(method: string) {
    const key = method.toLowerCase();
    const inUse = await this.providerPayments.exists({ method: key });
    if (inUse) {
      throw new ConflictException(
        `Providers are already using "${key}" — disable it instead of removing it.`,
      );
    }
    const deleted = await this.model.findOneAndDelete({ method: key });
    if (!deleted) throw new NotFoundException(`"${key}" is not added.`);
    return { deleted: true };
  }
}

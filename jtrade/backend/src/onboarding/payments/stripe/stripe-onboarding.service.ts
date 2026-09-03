import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  ConfigurationLink,
  ConfigurationUrls,
  MethodOnboarding,
  MethodState,
  StartMethodInput,
  StartMethodResult,
} from '../contracts/method-onboarding.contract';
import type {
  MethodConfigurable,
  SettingsFieldDef,
} from '../contracts/method-settings.contract';
import type { ProviderPaymentStatus } from '../schemas/provider-payment.schema';
import {
  RelayPaymentsClient,
  type RelayConnectedAccount,
} from '../relay-payments.client';

/**
 * The whole Stripe Connect flow + its admin settings. Its only responsibility:
 * get the provider through Stripe's account configuration and report the state.
 * It does NOT decide whether the provider can sell.
 */
@Injectable()
export class StripeOnboardingService
  implements MethodOnboarding, MethodConfigurable
{
  readonly method = 'stripe';

  constructor(private readonly relay: RelayPaymentsClient) {}

  // ─── admin settings ──────────────────────────────────────────────────────

  settingsFields(): SettingsFieldDef[] {
    return [
      {
        key: 'allowedCountries',
        label: 'Allowed countries',
        type: 'country-list',
        required: true,
        help: 'The provider picks one of these. Immutable at Stripe once set.',
      },
      {
        key: 'platformFeePercent',
        label: 'Platform fee (%)',
        type: 'number',
        required: true,
        help: 'Taken from every sale as the application fee.',
      },
      {
        key: 'platformFeeFixedMinor',
        label: 'Platform fee — fixed (cents)',
        type: 'number',
        required: false,
      },
    ];
  }

  validateSettings(raw: Record<string, unknown>): Record<string, unknown> {
    const countries = Array.isArray(raw.allowedCountries)
      ? raw.allowedCountries
          .map((c) => String(c).trim().toUpperCase())
          .filter((c) => /^[A-Z]{2}$/.test(c))
      : [];
    if (countries.length === 0) {
      throw new BadRequestException(
        'Stripe needs at least one allowed country (2-letter code).',
      );
    }

    const percent = Number(raw.platformFeePercent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      throw new BadRequestException(
        'Platform fee (%) must be a number between 0 and 100.',
      );
    }

    const fixed = Number(raw.platformFeeFixedMinor ?? 0);
    if (!Number.isFinite(fixed) || fixed < 0) {
      throw new BadRequestException(
        'Fixed platform fee must be 0 or a positive amount in cents.',
      );
    }

    return {
      allowedCountries: [...new Set(countries)],
      platformFeePercent: percent,
      platformFeeFixedMinor: Math.round(fixed),
    };
  }

  resolveCountry(
    settings: Record<string, unknown>,
    providerChoice?: string,
  ): string {
    const allowed = Array.isArray(settings.allowedCountries)
      ? (settings.allowedCountries as string[])
      : [];
    if (allowed.length === 0) {
      throw new BadRequestException(
        'Stripe payouts are not configured yet — ask an administrator to set the allowed countries.',
      );
    }
    if (allowed.length === 1) return allowed[0];

    const choice = (providerChoice ?? '').trim().toUpperCase();
    if (!choice) {
      throw new BadRequestException('Choose a country for your Stripe account.');
    }
    if (!allowed.includes(choice)) {
      throw new BadRequestException(
        `"${choice}" is not an allowed country for Stripe here.`,
      );
    }
    return choice;
  }

  // ─── onboarding flow ─────────────────────────────────────────────────────

  async start(input: StartMethodInput): Promise<StartMethodResult> {
    const account = await this.relay.createConnectedAccount({
      connectionId: input.relayConnectionId,
      connectedOrganizationId: input.providerOrganizationId,
      country: input.country,
      email: input.email,
      businessName: input.businessName,
    });
    return {
      relayConnectionId: input.relayConnectionId,
      relayAccountId: account.id,
      providerAccountId: account.providerAccountId ?? null,
      state: this.toState(account),
    };
  }

  async configurationLink(
    relayAccountId: string,
    urls: ConfigurationUrls,
  ): Promise<ConfigurationLink> {
    const link = await this.relay.createOnboardingLink(relayAccountId, {
      refreshUrl: urls.refreshUrl,
      returnUrl: urls.returnUrl,
    });
    return { url: link.url, expiresAt: new Date(link.expiresAt) };
  }

  async refreshState(relayAccountId: string): Promise<MethodState> {
    const account = await this.relay.refreshConnectedAccount(relayAccountId);
    return this.toState(account);
  }

  private toState(account: RelayConnectedAccount): MethodState {
    return {
      status: this.mapStatus(account),
      providerAccountId: account.providerAccountId ?? null,
      requirementsDue: account.requirementsCurrentlyDue ?? [],
      disabledReason: account.disabledReason ?? null,
    };
  }

  private mapStatus(account: RelayConnectedAccount): ProviderPaymentStatus {
    if (account.status === 'enabled') return 'complete';
    if (account.status === 'restricted' || account.status === 'disabled') {
      return 'restricted';
    }
    return 'pending';
  }
}

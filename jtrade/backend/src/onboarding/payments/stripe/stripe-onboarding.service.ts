import { Injectable } from '@nestjs/common';
import type {
  ConfigurationLink,
  ConfigurationUrls,
  MethodOnboarding,
  MethodState,
  StartMethodInput,
  StartMethodResult,
} from '../contracts/method-onboarding.contract';
import type { ProviderPaymentStatus } from '../schemas/provider-payment.schema';
import {
  RelayPaymentsClient,
  type RelayConnectedAccount,
} from '../relay-payments.client';
import { PaymentsCatalogService } from '../payments-catalog.service';

/**
 * The whole Stripe Connect onboarding flow. Its only responsibility: get the
 * provider through Stripe's account configuration and report the state.
 *
 * It does NOT decide whether the provider can sell — it just talks to Relay
 * and normalises Stripe's status onto `MethodState`.
 */
@Injectable()
export class StripeOnboardingService implements MethodOnboarding {
  readonly method = 'stripe';

  constructor(
    private readonly relay: RelayPaymentsClient,
    private readonly catalog: PaymentsCatalogService,
  ) {}

  async start(input: StartMethodInput): Promise<StartMethodResult> {
    const relayConnectionId = await this.catalog.resolveConnectionId(
      this.method,
    );
    const account = await this.relay.createConnectedAccount({
      connectionId: relayConnectionId,
      connectedOrganizationId: input.providerOrganizationId,
      country: input.country,
      email: input.email,
      businessName: input.businessName,
    });
    return {
      relayConnectionId,
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

  /** Stripe (via Relay) → jtrade's normalised state. */
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

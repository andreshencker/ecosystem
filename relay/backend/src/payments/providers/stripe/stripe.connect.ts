import Stripe from 'stripe';
import type {
  ConnectedPaymentAccountState,
  ConnectAccountSessionResult,
  ConnectCheckoutResult,
  ConnectOnboardingResult,
  CreateConnectedPaymentAccountParams,
  CreateConnectAccountSessionParams,
  CreateConnectCheckoutParams,
  CreateConnectOnboardingParams,
} from '../../contracts/payment-connect.contract';

function mapAccount(account: Stripe.Account): ConnectedPaymentAccountState {
  const currentlyDue = account.requirements?.currently_due ?? [];
  const eventuallyDue = account.requirements?.eventually_due ?? [];
  const disabledReason = account.requirements?.disabled_reason ?? undefined;
  const status =
    account.charges_enabled && account.payouts_enabled
      ? 'enabled'
      : disabledReason
        ? 'disabled'
        : account.details_submitted
          ? 'restricted'
          : 'pending';
  return {
    providerAccountId: account.id,
    status,
    chargesEnabled: account.charges_enabled ?? false,
    payoutsEnabled: account.payouts_enabled ?? false,
    detailsSubmitted: account.details_submitted ?? false,
    country: account.country ?? undefined,
    defaultCurrency: account.default_currency ?? undefined,
    requirementsCurrentlyDue: currentlyDue,
    requirementsEventuallyDue: eventuallyDue,
    disabledReason,
  };
}

export async function createStripeConnectedAccount(
  client: Stripe,
  params: CreateConnectedPaymentAccountParams,
): Promise<ConnectedPaymentAccountState> {
  const account = await client.accounts.create({
    type: 'express',
    ...(params.country ? { country: params.country.toUpperCase() } : {}),
    ...(params.email ? { email: params.email } : {}),
    ...(params.businessName
      ? { business_profile: { name: params.businessName } }
      : {}),
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      graphify_organization_id: params.connectedOrganizationId,
    },
  });
  return mapAccount(account);
}

export async function getStripeConnectedAccount(
  client: Stripe,
  providerAccountId: string,
): Promise<ConnectedPaymentAccountState> {
  const account = await client.accounts.retrieve(providerAccountId);
  return mapAccount(account);
}

export async function createStripeConnectOnboarding(
  client: Stripe,
  params: CreateConnectOnboardingParams,
): Promise<ConnectOnboardingResult> {
  const link = await client.accountLinks.create({
    account: params.providerAccountId,
    refresh_url: params.refreshUrl,
    return_url: params.returnUrl,
    type: 'account_onboarding',
    collection_options: {
      fields: 'eventually_due',
      future_requirements: 'include',
    },
  });
  return { url: link.url, expiresAt: new Date(link.expires_at * 1000) };
}

export async function createStripeConnectAccountSession(
  client: Stripe,
  params: CreateConnectAccountSessionParams,
): Promise<ConnectAccountSessionResult> {
  const session = await client.accountSessions.create({
    account: params.providerAccountId,
    components: {
      account_onboarding: { enabled: true },
      account_management: { enabled: true },
      notification_banner: { enabled: true },
      balances: { enabled: true },
      payouts: { enabled: true },
    },
  });
  return {
    clientSecret: session.client_secret,
    expiresAt: new Date(session.expires_at * 1000),
  };
}

export async function createStripeConnectCheckout(
  client: Stripe,
  params: CreateConnectCheckoutParams,
): Promise<ConnectCheckoutResult> {
  const metadata: Record<string, string> = {
    ...params.metadata,
    graphify_external_reference: params.externalReference,
  };
  const session = await client.checkout.sessions.create(
    {
      mode: 'payment',
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      client_reference_id: params.externalReference,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: params.currency.toLowerCase(),
            unit_amount: params.amountMinor,
            product_data: {
              name: params.description ?? params.externalReference,
            },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: params.applicationFeeMinor,
        transfer_data: { destination: params.providerAccountId },
        metadata,
      },
      metadata,
    },
    { idempotencyKey: params.idempotencyKey },
  );
  if (!session.url)
    throw new Error('Stripe Checkout did not return a redirect URL');
  return {
    providerSessionId: session.id,
    providerPaymentId:
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id,
    redirectUrl: session.url,
    status: session.status ?? 'open',
    expiresAt: new Date(session.expires_at * 1000),
  };
}

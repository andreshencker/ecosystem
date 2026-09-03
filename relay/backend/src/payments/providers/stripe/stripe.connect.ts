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

/**
 * Stripe deprecated the v1 Accounts API for new Connect integrations, so
 * connected accounts are created and read through the v2 Accounts API
 * (`/v2/core/accounts`). We onboard them as pure *recipients* — they receive
 * funds via destination charges (`transfer_data.destination` without
 * `on_behalf_of`); the platform is the merchant of record and collects the
 * application fee.
 */

const ACCOUNT_INCLUDE = [
  'configuration.recipient',
  'configuration.merchant',
  'identity',
  'requirements',
] as const;

function mapAccount(
  account: Stripe.V2.Core.Account,
): ConnectedPaymentAccountState {
  const recipient = account.configuration?.recipient;
  const balance = recipient?.capabilities?.stripe_balance;
  const transfersStatus = balance?.stripe_transfers?.status;
  const payoutsStatus = balance?.payouts?.status;

  const entries = account.requirements?.entries ?? [];
  const currentlyDue = entries
    .filter((e) => e.awaiting_action_from === 'user')
    .map((e) => e.description)
    .filter(Boolean);
  const errorReasons = entries
    .flatMap((e) => e.errors ?? [])
    .map((e) => e.description)
    .filter(Boolean);

  // The provider still has something to submit — first-time onboarding or a fix.
  const hasUserAction = currentlyDue.length > 0;
  const active = transfersStatus === 'active';
  // Blocked with nothing the provider can do (Stripe reviewing, hard block).
  const hardRestricted =
    !active &&
    !hasUserAction &&
    (transfersStatus === 'restricted' ||
      transfersStatus === 'unsupported' ||
      payoutsStatus === 'restricted');

  const status: ConnectedPaymentAccountState['status'] = active
    ? 'enabled'
    : hardRestricted
      ? 'restricted'
      : 'pending';

  return {
    providerAccountId: account.id,
    status,
    // A recipient-only account never charges cards itself.
    chargesEnabled: false,
    payoutsEnabled: payoutsStatus === 'active',
    // No open requirement the provider still has to act on.
    detailsSubmitted: currentlyDue.length === 0,
    country: account.identity?.country ?? undefined,
    defaultCurrency: account.defaults?.currency ?? undefined,
    requirementsCurrentlyDue: currentlyDue,
    requirementsEventuallyDue: [],
    disabledReason: hardRestricted
      ? (errorReasons[0] ?? 'restricted')
      : undefined,
  };
}

export async function createStripeConnectedAccount(
  client: Stripe,
  params: CreateConnectedPaymentAccountParams,
): Promise<ConnectedPaymentAccountState> {
  const account = await client.v2.core.accounts.create({
    ...(params.email ? { contact_email: params.email } : {}),
    ...(params.businessName ? { display_name: params.businessName } : {}),
    ...(params.country
      ? { identity: { country: params.country.toLowerCase() } }
      : {}),
    configuration: {
      // The account processes card payments as merchant of record and keeps
      // the proceeds in its Stripe balance; the platform tops it up via
      // destination transfers. This platform requires card_payments alongside
      // stripe_transfers.
      merchant: {
        capabilities: {
          card_payments: { requested: true },
        },
      },
      recipient: {
        capabilities: {
          stripe_balance: {
            stripe_transfers: { requested: true },
          },
        },
      },
    },
    defaults: {
      responsibilities: {
        fees_collector: 'application',
        losses_collector: 'application',
      },
    },
    dashboard: 'none',
    include: [
      'configuration.recipient',
      'configuration.merchant',
      'identity',
      'requirements',
    ],
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
  const account = await client.v2.core.accounts.retrieve(providerAccountId, {
    include: [...ACCOUNT_INCLUDE],
  });
  return mapAccount(account);
}

export async function createStripeConnectOnboarding(
  client: Stripe,
  params: CreateConnectOnboardingParams,
): Promise<ConnectOnboardingResult> {
  const link = await client.v2.core.accountLinks.create({
    account: params.providerAccountId,
    use_case: {
      type: 'account_onboarding',
      account_onboarding: {
        // Must match the configurations applied on the account.
        configurations: ['recipient', 'merchant'],
        refresh_url: params.refreshUrl,
        return_url: params.returnUrl,
        collection_options: { fields: 'eventually_due' },
      },
    },
  });
  // v2 timestamps are RFC 3339 strings.
  return { url: link.url, expiresAt: new Date(link.expires_at) };
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

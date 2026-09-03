import type Stripe from 'stripe';
import {
  createStripeConnectedAccount,
  createStripeConnectCheckout,
  createStripeConnectOnboarding,
} from './stripe.connect';

describe('Stripe Connect adapter (v2 Accounts API)', () => {
  it('creates a v2 connected account scoped to the connected organization', async () => {
    const create = jest.fn().mockResolvedValue({
      id: 'acct_provider_1',
      identity: { country: 'US' },
      defaults: { currency: 'usd' },
      configuration: {
        recipient: {
          capabilities: {
            stripe_balance: {
              stripe_transfers: { status: 'restricted' },
            },
          },
        },
      },
      requirements: {
        entries: [
          { awaiting_action_from: 'user', description: 'representative.email' },
        ],
      },
    });
    const client = {
      v2: { core: { accounts: { create } } },
    } as unknown as Stripe;

    const result = await createStripeConnectedAccount(client, {
      connectedOrganizationId: 'gpf_org_provider_1',
      country: 'us',
      email: 'provider@example.com',
      businessName: 'Provider Inc',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        contact_email: 'provider@example.com',
        display_name: 'Provider Inc',
        identity: { country: 'us' },
        dashboard: 'none',
        metadata: { graphify_organization_id: 'gpf_org_provider_1' },
      }),
    );
    expect(result).toMatchObject({
      providerAccountId: 'acct_provider_1',
      status: 'pending',
      requirementsCurrentlyDue: ['representative.email'],
    });
  });

  it('creates a destination checkout with the application fee and idempotency key', async () => {
    const create = jest.fn().mockResolvedValue({
      id: 'cs_test_1',
      url: 'https://checkout.stripe.com/test',
      status: 'open',
      expires_at: 1_800_000_000,
      payment_intent: 'pi_test_1',
    });
    const client = { checkout: { sessions: { create } } } as unknown as Stripe;

    const result = await createStripeConnectCheckout(client, {
      providerAccountId: 'acct_provider_1',
      externalReference: 'order_123',
      amountMinor: 10_000,
      applicationFeeMinor: 1_500,
      currency: 'USD',
      successUrl: 'https://jtrade.test/success',
      cancelUrl: 'https://jtrade.test/cancel',
      description: 'Trading bot license',
      metadata: { graphify_application_key: 'jtrade' },
      idempotencyKey: 'technical-idempotency-key',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        client_reference_id: 'order_123',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        payment_intent_data: expect.objectContaining({
          application_fee_amount: 1_500,
          transfer_data: { destination: 'acct_provider_1' },
        }),
      }),
      { idempotencyKey: 'technical-idempotency-key' },
    );
    expect(result).toMatchObject({
      providerSessionId: 'cs_test_1',
      providerPaymentId: 'pi_test_1',
      redirectUrl: 'https://checkout.stripe.com/test',
    });
  });

  it('creates a v2 hosted onboarding link for the connected account', async () => {
    const create = jest.fn().mockResolvedValue({
      url: 'https://connect.stripe.com/setup',
      expires_at: '2026-01-01T00:00:00.000Z',
    });
    const client = {
      v2: { core: { accountLinks: { create } } },
    } as unknown as Stripe;

    await createStripeConnectOnboarding(client, {
      providerAccountId: 'acct_provider_1',
      refreshUrl: 'https://jtrade.test/connect/refresh',
      returnUrl: 'https://jtrade.test/connect/return',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        account: 'acct_provider_1',
        use_case: expect.objectContaining({
          type: 'account_onboarding',
          account_onboarding: expect.objectContaining({
            configurations: ['recipient', 'merchant'],
            refresh_url: 'https://jtrade.test/connect/refresh',
            return_url: 'https://jtrade.test/connect/return',
          }),
        }),
      }),
    );
  });
});

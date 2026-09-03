import type Stripe from 'stripe';
import {
  createStripeConnectedAccount,
  createStripeConnectCheckout,
  createStripeConnectOnboarding,
} from './stripe.connect';

describe('Stripe Connect adapter', () => {
  it('creates an Express account scoped to the connected organization', async () => {
    const create = jest.fn().mockResolvedValue({
      id: 'acct_provider_1',
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: false,
      country: 'US',
      default_currency: 'usd',
      requirements: {
        currently_due: ['business_profile.url'],
        eventually_due: [],
      },
    });
    const client = { accounts: { create } } as unknown as Stripe;

    const result = await createStripeConnectedAccount(client, {
      connectedOrganizationId: 'gpf_org_provider_1',
      country: 'us',
      email: 'provider@example.com',
      businessName: 'Provider Inc',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'express',
        country: 'US',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { graphify_organization_id: 'gpf_org_provider_1' },
      }),
    );
    expect(result).toMatchObject({
      providerAccountId: 'acct_provider_1',
      status: 'pending',
      requirementsCurrentlyDue: ['business_profile.url'],
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
        // Jest asymmetric matchers are intentionally dynamic in this assertion.
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

  it('creates an onboarding link for the selected connected account', async () => {
    const create = jest.fn().mockResolvedValue({
      url: 'https://connect.stripe.com/setup',
      expires_at: 1_800_000_000,
    });
    const client = { accountLinks: { create } } as unknown as Stripe;

    await createStripeConnectOnboarding(client, {
      providerAccountId: 'acct_provider_1',
      refreshUrl: 'https://jtrade.test/connect/refresh',
      returnUrl: 'https://jtrade.test/connect/return',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        account: 'acct_provider_1',
        type: 'account_onboarding',
      }),
    );
  });
});

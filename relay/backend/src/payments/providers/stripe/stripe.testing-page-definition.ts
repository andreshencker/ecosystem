// src/payments/providers/stripe/stripe.testing-page-definition.ts
//
// Stripe-specific Payment Testing page definition.
//
// Stripe testing uses test cards with configurable scenarios.
// The developer selects a payment method, a test scenario, an amount and a
// currency, then the test is executed programmatically via the Stripe API.
//
// This module is the ONLY place where Stripe-specific test page UI configuration
// lives. The generic frontend must never branch on providerKey === 'stripe'.

import type {
  PaymentTestingPageDefinition,
  PaymentTestingPageDefinitionContext,
} from '../../contracts/payment-testing-page-definition.contract';

export function buildStripeTestingPageDefinition(
  ctx: PaymentTestingPageDefinitionContext,
): Promise<PaymentTestingPageDefinition> {
  const isTest = ctx.environment === 'test';

  return Promise.resolve({
    providerKey: 'stripe',
    connectionId: ctx.providerCredentialId,
    environment: ctx.environment ?? 'unknown',
    version: '1.0',
    capabilities: ctx.effectiveCapabilities,

    form: {
      supported: true,
      title: 'Run a payment test',
      description: isTest
        ? 'Use test card numbers to simulate different payment scenarios.'
        : undefined,
      submitLabel: 'Run payment test',
      fields: [
        {
          key: 'paymentMethodKey',
          label: 'Payment Method',
          type: 'select',
          required: true,
          optionsSource: 'provider',
          placeholder: 'Select a payment method',
          helpText: 'The payment method to test.',
        },
        {
          key: 'scenario',
          label: 'Scenario',
          type: 'scenario',
          required: true,
          optionsSource: 'test_scenarios',
          helpText:
            'Select the outcome to simulate. Stripe uses specific test card numbers ' +
            'to trigger each scenario.',
        },
        {
          key: 'amount',
          label: 'Amount',
          type: 'amount',
          required: true,
          defaultValue: 10,
        },
        {
          key: 'currency',
          label: 'Currency',
          type: 'payment_unit',
          required: true,
          optionsSource: 'payment_units',
          placeholder: 'Select currency',
        },
        {
          key: 'description',
          label: 'Description (optional)',
          type: 'text',
          required: false,
          placeholder: 'Test payment for invoice #123',
        },
      ],
    },

    result: {
      presentationType: 'none',
      successTitle: 'Test completed',
      successDescription:
        'The test payment was processed by Stripe in test mode.',
    },

    instructions: [
      'All Stripe test payments use Stripe test card numbers and are never charged to real cards.',
      'Tests complete immediately — no real banking network is involved.',
      'Test results appear in your Stripe Dashboard under the test mode section.',
    ],

    limitations: [
      'Only payment methods enabled for this account can be tested.',
      'Test amounts are always processed in the account default currency unless overridden.',
    ],

    metadata: {
      environment: ctx.environment,
    },
  });
}

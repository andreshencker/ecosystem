// src/payments/providers/coingate/coingate.testing-page-definition.ts
//
// CoinGate-specific Payment Testing page definition.
//
// Key CoinGate testing differences from card-based providers:
//   - No scenario field: CoinGate sandbox supports only a single success flow
//     (open the payment URL → sandbox handles the rest). Showing a "success"
//     scenario option in the UI is not informative, so it is omitted.
//   - Payment unit: the price_currency field uses a payment_unit selector
//     loaded from /payment-units for the connection.
//   - Result presentation: the test result always includes a paymentUrl that
//     the developer must open in the browser to simulate the crypto payment.
//
// This module is the ONLY place where CoinGate-specific test page UI configuration
// lives. The generic frontend must never branch on providerKey === 'coingate'.

import type {
  PaymentTestingPageDefinition,
  PaymentTestingPageDefinitionContext,
} from '../../contracts/payment-testing-page-definition.contract';

export function buildCoinGateTestingPageDefinition(
  ctx: PaymentTestingPageDefinitionContext,
): Promise<PaymentTestingPageDefinition> {
  const isTest = ctx.environment === 'test';

  return Promise.resolve({
    providerKey: 'coingate',
    connectionId: ctx.providerCredentialId,
    environment: ctx.environment ?? 'unknown',
    version: '1.0',
    capabilities: ctx.effectiveCapabilities,

    form: {
      supported: true,
      title: 'Create a sandbox payment',
      description: isTest
        ? 'Creates a CoinGate sandbox order. Open the payment URL to simulate the crypto payment flow.'
        : undefined,
      submitLabel: 'Create sandbox payment',
      fields: [
        {
          key: 'amount',
          label: 'Amount',
          type: 'amount',
          required: true,
          defaultValue: 10,
          helpText:
            'The price amount in the selected fiat currency (e.g. EUR 10.00). ' +
            'CoinGate converts this to crypto at checkout.',
        },
        {
          key: 'price_currency',
          label: 'Price Currency',
          type: 'select',
          required: true,
          referenceDataSource: 'price_currencies',
          placeholder: 'Select price currency (e.g. EUR)',
          helpText:
            'The fiat currency the amount is denominated in (e.g. EUR, USD). ' +
            'CoinGate converts this to crypto at checkout.',
        },
        {
          key: 'description',
          label: 'Description (optional)',
          type: 'text',
          required: false,
          placeholder: 'Sandbox test payment',
          helpText: 'Optional description shown in the CoinGate order.',
        },
      ],
    },

    result: {
      presentationType: 'redirect',
      successTitle: 'Sandbox order created',
      successDescription:
        'Open the payment URL below in your browser to simulate the crypto payment flow.',
    },

    instructions: [
      'CoinGate sandbox orders are created in the CoinGate test environment and are never charged to a real wallet.',
      'After creating the order, open the payment URL to simulate a buyer selecting a cryptocurrency and completing payment.',
      'The sandbox automatically completes the payment — no real crypto is transferred.',
    ],

    limitations: [
      'CoinGate supports only a single test flow: create order → open URL → sandbox completes payment.',
      'Decline and failure scenarios are not available — the sandbox always succeeds.',
    ],

    metadata: {
      environment: ctx.environment,
    },
  });
}

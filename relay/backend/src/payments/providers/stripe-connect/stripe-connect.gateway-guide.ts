// src/payments/providers/stripe-connect/stripe-connect.gateway-guide.ts
//
// Integration guide for the Stripe Connect provider — rendered by /payments/gateway.

import type { GatewayGuide } from '../../contracts/payment-gateway-guide.contract';

export const STRIPE_CONNECT_GATEWAY_GUIDE: GatewayGuide = {
  providerKey: 'stripe-connect',
  displayName: 'Stripe Connect',
  description:
    'Onboard your sellers as Stripe connected accounts and route payments to ' +
    'them with an application fee, using the platform account this connection ' +
    'holds the key for.',

  prerequisites: [
    'A Stripe account with Connect enabled (Dashboard → Connect → Get started).',
    'That account’s API key stored as a "stripe-connect" payment connection.',
    'A valid Relay Bearer token or the internal service key.',
    'Publicly reachable HTTPS return / refresh URLs for the hosted onboarding flow.',
    'A Connect webhook endpoint listening to account and checkout events.',
  ],

  supportedFlows: [
    'Connected account onboarding — create a v2 account and send the seller through Stripe-hosted KYC.',
    'Destination charge — the platform charges the buyer and transfers to the connected account minus an application fee.',
  ],

  implementationSteps: [
    {
      stepNumber: 1,
      title: 'Create a connected account',
      description:
        'POST /payments/connect/accounts with the platform connection id and an ' +
        'opaque reference for the seller. Relay creates a v2 connected account and ' +
        'returns its id and state.',
    },
    {
      stepNumber: 2,
      title: 'Send the seller through hosted onboarding',
      description:
        'POST /payments/connect/accounts/:id/onboarding with return and refresh ' +
        'URLs. Redirect the seller to the returned Stripe URL.',
    },
    {
      stepNumber: 3,
      title: 'Reconcile the account state',
      description:
        'On return, POST /payments/connect/accounts/:id/refresh, or let the ' +
        'account.updated webhook keep the stored state current.',
    },
    {
      stepNumber: 4,
      title: 'Charge and split',
      description:
        'POST /payments/connect/checkout-sessions with the amount, application ' +
        'fee and the connected account. Relay creates a Checkout session with a ' +
        'destination transfer.',
    },
  ],

  requestExamples: [
    {
      label: 'Create a connected account',
      method: 'POST',
      path: '/payments/connect/accounts',
      headers: { Authorization: 'Bearer <token>', 'Content-Type': 'application/json' },
      body: {
        connectionId: '<ProviderCredentials._id>',
        connectedOrganizationId: '<your seller id>',
        country: 'US',
        email: 'seller@example.com',
      },
    },
  ],

  responseExamples: [
    {
      label: 'Connected account created',
      statusCode: 201,
      body: {
        id: '<relay record id>',
        providerAccountId: 'acct_1ABC...',
        status: 'pending',
        chargesEnabled: false,
        payoutsEnabled: false,
        requirementsCurrentlyDue: ['identity.entity_type', 'representative.email'],
      },
    },
  ],

  presentationTypes: [
    {
      mode: 'hosted_onboarding',
      label: 'Hosted onboarding',
      description: 'Stripe collects the seller’s KYC on its own pages.',
      recommendedFor: ['Fastest integration', 'No PII handled by the platform'],
      supported: true,
    },
  ],

  testingInstructions: [
    'Use a Stripe test-mode key. Test connected accounts skip real verification.',
    'Complete onboarding with Stripe’s test data; the account becomes enabled.',
  ],

  limitations: [
    'Cross-border transfers are limited by Stripe based on the platform and seller countries.',
    'The connected account country is immutable once set.',
  ],

  webhookReceiverPath: '/payments/webhooks/{connectionId}',
};

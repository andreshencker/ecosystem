// src/payments/providers/stripe/stripe.refunds-page-definition.ts
//
// Stripe-specific Refunds page definition.
//
// This module is the ONLY place where Stripe-specific refund UI configuration
// lives. The generic frontend must never branch on providerKey === 'stripe'.

import type {
  RefundsPageDefinition,
  RefundsPageDefinitionContext,
} from '../../contracts/refunds-page-definition.contract';
import { PaymentCapability, CapabilityStatus } from '../../enums/payment.enums';

export function buildStripeRefundsPageDefinition(
  ctx: RefundsPageDefinitionContext,
): Promise<RefundsPageDefinition> {
  const caps = ctx.effectiveCapabilities;
  const isTest = ctx.environment === 'test';

  const supportsCreation =
    caps[PaymentCapability.RefundCreation] === CapabilityStatus.Available;
  const supportsPartial =
    caps[PaymentCapability.PartialRefunds] === CapabilityStatus.Available;
  const supportsReasons =
    caps[PaymentCapability.RefundReasons] === CapabilityStatus.Available;
  const supportsUnits =
    caps[PaymentCapability.PaymentUnits] === CapabilityStatus.Available;

  return Promise.resolve({
    providerKey: 'stripe',
    connectionId: ctx.providerCredentialId,
    version: '1.0',
    capabilities: caps,

    toolbarActions: [
      { key: 'refresh', label: 'Refresh', type: 'refresh' },
      ...(supportsCreation
        ? ([
            {
              key: 'create_refund',
              label: 'New Refund',
              type: 'create_refund',
              capability: PaymentCapability.RefundCreation,
            },
          ] as const)
        : []),
    ],

    filters: [
      {
        key: 'search',
        label: 'Search',
        type: 'search',
        queryParam: 'search',
        placeholder: 'Search by ID (re_, pi_, ch_)…',
        resetOnProviderChange: true,
        resetOnConnectionChange: true,
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        queryParam: 'status',
        optionsSource: 'refund_statuses',
        resetOnProviderChange: true,
        resetOnConnectionChange: false,
      },
      ...(supportsUnits
        ? ([
            {
              key: 'currency',
              label: 'Currency',
              type: 'select',
              queryParam: 'currency',
              optionsSource: 'payment_units',
              capability: PaymentCapability.PaymentUnits,
              resetOnProviderChange: true,
              resetOnConnectionChange: true,
            },
          ] as const)
        : []),
      {
        key: 'createdFrom',
        label: 'From',
        type: 'date',
        queryParam: 'createdFrom',
        resetOnProviderChange: true,
        resetOnConnectionChange: false,
      },
      {
        key: 'createdTo',
        label: 'To',
        type: 'date',
        queryParam: 'createdTo',
        resetOnProviderChange: true,
        resetOnConnectionChange: false,
      },
    ],

    columns: [
      {
        key: 'id',
        label: 'Refund',
        type: 'identifier',
        field: 'providerRefundId',
        secondaryField: 'providerPaymentId',
        flex: 1.5,
      },
      {
        key: 'amount',
        label: 'Amount',
        type: 'amount',
        field: 'amountMinor',
        width: 120,
      },
      {
        key: 'reason',
        label: 'Reason',
        type: 'reason',
        field: 'reason',
        width: 180,
      },
      {
        key: 'status',
        label: 'Status',
        type: 'status',
        field: 'status',
        width: 150,
      },
      {
        key: 'createdAt',
        label: 'Created',
        type: 'date',
        field: 'createdAt',
        width: 120,
      },
      {
        key: 'actions',
        label: '',
        type: 'actions',
        width: 64,
      },
    ],

    rowActions: [{ key: 'view', label: 'View details', type: 'view' }],

    createForm: {
      supported: supportsCreation,
      title: 'Create Refund',
      description: isTest
        ? 'Issue a refund against a test payment.'
        : undefined,
      submitLabel: 'Create Refund',
      fields: [
        {
          key: 'paymentId',
          label: 'Payment Intent / Charge ID',
          type: 'payment_reference',
          required: true,
          placeholder: 'pi_… or ch_…',
          helpText: 'The Stripe payment intent or charge to refund.',
        },
        ...(supportsPartial
          ? ([
              {
                key: 'amount',
                label: 'Refund Amount (optional)',
                type: 'amount',
                required: false,
                capability: PaymentCapability.PartialRefunds,
                helpText: 'Leave blank to issue a full refund.',
              },
            ] as const)
          : []),
        ...(supportsReasons
          ? ([
              {
                key: 'reason',
                label: 'Reason',
                type: 'select',
                required: false,
                capability: PaymentCapability.RefundReasons,
                optionsSource: 'refund_reasons',
              },
            ] as const)
          : []),
      ],
    },

    list: {
      supported:
        caps[PaymentCapability.RefundListing] === CapabilityStatus.Available,
      defaultPageSize: 20,
      allowedPageSizes: [20, 50],
      paginationType: 'cursor',
    },

    emptyState: {
      title: 'No refunds found',
      description: isTest
        ? 'No test refunds yet. Create a refund against a succeeded test payment.'
        : 'Refunds from your Stripe account will appear here.',
    },

    metadata: {
      environment: ctx.environment,
    },
  });
}

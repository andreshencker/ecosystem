// src/payments/providers/stripe/stripe.page-definition.ts
//
// Stripe-specific Payments page definition.
//
// This module is the ONLY place where Stripe-specific UI configuration lives.
// The generic frontend must never branch on providerKey === 'stripe'.

import type {
  PaymentsPageDefinition,
  PaymentsPageDefinitionContext,
} from '../../contracts/payments-page-definition.contract';
import { PaymentCapability, CapabilityStatus } from '../../enums/payment.enums';

export async function buildStripePageDefinition(
  ctx: PaymentsPageDefinitionContext,
): Promise<PaymentsPageDefinition> {
  const caps = ctx.effectiveCapabilities;

  return {
    providerKey: 'stripe',
    connectionId: ctx.providerCredentialId,
    version: '1.0',
    capabilities: caps,

    summaryCards: [
      {
        key: 'balance_available',
        label: 'Available Balance',
        type: 'amount',
        source: 'balance.available',
        capability: PaymentCapability.Balance,
        scope: 'connection',
        unavailableBehaviour: 'not_supported',
        format: { currencySource: 'balance.available' },
      },
      {
        key: 'balance_pending',
        label: 'Pending Balance',
        type: 'amount',
        source: 'balance.pending',
        capability: PaymentCapability.Balance,
        scope: 'connection',
        unavailableBehaviour: 'not_supported',
        format: { currencySource: 'balance.pending' },
      },
      {
        key: 'succeeded',
        label: 'Successful Payments',
        type: 'count',
        source: 'page.status',
        status: 'succeeded',
        scope: 'current_page',
        unavailableBehaviour: 'hide',
      },
      {
        key: 'failed',
        label: 'Failed Payments',
        type: 'count',
        source: 'page.status',
        status: 'failed',
        scope: 'current_page',
        unavailableBehaviour: 'hide',
      },
    ],

    filters: [
      {
        key: 'search',
        label: 'Search',
        type: 'search',
        queryParam: 'search',
        placeholder: 'Search payments…',
        resetOnProviderChange: true,
        resetOnConnectionChange: true,
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        queryParam: 'status',
        optionsSource: 'payment_statuses',
        resetOnProviderChange: true,
        resetOnConnectionChange: false,
      },
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
        label: 'Payment',
        type: 'identifier',
        field: 'providerPaymentId',
        secondaryField: 'description',
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
        key: 'method',
        label: 'Method',
        type: 'method',
        field: 'paymentMethodLabel',
        secondaryField: 'paymentMethodType',
        width: 150,
      },
      {
        key: 'status',
        label: 'Status',
        type: 'status',
        field: 'status',
        width: 160,
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

    rowActions: [
      {
        key: 'view',
        label: 'View details',
        type: 'view',
      },
    ],

    list: {
      supported:
        caps[PaymentCapability.Payments] === CapabilityStatus.Available,
      defaultPageSize: 20,
      allowedPageSizes: [20, 50],
      paginationType: 'cursor',
    },

    emptyState: {
      title: 'No payments found',
      description:
        ctx.environment === 'test'
          ? 'No test payments yet. Use Payment Testing to create a sandbox charge.'
          : 'Payments from your Stripe account will appear here.',
    },

    metadata: {
      environment: ctx.environment,
    },
  };
}

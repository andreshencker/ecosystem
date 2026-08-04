// src/payments/providers/coingate/coingate.page-definition.ts
//
// CoinGate-specific Payments page definition.
//
// CoinGate is a crypto payment gateway. Key differences from fiat providers:
//   - No balance endpoint (CoinGate doesn't expose a balance API).
//   - Orders use "requires_action" for new orders awaiting crypto payment.
//   - Expired orders represent a meaningful failure state for crypto.
//   - Each order has a payment_url for the buyer to complete the payment.
//
// This module is the ONLY place where CoinGate-specific UI configuration lives.
// The generic frontend must never branch on providerKey === 'coingate'.

import type {
  PaymentsPageDefinition,
  PaymentsPageDefinitionContext,
} from '../../contracts/payments-page-definition.contract';
import { PaymentCapability, CapabilityStatus } from '../../enums/payment.enums';
import { PaymentCanonicalStatus } from '../../enums/payment-canonical-status.enum';

export async function buildCoinGatePageDefinition(
  ctx: PaymentsPageDefinitionContext,
): Promise<PaymentsPageDefinition> {
  const caps = ctx.effectiveCapabilities;
  const isTest = ctx.environment === 'test';

  return {
    providerKey: 'coingate',
    connectionId: ctx.providerCredentialId,
    version: '1.0',
    capabilities: caps,

    // CoinGate does not expose a balance API. Status-based cards give the
    // merchant a meaningful overview of their order pipeline instead.
    summaryCards: [
      {
        key: 'succeeded',
        label: 'Paid Orders',
        type: 'count',
        source: 'page.status',
        status: PaymentCanonicalStatus.Succeeded,
        scope: 'current_page',
        unavailableBehaviour: 'hide',
      },
      {
        key: 'requires_action',
        label: 'Awaiting Payment',
        type: 'count',
        source: 'page.status',
        status: PaymentCanonicalStatus.RequiresAction,
        scope: 'current_page',
        unavailableBehaviour: 'hide',
      },
      {
        key: 'failed',
        label: 'Failed Orders',
        type: 'count',
        source: 'page.status',
        status: PaymentCanonicalStatus.Failed,
        scope: 'current_page',
        unavailableBehaviour: 'hide',
      },
      {
        key: 'expired',
        label: 'Expired Orders',
        type: 'count',
        source: 'page.status',
        status: PaymentCanonicalStatus.Expired,
        scope: 'current_page',
        unavailableBehaviour: 'hide',
      },
    ],

    filters: [
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
        label: 'Asset / Currency',
        type: 'select',
        queryParam: 'currency',
        optionsSource: 'payment_units',
        capability: PaymentCapability.PaymentUnits,
        placeholder: 'All assets',
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
        label: 'Order',
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
        key: 'currency',
        label: 'Asset',
        type: 'payment_unit',
        field: 'currency',
        width: 120,
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
        width: 80,
      },
    ],

    rowActions: [
      {
        key: 'view',
        label: 'View details',
        type: 'view',
      },
      {
        // 'paymentUrl' is populated by mapOrderToSummary for orders that have a payment page.
        // The action is hidden by the frontend when the field is falsy.
        key: 'open_payment_url',
        label: 'Open payment page',
        type: 'open_url',
        field: 'paymentUrl',
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
      title: 'No orders found',
      description: isTest
        ? 'No sandbox orders yet. Use Payment Testing to create a sandbox order.'
        : 'CoinGate orders from your merchant account will appear here.',
    },

    metadata: {
      environment: ctx.environment,
    },
  };
}

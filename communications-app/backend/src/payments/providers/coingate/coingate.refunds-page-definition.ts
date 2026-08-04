// src/payments/providers/coingate/coingate.refunds-page-definition.ts
//
// CoinGate-specific Refunds page definition.
//
// Key CoinGate refund differences from fiat providers:
//   - Refunds are order-scoped: listing requires an order ID in the search field.
//   - Refund creation requires crypto-specific provider extension fields:
//       address, currency_id (integer), platform_id (integer), email,
//       ledger_account_id, and optionally address_memo.
//   - The Reason column is omitted: CoinGate refunds use a free-form reason
//     string, not a canonical enum set, so it is less meaningful in table form.
//
// This module is the ONLY place where CoinGate-specific refund UI configuration
// lives. The generic frontend must never branch on providerKey === 'coingate'.

import type {
  RefundsPageDefinition,
  RefundsPageDefinitionContext,
} from '../../contracts/refunds-page-definition.contract';
import { PaymentCapability, CapabilityStatus } from '../../enums/payment.enums';

export function buildCoinGateRefundsPageDefinition(
  ctx: RefundsPageDefinitionContext,
): Promise<RefundsPageDefinition> {
  const caps = ctx.effectiveCapabilities;
  const isTest = ctx.environment === 'test';

  const supportsCreation =
    caps[PaymentCapability.RefundCreation] === CapabilityStatus.Available;
  const supportsPartial =
    caps[PaymentCapability.PartialRefunds] === CapabilityStatus.Available;
  const supportsUnits =
    caps[PaymentCapability.PaymentUnits] === CapabilityStatus.Available;

  return Promise.resolve({
    providerKey: 'coingate',
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
        label: 'Order ID',
        type: 'search',
        queryParam: 'search',
        placeholder: 'CoinGate order ID…',
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
              label: 'Asset / Currency',
              type: 'select',
              queryParam: 'currency',
              optionsSource: 'payment_units',
              capability: PaymentCapability.PaymentUnits,
              placeholder: 'All assets',
              resetOnProviderChange: true,
              resetOnConnectionChange: true,
            },
          ] as const)
        : []),
    ],

    // The Reason column is intentionally omitted for CoinGate.
    // CoinGate refunds use a free-form reason string not aligned with
    // canonical RefundCanonicalReason, making it unhelpful as a table column.
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
      description:
        'CoinGate refunds require a destination wallet address and asset selection. ' +
        'All provider-specific fields are sent securely inside providerExtensions.',
      submitLabel: 'Create Refund',
      fields: [
        {
          key: 'paymentId',
          label: 'Order ID',
          type: 'payment_reference',
          required: true,
          placeholder: 'CoinGate order ID',
          helpText: 'The CoinGate order to issue the refund for.',
        },
        ...(supportsPartial
          ? ([
              {
                key: 'amount',
                label: 'Refund Amount (optional)',
                type: 'amount',
                required: false,
                capability: PaymentCapability.PartialRefunds,
                helpText: 'Leave blank to refund the full order amount.',
              },
            ] as const)
          : []),
        {
          key: 'currency_id',
          label: 'Destination Asset',
          type: 'payment_unit',
          required: true,
          optionsSource: 'payment_units',
          placeholder: 'Select asset and network',
          helpText:
            'The cryptocurrency to receive the refund. ' +
            'Selecting an asset also determines the network (platform).',
          providerExtension: true,
          // When the user selects a payment unit, extract its CoinGate integer
          // IDs from providerMetadata and map them to providerExtensions keys.
          providerMetadataMapping: {
            currencyId: 'currency_id',
            platformId: 'platform_id',
          },
        },
        {
          key: 'address',
          label: 'Destination Wallet Address',
          type: 'text',
          required: true,
          placeholder: 'Wallet address',
          helpText: 'The wallet address to receive the refund.',
          providerExtension: true,
        },
        {
          key: 'email',
          label: 'Notification Email',
          type: 'email',
          required: true,
          placeholder: 'customer@example.com',
          helpText: 'Email address for refund status notifications.',
          providerExtension: true,
        },
        {
          key: 'ledger_account_id',
          label: 'Ledger Account ID',
          type: 'text',
          required: true,
          placeholder: 'CoinGate ledger account ID',
          helpText: 'The CoinGate ledger account to debit the refund from.',
          providerExtension: true,
        },
        {
          key: 'address_memo',
          label: 'Destination Memo / Tag (optional)',
          type: 'text',
          required: false,
          placeholder: 'Memo, tag, or destination note',
          helpText:
            'Required by some networks (e.g. XRP destination tag, Stellar memo).',
          providerExtension: true,
        },
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
        ? 'No sandbox refunds found. Enter a CoinGate sandbox order ID above to view its refunds.'
        : 'Enter a CoinGate order ID in the Order ID field above to view its refunds.',
    },

    metadata: {
      environment: ctx.environment,
    },
  });
}

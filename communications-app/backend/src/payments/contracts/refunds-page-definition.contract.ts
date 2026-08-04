// src/payments/contracts/refunds-page-definition.contract.ts
//
// Canonical page-definition contract for the Refunds page.
//
// The contract is the single source of truth for what the generic frontend
// renders: toolbar actions, filters, table columns, row actions, create form,
// and list configuration.
//
// Security rules:
//   - Never include API tokens, secret keys, decrypted credentials, or raw
//     provider headers anywhere in this contract.
//   - Never include provider-supplied HTML, executable expressions, or
//     arbitrary React components.
//   - Only canonical, controlled configuration structures are allowed.

import type { CapabilityStatus } from '../enums/payment.enums';
import {
  PaymentCapability,
  CapabilityStatus as CS,
} from '../enums/payment.enums';
import {
  computeConnectionCapabilities,
  intersectCapabilities,
} from './payments-page-definition.contract';

// Re-export so callers can import from one place
export { computeConnectionCapabilities, intersectCapabilities };

// ─── Toolbar action definition ────────────────────────────────────────────────

export type RefundToolbarActionType = 'refresh' | 'create_refund';

export interface RefundToolbarActionDefinition {
  /** Unique stable key within a definition (used as React key). */
  key: string;
  /** Human-readable button label. */
  label: string;
  /** What the action does. */
  type: RefundToolbarActionType;
  /**
   * If set, the action is only rendered when this capability is 'available'.
   * Actions without a capability guard are always rendered.
   */
  capability?: string;
  /** Future RBAC permission key. */
  permission?: string;
  /** Disable tooltip when the action exists but cannot be used right now. */
  disabledReason?: string;
}

// ─── Filter definition ────────────────────────────────────────────────────────

export type RefundFilterType = 'search' | 'select' | 'date' | 'date_range';

export type RefundFilterOptionsSource =
  | 'refund_statuses'
  | 'payment_units'
  | 'provider';

export interface RefundFilterDefinition {
  /** Unique stable key within a definition. */
  key: string;
  /** Human-readable filter label. */
  label: string;
  /** Control type. */
  type: RefundFilterType;
  /** The URL / API query parameter this filter populates. */
  queryParam: string;
  /**
   * If set, the filter is only rendered when this capability is 'available'.
   * When the capability is absent, the filter is removed from the definition.
   */
  capability?: string;
  /** Where to fetch options for 'select' filters. */
  optionsSource?: RefundFilterOptionsSource;
  placeholder?: string;
  /** Whether the filter value must be cleared when the provider selection changes. */
  resetOnProviderChange: boolean;
  /** Whether the filter value must be cleared when the connection selection changes. */
  resetOnConnectionChange: boolean;
}

// ─── Column definition ────────────────────────────────────────────────────────

export type RefundColumnType =
  | 'identifier'
  | 'amount'
  | 'payment_unit'
  | 'reason'
  | 'status'
  | 'date'
  | 'text'
  | 'actions';

export interface RefundColumnDefinition {
  /** Unique stable key within a definition (used as GridColDef field). */
  key: string;
  /** Column header label. */
  label: string;
  /** Rendering type — controls how the cell value is formatted. */
  type: RefundColumnType;
  /**
   * Primary field path in RefundSummary.
   * Required for all types except 'actions'.
   */
  field?: string;
  /**
   * Optional secondary field shown below the primary value
   * (e.g. providerPaymentId below providerRefundId).
   */
  secondaryField?: string;
  /** Only render this column when this capability is 'available'. */
  capability?: string;
  width?: number;
  flex?: number;
  align?: 'left' | 'center' | 'right';
  /** If true, hide the column when all rows have an empty value for this field. */
  hiddenWhenEmpty?: boolean;
}

// ─── Row action definition ────────────────────────────────────────────────────

export type RefundActionType = 'view';

export interface RefundActionDefinition {
  /** Unique stable key within a definition. */
  key: string;
  /** Tooltip / aria-label for the action button. */
  label: string;
  /** What the action does. */
  type: RefundActionType;
  /** Only render this action when this capability is 'available'. */
  capability?: string;
  /** Future RBAC permission key. */
  permission?: string;
}

// ─── Create form definition ───────────────────────────────────────────────────

export type RefundCreateFieldType =
  | 'payment_reference'
  | 'amount'
  | 'select'
  | 'text'
  | 'email'
  | 'payment_unit';

export interface RefundCreateFieldDefinition {
  /** Unique stable key within the form. Used as providerExtensions key when providerExtension=true. */
  key: string;
  /** Human-readable field label. */
  label: string;
  /** Input type determines the control rendered by the generic frontend. */
  type: RefundCreateFieldType;
  /** Whether the field must be filled before submission. */
  required: boolean;
  /**
   * If set, the field is only rendered when this capability is 'available'.
   * Fields without a capability guard are always rendered.
   */
  capability?: string;
  /**
   * Where to fetch select options.
   *   refund_reasons: canonical reason enum values
   *   payment_units:  provider payment units from /payment-units
   *   provider:       not currently supported in generic frontend
   */
  optionsSource?: 'payment_units' | 'refund_reasons' | 'provider';
  placeholder?: string;
  helpText?: string;
  /**
   * When true, the field value must be sent inside providerExtensions[key]
   * rather than as a top-level canonical field.
   * Never use this to pass credentials or secrets.
   */
  providerExtension?: boolean;
  /**
   * Used with type='payment_unit' + providerExtension=true.
   *
   * When the user selects a payment unit, the frontend extracts values from
   * the unit's providerMetadata and maps them into providerExtensions using
   * these key-to-key mappings.
   *
   * Example for CoinGate:
   *   { currencyId: 'currency_id', platformId: 'platform_id' }
   *
   * This keeps provider-specific ID fields out of the generic frontend while
   * still allowing precise extraction. The frontend iterates this map and
   * copies providerMetadata[sourceKey] → providerExtensions[targetKey] for
   * each entry, skipping undefined values.
   */
  providerMetadataMapping?: Record<string, string>;
}

export interface RefundCreateFormDefinition {
  /** Whether the provider supports refund creation at all. */
  supported: boolean;
  /** Drawer / dialog title. */
  title: string;
  /** Optional subtitle / helper shown below the title. */
  description?: string;
  /** Submit button label. */
  submitLabel: string;
  /** Ordered list of form fields to render. */
  fields: RefundCreateFieldDefinition[];
}

// ─── Page definition ──────────────────────────────────────────────────────────

export interface RefundsPageDefinition {
  /** Stable provider key from the adapter. */
  providerKey: string;
  /** ProviderCredentials._id of the selected connection. */
  connectionId: string;
  /** Semantic version of this definition schema. */
  version: string;
  /**
   * Effective capabilities after intersecting provider-level and
   * connection-level capability maps.
   */
  capabilities: Partial<Record<string, CapabilityStatus>>;
  toolbarActions: RefundToolbarActionDefinition[];
  filters: RefundFilterDefinition[];
  columns: RefundColumnDefinition[];
  rowActions: RefundActionDefinition[];
  /** Present only when the provider supports refund creation. */
  createForm?: RefundCreateFormDefinition;
  list: {
    supported: boolean;
    defaultPageSize: number;
    allowedPageSizes: number[];
    paginationType: 'cursor' | 'page' | 'none';
    defaultSort?: string;
  };
  emptyState: {
    title: string;
    description: string;
  };
  /** Provider-supplied safe metadata (no credentials). */
  metadata?: Record<string, unknown>;
}

// ─── Definition-resolution context ───────────────────────────────────────────

export interface RefundsPageDefinitionContext {
  companyId: string;
  /** ProviderCredentials._id of the connection being rendered. */
  providerCredentialId: string;
  providerKey: string;
  /** Derived from the stored credential mode field — never from the URL. */
  environment: 'test' | 'live' | null;
  /** Raw provider-level capabilities from the adapter. */
  providerCapabilities: Partial<Record<string, CapabilityStatus>>;
  /**
   * Connection-specific capability overrides (may restrict provider-level
   * capabilities based on account permissions, environment, etc.).
   */
  connectionCapabilities: Partial<Record<string, CapabilityStatus>>;
  /**
   * Effective (intersected) capabilities.
   */
  effectiveCapabilities: Partial<Record<string, CapabilityStatus>>;
}

// ─── Definition component filtering ──────────────────────────────────────────

/**
 * Removes toolbar actions, filters, columns, row actions, and create form
 * fields whose capability is not 'available'.
 *
 * Unlike the Payments definition, Refunds components are binary:
 * present when available, absent when not. There is no 'not_supported'
 * placeholder behaviour — components simply are not rendered.
 */
export function filterRefundDefinitionComponents(
  definition: RefundsPageDefinition,
  effectiveCapabilities: Partial<Record<string, CapabilityStatus>>,
): RefundsPageDefinition {
  const isAvailable = (cap?: string): boolean =>
    !cap || effectiveCapabilities[cap] === CS.Available;

  const createForm = definition.createForm
    ? {
        ...definition.createForm,
        fields: definition.createForm.fields.filter((f) =>
          isAvailable(f.capability),
        ),
      }
    : undefined;

  return {
    ...definition,
    toolbarActions: definition.toolbarActions.filter((a) =>
      isAvailable(a.capability),
    ),
    filters: definition.filters.filter((f) => isAvailable(f.capability)),
    columns: definition.columns.filter((c) => isAvailable(c.capability)),
    rowActions: definition.rowActions.filter((a) => isAvailable(a.capability)),
    createForm,
  };
}

// ─── Generic default definition ───────────────────────────────────────────────

/**
 * Builds a provider-neutral Refunds page definition for providers that support
 * refund listing but have not implemented a custom definition.
 *
 * This default is intentionally conservative: only the most universally
 * supported toolbar actions, filters, columns, and create-form fields are
 * included.
 */
export function buildGenericRefundsPageDefinition(
  providerKey: string,
  connectionId: string,
  effectiveCapabilities: Partial<Record<string, CapabilityStatus>>,
): RefundsPageDefinition {
  const supportsCreation =
    effectiveCapabilities[PaymentCapability.RefundCreation] === CS.Available;
  const supportsPartial =
    effectiveCapabilities[PaymentCapability.PartialRefunds] === CS.Available;
  const supportsReasons =
    effectiveCapabilities[PaymentCapability.RefundReasons] === CS.Available;
  const supportsUnits =
    effectiveCapabilities[PaymentCapability.PaymentUnits] === CS.Available;

  const toolbarActions: RefundToolbarActionDefinition[] = [
    { key: 'refresh', label: 'Refresh', type: 'refresh' },
    ...(supportsCreation
      ? ([
          {
            key: 'create_refund',
            label: 'New Refund',
            type: 'create_refund',
            capability: PaymentCapability.RefundCreation,
          },
        ] as RefundToolbarActionDefinition[])
      : []),
  ];

  const filters: RefundFilterDefinition[] = [
    {
      key: 'search',
      label: 'Search',
      type: 'search',
      queryParam: 'search',
      placeholder: 'Search refunds…',
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
            label: 'Currency / Asset',
            type: 'select',
            queryParam: 'currency',
            optionsSource: 'payment_units',
            capability: PaymentCapability.PaymentUnits,
            resetOnProviderChange: true,
            resetOnConnectionChange: true,
          },
        ] as RefundFilterDefinition[])
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
  ];

  const columns: RefundColumnDefinition[] = [
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
  ];

  const createFormFields: RefundCreateFieldDefinition[] = [
    {
      key: 'paymentId',
      label: 'Payment Reference',
      type: 'payment_reference',
      required: true,
      placeholder: 'Payment / order reference',
    },
    ...(supportsPartial
      ? ([
          {
            key: 'amount',
            label: 'Refund Amount (optional)',
            type: 'amount',
            required: false,
            capability: PaymentCapability.PartialRefunds,
            helpText: 'Leave blank for full refund.',
          },
        ] as RefundCreateFieldDefinition[])
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
        ] as RefundCreateFieldDefinition[])
      : []),
  ];

  return {
    providerKey,
    connectionId,
    version: '1.0',
    capabilities: effectiveCapabilities,
    toolbarActions,
    filters,
    columns,
    rowActions: [{ key: 'view', label: 'View details', type: 'view' }],
    createForm: {
      supported: supportsCreation,
      title: 'Create Refund',
      submitLabel: 'Create Refund',
      fields: createFormFields,
    },
    list: {
      supported: true,
      defaultPageSize: 20,
      allowedPageSizes: [20, 50],
      paginationType: 'cursor',
    },
    emptyState: {
      title: 'No refunds found',
      description:
        'Refunds processed through the connected provider will appear here.',
    },
  };
}

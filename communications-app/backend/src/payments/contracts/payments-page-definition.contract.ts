// src/payments/contracts/payments-page-definition.contract.ts
//
// Canonical page-definition contract for the Payments list page.
//
// The contract is the single source of truth for what the generic frontend
// renders: summary cards, filters, columns, actions, and empty-state copy.
//
// Security rules:
//   - Never include API tokens, secret keys, decrypted credentials, or raw
//     provider headers anywhere in this contract.
//   - Never include provider-supplied HTML, executable expressions, or
//     arbitrary React components.
//   - Only canonical, controlled configuration structures are allowed.

import type { CapabilityStatus } from '../enums/payment.enums';
import type { PaymentCanonicalStatus } from '../enums/payment-canonical-status.enum';
import {
  PaymentCapability,
  CapabilityStatus as CS,
} from '../enums/payment.enums';

// ─── Summary card definition ──────────────────────────────────────────────────

export type SummaryCardSource =
  | 'balance.available'
  | 'balance.pending'
  | 'page.status'
  | 'aggregate.status'
  | 'provider.metric';

export type SummaryCardScope =
  | 'connection'
  | 'filtered_result'
  | 'current_page';

export type SummaryCardUnavailableBehaviour =
  | 'hide'
  | 'not_supported'
  | 'unavailable';

export interface PaymentSummaryCardDefinition {
  /** Unique stable key within a definition (used as React key). */
  key: string;
  /** Human-readable card label shown above the primary value. */
  label: string;
  /** How the primary value is formatted. */
  type: 'amount' | 'count' | 'text';
  /** Where the value comes from. */
  source: SummaryCardSource;
  /**
   * For 'page.status' and 'aggregate.status' sources:
   * which canonical status to count/aggregate.
   */
  status?: PaymentCanonicalStatus;
  /**
   * Optional capability key that must be 'available' for this card to show data.
   * If the capability is absent or not 'available', `unavailableBehaviour` applies.
   */
  capability?: string;
  /**
   * The scope of the displayed value — drives the secondary label wording.
   *   connection:      balance or metric scoped to the connected account
   *   filtered_result: count/sum over the full filtered result set
   *   current_page:    count/sum from the currently loaded page only
   */
  scope: SummaryCardScope;
  /**
   * What to do when the capability is unavailable.
   *   hide:          omit the card from the definition entirely (done server-side)
   *   not_supported: show "Not supported" text; never fire the data request
   *   unavailable:   show "Unavailable" text; never fire the data request
   */
  unavailableBehaviour: SummaryCardUnavailableBehaviour;
  format?: {
    /** For 'amount' type: which field/source drives the currency code. */
    currencySource?: string;
    /** Decimal places for formatted amounts (default: provider standard). */
    decimals?: number;
  };
}

// ─── Filter definition ────────────────────────────────────────────────────────

export type FilterType =
  | 'search'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'date_range';

export type FilterOptionsSource =
  | 'payment_units'
  | 'payment_statuses'
  | 'payment_methods'
  | 'provider';

export interface PaymentFilterDefinition {
  /** Unique stable key within a definition. */
  key: string;
  /** Human-readable filter label. */
  label: string;
  /** Control type. */
  type: FilterType;
  /** The URL / API query parameter this filter populates. */
  queryParam: string;
  /**
   * If set, the filter is only rendered when this capability is 'available'.
   * When the capability is absent, the filter is removed from the definition.
   */
  capability?: string;
  /** Where to fetch options for 'select' or 'multi_select' filters. */
  optionsSource?: FilterOptionsSource;
  placeholder?: string;
  /** Whether the filter value must be cleared when the provider selection changes. */
  resetOnProviderChange: boolean;
  /** Whether the filter value must be cleared when the connection selection changes. */
  resetOnConnectionChange: boolean;
}

// ─── Column definition ────────────────────────────────────────────────────────

export type ColumnType =
  | 'identifier'
  | 'amount'
  | 'payment_unit'
  | 'method'
  | 'status'
  | 'date'
  | 'text'
  | 'actions';

export interface PaymentColumnDefinition {
  /** Unique stable key within a definition (used as GridColDef field). */
  key: string;
  /** Column header label. */
  label: string;
  /** Rendering type — controls how the cell value is formatted. */
  type: ColumnType;
  /**
   * Primary field path in PaymentSummary.
   * Required for all types except 'actions'.
   */
  field?: string;
  /**
   * Optional secondary field shown below the primary value
   * (e.g. description below providerPaymentId).
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

// ─── Action definition ────────────────────────────────────────────────────────

export type ActionType = 'view' | 'open_url' | 'refund' | 'cancel' | 'capture';

export interface PaymentActionDefinition {
  /** Unique stable key within a definition. */
  key: string;
  /** Tooltip / aria-label for the action button. */
  label: string;
  /** What the action does. */
  type: ActionType;
  /** Only render this action when this capability is 'available'. */
  capability?: string;
  /**
   * For 'open_url': the field in PaymentSummary that contains the safe URL.
   * The action is hidden when this field is falsy on the row.
   */
  field?: string;
  confirmationRequired?: boolean;
  /** Future RBAC permission key. */
  permission?: string;
}

// ─── Page definition ──────────────────────────────────────────────────────────

export interface PaymentsPageDefinition {
  /** Stable provider key from the adapter. */
  providerKey: string;
  /** ProviderCredentials._id of the selected connection. */
  connectionId: string;
  /** Semantic version of this definition schema. */
  version: string;
  /**
   * Effective capabilities after intersecting provider-level and
   * connection-level capability maps.
   * The frontend uses this to drive conditional behaviour without
   * branching on providerKey.
   */
  capabilities: Partial<Record<string, CapabilityStatus>>;
  summaryCards: PaymentSummaryCardDefinition[];
  filters: PaymentFilterDefinition[];
  columns: PaymentColumnDefinition[];
  rowActions: PaymentActionDefinition[];
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

export interface PaymentsPageDefinitionContext {
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
   * Rules:
   *   - unsupported at either level → unsupported
   *   - planned at either level → planned
   *   - available only when both levels allow it (or connection doesn't restrict it)
   */
  effectiveCapabilities: Partial<Record<string, CapabilityStatus>>;
}

// ─── Capability intersection ──────────────────────────────────────────────────

export function intersectCapabilities(
  providerCaps: Partial<Record<string, CapabilityStatus>>,
  connectionCaps: Partial<Record<string, CapabilityStatus>>,
): Partial<Record<string, CapabilityStatus>> {
  const result: Partial<Record<string, CapabilityStatus>> = { ...providerCaps };

  for (const [key, connStatus] of Object.entries(connectionCaps)) {
    const provStatus = providerCaps[key];

    if (connStatus === CS.Unsupported || provStatus === CS.Unsupported) {
      result[key] = CS.Unsupported;
    } else if (provStatus === CS.Planned || connStatus === CS.Planned) {
      result[key] = CS.Planned;
    } else {
      // Both available (or connection entry is available and provider is too)
      result[key] = CS.Available;
    }
  }

  return result;
}

/**
 * Computes connection-level capabilities from the provider map plus
 * environment-specific restrictions.
 *
 * For most providers and connections, this equals the provider map.
 * Environment restrictions currently applied:
 *   - paymentTesting is only sensible in test/sandbox mode.
 */
export function computeConnectionCapabilities(
  providerCapabilities: Partial<Record<string, CapabilityStatus>>,
  environment: 'test' | 'live' | null,
): Partial<Record<string, CapabilityStatus>> {
  const caps: Partial<Record<string, CapabilityStatus>> = {
    ...providerCapabilities,
  };

  if (
    environment === 'live' &&
    caps[PaymentCapability.PaymentTesting] === CS.Available
  ) {
    caps[PaymentCapability.PaymentTesting] = CS.Unsupported;
  }

  return caps;
}

// ─── Definition component filtering ──────────────────────────────────────────

/**
 * Removes components whose capability is not 'available' and whose
 * `unavailableBehaviour` is 'hide'.
 *
 * Components with 'not_supported' or 'unavailable' behaviour are kept in the
 * definition so the frontend can render the appropriate placeholder.
 * Filters, columns and actions without an explicit capability restriction are
 * always kept.
 */
export function filterDefinitionComponents(
  definition: PaymentsPageDefinition,
  effectiveCapabilities: Partial<Record<string, CapabilityStatus>>,
): PaymentsPageDefinition {
  const isAvailable = (cap?: string): boolean =>
    !cap || effectiveCapabilities[cap] === CS.Available;

  return {
    ...definition,
    summaryCards: definition.summaryCards.filter((c) => {
      if (!c.capability) return true;
      if (isAvailable(c.capability)) return true;
      return c.unavailableBehaviour !== 'hide';
    }),
    filters: definition.filters.filter((f) => isAvailable(f.capability)),
    columns: definition.columns.filter((c) => isAvailable(c.capability)),
    rowActions: definition.rowActions.filter((a) => isAvailable(a.capability)),
  };
}

// ─── Generic default definition ───────────────────────────────────────────────

/**
 * Builds a provider-neutral page definition for providers that support payment
 * listing but have not implemented a custom definition.
 *
 * This default is intentionally conservative: only the most universally
 * supported cards, filters, and columns are included.
 */
export function buildGenericPageDefinition(
  providerKey: string,
  connectionId: string,
  effectiveCapabilities: Partial<Record<string, CapabilityStatus>>,
): PaymentsPageDefinition {
  return {
    providerKey,
    connectionId,
    version: '1.0',
    capabilities: effectiveCapabilities,
    summaryCards: [
      {
        key: 'succeeded',
        label: 'Successful Payments',
        type: 'count',
        source: 'page.status',
        status: 'succeeded' as PaymentCanonicalStatus,
        scope: 'current_page',
        unavailableBehaviour: 'hide',
      },
      {
        key: 'failed',
        label: 'Failed Payments',
        type: 'count',
        source: 'page.status',
        status: 'failed' as PaymentCanonicalStatus,
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
        label: 'Currency / Asset',
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
      supported: true,
      defaultPageSize: 20,
      allowedPageSizes: [20, 50],
      paginationType: 'cursor',
    },
    emptyState: {
      title: 'No payments found',
      description: 'Payments from the connected provider will appear here.',
    },
  };
}

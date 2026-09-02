'use client';

/**
 * Payments module context — provider-centric.
 *
 * Two-level selection hierarchy:
 *   Company → Configured Payment Providers (from CompanyChannelProvider)
 *       → Selected Provider
 *           → Active Connections for that Provider (from ProviderCredentials)
 *               → Selected Connection
 *
 * Source of truth for each level:
 *   Providers   — CompanyChannelProvider filtered to channelKey='payment', isActive=true
 *   Connections — ProviderCredentials filtered to the selected provider's providerKey
 *
 * Architecture principle: the payment provider API is the source of truth for
 * all provider resources (balance, payment methods, etc.). Graphify stores only
 * credentials and configuration.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import {
  usePaymentProviders,
  usePaymentAccounts,
  useProviderCapabilities,
  usePaymentsPageDefinition,
} from '@/hooks/api/usePayments';
import type {
  PaymentProviderOption,
  PaymentAccountSummary,
  ProviderCapabilityStatus,
  PaymentsPageDefinition,
} from '@/types/payments';

// ─── Context shape ────────────────────────────────────────────────────────────

export interface PaymentsContextValue {
  // ── Provider level — sourced from CompanyChannelProvider ─────────────────

  /** Active payment providers configured for this company. */
  availableProviderOptions: PaymentProviderOption[];
  providersLoading: boolean;
  providersError: Error | null;

  /**
   * The CCP id the user explicitly chose.
   * Empty string = no explicit choice; auto-selection may apply.
   */
  selectedProviderId: string;

  /**
   * Sets the selected provider by its CCP id and clears the connection
   * selection so that auto-selection re-runs for the new provider.
   */
  setSelectedProviderId: (ccpId: string) => void;

  /**
   * Effective CCP id: `selectedProviderId` when valid, or the only available
   * provider when exactly one exists. Empty string when unresolvable.
   */
  resolvedProviderId: string;

  /** Stable provider key (e.g. 'stripe') for the resolved provider. */
  resolvedProviderKey: string;

  /** Full option record for the resolved provider. Null when unresolved. */
  selectedProvider: PaymentProviderOption | null;

  // ── Capability level — sourced from GET /payments/providers/:key/capabilities
  // Fetched once per resolved provider; cached for 5 minutes.
  // capabilitiesLoading is true only while the initial fetch is in flight.

  /** Map of capability key → status for the resolved provider. Null while loading or no provider. */
  providerCapabilities: Partial<Record<string, ProviderCapabilityStatus>> | null;
  capabilitiesLoading: boolean;

  // ── Page definition level — sourced from GET /payments/connections/:id/page-definition
  // Fetched once per resolved connection; stale after 60 s.
  // Drives all Payments list page UI: cards, filters, columns, actions.

  /** Canonical page definition for the resolved connection. Null while loading or no connection. */
  pageDefinition: PaymentsPageDefinition | null;
  pageDefinitionLoading: boolean;
  pageDefinitionError: Error | null;

  /**
   * Returns the status for a single capability key.
   * Returns null when no provider is resolved or capabilities are still loading.
   * Returns 'unsupported' for any key absent from the provider's declaration.
   */
  getCapabilityStatus: (capabilityKey: string) => ProviderCapabilityStatus | null;

  // ── Connection level — sourced from ProviderCredentials ───────────────────

  /**
   * All active configured connections for this company.
   * (= ProviderCredentials summaries from GET /payments/accounts)
   */
  connections: PaymentAccountSummary[];
  connectionsLoading: boolean;
  connectionsError: Error | null;

  /** Connections belonging to the resolved provider (filtered by providerKey). */
  availableConnections: PaymentAccountSummary[];

  /** ProviderCredentials._id the user explicitly chose. */
  selectedConnectionId: string;
  setSelectedConnectionId: (id: string) => void;

  /**
   * Effective connection id. Empty string when unresolvable.
   * All provider-resource queries must use this — never `selectedConnectionId`.
   */
  resolvedConnectionId: string;

  /** Full summary record for `resolvedConnectionId`. Null when unresolved. */
  selectedConnection: PaymentAccountSummary | null;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const PaymentsContext = createContext<PaymentsContextValue | null>(null);

// ─── Label helpers ────────────────────────────────────────────────────────────

export function connectionLabel(c: PaymentAccountSummary): string {
  const parts: string[] = [c.tag];
  if (c.displayIdentifier) parts.push(c.displayIdentifier);
  return parts.join(' — ');
}

// ─── Provider component ────────────────────────────────────────────────────────

export function PaymentsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selectedProviderId, setSelectedProviderIdRaw] = useState<string>('');
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');

  // ── Load providers from CompanyChannelProvider ────────────────────────────
  const {
    providers: availableProviderOptions,
    isLoading: providersLoading,
    error: providersError,
  } = usePaymentProviders();

  // ── Provider resolution ───────────────────────────────────────────────────
  // Must happen before capability fetch so resolvedProviderKey is available.

  const resolvedProviderId = useMemo(() => {
    if (
      selectedProviderId &&
      availableProviderOptions.some((p) => p.ccpId === selectedProviderId)
    ) {
      return selectedProviderId;
    }
    if (availableProviderOptions.length === 1) {
      return availableProviderOptions[0].ccpId;
    }
    return '';
  }, [selectedProviderId, availableProviderOptions]);

  const selectedProvider = useMemo(
    () =>
      availableProviderOptions.find((p) => p.ccpId === resolvedProviderId) ??
      null,
    [availableProviderOptions, resolvedProviderId],
  );

  const resolvedProviderKey = selectedProvider?.providerKey ?? '';

  // ── Load provider capabilities (re-fetches when resolved provider changes) ──
  const {
    data: capabilitiesData,
    isLoading: capabilitiesLoading,
  } = useProviderCapabilities(resolvedProviderKey || null);

  const providerCapabilities = capabilitiesData?.capabilities ?? null;

  const getCapabilityStatus = useCallback(
    (capabilityKey: string): ProviderCapabilityStatus | null => {
      if (!resolvedProviderKey || capabilitiesLoading || !providerCapabilities) return null;
      return providerCapabilities[capabilityKey] ?? 'unsupported';
    },
    [resolvedProviderKey, capabilitiesLoading, providerCapabilities],
  );

  // ── Load all active connections (ProviderCredentials summaries) ───────────
  const {
    data: accountsData,
    isLoading: connectionsLoading,
    error: connectionsError,
  } = usePaymentAccounts({ isActive: true });

  const connections = useMemo(
    () => accountsData?.data ?? [],
    [accountsData],
  );

  // ── Connection resolution (filtered to selected provider) ────────────────

  const availableConnections = useMemo(
    () =>
      connections.filter((c) => c.providerKey === resolvedProviderKey),
    [connections, resolvedProviderKey],
  );

  const resolvedConnectionId = useMemo(() => {
    if (
      selectedConnectionId &&
      availableConnections.some((c) => c.id === selectedConnectionId)
    ) {
      return selectedConnectionId;
    }
    if (availableConnections.length === 1) return availableConnections[0].id;
    return '';
  }, [selectedConnectionId, availableConnections]);

  const selectedConnection = useMemo(
    () =>
      availableConnections.find((c) => c.id === resolvedConnectionId) ?? null,
    [availableConnections, resolvedConnectionId],
  );

  // ── Load page definition (re-fetches when resolved connection changes) ──────
  const {
    data: pageDefinitionData,
    isLoading: pageDefinitionLoading,
    error: pageDefinitionError,
  } = usePaymentsPageDefinition(resolvedConnectionId || null);

  // ── Setters ───────────────────────────────────────────────────────────────

  // Changing provider clears the connection selection so auto-selection re-runs.
  const setSelectedProviderId = useCallback((ccpId: string) => {
    setSelectedProviderIdRaw(ccpId);
    setSelectedConnectionId('');
  }, []);

  // ── Context value ─────────────────────────────────────────────────────────

  const value = useMemo(
    () => ({
      availableProviderOptions,
      providersLoading,
      providersError,
      selectedProviderId,
      setSelectedProviderId,
      resolvedProviderId,
      resolvedProviderKey,
      selectedProvider,
      providerCapabilities,
      capabilitiesLoading,
      getCapabilityStatus,
      connections,
      connectionsLoading,
      connectionsError: connectionsError as Error | null,
      availableConnections,
      selectedConnectionId,
      setSelectedConnectionId,
      resolvedConnectionId,
      selectedConnection,
      pageDefinition: pageDefinitionData ?? null,
      pageDefinitionLoading,
      pageDefinitionError: pageDefinitionError as Error | null,
    }),
    [
      availableProviderOptions,
      providersLoading,
      providersError,
      selectedProviderId,
      setSelectedProviderId,
      resolvedProviderId,
      resolvedProviderKey,
      selectedProvider,
      providerCapabilities,
      capabilitiesLoading,
      getCapabilityStatus,
      connections,
      connectionsLoading,
      connectionsError,
      availableConnections,
      selectedConnectionId,
      resolvedConnectionId,
      selectedConnection,
      pageDefinitionData,
      pageDefinitionLoading,
      pageDefinitionError,
    ],
  );

  return (
    <PaymentsContext.Provider value={value}>
      {children}
    </PaymentsContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePaymentsContext(): PaymentsContextValue {
  const ctx = useContext(PaymentsContext);
  if (!ctx) {
    throw new Error(
      'usePaymentsContext must be called inside a PaymentsProvider.',
    );
  }
  return ctx;
}

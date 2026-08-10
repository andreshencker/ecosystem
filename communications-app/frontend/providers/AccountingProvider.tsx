'use client';

/**
 * Accounting module context — provider-centric.
 *
 * Two-level selection hierarchy:
 *   Company → Configured Accounting Providers (CompanyChannelProvider, channelKey='accounting')
 *       → Selected Provider
 *           → Active Connections for that Provider (ProviderCredentials, accounting channel)
 *               → Selected Connection
 *
 * Source of truth:
 *   Providers    — CompanyChannelProvider filtered to channelKey='accounting', isActive=true
 *   Connections  — ProviderCredentials filtered to selected provider, accounting channel, isActive=true
 *   Capabilities — GET /accounting/providers/:key/capabilities (5-min cache)
 *
 * Provider-neutral: any accounting provider (QuickBooks, MYOB, Sage) works
 * without changing this context once its adapter is registered in the backend.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import {
  useAccountingProviders,
  useAccountingCredentials,
  useAccountingProviderCapabilities,
} from '@/hooks/api/useAccounting';
import type {
  AccountingProviderOption,
  AccountingCredentialSummary,
  AccountingCapabilityStatus,
} from '@/types/accounting';

// ─── Context shape ────────────────────────────────────────────────────────────

export interface AccountingContextValue {
  // ── Provider level ────────────────────────────────────────────────────────

  /** Accounting providers configured for this company. */
  availableProviderOptions: AccountingProviderOption[];
  providersLoading: boolean;
  providersError: Error | null;

  /** The CCP id the user explicitly chose. Empty = no choice. */
  selectedProviderId: string;
  setSelectedProviderId: (ccpId: string) => void;

  /**
   * Effective CCP id. Auto-selects when exactly one provider exists.
   * Empty string when unresolvable.
   */
  resolvedProviderId: string;

  /** Stable provider key (e.g. 'xero') for the resolved provider. */
  resolvedProviderKey: string;

  /** Full option record for the resolved provider. Null when unresolved. */
  selectedProvider: AccountingProviderOption | null;

  // ── Capability level ──────────────────────────────────────────────────────

  providerCapabilities: Partial<Record<string, AccountingCapabilityStatus>> | null;
  capabilitiesLoading: boolean;

  /**
   * Returns the status for a single capability key.
   * Returns null when no provider is resolved or capabilities are loading.
   * Returns 'unsupported' for any key absent from the provider declaration.
   */
  getCapabilityStatus: (capabilityKey: string) => AccountingCapabilityStatus | null;

  // ── Connection level ──────────────────────────────────────────────────────

  /** Active connections for the selected provider (from ProviderCredentials). */
  availableConnections: AccountingCredentialSummary[];
  connectionsLoading: boolean;
  connectionsError: Error | null;

  /** ProviderCredentials._id the user explicitly chose. */
  selectedConnectionId: string;
  setSelectedConnectionId: (id: string) => void;

  /**
   * Effective connection id. All banking queries must use this — never
   * selectedConnectionId directly.
   */
  resolvedConnectionId: string;

  /** Full credential record for resolvedConnectionId. Null when unresolved. */
  selectedConnection: AccountingCredentialSummary | null;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AccountingContext = createContext<AccountingContextValue | null>(null);

// ─── Label helper ─────────────────────────────────────────────────────────────

export function accountingConnectionLabel(c: AccountingCredentialSummary): string {
  const parts: string[] = [c.tag];
  if (c.displayIdentifier) parts.push(c.displayIdentifier);
  return parts.join(' — ');
}

// ─── Provider component ───────────────────────────────────────────────────────

export function AccountingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selectedProviderId, setSelectedProviderIdRaw] = useState<string>('');
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');

  // ── Load accounting providers from CompanyChannelProvider ─────────────────
  const {
    providers: availableProviderOptions,
    isLoading: providersLoading,
    error: providersError,
  } = useAccountingProviders();

  // ── Provider resolution ───────────────────────────────────────────────────

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

  // ── Load capabilities ─────────────────────────────────────────────────────

  const { data: capabilitiesData, isLoading: capabilitiesLoading } =
    useAccountingProviderCapabilities(resolvedProviderKey || null);

  const providerCapabilities = capabilitiesData?.capabilities ?? null;

  const getCapabilityStatus = useCallback(
    (capabilityKey: string): AccountingCapabilityStatus | null => {
      if (!resolvedProviderKey || capabilitiesLoading || !providerCapabilities)
        return null;
      return providerCapabilities[capabilityKey] ?? 'unsupported';
    },
    [resolvedProviderKey, capabilitiesLoading, providerCapabilities],
  );

  // ── Load accounting credentials for the selected provider ─────────────────

  const {
    credentials,
    isLoading: connectionsLoading,
    error: connectionsError,
  } = useAccountingCredentials(resolvedProviderKey || null);

  // ── Connection resolution ─────────────────────────────────────────────────

  const availableConnections = credentials; // already filtered to provider + channel

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

  // ── Setters ───────────────────────────────────────────────────────────────

  // Changing provider clears connection selection so auto-selection re-runs.
  const setSelectedProviderId = useCallback((ccpId: string) => {
    setSelectedProviderIdRaw(ccpId);
    setSelectedConnectionId('');
  }, []);

  // ── Context value ─────────────────────────────────────────────────────────

  const value = useMemo<AccountingContextValue>(
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
      availableConnections,
      connectionsLoading,
      connectionsError: connectionsError as Error | null,
      selectedConnectionId,
      setSelectedConnectionId,
      resolvedConnectionId,
      selectedConnection,
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
      availableConnections,
      connectionsLoading,
      connectionsError,
      selectedConnectionId,
      resolvedConnectionId,
      selectedConnection,
    ],
  );

  return (
    <AccountingContext.Provider value={value}>
      {children}
    </AccountingContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAccountingContext(): AccountingContextValue {
  const ctx = useContext(AccountingContext);
  if (!ctx) {
    throw new Error(
      'useAccountingContext must be called inside an AccountingProvider.',
    );
  }
  return ctx;
}

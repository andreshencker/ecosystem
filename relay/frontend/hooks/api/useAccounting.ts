'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { apiClient } from '@/lib/axios';
import { useAuthStore } from '@/stores/auth.store';
import { useCompanyChannelProviders } from '@/hooks/api/useCompanyChannelProviders';
import { useAllCompanyCredentials } from '@/hooks/api/useProviderCredentials';
import { useUIStore } from '@/stores/ui.store';
import { extractApiMessage } from '@/lib/mapApiError';
import type {
  AccountingProviderOption,
  AccountingCredentialSummary,
  AccountingProviderCapabilitiesResponse,
  AccountingListResult,
  BankAccountSummary,
  BankAccountDetail,
  BankAccountBalance,
  ListBankAccountsParams,
  BankTransactionSummary,
  ListBankTransactionsParams,
  AccountSummary,
  AccountDetail,
  CreateAccountInput,
  UpdateAccountInput,
  ArchiveAccountResult,
  DeleteAccountResult,
  ListAccountsParams,
  ManualJournalSummary,
  ManualJournalDetail,
  CreateManualJournalInput,
  UpdateManualJournalInput,
  ListManualJournalsParams,
  JournalSummary,
  ListJournalsParams,
} from '@/types/accounting';

// ─── Retry policy ──────────────────────────────────────────────────────────────
// 4xx errors are definitive (provider does not support the capability or the
// resource does not exist) — never retry. 5xx / network errors may recover.

function retrySkip4xx(failureCount: number, error: unknown): boolean {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  if (status !== undefined && status >= 400 && status < 500) return false;
  return failureCount < 1;
}

// ─── Accounting providers ─────────────────────────────────────────────────────
//
// Sources from CompanyChannelProvider filtered to channelKey='accounting'.
// Never shows providers from other channels (payment, billing, etc.).

export function useAccountingProviders(): {
  providers: AccountingProviderOption[];
  isLoading: boolean;
  error: Error | null;
} {
  const companyId = useAuthStore((s) => s.companyId);

  const { data, isLoading, error } = useCompanyChannelProviders(companyId, {
    active: true,
    populate: true,
    limit: 100,
  });

  const providers = useMemo<AccountingProviderOption[]>(() => {
    if (!data?.items) return [];

    return data.items
      .filter(
        (ccp) => ccp.channel?.channelKey === 'accounting' && ccp.isActive,
      )
      .map((ccp) => {
        const providerId =
          typeof ccp.providerId === 'string'
            ? ccp.providerId
            : (ccp.providerId as { id?: string })?.id ?? '';

        return {
          ccpId:       ccp.id,
          providerId,
          providerKey: ccp.provider?.providerKey ?? '',
          displayName:
            ccp.provider?.displayName ?? ccp.provider?.providerKey ?? '',
          isActive: ccp.isActive,
        };
      })
      .filter((p) => Boolean(p.providerKey));
  }, [data]);

  return { providers, isLoading, error: error as Error | null };
}

// ─── Accounting credentials ───────────────────────────────────────────────────
//
// Sources from ProviderCredentials filtered to accounting channel + selected provider.
// Populates companyChannelProvider so we can read channelKey and providerKey.

export function useAccountingCredentials(
  providerKey: string | null,
): {
  credentials: AccountingCredentialSummary[];
  isLoading: boolean;
  error: Error | null;
} {
  const companyId = useAuthStore((s) => s.companyId);

  const { data, isLoading, error } = useAllCompanyCredentials(companyId, {
    active: true,
  });

  const credentials = useMemo<AccountingCredentialSummary[]>(() => {
    if (!data?.items || !providerKey) return [];

    return data.items
      .filter((cred) => {
        const ccp = cred.companyChannelProvider;
        return (
          ccp?.channel?.channelKey === 'accounting' &&
          ccp?.provider?.providerKey === providerKey &&
          cred.isActive
        );
      })
      .map((cred) => ({
        id:                cred.id,
        providerKey:       cred.companyChannelProvider?.provider?.providerKey ?? '',
        tag:               cred.tag,
        displayIdentifier: cred.displayIdentifier,
        isActive:          cred.isActive,
        connectedAt:       cred.createdAt ?? null,
      }));
  }, [data, providerKey]);

  return { credentials, isLoading, error: error as Error | null };
}

// ─── Provider capabilities ────────────────────────────────────────────────────
//
// Fetches the declared capability map for a provider.
// Global metadata — no company context required.
// Cached for 5 minutes; re-fetches when providerKey changes.

export function useAccountingProviderCapabilities(
  providerKey: string | null | undefined,
) {
  return useQuery({
    queryKey: ['accounting', 'capabilities', providerKey],
    queryFn: () =>
      apiClient
        .get<AccountingProviderCapabilitiesResponse>(
          `/accounting/providers/${providerKey!}/capabilities`,
        )
        .then((r) => r.data),
    enabled: Boolean(providerKey),
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Banking: list bank accounts ──────────────────────────────────────────────

export function useBankAccounts(
  credentialId: string | null | undefined,
  params: ListBankAccountsParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery<AccountingListResult<BankAccountSummary>, Error>({
    queryKey: ['accounting', 'banking', 'accounts', credentialId, params],
    queryFn: () =>
      apiClient
        .get<AccountingListResult<BankAccountSummary>>(
          `/accounting/banking/${credentialId!}/accounts`,
          { params },
        )
        .then((r) => r.data),
    enabled: Boolean(credentialId) && (options.enabled !== false),
    retry: retrySkip4xx,
  });
}

// ─── Banking: get single bank account ────────────────────────────────────────

export function useBankAccount(
  credentialId: string | null | undefined,
  accountId: string | null | undefined,
  options: { enabled?: boolean } = {},
) {
  return useQuery<BankAccountDetail, Error>({
    queryKey: ['accounting', 'banking', 'account', credentialId, accountId],
    queryFn: () =>
      apiClient
        .get<BankAccountDetail>(
          `/accounting/banking/${credentialId!}/accounts/${accountId!}`,
        )
        .then((r) => r.data),
    enabled:
      Boolean(credentialId) &&
      Boolean(accountId) &&
      (options.enabled !== false),
    retry: retrySkip4xx,
  });
}

// ─── Banking: get bank account balance ───────────────────────────────────────

export function useBankAccountBalance(
  credentialId: string | null | undefined,
  accountId: string | null | undefined,
  options: { enabled?: boolean } = {},
) {
  return useQuery<BankAccountBalance, Error>({
    queryKey: ['accounting', 'banking', 'balance', credentialId, accountId],
    queryFn: () =>
      apiClient
        .get<BankAccountBalance>(
          `/accounting/banking/${credentialId!}/accounts/${accountId!}/balance`,
        )
        .then((r) => r.data),
    enabled:
      Boolean(credentialId) &&
      Boolean(accountId) &&
      (options.enabled !== false),
    retry: retrySkip4xx,
  });
}

// ─── Bank Transactions ────────────────────────────────────────────────────────

export function useBankTransactions(
  credentialId: string | null | undefined,
  bankAccountId: string | null | undefined,
  params: ListBankTransactionsParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery<AccountingListResult<BankTransactionSummary>, Error>({
    queryKey: ['accounting', 'banking', 'transactions', credentialId, bankAccountId, params],
    queryFn: () =>
      apiClient
        .get<AccountingListResult<BankTransactionSummary>>(
          `/accounting/banking/${credentialId!}/accounts/${bankAccountId!}/transactions`,
          { params },
        )
        .then((r) => r.data),
    enabled:
      Boolean(credentialId) &&
      Boolean(bankAccountId) &&
      (options.enabled !== false),
    retry: retrySkip4xx,
  });
}

// ─── Chart of Accounts: list ──────────────────────────────────────────────────

const COA_BASE = (credentialId: string) =>
  `/accounting/chart-of-accounts/${credentialId}/accounts`;

export function useAccounts(
  credentialId: string | null | undefined,
  params: ListAccountsParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery<AccountingListResult<AccountSummary>, Error>({
    queryKey: ['accounting', 'coa', 'list', credentialId, params],
    queryFn: () =>
      apiClient
        .get<AccountingListResult<AccountSummary>>(COA_BASE(credentialId!), { params })
        .then((r) => r.data),
    enabled: Boolean(credentialId) && options.enabled !== false,
    retry: retrySkip4xx,
  });
}

// ─── Chart of Accounts: get single ───────────────────────────────────────────

export function useAccount(
  credentialId: string | null | undefined,
  accountId: string | null | undefined,
  options: { enabled?: boolean } = {},
) {
  return useQuery<AccountDetail, Error>({
    queryKey: ['accounting', 'coa', 'detail', credentialId, accountId],
    queryFn: () =>
      apiClient
        .get<AccountDetail>(`${COA_BASE(credentialId!)}/${accountId!}`)
        .then((r) => r.data),
    enabled: Boolean(credentialId) && Boolean(accountId) && options.enabled !== false,
    retry: retrySkip4xx,
  });
}

// ─── Chart of Accounts: create ────────────────────────────────────────────────

export function useCreateAccountMutation(credentialId: string | null | undefined) {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);
  return useMutation<AccountDetail, Error, CreateAccountInput>({
    mutationFn: (dto) =>
      apiClient
        .post<AccountDetail>(COA_BASE(credentialId!), dto)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounting', 'coa', 'list', credentialId] });
      pushSnack({ type: 'success', message: 'Account created.' });
    },
    onError: (err) =>
      pushSnack({ type: 'error', message: extractApiMessage(err, 'Could not create account.') }),
  });
}

// ─── Chart of Accounts: update ────────────────────────────────────────────────

export function useUpdateAccountMutation(credentialId: string | null | undefined) {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);
  return useMutation<AccountDetail, Error, { accountId: string; dto: UpdateAccountInput }>({
    mutationFn: ({ accountId, dto }) =>
      apiClient
        .patch<AccountDetail>(`${COA_BASE(credentialId!)}/${accountId}`, dto)
        .then((r) => r.data),
    onSuccess: (_data, { accountId }) => {
      qc.invalidateQueries({ queryKey: ['accounting', 'coa', 'list', credentialId] });
      qc.invalidateQueries({ queryKey: ['accounting', 'coa', 'detail', credentialId, accountId] });
      pushSnack({ type: 'success', message: 'Account updated.' });
    },
    onError: (err) =>
      pushSnack({ type: 'error', message: extractApiMessage(err, 'Could not update account.') }),
  });
}

// ─── Chart of Accounts: archive ───────────────────────────────────────────────

export function useArchiveAccountMutation(credentialId: string | null | undefined) {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);
  return useMutation<ArchiveAccountResult, Error, string>({
    mutationFn: (accountId) =>
      apiClient
        .post<ArchiveAccountResult>(`${COA_BASE(credentialId!)}/${accountId}/archive`)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounting', 'coa', 'list', credentialId] });
      pushSnack({ type: 'success', message: 'Account archived.' });
    },
    onError: (err) =>
      pushSnack({ type: 'error', message: extractApiMessage(err, 'Could not archive account.') }),
  });
}

// ─── Chart of Accounts: delete ────────────────────────────────────────────────

export function useDeleteAccountMutation(credentialId: string | null | undefined) {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);
  return useMutation<DeleteAccountResult, Error, string>({
    mutationFn: (accountId) =>
      apiClient
        .delete<DeleteAccountResult>(`${COA_BASE(credentialId!)}/${accountId}`)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounting', 'coa', 'list', credentialId] });
      pushSnack({ type: 'success', message: 'Account deleted.' });
    },
    onError: (err) =>
      pushSnack({ type: 'error', message: extractApiMessage(err, 'Could not delete account.') }),
  });
}

// ─── Manual Journals ──────────────────────────────────────────────────────────

const MJ_BASE = (credentialId: string) =>
  `/accounting/manual-journals/${credentialId}`;

export function useManualJournals(
  credentialId: string | null | undefined,
  params: ListManualJournalsParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery<AccountingListResult<ManualJournalSummary>, Error>({
    queryKey: ['accounting', 'manual-journals', 'list', credentialId, params],
    queryFn: () =>
      apiClient
        .get<AccountingListResult<ManualJournalSummary>>(MJ_BASE(credentialId!), { params })
        .then((r) => r.data),
    enabled: options.enabled !== false && Boolean(credentialId),
    staleTime: 30_000,
    retry: retrySkip4xx,
  });
}

export function useManualJournal(
  credentialId: string | null | undefined,
  manualJournalId: string | null | undefined,
  options: { enabled?: boolean } = {},
) {
  return useQuery<ManualJournalDetail, Error>({
    queryKey: ['accounting', 'manual-journals', 'detail', credentialId, manualJournalId],
    queryFn: () =>
      apiClient
        .get<ManualJournalDetail>(`${MJ_BASE(credentialId!)}/${manualJournalId}`)
        .then((r) => r.data),
    enabled: options.enabled !== false && Boolean(credentialId) && Boolean(manualJournalId),
    staleTime: 30_000,
    retry: retrySkip4xx,
  });
}

export function useCreateManualJournalMutation(credentialId: string | null | undefined) {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);
  return useMutation<ManualJournalDetail, Error, CreateManualJournalInput>({
    mutationFn: (dto) =>
      apiClient
        .post<ManualJournalDetail>(MJ_BASE(credentialId!), dto)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounting', 'manual-journals', 'list', credentialId] });
      pushSnack({ type: 'success', message: 'Manual journal created.' });
    },
    onError: (err) =>
      pushSnack({ type: 'error', message: extractApiMessage(err, 'Could not create manual journal.') }),
  });
}

export function useUpdateManualJournalMutation(credentialId: string | null | undefined) {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);
  return useMutation<ManualJournalDetail, Error, { manualJournalId: string; dto: UpdateManualJournalInput }>({
    mutationFn: ({ manualJournalId, dto }) =>
      apiClient
        .patch<ManualJournalDetail>(`${MJ_BASE(credentialId!)}/${manualJournalId}`, dto)
        .then((r) => r.data),
    onSuccess: (_data, { manualJournalId }) => {
      qc.invalidateQueries({ queryKey: ['accounting', 'manual-journals', 'list', credentialId] });
      qc.invalidateQueries({ queryKey: ['accounting', 'manual-journals', 'detail', credentialId, manualJournalId] });
      pushSnack({ type: 'success', message: 'Manual journal updated.' });
    },
    onError: (err) =>
      pushSnack({ type: 'error', message: extractApiMessage(err, 'Could not update manual journal.') }),
  });
}

// ─── General Ledger ───────────────────────────────────────────────────────────

const GL_BASE = (credentialId: string) =>
  `/accounting/general-ledger/${credentialId}/journals`;

export function useGeneralLedgerJournals(
  credentialId: string | null | undefined,
  params: ListJournalsParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery<AccountingListResult<JournalSummary>, Error>({
    queryKey: ['accounting', 'gl', 'list', credentialId, params],
    queryFn: () =>
      apiClient
        .get<AccountingListResult<JournalSummary>>(GL_BASE(credentialId!), { params })
        .then((r) => r.data),
    enabled: options.enabled !== false && Boolean(credentialId),
    staleTime: 30_000,
    retry: retrySkip4xx,
  });
}

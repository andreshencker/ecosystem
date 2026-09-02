'use client';

// Generic hooks for the OAuth connection lifecycle.
//
// All hooks take an `oauthBasePath` parameter (e.g. '/accounting/oauth/xero')
// so the same hooks work for any future OAuth provider without branching.
//
// API calls use apiClient (JWT-authenticated) — these endpoints are protected
// by the NestJS GlobalAuthGuard, not by the engine x-api-key.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OAuthStartResult {
  authorizationUrl: string;
}

export interface OAuthStartParams {
  providerCredentialsId: string;
  returnPath?: string;
}

/**
 * Safe connection status returned after verifying an OAuth connection.
 * Never contains tokens, client secrets, or raw provider payloads.
 */
export interface OAuthConnectionStatus {
  connected: boolean;
  providerKey: string;
  /** Redacted (first 8 + last 4 chars) tenant ID — safe for display. */
  tenantIdHint: string | null;
  tenantName: string | null;
  organisationName: string | null;
  /** Granted OAuth scopes summary — not a secret. */
  grantedScopes: string | null;
  /** ISO timestamp when the current access token expires. */
  tokenExpiresAt: string | null;
  /** ISO timestamp of the verification call. */
  checkedAt: string;
  /** Human-readable reason when connected is false. */
  reason?: string;
}

export interface OAuthTenantOption {
  connectionId: string;
  tenantId: string;
  tenantType: string;
  tenantName: string | null;
}

export interface OAuthDisconnectResult {
  disconnected: boolean;
  tenantName: string | null;
}

export interface OAuthSelectTenantResult {
  credentialId: string;
  tenantName: string | null;
}

/** Safe canonical representation of one authorised organisation. Never contains tenantId. */
export interface OAuthOrganisation {
  /** Communications-internal organisation ID (use this to select an org for operations). */
  id: string;
  /** ProviderCredentials._id that authorised access to this org. */
  connectionId: string;
  providerKey: string;
  name: string | null;
  type: string;
  status: 'available' | 'unavailable';
  isDefault: boolean;
  discoveredAt: string;
  lastVerifiedAt: string | null;
}

export interface OAuthOrganisationsListResult {
  connectionId: string;
  providerKey: string;
  total: number;
  available: number;
  organisations: OAuthOrganisation[];
}

export interface OAuthOrganisationsRefreshResult {
  connectionId: string;
  discovered: number;
  nowAvailable: number;
  nowUnavailable: number;
  message: string;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Starts the OAuth authorization flow for a given provider.
 *
 * Returns `authorizationUrl` — the caller must redirect the browser to this URL.
 * No tokens are returned. The callback is handled server-side.
 *
 * @param oauthBasePath e.g. '/accounting/oauth/xero'
 */
export function useStartOAuthMutation(oauthBasePath: string) {
  return useMutation({
    mutationFn: (params: OAuthStartParams) =>
      apiClient
        .post<OAuthStartResult>(`${oauthBasePath}/start`, params)
        .then((r) => r.data),
  });
}

/**
 * Tests an active OAuth connection by calling the provider's verify endpoint.
 *
 * Returns canonical connection status — no tokens or raw provider payloads.
 *
 * @param oauthBasePath e.g. '/accounting/oauth/xero'
 */
export function useTestOAuthConnectionMutation(oauthBasePath: string) {
  return useMutation({
    mutationFn: (credentialId: string) =>
      apiClient
        .get<OAuthConnectionStatus>(
          `${oauthBasePath}/connections/${credentialId}/status`,
        )
        .then((r) => r.data),
  });
}

/**
 * Disconnects an OAuth connection.
 *
 * Revokes the connection at the provider and deactivates the credential record.
 * Best-effort — the credential is deactivated even if provider revocation fails.
 *
 * @param oauthBasePath e.g. '/accounting/oauth/xero'
 */
export function useDisconnectOAuthMutation(oauthBasePath: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (credentialId: string) =>
      apiClient
        .delete<OAuthDisconnectResult>(
          `${oauthBasePath}/connections/${credentialId}`,
        )
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provider-credentials'] });
    },
  });
}

/**
 * Fetches the available tenant options for a pending multi-tenant OAuth session.
 *
 * The `sessionId` is received from the OAuth callback redirect URL query param.
 * Returns only safe metadata — no tokens.
 *
 * @param oauthBasePath e.g. '/accounting/oauth/xero'
 */
export function useOAuthTenants(
  oauthBasePath: string | null | undefined,
  sessionId: string | null | undefined,
) {
  return useQuery({
    queryKey: ['oauth-tenants', oauthBasePath, sessionId],
    queryFn: () =>
      apiClient
        .get<{ tenants: OAuthTenantOption[] }>(
          `${oauthBasePath}/tenants/${sessionId}`,
        )
        .then((r) => r.data.tenants),
    enabled: Boolean(oauthBasePath && sessionId),
    staleTime: 0,
    retry: false,
  });
}

/**
 * Selects a tenant to complete the multi-tenant OAuth flow.
 *
 * Consumes the pending session (single-use). Persists tokens and the selected
 * tenant into the ProviderCredentials record.
 *
 * @param oauthBasePath e.g. '/accounting/oauth/xero'
 */
export function useSelectOAuthTenantMutation(oauthBasePath: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      tenantId,
    }: {
      sessionId: string;
      tenantId: string;
    }) =>
      apiClient
        .post<OAuthSelectTenantResult>(
          `${oauthBasePath}/tenants/${sessionId}/select`,
          { tenantId },
        )
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provider-credentials'] });
    },
  });
}

/**
 * Lists the authorised organisations for an OAuth connection.
 *
 * Returns safe canonical metadata only — no tenantIds, tokens, or credentials.
 * Use the `id` field to select an organisation for Accounting operations.
 *
 * @param oauthBasePath  e.g. '/accounting/oauth/xero'
 * @param credentialId   ProviderCredentials._id
 */
export function useConnectionOrganisations(
  oauthBasePath: string | null | undefined,
  credentialId: string | null | undefined,
) {
  return useQuery({
    queryKey: ['oauth-organisations', oauthBasePath, credentialId],
    queryFn: () =>
      apiClient
        .get<OAuthOrganisationsListResult>(
          `${oauthBasePath}/connections/${credentialId}/organisations`,
        )
        .then((r) => r.data),
    enabled: Boolean(oauthBasePath && credentialId),
    staleTime: 2 * 60 * 1000, // 2 minutes — organisations rarely change
    retry: false,
  });
}

/**
 * Refreshes the authorised organisations list from the provider.
 *
 * Calls the provider's live connections endpoint and reconciles stored metadata:
 *   - Organisations removed in the provider are marked unavailable.
 *   - Newly authorised organisations are added.
 *
 * @param oauthBasePath e.g. '/accounting/oauth/xero'
 */
export function useRefreshOrganisationsMutation(oauthBasePath: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (credentialId: string) =>
      apiClient
        .post<OAuthOrganisationsRefreshResult>(
          `${oauthBasePath}/connections/${credentialId}/organisations/refresh`,
        )
        .then((r) => r.data),
    onSuccess: (_data, credentialId) => {
      qc.invalidateQueries({
        queryKey: ['oauth-organisations', oauthBasePath, credentialId],
      });
    },
  });
}

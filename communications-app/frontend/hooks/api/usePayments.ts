'use client';

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { apiClient } from '@/lib/axios';
import { extractApiMessage } from '@/lib/mapApiError';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { useCompanyChannelProviders } from '@/hooks/api/useCompanyChannelProviders';
import type {
  PaymentAccountsListResponse,
  PaymentBalance,
  PaymentMethodConfiguration,
  PaymentMethodConfigurationsListResponse,
  PaymentProviderOption,
  UpdatePaymentMethodInput,
  PaymentTestScenario,
  PaymentTestResult,
  CreatePaymentTestInput,
  PaymentListResult,
  PaymentDetail,
  ListPaymentsParams,
  PaymentUnitsResponse,
  RefundListResult,
  RefundDetail,
  ListRefundsParams,
  CreateRefundInput,
  PayoutListResult,
  PayoutDetail,
  ListPayoutsParams,
  WebhookEndpointListResult,
  WebhookEndpointDetail,
  WebhookEndpointCreateResult,
  CreateWebhookEndpointInput,
  UpdateWebhookEndpointInput,
  WebhookDeliveryListResult,
  WebhookDeliveryDetail,
  ListWebhookDeliveriesParams,
  GatewayGuide,
  ProviderCapabilitiesResponse,
  PaymentsPageDefinition,
  RefundsPageDefinition,
  PaymentTestingPageDefinition,
} from '@/types/payments';

export interface ListPaymentAccountsParams {
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

// ─── Payment providers (from CompanyChannelProvider, payment channel) ─────────
//
// This is the source of truth for which providers the company has configured.
// Uses CompanyChannelProvider filtered to channelKey='payment', isActive=true.
// Provider display names come from the populated Provider catalog record.

export function usePaymentProviders(): {
  providers: PaymentProviderOption[];
  isLoading: boolean;
  error: Error | null;
} {
  const companyId = useAuthStore((s) => s.companyId);

  const { data, isLoading, error } = useCompanyChannelProviders(
    companyId,
    { active: true, populate: true, limit: 100 },
  );

  const providers = useMemo<PaymentProviderOption[]>(() => {
    if (!data?.items) return [];

    return data.items
      .filter(
        (ccp) => ccp.channel?.channelKey === 'payment' && ccp.isActive,
      )
      .map((ccp) => {
        const providerId =
          typeof ccp.providerId === 'string'
            ? ccp.providerId
            : (ccp.providerId as { id?: string })?.id ?? '';

        return {
          ccpId: ccp.id,
          providerId,
          providerKey: ccp.provider?.providerKey ?? '',
          displayName:
            ccp.provider?.displayName ??
            ccp.provider?.providerKey ??
            '',
          isActive: ccp.isActive,
        };
      })
      .filter((p) => Boolean(p.providerKey));
  }, [data]);

  return { providers, isLoading, error: error as Error | null };
}

// ─── Connections (ProviderCredentials summaries, no live provider call) ────────
// Named "accounts" at the API level; called "connections" in the UI context.

export function usePaymentAccounts(params: ListPaymentAccountsParams = {}) {
  return useQuery({
    queryKey: ['payments', 'accounts', params],
    queryFn: () =>
      apiClient
        .get<PaymentAccountsListResponse>('/payments/accounts', { params })
        .then((r) => r.data),
  });
}

// ─── Retry policy for optional capability queries ─────────────────────────────
//
// Balance and PaymentUnits are OPTIONAL capabilities. Some providers (e.g.
// CoinGate) declare them as unsupported. When the backend returns 422 for an
// unsupported capability it will never succeed on retry — the provider simply
// does not implement the endpoint. Using the global retry:1 would fire a
// second, identical request that is guaranteed to fail too.
//
// This retry function:
//   - 4xx  → false  (never retry; the error is definitively from the provider)
//   - 5xx / network → retry once (transient failures may recover)
//
// This keeps optional-capability failures fast (error state on first response)
// and completely independent of the payments-list query.
function retrySkip4xx(failureCount: number, error: unknown): boolean {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  if (status !== undefined && status >= 400 && status < 500) return false;
  return failureCount < 1;
}

// ─── Balance (live provider call) ─────────────────────────────────────────────

export function usePaymentBalance(connectionId: string | null | undefined) {
  return useQuery({
    queryKey: ['payments', 'balance', connectionId],
    queryFn: () =>
      apiClient
        .get<PaymentBalance>(`/payments/accounts/${connectionId!}/balance`)
        .then((r) => r.data),
    enabled: Boolean(connectionId),
    retry: retrySkip4xx,
  });
}

// ─── Payment method configurations (live provider call) ──────────────────────

export function usePaymentMethodConfigurations(
  connectionId: string | null | undefined,
) {
  return useQuery({
    queryKey: ['payments', 'payment-methods', connectionId],
    queryFn: () =>
      apiClient
        .get<PaymentMethodConfigurationsListResponse>(
          `/payments/accounts/${connectionId!}/payment-methods`,
        )
        .then((r) => r.data),
    enabled: Boolean(connectionId),
  });
}

export function usePaymentMethodConfiguration(
  connectionId: string | null | undefined,
  methodId: string | null | undefined,
) {
  return useQuery({
    queryKey: ['payments', 'payment-method', connectionId, methodId],
    queryFn: () =>
      apiClient
        .get<PaymentMethodConfiguration>(
          `/payments/accounts/${connectionId!}/payment-methods/${methodId!}`,
        )
        .then((r) => r.data),
    enabled: Boolean(connectionId) && Boolean(methodId),
  });
}

// ─── Payment testing ─────────────────────────────────────────────────────────

export function usePaymentTestScenarios(
  connectionId: string | null | undefined,
  methodKey: string | null | undefined,
) {
  return useQuery({
    queryKey: ['payments', 'testing', 'scenarios', connectionId, methodKey],
    queryFn: () =>
      apiClient
        .get<{ scenarios: string[] }>('/payments/testing/scenarios', {
          params: { connectionId: connectionId!, methodKey: methodKey! },
        })
        .then((r) => r.data.scenarios as PaymentTestScenario[]),
    enabled: Boolean(connectionId) && Boolean(methodKey),
  });
}

export function useCreatePaymentTestMutation() {
  const pushSnack = useUIStore((s) => s.pushSnack);
  return useMutation({
    mutationFn: (dto: CreatePaymentTestInput) =>
      apiClient
        .post<PaymentTestResult>('/payments/testing', dto)
        .then((r) => r.data),
    onError: (err) =>
      pushSnack({
        type: 'error',
        message: extractApiMessage(err, 'Payment test failed.'),
      }),
  });
}

// ─── Payments list ─────────────────────────────────────────────────────────────

export function usePaymentsList(
  connectionId: string | null | undefined,
  params: ListPaymentsParams = {},
) {
  return useQuery({
    queryKey: ['payments', 'list', connectionId, params],
    queryFn: () =>
      apiClient
        .get<PaymentListResult>(
          `/payments/accounts/${connectionId!}/payments`,
          { params },
        )
        .then((r) => r.data),
    enabled: Boolean(connectionId),
  });
}

// ─── Payment units (currencies / assets) ──────────────────────────────────────
//
// Query key includes connectionId so that switching connections causes a fresh
// fetch.  The query is disabled (no fetch, no stale options) when no valid
// connection exists.

export function usePaymentUnits(connectionId: string | null | undefined) {
  return useQuery({
    queryKey: ['payments', 'payment-units', connectionId],
    queryFn: () =>
      apiClient
        .get<PaymentUnitsResponse>(
          `/payments/accounts/${connectionId!}/payment-units`,
        )
        .then((r) => r.data),
    enabled: Boolean(connectionId),
    retry: retrySkip4xx,
  });
}

export function usePaymentDetail(
  connectionId: string | null | undefined,
  paymentId: string | null | undefined,
) {
  return useQuery({
    queryKey: ['payments', 'detail', connectionId, paymentId],
    queryFn: () =>
      apiClient
        .get<PaymentDetail>(
          `/payments/accounts/${connectionId!}/payments/${paymentId!}`,
        )
        .then((r) => r.data),
    enabled: Boolean(connectionId) && Boolean(paymentId),
  });
}

// ─── Refunds ──────────────────────────────────────────────────────────────────

export function useRefundsList(
  connectionId: string | null | undefined,
  params: ListRefundsParams = {},
) {
  return useQuery({
    queryKey: ['payments', 'refunds', 'list', connectionId, params],
    queryFn: () =>
      apiClient
        .get<RefundListResult>(`/payments/accounts/${connectionId!}/refunds`, {
          params,
        })
        .then((r) => r.data),
    enabled: Boolean(connectionId),
  });
}

export function useRefundDetail(
  connectionId: string | null | undefined,
  refundId: string | null | undefined,
) {
  return useQuery({
    queryKey: ['payments', 'refunds', 'detail', connectionId, refundId],
    queryFn: () =>
      apiClient
        .get<RefundDetail>(
          `/payments/accounts/${connectionId!}/refunds/${refundId!}`,
        )
        .then((r) => r.data),
    enabled: Boolean(connectionId) && Boolean(refundId),
  });
}

export function useCreateRefundMutation(connectionId: string) {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);
  return useMutation({
    mutationFn: (dto: CreateRefundInput) =>
      apiClient
        .post<RefundDetail>(`/payments/accounts/${connectionId}/refunds`, dto)
        .then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ['payments', 'refunds', 'list', connectionId],
      });
      void qc.invalidateQueries({
        queryKey: ['payments', 'list', connectionId],
      });
      pushSnack({ type: 'success', message: 'Refund created successfully.' });
    },
    onError: (err) =>
      pushSnack({
        type: 'error',
        message: extractApiMessage(err, 'Failed to create refund.'),
      }),
  });
}

// ─── Payouts ──────────────────────────────────────────────────────────────────
//
// Query key includes connectionId so that switching connections causes a fresh
// fetch. The query is disabled when no valid connection exists.

export function usePayoutsList(
  connectionId: string | null | undefined,
  params: ListPayoutsParams = {},
) {
  return useQuery({
    queryKey: ['payments', 'payouts', 'list', connectionId, params],
    queryFn: () =>
      apiClient
        .get<PayoutListResult>(
          `/payments/accounts/${connectionId!}/payouts`,
          { params },
        )
        .then((r) => r.data),
    enabled: Boolean(connectionId),
  });
}

export function usePayoutDetail(
  connectionId: string | null | undefined,
  payoutId: string | null | undefined,
) {
  return useQuery({
    queryKey: ['payments', 'payouts', 'detail', connectionId, payoutId],
    queryFn: () =>
      apiClient
        .get<PayoutDetail>(
          `/payments/accounts/${connectionId!}/payouts/${payoutId!}`,
        )
        .then((r) => r.data),
    enabled: Boolean(connectionId) && Boolean(payoutId),
  });
}

// ─── Webhook Endpoints ────────────────────────────────────────────────────────

export function useWebhookEndpoints(
  connectionId: string | null | undefined,
  params: { cursor?: string; limit?: number } = {},
) {
  return useQuery({
    queryKey: ['payments', 'webhook-endpoints', connectionId, params],
    queryFn: () =>
      apiClient
        .get<WebhookEndpointListResult>(
          `/payments/accounts/${connectionId!}/webhook-endpoints`,
          { params },
        )
        .then((r) => r.data),
    enabled: Boolean(connectionId),
  });
}

export function useWebhookEndpointDetail(
  connectionId: string | null | undefined,
  endpointId: string | null | undefined,
) {
  return useQuery({
    queryKey: ['payments', 'webhook-endpoint', connectionId, endpointId],
    queryFn: () =>
      apiClient
        .get<WebhookEndpointDetail>(
          `/payments/accounts/${connectionId!}/webhook-endpoints/${endpointId!}`,
        )
        .then((r) => r.data),
    enabled: Boolean(connectionId) && Boolean(endpointId),
  });
}

export function useWebhookSupportedEventTypes(
  connectionId: string | null | undefined,
) {
  return useQuery({
    queryKey: ['payments', 'webhook-event-types', connectionId],
    queryFn: () =>
      apiClient
        .get<{ data: string[]; total: number }>(
          `/payments/accounts/${connectionId!}/webhook-endpoints/event-types`,
        )
        .then((r) => r.data),
    enabled: Boolean(connectionId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateWebhookEndpointMutation(connectionId: string) {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);
  return useMutation({
    mutationFn: (dto: CreateWebhookEndpointInput) =>
      apiClient
        .post<WebhookEndpointCreateResult>(
          `/payments/accounts/${connectionId}/webhook-endpoints`,
          dto,
        )
        .then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ['payments', 'webhook-endpoints', connectionId],
      });
    },
    onError: (err) =>
      pushSnack({
        type: 'error',
        message: extractApiMessage(err, 'Failed to create webhook endpoint.'),
      }),
  });
}

export function useUpdateWebhookEndpointMutation(
  connectionId: string,
  endpointId: string,
) {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);
  return useMutation({
    mutationFn: (dto: UpdateWebhookEndpointInput) =>
      apiClient
        .put<WebhookEndpointDetail>(
          `/payments/accounts/${connectionId}/webhook-endpoints/${endpointId}`,
          dto,
        )
        .then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ['payments', 'webhook-endpoints', connectionId],
      });
      void qc.invalidateQueries({
        queryKey: ['payments', 'webhook-endpoint', connectionId, endpointId],
      });
      pushSnack({ type: 'success', message: 'Endpoint updated.' });
    },
    onError: (err) =>
      pushSnack({
        type: 'error',
        message: extractApiMessage(err, 'Failed to update endpoint.'),
      }),
  });
}

export function useDeleteWebhookEndpointMutation(connectionId: string) {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);
  return useMutation({
    mutationFn: (endpointId: string) =>
      apiClient
        .delete<{ deleted: boolean; endpointId: string }>(
          `/payments/accounts/${connectionId}/webhook-endpoints/${endpointId}`,
        )
        .then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ['payments', 'webhook-endpoints', connectionId],
      });
      pushSnack({ type: 'success', message: 'Endpoint deleted.' });
    },
    onError: (err) =>
      pushSnack({
        type: 'error',
        message: extractApiMessage(err, 'Failed to delete endpoint.'),
      }),
  });
}

// ─── Webhook Deliveries ───────────────────────────────────────────────────────

export function useWebhookDeliveries(
  connectionId: string | null | undefined,
  params: ListWebhookDeliveriesParams = {},
) {
  return useQuery({
    queryKey: ['payments', 'webhook-deliveries', connectionId, params],
    queryFn: () =>
      apiClient
        .get<WebhookDeliveryListResult>(
          `/payments/accounts/${connectionId!}/webhook-deliveries`,
          { params },
        )
        .then((r) => r.data),
    enabled: Boolean(connectionId),
  });
}

export function useWebhookDeliveryDetail(
  connectionId: string | null | undefined,
  deliveryId: string | null | undefined,
) {
  return useQuery({
    queryKey: ['payments', 'webhook-delivery', connectionId, deliveryId],
    queryFn: () =>
      apiClient
        .get<WebhookDeliveryDetail>(
          `/payments/accounts/${connectionId!}/webhook-deliveries/${deliveryId!}`,
        )
        .then((r) => r.data),
    enabled: Boolean(connectionId) && Boolean(deliveryId),
  });
}

export function useRetryWebhookDeliveryMutation(connectionId: string) {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);
  return useMutation({
    mutationFn: (deliveryId: string) =>
      apiClient
        .post<WebhookDeliveryDetail>(
          `/payments/accounts/${connectionId}/webhook-deliveries/${deliveryId}/retry`,
        )
        .then((r) => r.data),
    onSuccess: (_, deliveryId) => {
      void qc.invalidateQueries({
        queryKey: ['payments', 'webhook-deliveries', connectionId],
      });
      void qc.invalidateQueries({
        queryKey: ['payments', 'webhook-delivery', connectionId, deliveryId],
      });
      pushSnack({ type: 'success', message: 'Delivery retry initiated.' });
    },
    onError: (err) =>
      pushSnack({
        type: 'error',
        message: extractApiMessage(err, 'Retry failed.'),
      }),
  });
}

// ─── Provider Capabilities ────────────────────────────────────────────────────
//
// Fetches the declared capability map for a provider.
// Never requires company context — capability data is global to the provider.
// Cached for 5 minutes; re-fetched when providerKey changes (provider switch).

export function useProviderCapabilities(providerKey: string | null | undefined) {
  return useQuery({
    queryKey: ['payments', 'capabilities', providerKey],
    queryFn: () =>
      apiClient
        .get<ProviderCapabilitiesResponse>(
          `/payments/providers/${providerKey!}/capabilities`,
        )
        .then((r) => r.data),
    enabled: Boolean(providerKey),
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Gateway Guide ────────────────────────────────────────────────────────────

// ─── Payments page definition ─────────────────────────────────────────────────
//
// Fetches the canonical page definition for the selected connection.
// The definition drives every UI component (cards, filters, columns, actions).
// Query key includes connectionId so that switching connections causes a fresh fetch.
// staleTime is short (60 s) so the definition stays current after capability changes.

export function usePaymentsPageDefinition(connectionId: string | null | undefined) {
  return useQuery({
    queryKey: ['payments', 'page-definition', connectionId],
    queryFn: () =>
      apiClient
        .get<PaymentsPageDefinition>(
          `/payments/connections/${connectionId!}/page-definition`,
        )
        .then((r) => r.data),
    enabled: Boolean(connectionId),
    staleTime: 60 * 1000,
    retry: retrySkip4xx,
  });
}

// ─── Refunds page definition ──────────────────────────────────────────────────
//
// Fetches the canonical Refunds page definition for the selected connection.
// The definition drives all Refunds page components: toolbar actions, filters,
// columns, row actions, and the create form.
// Query key includes connectionId — switching connections triggers a fresh fetch
// and the previous definition is discarded.
// Stale time is short (60 s) so definitions stay current.

export function useRefundsPageDefinition(connectionId: string | null | undefined) {
  return useQuery({
    queryKey: ['payments', 'refunds', 'page-definition', connectionId],
    queryFn: () =>
      apiClient
        .get<RefundsPageDefinition>(
          `/payments/connections/${connectionId!}/refunds/page-definition`,
        )
        .then((r) => r.data),
    enabled: Boolean(connectionId),
    staleTime: 60 * 1000,
    retry: retrySkip4xx,
  });
}

// ─── Payment Testing page definition ─────────────────────────────────────────
//
// Fetches the canonical Payment Testing page definition for the selected connection.
// The definition drives the test form: fields, submit label, result presentation.
// Query key includes connectionId — switching connections triggers a fresh fetch.
// Stale time is short (60 s) so definitions stay current.

export function usePaymentTestingPageDefinition(connectionId: string | null | undefined) {
  return useQuery({
    queryKey: ['payments', 'testing', 'page-definition', connectionId],
    queryFn: () =>
      apiClient
        .get<PaymentTestingPageDefinition>(
          `/payments/connections/${connectionId!}/testing/page-definition`,
        )
        .then((r) => r.data),
    enabled: Boolean(connectionId),
    staleTime: 60 * 1000,
    retry: retrySkip4xx,
  });
}

export function useGatewayGuide(providerKey: string | null | undefined) {
  return useQuery({
    queryKey: ['payments', 'gateway-guide', providerKey],
    queryFn: () =>
      apiClient
        .get<GatewayGuide>(`/payments/providers/${providerKey!}/gateway-guide`)
        .then((r) => r.data),
    enabled: Boolean(providerKey),
    staleTime: 10 * 60 * 1000,
  });
}

export function useUpdatePaymentMethodMutation(
  connectionId: string,
  methodId: string,
) {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);
  return useMutation({
    mutationFn: (dto: UpdatePaymentMethodInput) =>
      apiClient
        .patch<PaymentMethodConfiguration>(
          `/payments/accounts/${connectionId}/payment-methods/${methodId}`,
          dto,
        )
        .then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ['payments', 'payment-methods', connectionId],
      });
      void qc.invalidateQueries({
        queryKey: ['payments', 'payment-method', connectionId, methodId],
      });
      pushSnack({ type: 'success', message: 'Payment method updated.' });
    },
    onError: (err) =>
      pushSnack({
        type: 'error',
        message: extractApiMessage(err, 'Failed to update payment method.'),
      }),
  });
}

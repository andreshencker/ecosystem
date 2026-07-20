'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import type {
  Contract,
  ContractListResponse,
  CreateContractPayload,
  UpdateContractPayload,
} from '@/types/contract';
import { useUIStore } from '@/stores/ui.store';
import { extractApiMessage } from '@/lib/mapApiError';

export interface ContractsParams {
  page?:       number;
  limit?:      number;
  customerId?: string;
  status?:     string;
  search?:     string;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useContracts(params: ContractsParams = {}) {
  return useQuery({
    queryKey: ['contracts', params],
    queryFn: () =>
      apiClient
        .get<ContractListResponse>('/contracts', { params })
        .then((r) => r.data),
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateContractMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (dto: CreateContractPayload) =>
      apiClient.post<Contract>('/contracts', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      pushSnack({ type: 'success', message: 'Contract created' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to create contract') }),
  });
}

export function useUpdateContractMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & UpdateContractPayload) =>
      apiClient.patch<Contract>(`/contracts/${id}`, dto).then((r) => r.data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['contracts', id] });
      pushSnack({ type: 'success', message: 'Contract updated' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to update contract') }),
  });
}

export function useCancelContractMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<Contract>(`/contracts/${id}/cancel`).then((r) => r.data),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['contracts', id] });
      pushSnack({ type: 'success', message: 'Contract cancelled' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to cancel contract') }),
  });
}

export function useFinishContractMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<Contract>(`/contracts/${id}/finish`).then((r) => r.data),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['contracts', id] });
      pushSnack({ type: 'success', message: 'Contract finished' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to finish contract') }),
  });
}

export function useDeleteContractMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/contracts/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      pushSnack({ type: 'success', message: 'Contract deleted' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to delete contract') }),
  });
}

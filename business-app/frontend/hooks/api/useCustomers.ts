'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import type {
  Customer,
  CustomerListResponse,
  CreateCustomerPayload,
  UpdateCustomerPayload,
  CreateContactPayload,
  UpdateContactPayload,
  CustomerContact,
} from '@/types/customer';
import { useUIStore } from '@/stores/ui.store';
import { extractApiMessage } from '@/lib/mapApiError';

// ─── Query params ─────────────────────────────────────────────────────────────

export interface CustomersParams {
  page?:   number;
  limit?:  number;
  search?: string;
  active?: boolean;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useCustomers(params: CustomersParams = {}) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: () =>
      apiClient
        .get<CustomerListResponse>('/customers', { params })
        .then((r) => r.data),
  });
}

export function useCustomer(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: () =>
      apiClient
        .get<Customer>(`/customers/${id}`)
        .then((r) => r.data),
    enabled: options?.enabled ?? !!id,
  });
}

export function useCustomerContacts(customerId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['customers', customerId, 'contacts'],
    queryFn: () =>
      apiClient
        .get<{ items: CustomerContact[] }>(`/customers/${customerId}/contacts`)
        .then((r) => r.data.items),
    enabled: options?.enabled ?? !!customerId,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateCustomerMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (dto: CreateCustomerPayload) =>
      apiClient.post<Customer>('/customers', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      pushSnack({ type: 'success', message: 'Customer created' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to create customer') }),
  });
}

export function useUpdateCustomerMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & UpdateCustomerPayload) =>
      apiClient.patch<Customer>(`/customers/${id}`, dto).then((r) => r.data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customers', id] });
      pushSnack({ type: 'success', message: 'Customer updated' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to update customer') }),
  });
}

export function useDeactivateCustomerMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<Customer>(`/customers/${id}/deactivate`).then((r) => r.data),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customers', id] });
      pushSnack({ type: 'success', message: 'Customer deactivated' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to deactivate customer') }),
  });
}

export function useActivateCustomerMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<Customer>(`/customers/${id}/activate`).then((r) => r.data),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customers', id] });
      pushSnack({ type: 'success', message: 'Customer activated' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to activate customer') }),
  });
}

export function useDeleteCustomerMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/customers/${id}`).then((r) => r.data),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.removeQueries({ queryKey: ['customers', id] });
      pushSnack({ type: 'success', message: 'Customer deleted' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to delete customer') }),
  });
}

export function useAddContactMutation(customerId: string) {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (dto: CreateContactPayload) =>
      apiClient
        .post<CustomerContact>(`/customers/${customerId}/contacts`, dto)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers', customerId, 'contacts'] });
      qc.invalidateQueries({ queryKey: ['customers', customerId] });
      pushSnack({ type: 'success', message: 'Contact added' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to add contact') }),
  });
}

export function useUpdateContactMutation(customerId: string) {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: ({ contactId, ...dto }: { contactId: string } & UpdateContactPayload) =>
      apiClient
        .patch<CustomerContact>(`/customers/${customerId}/contacts/${contactId}`, dto)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers', customerId, 'contacts'] });
      pushSnack({ type: 'success', message: 'Contact updated' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to update contact') }),
  });
}

export function useRemoveContactMutation(customerId: string) {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (contactId: string) =>
      apiClient.delete(`/customers/${customerId}/contacts/${contactId}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers', customerId, 'contacts'] });
      pushSnack({ type: 'success', message: 'Contact removed' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to remove contact') }),
  });
}

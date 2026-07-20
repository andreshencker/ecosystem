'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller, useWatch } from 'react-hook-form';
import Box          from '@mui/material/Box';
import Button       from '@mui/material/Button';
import Card         from '@mui/material/Card';
import CardContent  from '@mui/material/CardContent';
import Divider      from '@mui/material/Divider';
import Skeleton     from '@mui/material/Skeleton';
import TextField    from '@mui/material/TextField';
import Typography   from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { PageHeader }  from '@/components/layout';
import { ConfirmDialog, EmptyState, LoadingButton } from '@/components/shared';
import { useCustomer, useUpdateCustomerMutation } from '@/hooks/api/useCustomers';
import type {
  UpdateCustomerPayload,
  CustomerCommPurpose,
  CommPurposeFormEntry,
} from '@/types/customer';
import {
  CustomerContactsFieldArray,
  type ContactFormRow,
} from '../../components/CustomerContactsFieldArray';
import {
  CustomerLocationsFieldArray,
  type LocationFormRow,
} from '../../components/CustomerLocationsFieldArray';
import { CustomerCommunicationPurposesSection } from '../../components/CustomerCommunicationPurposesSection';
import {
  locationsToFormRows,
  formRowsToLocations,
  buildContactsPayload,
} from '../../components/CustomerFormDrawer';

// ─── Conversion helpers — Communication Purposes ──────────────────────────────

function purposesToFormEntries(purposes: CustomerCommPurpose[]): CommPurposeFormEntry[] {
  return (purposes ?? []).map((p) => {
    const emailCh = p.channels.find((ch) => ch.channel === 'email');
    const smsCh   = p.channels.find((ch) => ch.channel === 'sms');
    return {
      communicationDomainId: p.communicationDomainId,
      emailRecipients: (emailCh?.recipients ?? [])
        .filter((r) => r.email)
        .map((r) => ({ email: r.email!, recipientType: r.recipientType ?? 'to' })),
      smsRecipients: (smsCh?.recipients ?? [])
        .filter((r) => r.phone)
        .map((r) => ({ phone: r.phone! })),
    };
  });
}

function formEntriesToPurposes(entries: CommPurposeFormEntry[]): CustomerCommPurpose[] {
  return entries.map((e) => {
    const channels: CustomerCommPurpose['channels'] = [];
    if (e.emailRecipients.length > 0) {
      channels.push({
        channel: 'email',
        recipients: e.emailRecipients.map((r) => ({ email: r.email, recipientType: r.recipientType })),
      });
    }
    if (e.smsRecipients.length > 0) {
      channels.push({
        channel: 'sms',
        recipients: e.smsRecipients.map((r) => ({ phone: r.phone })),
      });
    }
    return { communicationDomainId: e.communicationDomainId, channels };
  });
}

// ─── Form shape ───────────────────────────────────────────────────────────────

interface FormValues {
  displayName:           string;
  abn:                   string;
  contacts:              ContactFormRow[];
  locations:             LocationFormRow[];
  notes:                 string;
  communicationPurposes: CommPurposeFormEntry[];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditCustomerPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();

  const { data: customer, isLoading } = useCustomer(id);
  const updateMutation = useUpdateCustomerMutation();

  // ── Location-deletion confirmation state ──────────────────────────────────
  const [locationDeletePending, setLocationDeletePending] = useState<{
    localId: string;
    locationTag: string;
    affectedCount: number;
    onConfirm: () => void;
  } | null>(null);

  const { control, handleSubmit, formState: { errors }, getValues, setValue } = useForm<FormValues>({
    values: (() => {
      if (!customer) return undefined;
      const locRows = locationsToFormRows(customer.locations ?? []);
      const localIdByDbId = new Map(locRows.filter((l) => l._id).map((l) => [l._id!, l.localId]));
      return {
        displayName: customer.displayName ?? '',
        abn:         customer.abn         ?? '',
        contacts: (customer.contacts ?? []).map((ct) => ({
          _id:        ct.id !== 'legacy-primary' ? ct.id : undefined,
          name:       [ct.firstName, ct.lastName].filter(Boolean).join(' '),
          email:      ct.email    ?? '',
          phone:      ct.phone    ?? '',
          role:       ct.role     ?? '',
          isPrimary:  ct.isPrimary,
          locationId: ct.locationId ? (localIdByDbId.get(ct.locationId) ?? '') : '',
        })),
        locations:             locRows,
        notes:                 customer.notes ?? '',
        communicationPurposes: purposesToFormEntries(customer.communicationPurposes ?? []),
      };
    })(),
  });

  const watchedContacts  = useWatch({ control, name: 'contacts'  });
  const watchedLocations = useWatch({ control, name: 'locations' });

  // ── Location deletion ─────────────────────────────────────────────────────

  function handleBeforeLocationRemove(
    _index: number,
    localId: string,
    onConfirm: () => void,
  ) {
    const contacts = getValues('contacts');
    const affected = contacts.filter((c) => c.locationId === localId);
    if (affected.length > 0) {
      const tag = getValues('locations').find((l) => l.localId === localId)?.tag ?? 'This location';
      setLocationDeletePending({ localId, locationTag: tag, affectedCount: affected.length, onConfirm });
    } else {
      onConfirm();
    }
  }

  const onSubmit = async (values: FormValues) => {
    const contactsPayload = buildContactsPayload(values.contacts, values.locations);

    const payload: UpdateCustomerPayload = {};
    if (values.displayName !== (customer?.displayName ?? '')) payload.displayName = values.displayName;
    if (values.abn         !== (customer?.abn         ?? '')) payload.abn         = values.abn || undefined;
    if (values.notes       !== (customer?.notes       ?? '')) payload.notes       = values.notes || undefined;

    payload.contacts              = contactsPayload;
    payload.locations             = formRowsToLocations(values.locations);
    payload.communicationPurposes = formEntriesToPurposes(values.communicationPurposes);

    try {
      await updateMutation.mutateAsync({ id, ...payload });
      router.push(`/customers/${id}`);
    } catch {
      // Error is handled by the mutation's onError (snack notification).
    }
  };

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={200} height={40} />
        <Skeleton variant="rectangular" height={300} sx={{ mt: 2, borderRadius: 2 }} />
      </Box>
    );
  }

  if (!customer) {
    return (
      <EmptyState
        title="Customer not found"
        action={<Button onClick={() => router.push('/customers')}>Back to Customers</Button>}
      />
    );
  }

  return (
    <>
      <Box>
        <PageHeader
          title={`Edit — ${customer.displayName}`}
          actions={
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => router.push(`/customers/${id}`)}>
              Cancel
            </Button>
          }
        />

        <Card variant="outlined" sx={{ maxWidth: 640 }}>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <Box display="flex" flexDirection="column" gap={3}>

                <Typography variant="body2" color="text.secondary">
                  Type: <strong>{customer.type === 'company' ? 'Company' : 'Individual'}</strong>
                  {' '}(cannot be changed after creation)
                </Typography>

                {/* ── Customer Information ──────────────────────────────── */}
                <Controller
                  name="displayName"
                  control={control}
                  rules={{ required: 'Company name is required', maxLength: { value: 200, message: 'Max 200 characters' } }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Company Name"
                      required
                      fullWidth
                      error={!!errors.displayName}
                      helperText={errors.displayName?.message ?? 'Trading or registered name'}
                    />
                  )}
                />

                <Controller
                  name="abn"
                  control={control}
                  rules={{ pattern: { value: /^(\d{11})?$/, message: 'ABN must be 11 digits' } }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="ABN"
                      fullWidth
                      error={!!errors.abn}
                      helperText={errors.abn?.message ?? 'Australian Business Number — 11 digits'}
                      inputProps={{ maxLength: 11 }}
                    />
                  )}
                />

                <Divider />

                {/* ── Contacts ─────────────────────────────────────────── */}
                <CustomerContactsFieldArray
                  control={control as any}
                  errors={errors as any}
                  locations={watchedLocations ?? []}
                />

                <Divider />

                {/* ── Customer Locations ────────────────────────────────── */}
                <CustomerLocationsFieldArray
                  control={control as any}
                  errors={errors as any}
                  onBeforeRemove={handleBeforeLocationRemove}
                />

                <Divider />

                {/* ── Communication Purposes ────────────────────────────── */}
                <Controller
                  name="communicationPurposes"
                  control={control}
                  render={({ field }) => (
                    <CustomerCommunicationPurposesSection
                      value={field.value}
                      onChange={field.onChange}
                      contacts={watchedContacts ?? []}
                    />
                  )}
                />

                <Divider />

                {/* ── Notes ────────────────────────────────────────────── */}
                <Controller
                  name="notes"
                  control={control}
                  rules={{ maxLength: { value: 2000, message: 'Max 2000 characters' } }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Notes"
                      fullWidth
                      multiline
                      minRows={3}
                      error={!!errors.notes}
                      helperText={errors.notes?.message ?? 'Internal notes — not visible to the customer'}
                    />
                  )}
                />

                {/* ── Actions ──────────────────────────────────────────── */}
                <Box display="flex" gap={2} justifyContent="flex-end">
                  <Button variant="outlined" onClick={() => router.push(`/customers/${id}`)}>Cancel</Button>
                  <LoadingButton type="submit" variant="contained" loading={updateMutation.isPending}>
                    Save Changes
                  </LoadingButton>
                </Box>

              </Box>
            </form>
          </CardContent>
        </Card>
      </Box>

      {/* ── Location-deletion confirmation dialog ─────────────────────── */}
      <ConfirmDialog
        open={locationDeletePending !== null}
        title="Remove location?"
        description={
          locationDeletePending
            ? `"${locationDeletePending.locationTag}" is assigned to ${locationDeletePending.affectedCount} contact${locationDeletePending.affectedCount === 1 ? '' : 's'}. Removing this location will clear their location assignment. The contacts themselves will not be deleted.`
            : undefined
        }
        confirmLabel="Remove Location"
        danger
        onConfirm={() => {
          if (!locationDeletePending) return;
          const contacts = getValues('contacts');
          setValue(
            'contacts',
            contacts.map((c) =>
              c.locationId === locationDeletePending.localId ? { ...c, locationId: '' } : c
            ),
            { shouldDirty: true },
          );
          locationDeletePending.onConfirm();
          setLocationDeletePending(null);
        }}
        onCancel={() => setLocationDeletePending(null)}
      />
    </>
  );
}

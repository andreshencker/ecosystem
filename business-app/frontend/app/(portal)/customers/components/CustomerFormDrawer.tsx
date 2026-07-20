'use client';

import React, { useEffect, useState } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import Box              from '@mui/material/Box';
import Button           from '@mui/material/Button';
import Divider          from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio            from '@mui/material/Radio';
import RadioGroup       from '@mui/material/RadioGroup';
import TextField        from '@mui/material/TextField';
import Typography       from '@mui/material/Typography';

import { ConfirmDialog, FormDrawer, LoadingButton } from '@/components/shared';
import {
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
} from '@/hooks/api/useCustomers';
import type {
  Customer,
  CustomerType,
  CustomerLocation,
  CustomerCommPurpose,
  CommPurposeFormEntry,
  LocationPayload,
  CreateCustomerPayload,
  UpdateCustomerPayload,
  ContactPayload,
} from '@/types/customer';
import {
  CustomerContactsFieldArray,
  type ContactFormRow,
} from './CustomerContactsFieldArray';
import {
  CustomerLocationsFieldArray,
  type LocationFormRow,
} from './CustomerLocationsFieldArray';
import { CustomerCommunicationPurposesSection } from './CustomerCommunicationPurposesSection';

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

// ─── Conversion helpers — Locations ──────────────────────────────────────────

export function locationsToFormRows(locs: CustomerLocation[]): LocationFormRow[] {
  return (locs ?? []).map((l) => ({
    // For legacy-address sentinel, generate a fresh UUID so it gets a new DB ID on save.
    _id:        l.id !== 'legacy-address' ? l.id : undefined,
    localId:    l.id !== 'legacy-address' ? l.id : crypto.randomUUID(),
    tag:        l.tag,
    country:    l.country,
    line1:      l.line1,
    line2:      l.line2 ?? '',
    city:       l.city,
    postalCode: l.postalCode,
    state:      l.state ?? '',
  }));
}

export function formRowsToLocations(rows: LocationFormRow[]): LocationPayload[] {
  return rows.map((r) => ({
    id:         r._id,          // send existing DB ID so backend preserves _id
    tag:        r.tag.trim(),
    country:    r.country.trim(),
    line1:      r.line1.trim(),
    line2:      r.line2.trim()  || undefined,
    city:       r.city.trim(),
    postalCode: r.postalCode.trim(),
    state:      r.state.trim() || undefined,
  }));
}

/** Maps form contacts to payload, resolving locationId (localId) → locationIndex. */
export function buildContactsPayload(
  contacts: ContactFormRow[],
  locations: LocationFormRow[],
): ContactPayload[] {
  const localIdToIndex = new Map(locations.map((l, i) => [l.localId, i]));
  return contacts
    .filter((c) => c.name.trim())
    .map((c) => ({
      firstName:     c.name.trim(),
      email:         c.email   || undefined,
      phone:         c.phone   || undefined,
      role:          c.role    || undefined,
      isPrimary:     c.isPrimary,
      locationIndex: c.locationId && localIdToIndex.has(c.locationId)
        ? localIdToIndex.get(c.locationId)!
        : null,
    }));
}

// ─── Form shape ───────────────────────────────────────────────────────────────

interface FormValues {
  type:                  CustomerType;
  displayName:           string;
  abn:                   string;
  contacts:              ContactFormRow[];
  locations:             LocationFormRow[];
  notes:                 string;
  communicationPurposes: CommPurposeFormEntry[];
}

const EMPTY_VALUES: FormValues = {
  type:                  'company',
  displayName:           '',
  abn:                   '',
  contacts:              [],
  locations:             [],
  notes:                 '',
  communicationPurposes: [],
};

function customerToFormValues(c: Customer): FormValues {
  const locRows = locationsToFormRows(c.locations ?? []);
  const localIdByDbId = new Map(locRows.filter((l) => l._id).map((l) => [l._id!, l.localId]));

  return {
    type:        c.type,
    displayName: c.displayName ?? '',
    abn:         c.abn        ?? '',
    contacts: (c.contacts ?? []).map((ct) => ({
      _id:        ct.id !== 'legacy-primary' ? ct.id : undefined,
      name:       [ct.firstName, ct.lastName].filter(Boolean).join(' '),
      email:      ct.email     ?? '',
      phone:      ct.phone     ?? '',
      role:       ct.role      ?? '',
      isPrimary:  ct.isPrimary,
      // Resolve existing locationId (DB _id) to the corresponding localId
      locationId: ct.locationId ? (localIdByDbId.get(ct.locationId) ?? '') : '',
    })),
    locations:             locRows,
    notes:                 c.notes ?? '',
    communicationPurposes: purposesToFormEntries(c.communicationPurposes ?? []),
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CustomerFormDrawerProps {
  open:      boolean;
  onClose:   () => void;
  customer?: Customer | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CustomerFormDrawer({
  open,
  onClose,
  customer,
}: CustomerFormDrawerProps) {
  const isEdit = !!customer;

  const createMutation = useCreateCustomerMutation();
  const updateMutation = useUpdateCustomerMutation();
  const saving = createMutation.isPending || updateMutation.isPending;

  // ── Location-deletion confirmation state ────────────────────────────────────
  const [locationDeletePending, setLocationDeletePending] = useState<{
    localId: string;
    locationTag: string;
    affectedCount: number;
    onConfirm: () => void;
  } | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: EMPTY_VALUES });

  const watchedContacts  = useWatch({ control, name: 'contacts'  });
  const watchedLocations = useWatch({ control, name: 'locations' });

  useEffect(() => {
    if (open) reset(customer ? customerToFormValues(customer) : EMPTY_VALUES);
  }, [open, customer, reset]);

  // ─── Location deletion handler ──────────────────────────────────────────────

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

  // ─── Submit ────────────────────────────────────────────────────────────────

  async function onSubmit(values: FormValues) {
    const contactsPayload = buildContactsPayload(values.contacts, values.locations);

    try {
      if (isEdit && customer) {
        const payload: UpdateCustomerPayload = {};

        if (values.displayName !== customer.displayName)
          payload.displayName = values.displayName;
        if (values.abn !== (customer.abn ?? ''))
          payload.abn = values.abn || undefined;
        if (values.notes !== (customer.notes ?? ''))
          payload.notes = values.notes || undefined;

        payload.contacts              = contactsPayload;
        payload.locations             = formRowsToLocations(values.locations);
        payload.communicationPurposes = formEntriesToPurposes(values.communicationPurposes);

        await updateMutation.mutateAsync({ id: customer.id, ...payload });
      } else {
        const payload: CreateCustomerPayload = {
          type:        values.type,
          displayName: values.displayName,
          ...(values.abn   && { abn:   values.abn }),
          contacts:     contactsPayload,
          ...(values.notes && { notes: values.notes }),
          locations:    formRowsToLocations(values.locations),
          ...(values.communicationPurposes.length > 0 && {
            communicationPurposes: formEntriesToPurposes(values.communicationPurposes),
          }),
        };
        await createMutation.mutateAsync(payload);
      }
      onClose();
    } catch {
      // Error handled by hook's onError snack notification.
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <FormDrawer
        open={open}
        onClose={onClose}
        title={isEdit ? `Edit — ${customer?.displayName}` : 'Create Customer'}
        actions={
          <>
            <Button variant="outlined" onClick={onClose} disabled={saving}>Cancel</Button>
            <LoadingButton variant="contained" loading={saving} onClick={handleSubmit(onSubmit)}>
              {isEdit ? 'Save Changes' : 'Create Customer'}
            </LoadingButton>
          </>
        }
      >
        <Box display="flex" flexDirection="column" gap={2.5}>

          {/* ── SECTION A: Customer type ──────────────────────────────── */}
          {!isEdit ? (
            <Box>
              <Typography variant="subtitle2" gutterBottom>Customer type</Typography>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <RadioGroup row {...field}>
                    <FormControlLabel value="company"    control={<Radio size="small" />} label="Company" />
                    <FormControlLabel value="individual" control={<Radio size="small" />} label="Individual" />
                  </RadioGroup>
                )}
              />
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Type: <strong>{customer?.type === 'company' ? 'Company' : 'Individual'}</strong>
              {' '}— cannot be changed after creation.
            </Typography>
          )}

          <Divider />

          {/* ── SECTION B: Customer Information ──────────────────────── */}
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
                size="small"
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
                size="small"
                error={!!errors.abn}
                helperText={errors.abn?.message ?? 'Australian Business Number — 11 digits'}
                inputProps={{ maxLength: 11 }}
              />
            )}
          />

          <Controller
            name="notes"
            control={control}
            rules={{ maxLength: { value: 2000, message: 'Max 2000 characters' } }}
            render={({ field }) => (
              <TextField
                {...field}
                label="Notes"
                fullWidth
                size="small"
                multiline
                minRows={2}
                error={!!errors.notes}
                helperText={errors.notes?.message ?? 'Internal notes — not visible to the customer'}
              />
            )}
          />

          <Divider />

          {/* ── SECTION C: Customer Locations ────────────────────────── */}
          <CustomerLocationsFieldArray
            control={control as any}
            errors={errors as any}
            onBeforeRemove={handleBeforeLocationRemove}
          />

          <Divider />

          {/* ── SECTION D: Communication Purposes ────────────────────── */}
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

          {/* ── SECTION E: Contacts (with location selector) ─────────── */}
          <CustomerContactsFieldArray
            control={control as any}
            errors={errors as any}
            locations={watchedLocations ?? []}
          />

        </Box>
      </FormDrawer>

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
          // Clear locationId from all contacts that referenced this location
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

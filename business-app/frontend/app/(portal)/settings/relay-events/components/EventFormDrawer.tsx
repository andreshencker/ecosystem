'use client';

import React, { useEffect } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import Box             from '@mui/material/Box';
import Button          from '@mui/material/Button';
import Divider         from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem        from '@mui/material/MenuItem';
import Switch          from '@mui/material/Switch';
import TextField       from '@mui/material/TextField';
import Typography      from '@mui/material/Typography';

import { FormDrawer, LoadingButton } from '@/components/shared';
import {
  useCreateRelayEventMutation,
  useUpdateRelayEventMutation,
} from '@/hooks/api/useRelayEvents';
import type { Purpose } from '@/types/communication-purposes';
import type {
  RelayEvent,
  ChannelContent,
  CreateEventPayload,
  UpdateEventPayload,
  RelayEventType,
} from '@/types/relay-events';
import { EVENT_TYPE_OPTIONS } from '@/types/relay-events';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function splitVars(s: string): string[] {
  return s.split(',').map((v) => v.trim()).filter(Boolean);
}

function joinVars(arr: string[] | undefined): string {
  return (arr ?? []).join(', ');
}

function buildChannelContent(values: EventFormValues): ChannelContent {
  return {
    email: {
      enabled:           values.emailEnabled,
      subject:           values.emailSubject,
      content:           values.emailContent,
      requiredVariables: splitVars(values.emailRequiredVars),
      optionalVariables: splitVars(values.emailOptionalVars),
      files: {
        required: splitVars(values.emailRequiredFiles),
        optional: splitVars(values.emailOptionalFiles),
      },
    },
    sms: {
      enabled:           values.smsEnabled,
      content:           values.smsContent,
      requiredVariables: splitVars(values.smsRequiredVars),
      optionalVariables: splitVars(values.smsOptionalVars),
    },
  };
}

// ─── Form shape ───────────────────────────────────────────────────────────────

interface EventFormValues {
  domainCatalogueId:    string;
  eventKey:             string;
  displayName:          string;
  description:          string;
  eventType:            RelayEventType;
  isActive:             boolean;
  // Email channel
  emailEnabled:         boolean;
  emailSubject:         string;
  emailContent:         string;
  emailRequiredVars:    string;
  emailOptionalVars:    string;
  emailRequiredFiles:   string;
  emailOptionalFiles:   string;
  // SMS channel
  smsEnabled:           boolean;
  smsContent:           string;
  smsRequiredVars:      string;
  smsOptionalVars:      string;
}

const EMPTY_VALUES: EventFormValues = {
  domainCatalogueId:    '',
  eventKey:             '',
  displayName:          '',
  description:          '',
  eventType:            'notification',
  isActive:             true,
  emailEnabled:         true,
  emailSubject:         '',
  emailContent:         '',
  emailRequiredVars:    '',
  emailOptionalVars:    '',
  emailRequiredFiles:   '',
  emailOptionalFiles:   '',
  smsEnabled:           false,
  smsContent:           '',
  smsRequiredVars:      '',
  smsOptionalVars:      '',
};

function eventToFormValues(event: RelayEvent, domainCatalogueId: string): EventFormValues {
  const email = event.channelContent?.email;
  const sms   = event.channelContent?.sms;
  return {
    domainCatalogueId,
    eventKey:          event.eventKey,
    displayName:       event.displayName,
    description:       event.description ?? '',
    eventType:         event.eventType,
    isActive:          event.isActive,
    emailEnabled:      email?.enabled ?? false,
    emailSubject:      email?.subject ?? '',
    emailContent:      email?.content ?? '',
    emailRequiredVars: joinVars(email?.requiredVariables),
    emailOptionalVars: joinVars(email?.optionalVariables),
    emailRequiredFiles:joinVars(email?.files?.required),
    emailOptionalFiles:joinVars(email?.files?.optional),
    smsEnabled:        sms?.enabled ?? false,
    smsContent:        sms?.content ?? '',
    smsRequiredVars:   joinVars(sms?.requiredVariables),
    smsOptionalVars:   joinVars(sms?.optionalVariables),
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface EventFormDrawerProps {
  open:     boolean;
  onClose:  () => void;
  event?:   RelayEvent | null;
  /** Pre-selected purpose; required on create. */
  purposes: Purpose[];
  /** Pre-selected domainCatalogueId from the page-level selector. */
  selectedDomainId?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EventFormDrawer({
  open,
  onClose,
  event,
  purposes,
  selectedDomainId,
}: EventFormDrawerProps) {
  const isEdit = !!event;

  const createMutation = useCreateRelayEventMutation();
  const updateMutation = useUpdateRelayEventMutation();
  const saving = createMutation.isPending || updateMutation.isPending;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EventFormValues>({ defaultValues: EMPTY_VALUES });

  const emailEnabled = useWatch({ control, name: 'emailEnabled' });
  const smsEnabled   = useWatch({ control, name: 'smsEnabled' });

  useEffect(() => {
    if (!open) return;
    if (isEdit && event) {
      // Resolve domainCatalogueId: may be a populated object or a raw string
      const domainId =
        typeof event.domainCatalogueId === 'object'
          ? (event.domainCatalogueId as any).id ?? selectedDomainId ?? ''
          : (event.domainCatalogueId as string) ?? selectedDomainId ?? '';
      reset(eventToFormValues(event, domainId));
    } else {
      reset({ ...EMPTY_VALUES, domainCatalogueId: selectedDomainId ?? '' });
    }
  }, [open, event, isEdit, selectedDomainId, reset]);

  // ─── Submit ────────────────────────────────────────────────────────────────

  async function onSubmit(values: EventFormValues) {
    try {
      if (isEdit && event) {
        const payload: UpdateEventPayload = {
          displayName:    values.displayName,
          description:    values.description || undefined,
          eventType:      values.eventType,
          isActive:       values.isActive,
          channelContent: buildChannelContent(values),
        };
        await updateMutation.mutateAsync({ id: event.id, ...payload });
      } else {
        const payload: CreateEventPayload = {
          domainCatalogueId: values.domainCatalogueId,
          eventKey:          values.eventKey.trim().toLowerCase(),
          displayName:       values.displayName,
          description:       values.description || undefined,
          eventType:         values.eventType,
          isActive:          values.isActive,
          channelContent:    buildChannelContent(values),
        };
        await createMutation.mutateAsync(payload);
      }
      onClose();
    } catch {
      // Error surfaced via mutation's onError snack.
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit — ${event?.displayName}` : 'New Relay Event'}
      width={560}
      actions={
        <>
          <Button variant="outlined" onClick={onClose} disabled={saving}>Cancel</Button>
          <LoadingButton
            variant="contained"
            loading={saving}
            onClick={handleSubmit(onSubmit)}
          >
            {isEdit ? 'Save Changes' : 'Create Event'}
          </LoadingButton>
        </>
      }
    >
      <Box display="flex" flexDirection="column" gap={2.5}>

        {/* ── SECTION A: Basic Information ───────────────────────────── */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>Basic Information</Typography>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>

            {/* Relay Purpose */}
            <Controller
              name="domainCatalogueId"
              control={control}
              rules={{ required: 'Relay Purpose is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Relay Purpose"
                  required
                  fullWidth
                  size="small"
                  disabled={isEdit}
                  error={!!errors.domainCatalogueId}
                  helperText={
                    errors.domainCatalogueId?.message ??
                    (isEdit
                      ? 'Purpose cannot be changed after creation'
                      : 'Select the purpose this event belongs to')
                  }
                >
                  {purposes.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>{p.displayName}</Typography>
                        <Typography variant="caption" color="text.secondary">{p.domainKey}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            {/* Event Key */}
            <Controller
              name="eventKey"
              control={control}
              rules={{
                required: 'Event Key is required',
                maxLength: { value: 200, message: 'Max 200 characters' },
                pattern: {
                  value: /^[a-z0-9_-]+$/,
                  message: 'Only lowercase letters, numbers, hyphens and underscores',
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Event Key"
                  required
                  fullWidth
                  size="small"
                  disabled={isEdit}
                  error={!!errors.eventKey}
                  helperText={
                    errors.eventKey?.message ??
                    (isEdit
                      ? 'Event Key cannot be changed after creation'
                      : 'Unique identifier within the purpose (e.g. invoice_sent)')
                  }
                  inputProps={{ maxLength: 200 }}
                />
              )}
            />

            {/* Event Name */}
            <Controller
              name="displayName"
              control={control}
              rules={{
                required: 'Event Name is required',
                maxLength: { value: 300, message: 'Max 300 characters' },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Event Name"
                  required
                  fullWidth
                  size="small"
                  error={!!errors.displayName}
                  helperText={errors.displayName?.message ?? 'User-facing name'}
                />
              )}
            />

            {/* Description */}
            <Controller
              name="description"
              control={control}
              rules={{ maxLength: { value: 1000, message: 'Max 1000 characters' } }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Description"
                  fullWidth
                  size="small"
                  multiline
                  minRows={2}
                  error={!!errors.description}
                  helperText={errors.description?.message ?? 'Optional — describes when this event is triggered'}
                />
              )}
            />

            {/* Event Type */}
            <Controller
              name="eventType"
              control={control}
              rules={{ required: 'Event Type is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Event Type"
                  required
                  fullWidth
                  size="small"
                  error={!!errors.eventType}
                  helperText={errors.eventType?.message}
                >
                  {EVENT_TYPE_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </TextField>
              )}
            />

            {/* Active */}
            <Controller
              name="isActive"
              control={control}
              render={({ field: { value, onChange } }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                      size="small"
                    />
                  }
                  label={value ? 'Active' : 'Inactive'}
                />
              )}
            />
          </Box>
        </Box>

        <Divider />

        {/* ── SECTION B: Email Channel ────────────────────────────────── */}
        <Box>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle2">Email Channel</Typography>
            <Controller
              name="emailEnabled"
              control={control}
              render={({ field: { value, onChange } }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                      size="small"
                    />
                  }
                  label={value ? 'Enabled' : 'Disabled'}
                  labelPlacement="start"
                  sx={{ mr: 0 }}
                />
              )}
            />
          </Box>

          {emailEnabled && (
            <Box display="flex" flexDirection="column" gap={2} mt={1.5}>
              <Controller
                name="emailSubject"
                control={control}
                rules={{
                  validate: (v, fv) =>
                    !fv.emailEnabled || v.trim() ? true : 'Subject is required when email is enabled',
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Subject"
                    fullWidth
                    size="small"
                    error={!!errors.emailSubject}
                    helperText={errors.emailSubject?.message ?? 'Supports {{variableName}} placeholders'}
                    inputProps={{ maxLength: 500 }}
                  />
                )}
              />
              <Controller
                name="emailContent"
                control={control}
                rules={{
                  validate: (v, fv) =>
                    !fv.emailEnabled || v.trim() ? true : 'HTML content is required when email is enabled',
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="HTML Content"
                    fullWidth
                    size="small"
                    multiline
                    minRows={4}
                    error={!!errors.emailContent}
                    helperText={
                      errors.emailContent?.message ??
                      'HTML email body — supports {{data.variable}} placeholders'
                    }
                  />
                )}
              />
              <Controller
                name="emailRequiredVars"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Required Variables"
                    fullWidth
                    size="small"
                    helperText='Comma-separated variable paths (e.g. data.firstName, data.orderId)'
                  />
                )}
              />
              <Controller
                name="emailOptionalVars"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Optional Variables"
                    fullWidth
                    size="small"
                    helperText='Comma-separated optional variable paths'
                  />
                )}
              />
              <Box display="flex" gap={1.5}>
                <Controller
                  name="emailRequiredFiles"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Required Files"
                      fullWidth
                      size="small"
                      helperText='Comma-separated attachment keys (e.g. invoice, receipt)'
                    />
                  )}
                />
                <Controller
                  name="emailOptionalFiles"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Optional Files"
                      fullWidth
                      size="small"
                      helperText='Comma-separated optional attachment keys'
                    />
                  )}
                />
              </Box>
            </Box>
          )}
        </Box>

        <Divider />

        {/* ── SECTION C: SMS Channel ──────────────────────────────────── */}
        <Box>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle2">SMS Channel</Typography>
            <Controller
              name="smsEnabled"
              control={control}
              render={({ field: { value, onChange } }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                      size="small"
                    />
                  }
                  label={value ? 'Enabled' : 'Disabled'}
                  labelPlacement="start"
                  sx={{ mr: 0 }}
                />
              )}
            />
          </Box>

          {smsEnabled && (
            <Box display="flex" flexDirection="column" gap={2} mt={1.5}>
              <Controller
                name="smsContent"
                control={control}
                rules={{
                  validate: (v, fv) =>
                    !fv.smsEnabled || v.trim() ? true : 'SMS content is required when SMS is enabled',
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="SMS Content"
                    fullWidth
                    size="small"
                    multiline
                    minRows={3}
                    error={!!errors.smsContent}
                    helperText={
                      errors.smsContent?.message ??
                      `Supports {{variableName}} placeholders — ${160} chars = 1 SMS segment`
                    }
                    inputProps={{ maxLength: 2000 }}
                  />
                )}
              />
              <Controller
                name="smsRequiredVars"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Required Variables"
                    fullWidth
                    size="small"
                    helperText='Comma-separated variable paths (e.g. data.firstName)'
                  />
                )}
              />
              <Controller
                name="smsOptionalVars"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Optional Variables"
                    fullWidth
                    size="small"
                    helperText='Comma-separated optional variable paths'
                  />
                )}
              />
            </Box>
          )}
        </Box>

      </Box>
    </FormDrawer>
  );
}

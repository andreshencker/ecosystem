'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import Alert         from '@mui/material/Alert';
import Box           from '@mui/material/Box';
import Button        from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider       from '@mui/material/Divider';
import FormControl   from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel    from '@mui/material/InputLabel';
import MenuItem      from '@mui/material/MenuItem';
import Select        from '@mui/material/Select';
import TextField     from '@mui/material/TextField';
import ToggleButton  from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography    from '@mui/material/Typography';

import AddCircleOutlineIcon  from '@mui/icons-material/AddCircleOutline';
import CalendarTodayIcon     from '@mui/icons-material/CalendarToday';
import LinkIcon              from '@mui/icons-material/Link';

import { FormDrawer, LoadingButton } from '@/components/shared';
import {
  useAvailableCalendarAccounts,
  useCreateAndLinkCalendarMutation,
  useSubscribeByUrlMutation,
  useSubscribeFromCatalogueMutation,
  usePublicCalendarCatalogue,
} from '@/hooks/api/useLinkedCalendars';
import type { CalendarFlow, CalendarSource, PublicCalendarEntry } from '@/types/linked-calendar';

// ─── Provider capability map ──────────────────────────────────────────────────
// Based on known provider capabilities. Conservatively enables both operations
// for all providers; operational errors surface a clear message via the backend.

interface ProviderCapabilities {
  canCreate:    boolean;
  canSubscribe: boolean;
}

function getProviderCapabilities(providerKey: string): ProviderCapabilities {
  switch (providerKey.toLowerCase()) {
    case 'icloud':
    case 'apple_calendar':
      return { canCreate: true, canSubscribe: true };
    case 'google_calendar':
    case 'google':
      return { canCreate: true, canSubscribe: true };
    case 'microsoft':
    case 'outlook':
    case 'exchange':
      return { canCreate: true, canSubscribe: true };
    case 'caldav':
      // CalDAV servers vary — offer both and let the backend surface errors
      return { canCreate: true, canSubscribe: true };
    default:
      return { canCreate: true, canSubscribe: true };
  }
}

// ─── Form shape ───────────────────────────────────────────────────────────────

interface FormValues {
  source:          CalendarSource;
  connectionId:    string;
  // create-specific
  name:            string;
  description:     string;
  // catalogue-specific
  catCountry:      string;
  catRegion:       string;
  catKey:          string;
  // url-specific
  subscriptionUrl: string;
  urlName:         string;
  urlDescription:  string;
  // shared
  flow:            CalendarFlow | '';
}

const DEFAULT_VALUES: FormValues = {
  source:          'create',
  connectionId:    '',
  name:            '',
  description:     '',
  catCountry:      'AU',
  catRegion:       '',
  catKey:          '',
  subscriptionUrl: '',
  urlName:         '',
  urlDescription:  '',
  flow:            '',
};

// ─── Account select helper ────────────────────────────────────────────────────

function AccountField({
  control,
  errors,
  accounts,
  loading,
  loadError,
}: {
  control:   any;
  errors:    any;
  accounts:  any[] | undefined;
  loading:   boolean;
  loadError: any;
}) {
  if (loadError) {
    return (
      <Alert severity="error">
        {(loadError as any)?.response?.data?.message ?? 'Failed to load calendar accounts. Check that Communications integration is configured.'}
      </Alert>
    );
  }
  if (!loading && (!accounts || accounts.length === 0)) {
    return (
      <Alert severity="info">
        No calendar accounts found. Connect a calendar account in{' '}
        <strong>Communications App → Calendar → Connect</strong> first.
      </Alert>
    );
  }
  return (
    <Controller
      name="connectionId"
      control={control}
      rules={{ required: 'Calendar Account is required' }}
      render={({ field }) => (
        <FormControl fullWidth size="small" required error={!!errors.connectionId}>
          <InputLabel>Calendar Account</InputLabel>
          <Select {...field} label="Calendar Account" disabled={loading}>
            <MenuItem value="">Select an account</MenuItem>
            {loading && (
              <MenuItem value="" disabled>
                <Box display="flex" alignItems="center" gap={1}>
                  <CircularProgress size={14} />
                  <span>Loading…</span>
                </Box>
              </MenuItem>
            )}
            {(accounts ?? []).map((acc) => (
              <MenuItem key={acc.connectionId} value={acc.connectionId}>
                <Box>
                  <Typography variant="body2">{acc.accountIdentifier}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {acc.providerDisplayName}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
          {errors.connectionId && (
            <FormHelperText>{errors.connectionId.message}</FormHelperText>
          )}
        </FormControl>
      )}
    />
  );
}

// ─── Flow field ───────────────────────────────────────────────────────────────

function FlowField({ control, errors }: { control: any; errors: any }) {
  return (
    <Controller
      name="flow"
      control={control}
      rules={{ required: 'Flow is required' }}
      render={({ field }) => (
        <FormControl fullWidth size="small" required error={!!errors.flow}>
          <InputLabel>Use this calendar for</InputLabel>
          <Select {...field} label="Use this calendar for">
            <MenuItem value="">Select a flow</MenuItem>
            <MenuItem value="holidays">Holidays</MenuItem>
            <MenuItem value="shifts">Shifts</MenuItem>
            <MenuItem value="payments">Payments</MenuItem>
          </Select>
          {errors.flow ? (
            <FormHelperText>{errors.flow.message}</FormHelperText>
          ) : (
            <FormHelperText>Defines how this calendar is used across Business App.</FormHelperText>
          )}
        </FormControl>
      )}
    />
  );
}

// ─── Source: Create New Calendar ──────────────────────────────────────────────

function CreateFields({ control, errors }: { control: any; errors: any }) {
  return (
    <>
      <Controller
        name="name"
        control={control}
        rules={{
          required:  'Calendar Name is required',
          maxLength: { value: 200, message: 'Max 200 characters' },
        }}
        render={({ field }) => (
          <TextField
            {...field}
            label="Calendar Name"
            required
            fullWidth
            size="small"
            error={!!errors.name}
            helperText={errors.name?.message ?? 'The name shown in your calendar provider.'}
            placeholder="e.g. Expected Payments"
          />
        )}
      />
      <Controller
        name="description"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label="Description"
            fullWidth
            size="small"
            multiline
            minRows={2}
            helperText="Optional. Shown in your calendar provider."
            placeholder="e.g. Expected customer invoice payment dates"
          />
        )}
      />
    </>
  );
}

// ─── Source: Browse Public Calendars ─────────────────────────────────────────

function CatalogueFields({
  control,
  errors,
  setValue,
}: {
  control:  any;
  errors:   any;
  setValue: (name: keyof FormValues, val: any) => void;
}) {
  const catCountry = useWatch({ control, name: 'catCountry' });
  const catRegion  = useWatch({ control, name: 'catRegion' });
  const catKey     = useWatch({ control, name: 'catKey' });

  const { data: catalogue, isLoading: catLoading } = usePublicCalendarCatalogue(catCountry || 'AU');

  // Unique regions in selected country
  const regions = useMemo<{ region: string; regionLabel: string }[]>(() => {
    if (!catalogue) return [];
    const seen = new Set<string>();
    return catalogue
      .filter((e) => { if (seen.has(e.region)) return false; seen.add(e.region); return true; })
      .map((e) => ({ region: e.region, regionLabel: e.regionLabel }));
  }, [catalogue]);

  // Calendars available for selected region (available and unavailable — show all for UX)
  const regionCalendars = useMemo<PublicCalendarEntry[]>(() => {
    if (!catalogue || !catRegion) return [];
    return catalogue.filter((e) => e.region === catRegion);
  }, [catalogue, catRegion]);

  const selectedEntry = useMemo(
    () => catalogue?.find((e) => e.key === catKey) ?? null,
    [catalogue, catKey],
  );

  // Auto-set flow from catalogue recommendation when entry changes
  useEffect(() => {
    if (selectedEntry?.recommendedFlow) {
      setValue('flow', selectedEntry.recommendedFlow);
    }
  }, [selectedEntry, setValue]);

  // Reset catKey when region changes
  useEffect(() => {
    setValue('catKey', '');
  }, [catRegion, setValue]);

  return (
    <>
      {/* Country — currently fixed to AU; extend when more countries added */}
      <Controller
        name="catCountry"
        control={control}
        render={({ field }) => (
          <FormControl fullWidth size="small">
            <InputLabel>Country</InputLabel>
            <Select {...field} label="Country">
              <MenuItem value="AU">Australia</MenuItem>
            </Select>
            <FormHelperText>Additional countries will be added in future releases.</FormHelperText>
          </FormControl>
        )}
      />

      {/* State / Region */}
      <Controller
        name="catRegion"
        control={control}
        rules={{ required: 'State / Region is required' }}
        render={({ field }) => (
          <FormControl fullWidth size="small" required error={!!errors.catRegion}>
            <InputLabel>State / Region</InputLabel>
            <Select {...field} label="State / Region" disabled={catLoading || regions.length === 0}>
              <MenuItem value="">Select a region</MenuItem>
              {catLoading && <MenuItem value="" disabled>Loading…</MenuItem>}
              {regions.map((r) => (
                <MenuItem key={r.region} value={r.region}>{r.regionLabel}</MenuItem>
              ))}
            </Select>
            {errors.catRegion && <FormHelperText>{errors.catRegion.message}</FormHelperText>}
          </FormControl>
        )}
      />

      {/* Public Calendar */}
      {catRegion && (
        <Controller
          name="catKey"
          control={control}
          rules={{ required: 'Public Calendar is required' }}
          render={({ field }) => (
            <FormControl fullWidth size="small" required error={!!errors.catKey}>
              <InputLabel>Public Calendar</InputLabel>
              <Select {...field} label="Public Calendar">
                <MenuItem value="">Select a calendar</MenuItem>
                {regionCalendars.map((e) => (
                  <MenuItem key={e.key} value={e.key} disabled={!e.available}>
                    <Box>
                      <Typography variant="body2">{e.displayName}</Typography>
                      {!e.available && (
                        <Typography variant="caption" color="text.disabled">
                          Not currently available
                        </Typography>
                      )}
                      {e.available && e.limitations && (
                        <Typography variant="caption" color="text.secondary">
                          {e.limitations}
                        </Typography>
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
              {errors.catKey ? (
                <FormHelperText>{errors.catKey.message}</FormHelperText>
              ) : (
                <FormHelperText>
                  Calendar is subscribed through your provider and linked automatically.
                </FormHelperText>
              )}
            </FormControl>
          )}
        />
      )}

      {/* No available calendars in region */}
      {catRegion && !catLoading && regionCalendars.length > 0 && regionCalendars.every((e) => !e.available) && (
        <Alert severity="info">
          No public calendars are currently available for this region.
          Subscribe by URL if you have a known iCal feed, or check back later.
        </Alert>
      )}

      {/* Selected entry description */}
      {selectedEntry?.description && (
        <Alert severity="success" sx={{ py: 0.5 }}>
          {selectedEntry.description}
          {selectedEntry.limitations && (
            <Box mt={0.5}>
              <Typography variant="caption">Note: {selectedEntry.limitations}</Typography>
            </Box>
          )}
        </Alert>
      )}
    </>
  );
}

// ─── Source: Subscribe by URL ─────────────────────────────────────────────────

function UrlFields({ control, errors }: { control: any; errors: any }) {
  return (
    <>
      <Controller
        name="subscriptionUrl"
        control={control}
        rules={{
          required: 'Subscription URL is required',
          validate: (v: string) => {
            const trimmed = v.trim();
            if (!trimmed) return 'Subscription URL is required';
            if (!/^https:\/\//i.test(trimmed)) {
              return 'Only HTTPS URLs are accepted (e.g. https://example.org/calendar.ics)';
            }
            try {
              new URL(trimmed);
            } catch {
              return 'Please enter a valid URL';
            }
            if (trimmed.length > 2048) return 'URL is too long (max 2048 characters)';
            return true;
          },
        }}
        render={({ field }) => (
          <TextField
            {...field}
            onChange={(e) => field.onChange(e.target.value.trim())}
            label="Subscription URL"
            required
            fullWidth
            size="small"
            error={!!errors.subscriptionUrl}
            helperText={
              errors.subscriptionUrl?.message ??
              'Paste a public iCal/ICS subscription URL (HTTPS only).'
            }
            placeholder="https://example.org/calendar.ics"
          />
        )}
      />
      <Controller
        name="urlName"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label="Calendar Name"
            fullWidth
            size="small"
            helperText="Optional. Defaults to the name provided by the subscription URL."
            placeholder="e.g. Industry Events"
          />
        )}
      />
      <Controller
        name="urlDescription"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label="Description"
            fullWidth
            size="small"
            multiline
            minRows={2}
            helperText="Optional."
          />
        )}
      />
    </>
  );
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

interface CreateCalendarDrawerProps {
  open:    boolean;
  onClose: () => void;
}

const SOURCE_HELP: Record<CalendarSource, string> = {
  create:    'Creates a new calendar in the selected provider and links it to Business App.',
  catalogue: 'Choose a calendar from the Business App catalogue, such as Australian public holidays.',
  url:       'Paste a public iCal/ICS subscription URL supplied by a third party.',
};

const SUBMIT_LABEL: Record<CalendarSource, string> = {
  create:    'Create Calendar',
  catalogue: 'Subscribe',
  url:       'Subscribe',
};

export function CreateCalendarDrawer({ open, onClose }: CreateCalendarDrawerProps) {
  const { data: accounts, isLoading: accountsLoading, error: accountsError } =
    useAvailableCalendarAccounts();

  const createMutation    = useCreateAndLinkCalendarMutation();
  const subscribeUrl      = useSubscribeByUrlMutation();
  const subscribeCatalogue = useSubscribeFromCatalogueMutation();

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: DEFAULT_VALUES });

  const source = watch('source');
  const connectionId = watch('connectionId');

  // Provider capabilities (shown after account selected)
  const selectedAccount = accounts?.find((a) => a.connectionId === connectionId);
  const caps = selectedAccount
    ? getProviderCapabilities(selectedAccount.providerKey)
    : { canCreate: true, canSubscribe: true };

  useEffect(() => {
    if (open) reset(DEFAULT_VALUES);
  }, [open, reset]);

  // Auto-select when exactly one account exists
  useEffect(() => {
    if (accounts?.length === 1 && !watch('connectionId')) {
      setValue('connectionId', accounts[0].connectionId);
    }
  }, [accounts]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear source-specific values when source changes
  useEffect(() => {
    if (source === 'create') {
      setValue('catRegion', '');
      setValue('catKey', '');
      setValue('subscriptionUrl', '');
      setValue('urlName', '');
      setValue('urlDescription', '');
    } else if (source === 'catalogue') {
      setValue('name', '');
      setValue('description', '');
      setValue('subscriptionUrl', '');
      setValue('urlName', '');
      setValue('urlDescription', '');
    } else if (source === 'url') {
      setValue('name', '');
      setValue('description', '');
      setValue('catRegion', '');
      setValue('catKey', '');
    }
  }, [source, setValue]);

  const isPending =
    createMutation.isPending ||
    subscribeUrl.isPending   ||
    subscribeCatalogue.isPending;

  const onSubmit = handleSubmit(async (values) => {
    const { source: src, connectionId: conn, flow } = values;

    if (src === 'create') {
      await createMutation.mutateAsync({
        connectionId: conn,
        name:         values.name.trim(),
        ...(values.description.trim() ? { description: values.description.trim() } : {}),
        flow:         flow as CalendarFlow,
      });
    } else if (src === 'catalogue') {
      await subscribeCatalogue.mutateAsync({
        connectionId: conn,
        catalogueKey: values.catKey,
        flow:         flow as CalendarFlow,
      });
    } else if (src === 'url') {
      await subscribeUrl.mutateAsync({
        connectionId:    conn,
        subscriptionUrl: values.subscriptionUrl.trim(),
        ...(values.urlName.trim()        ? { calendarName:  values.urlName.trim() }        : {}),
        ...(values.urlDescription.trim() ? { description:   values.urlDescription.trim() } : {}),
        flow: flow as CalendarFlow,
      });
    }

    onClose();
  });

  // Warn when selected source is unsupported by the chosen provider
  const sourceDisabled =
    (source === 'create'    && !caps.canCreate)    ||
    (source === 'catalogue' && !caps.canSubscribe) ||
    (source === 'url'       && !caps.canSubscribe);

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Create Calendar"
      width={520}
      actions={
        <>
          <Button variant="outlined" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <LoadingButton
            variant="contained"
            loading={isPending}
            onClick={onSubmit}
            disabled={sourceDisabled}
          >
            {SUBMIT_LABEL[source]}
          </LoadingButton>
        </>
      }
    >
      <Box display="flex" flexDirection="column" gap={2.5}>

        {/* 1 — Calendar Source */}
        <Box>
          <Typography variant="body2" fontWeight={600} mb={1}>
            Calendar Source *
          </Typography>
          <Controller
            name="source"
            control={control}
            render={({ field }) => (
              <ToggleButtonGroup
                exclusive
                value={field.value}
                onChange={(_e, val) => { if (val) field.onChange(val); }}
                size="small"
                fullWidth
                sx={{ mb: 0.5 }}
              >
                <ToggleButton value="create">
                  <AddCircleOutlineIcon fontSize="small" sx={{ mr: 0.75 }} />
                  Create New
                </ToggleButton>
                <ToggleButton value="catalogue">
                  <CalendarTodayIcon fontSize="small" sx={{ mr: 0.75 }} />
                  Browse Public
                </ToggleButton>
                <ToggleButton value="url">
                  <LinkIcon fontSize="small" sx={{ mr: 0.75 }} />
                  Subscribe by URL
                </ToggleButton>
              </ToggleButtonGroup>
            )}
          />
          <Typography variant="caption" color="text.secondary">
            {SOURCE_HELP[source]}
          </Typography>
        </Box>

        <Divider />

        {/* 2 — Calendar Account */}
        <AccountField
          control={control}
          errors={errors}
          accounts={accounts}
          loading={accountsLoading}
          loadError={accountsError}
        />

        {/* Provider capability warning */}
        {sourceDisabled && selectedAccount && (
          <Alert severity="warning">
            {source === 'create'
              ? `${selectedAccount.providerDisplayName} does not support creating calendars.`
              : `${selectedAccount.providerDisplayName} does not support URL subscriptions.`}
            {' '}Please choose a different source or account.
          </Alert>
        )}

        {/* 3 — Source-specific fields */}
        {!sourceDisabled && (
          <>
            {source === 'create' && (
              <CreateFields control={control} errors={errors} />
            )}
            {source === 'catalogue' && (
              <CatalogueFields control={control} errors={errors} setValue={setValue} />
            )}
            {source === 'url' && (
              <UrlFields control={control} errors={errors} />
            )}
          </>
        )}

        {/* 4 — Flow */}
        <FlowField control={control} errors={errors} />
      </Box>
    </FormDrawer>
  );
}

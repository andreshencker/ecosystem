'use client';

import React, { useEffect, useState } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import Autocomplete    from '@mui/material/Autocomplete';
import Box             from '@mui/material/Box';
import Button          from '@mui/material/Button';
import Chip            from '@mui/material/Chip';
import Divider         from '@mui/material/Divider';
import IconButton      from '@mui/material/IconButton';
import MenuItem        from '@mui/material/MenuItem';
import TextField       from '@mui/material/TextField';
import Typography      from '@mui/material/Typography';
import AddIcon         from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import SmsOutlinedIcon   from '@mui/icons-material/SmsOutlined';

import { FormDrawer, LoadingButton } from '@/components/shared';
import { usePurposes } from '@/hooks/api/useCommunicationPurposes';
import type { Purpose } from '@/types/communication-purposes';
import type {
  CommPurposeFormEntry,
  CommPurposeEmailRecipient,
  CommPurposeSmsRecipient,
} from '@/types/customer';
import {
  getContactOptionLabel,
  resolveContactOptionValue,
} from './purposeAutocomplete.utils';

// ─── Contact suggestions ──────────────────────────────────────────────────────

export interface ContactOption {
  /** Display label shown in the dropdown — never stored in the form field. */
  label: string;
  /** The raw email or phone stored in the form field after selection. */
  value: string;
}

// ─── Form shape (internal to this drawer) ─────────────────────────────────────

interface DrawerFormValues {
  purposeId:       string;
  emailRecipients: CommPurposeEmailRecipient[];
  smsRecipients:   CommPurposeSmsRecipient[];
}

const DEFAULT_VALUES: DrawerFormValues = {
  purposeId:       '',
  emailRecipients: [],
  smsRecipients:   [],
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PurposeConfigDrawerProps {
  open:   boolean;
  onClose: () => void;
  onSave:  (entry: CommPurposeFormEntry) => void;
  /** Provided when editing an existing entry; null/undefined = create mode. */
  entry?: CommPurposeFormEntry | null;
  /** IDs of purposes already configured on this customer (to prevent duplicates). */
  usedDomainIds: string[];
  /** Contact suggestions for autocomplete. */
  emailSuggestions: ContactOption[];
  smsSuggestions:   ContactOption[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PurposeConfigDrawer({
  open,
  onClose,
  onSave,
  entry,
  usedDomainIds,
  emailSuggestions,
  smsSuggestions,
}: PurposeConfigDrawerProps) {
  const isEdit = !!entry;

  const { data: purposesData } = usePurposes({ limit: 200, enabled: open });
  const purposes: Purpose[] = purposesData?.data ?? [];

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<DrawerFormValues>({ defaultValues: DEFAULT_VALUES });

  const purposeId    = watch('purposeId');
  const selectedPurpose = purposes.find((p) => p.id === purposeId) ?? null;

  const hasEmail = selectedPurpose?.channelsToUse.some((c) => c.channel === 'email') ?? false;
  const hasSms   = selectedPurpose?.channelsToUse.some((c) => c.channel === 'sms')   ?? false;

  const {
    fields: emailFields,
    append:  appendEmail,
    remove:  removeEmail,
  } = useFieldArray({ control, name: 'emailRecipients' });

  const {
    fields: smsFields,
    append:  appendSms,
    remove:  removeSms,
  } = useFieldArray({ control, name: 'smsRecipients' });

  // Reset form when drawer opens / entry changes
  useEffect(() => {
    if (!open) return;
    if (isEdit && entry) {
      reset({
        purposeId:       entry.communicationDomainId,
        emailRecipients: entry.emailRecipients.length > 0 ? entry.emailRecipients : [],
        smsRecipients:   entry.smsRecipients.length   > 0 ? entry.smsRecipients   : [],
      });
    } else {
      reset(DEFAULT_VALUES);
    }
  }, [open, entry, isEdit, reset]);

  // ─── Submit ────────────────────────────────────────────────────────────────

  function onSubmit(values: DrawerFormValues) {
    if (!values.purposeId) {
      setError('purposeId', { message: 'Please select a Communication Purpose' });
      return;
    }

    // Duplicate purpose check (only on create)
    if (!isEdit && usedDomainIds.includes(values.purposeId)) {
      setError('purposeId', { message: 'This Purpose is already configured for this customer' });
      return;
    }

    // Duplicate email validation
    const emailAddresses = values.emailRecipients.map((r) => r.email.toLowerCase());
    if (new Set(emailAddresses).size < emailAddresses.length) {
      setError('emailRecipients', { message: 'Duplicate email addresses are not allowed' });
      return;
    }

    // Duplicate phone validation
    const phones = values.smsRecipients.map((r) => r.phone.trim());
    if (new Set(phones).size < phones.length) {
      setError('smsRecipients', { message: 'Duplicate phone numbers are not allowed' });
      return;
    }

    onSave({
      communicationDomainId: values.purposeId,
      emailRecipients:       hasEmail ? values.emailRecipients : [],
      smsRecipients:         hasSms   ? values.smsRecipients   : [],
    });
    onClose();
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const purposeOptions = isEdit
    ? purposes
    : purposes.filter((p) => !usedDomainIds.includes(p.id) || p.id === purposeId);

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Communication Purpose' : 'Add Communication Purpose'}
      width={500}
      actions={
        <>
          <Button variant="outlined" onClick={onClose}>Cancel</Button>
          <LoadingButton variant="contained" onClick={handleSubmit(onSubmit)}>
            {isEdit ? 'Save Changes' : 'Add Purpose'}
          </LoadingButton>
        </>
      }
    >
      <Box display="flex" flexDirection="column" gap={2.5}>

        {/* ── Step 1: Select Purpose ──────────────────────────────────── */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>Communication Purpose</Typography>
          <Controller
            name="purposeId"
            control={control}
            rules={{ required: 'Please select a Communication Purpose' }}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Communication Purpose"
                required
                fullWidth
                size="small"
                disabled={isEdit}
                error={!!errors.purposeId}
                helperText={
                  errors.purposeId?.message ??
                  (isEdit
                    ? 'Purpose cannot be changed — delete and re-add to change'
                    : 'Select the purpose to configure recipients for')
                }
              >
                {purposeOptions.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>{p.displayName}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                        {p.domainKey}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </Box>

        {/* ── Step 2: Channels + Recipients ──────────────────────────── */}
        {selectedPurpose && (
          <>
            {/* Channel summary */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>Channels</Typography>
              <Box display="flex" gap={1}>
                {hasEmail && <Chip icon={<EmailOutlinedIcon />} label="Email" size="small" color="primary" variant="outlined" />}
                {hasSms   && <Chip icon={<SmsOutlinedIcon />}   label="SMS"   size="small" color="info"    variant="outlined" />}
                {!hasEmail && !hasSms && (
                  <Typography variant="body2" color="text.disabled">
                    No channels configured for this purpose
                  </Typography>
                )}
              </Box>
            </Box>

            {/* ── Email recipients ──────────────────────────────────── */}
            {hasEmail && (
              <>
                <Divider />
                <Box>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                    <Typography variant="subtitle2">
                      <EmailOutlinedIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                      Email Recipients
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => appendEmail({ email: '', recipientType: 'to' })}
                    >
                      Add
                    </Button>
                  </Box>

                  {(errors as any).emailRecipients?.message && (
                    <Typography variant="caption" color="error" display="block" mb={1}>
                      {(errors as any).emailRecipients.message}
                    </Typography>
                  )}

                  {emailFields.length === 0 ? (
                    <Typography variant="body2" color="text.disabled">
                      No email recipients added yet.
                    </Typography>
                  ) : (
                    <Box display="flex" flexDirection="column" gap={1.5}>
                      {emailFields.map((field, index) => (
                        <Box key={field.id} display="flex" gap={1} alignItems="flex-start">
                          {/* Email autocomplete */}
                          <Controller
                            name={`emailRecipients.${index}.email`}
                            control={control}
                            rules={{
                              required: 'Email is required',
                              pattern: {
                                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                message: 'Invalid email',
                              },
                            }}
                            render={({ field: f }) => (
                              <Autocomplete
                                freeSolo
                                options={emailSuggestions}
                                getOptionLabel={getContactOptionLabel}
                                inputValue={f.value}
                                onInputChange={(_e, v) => f.onChange(v)}
                                onChange={(_e, val) => f.onChange(resolveContactOptionValue(val))}
                                sx={{ flex: 1 }}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    label="Email"
                                    size="small"
                                    error={!!errors.emailRecipients?.[index]?.email}
                                    helperText={errors.emailRecipients?.[index]?.email?.message}
                                  />
                                )}
                                renderOption={(props, opt) => {
                                  const { key, ...rest } = props as any;
                                  return (
                                    <li key={key} {...rest}>
                                      <Box>
                                        <Typography variant="body2">{opt.label.split(' — ')[0]}</Typography>
                                        <Typography variant="caption" color="text.secondary">{opt.value}</Typography>
                                      </Box>
                                    </li>
                                  );
                                }}
                              />
                            )}
                          />
                          {/* Recipient type */}
                          <Controller
                            name={`emailRecipients.${index}.recipientType`}
                            control={control}
                            rules={{ required: 'Required' }}
                            render={({ field: f }) => (
                              <TextField {...f} select label="Type" size="small" sx={{ width: 76 }}>
                                <MenuItem value="to">To</MenuItem>
                                <MenuItem value="cc">CC</MenuItem>
                                <MenuItem value="bcc">BCC</MenuItem>
                              </TextField>
                            )}
                          />
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removeEmail(index)}
                            sx={{ mt: 0.5 }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </>
            )}

            {/* ── SMS recipients ────────────────────────────────────── */}
            {hasSms && (
              <>
                <Divider />
                <Box>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                    <Typography variant="subtitle2">
                      <SmsOutlinedIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                      SMS Recipients
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => appendSms({ phone: '' })}
                    >
                      Add
                    </Button>
                  </Box>

                  {(errors as any).smsRecipients?.message && (
                    <Typography variant="caption" color="error" display="block" mb={1}>
                      {(errors as any).smsRecipients.message}
                    </Typography>
                  )}

                  {smsFields.length === 0 ? (
                    <Typography variant="body2" color="text.disabled">
                      No phone numbers added yet.
                    </Typography>
                  ) : (
                    <Box display="flex" flexDirection="column" gap={1.5}>
                      {smsFields.map((field, index) => (
                        <Box key={field.id} display="flex" gap={1} alignItems="flex-start">
                          <Controller
                            name={`smsRecipients.${index}.phone`}
                            control={control}
                            rules={{
                              required: 'Phone number is required',
                              pattern: {
                                value: /^\+?[0-9\s\-()]{7,20}$/,
                                message: 'Invalid phone number',
                              },
                            }}
                            render={({ field: f }) => (
                              <Autocomplete
                                freeSolo
                                options={smsSuggestions}
                                getOptionLabel={getContactOptionLabel}
                                inputValue={f.value}
                                onInputChange={(_e, v) => f.onChange(v)}
                                onChange={(_e, val) => f.onChange(resolveContactOptionValue(val))}
                                sx={{ flex: 1 }}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    label="Phone Number"
                                    size="small"
                                    placeholder="+61411000000"
                                    error={!!errors.smsRecipients?.[index]?.phone}
                                    helperText={errors.smsRecipients?.[index]?.phone?.message}
                                  />
                                )}
                                renderOption={(props, opt) => {
                                  const { key, ...rest } = props as any;
                                  return (
                                    <li key={key} {...rest}>
                                      <Box>
                                        <Typography variant="body2">{opt.label.split(' — ')[0]}</Typography>
                                        <Typography variant="caption" color="text.secondary">{opt.value}</Typography>
                                      </Box>
                                    </li>
                                  );
                                }}
                              />
                            )}
                          />
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removeSms(index)}
                            sx={{ mt: 0.5 }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </>
            )}
          </>
        )}

      </Box>
    </FormDrawer>
  );
}

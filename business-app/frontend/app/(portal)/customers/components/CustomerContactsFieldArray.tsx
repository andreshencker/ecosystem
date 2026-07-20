'use client';

import React, { useRef } from 'react';
import { Controller, useFieldArray, type Control, type FieldErrors } from 'react-hook-form';
import Box         from '@mui/material/Box';
import Button      from '@mui/material/Button';
import Chip        from '@mui/material/Chip';
import Divider     from '@mui/material/Divider';
import IconButton  from '@mui/material/IconButton';
import TextField   from '@mui/material/TextField';
import Tooltip     from '@mui/material/Tooltip';
import Typography  from '@mui/material/Typography';
import AddIcon            from '@mui/icons-material/Add';
import DeleteOutlineIcon  from '@mui/icons-material/DeleteOutline';
import StarIcon           from '@mui/icons-material/Star';
import StarBorderIcon     from '@mui/icons-material/StarBorder';

import MenuItem    from '@mui/material/MenuItem';
import { PhoneField } from '@/components/shared';
import type { LocationFormRow } from './CustomerLocationsFieldArray';

// ─── Contact row shape ────────────────────────────────────────────────────────

export interface ContactFormRow {
  /** tempId used as the RHF key; real database id populated in edit mode */
  _id?:       string;
  name:       string;
  email:      string;
  phone:      string;
  role:       string;
  isPrimary:  boolean;
  /** localId of the assigned LocationFormRow. Empty string = no location. */
  locationId: string;
}

export const EMPTY_CONTACT_ROW: ContactFormRow = {
  name:       '',
  email:      '',
  phone:      '',
  role:       '',
  isPrimary:  false,
  locationId: '',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control:    Control<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors:     FieldErrors<any>;
  /** Current locations configured for this customer — used for the location selector. */
  locations?: LocationFormRow[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CustomerContactsFieldArray({ control, errors, locations }: Props) {
  const { fields: rawFields, append, remove, update } = useFieldArray({
    control,
    name: 'contacts',
  });
  // Cast to concrete type — useFieldArray loses generics when Control<any> is used
  const fields = rawFields as (ContactFormRow & { id: string })[];

  const contactErrors = errors?.contacts as FieldErrors<ContactFormRow>[] | undefined;

  // Ref for the contacts scroll container — used to auto-scroll when a contact is added
  const scrollRef = useRef<HTMLDivElement>(null);

  function handleSetPrimary(index: number) {
    fields.forEach((f, i) => {
      update(i, { ...f, isPrimary: i === index });
    });
  }

  function handleAdd() {
    const isFirst = fields.length === 0;
    append({ ...EMPTY_CONTACT_ROW, isPrimary: isFirst });
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);
  }

  return (
    <Box>
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={0.5}>
        <Box>
          <Typography variant="subtitle2">Contacts</Typography>
          <Typography variant="caption" color="text.secondary">
            People associated with this customer. One contact should be marked as primary.
          </Typography>
        </Box>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          sx={{ ml: 1, flexShrink: 0, mt: 0.25 }}
        >
          Add Contact
        </Button>
      </Box>

      {fields.length === 0 ? (
        <Typography variant="body2" color="text.disabled" sx={{ py: 1 }}>
          No contacts yet. Add a contact to track people within this customer.
        </Typography>
      ) : (
        /* Bounded scroll area — header and Add button stay above this */
        <Box
          ref={scrollRef}
          sx={{
            maxHeight: { xs: 'none', sm: 420 },
            overflowY: 'auto',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            px: 1.5,
            py: 1.5,
            mt: 1,
          }}
        >
        <Box display="flex" flexDirection="column" gap={2}>
          {fields.map((fieldItem, index) => {
            const rowErrors = contactErrors?.[index];
            return (
              <Box key={fieldItem.id}>
                {/* Contact card header */}
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Contact {index + 1}
                    </Typography>
                    {fieldItem.isPrimary && (
                      <Chip label="Primary" size="small" color="primary" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                    )}
                  </Box>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Tooltip title={fieldItem.isPrimary ? 'Primary contact' : 'Set as primary'}>
                      <IconButton
                        size="small"
                        color={fieldItem.isPrimary ? 'primary' : 'default'}
                        onClick={() => handleSetPrimary(index)}
                        aria-label={fieldItem.isPrimary ? 'Primary contact' : 'Set as primary'}
                      >
                        {fieldItem.isPrimary
                          ? <StarIcon fontSize="small" />
                          : <StarBorderIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove contact">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => remove(index)}
                        aria-label="Remove contact"
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Contact fields */}
                <Box display="flex" flexDirection="column" gap={1.5}>
                  <Controller
                    name={`contacts.${index}.name` as any}
                    control={control as any}
                    rules={{ required: 'Contact name is required', maxLength: { value: 200, message: 'Max 200 characters' } }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Name"
                        required
                        fullWidth
                        size="small"
                        error={!!rowErrors?.name}
                        helperText={(rowErrors?.name as any)?.message ?? 'Full name'}
                      />
                    )}
                  />

                  <Controller
                    name={`contacts.${index}.role` as any}
                    control={control as any}
                    rules={{ maxLength: { value: 100, message: 'Max 100 characters' } }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Role / Position"
                        fullWidth
                        size="small"
                        placeholder="e.g. Accounts Payable"
                        error={!!rowErrors?.role}
                        helperText={(rowErrors?.role as any)?.message}
                      />
                    )}
                  />

                  <Controller
                    name={`contacts.${index}.email` as any}
                    control={control as any}
                    rules={{
                      pattern: { value: /^([^\s@]+@[^\s@]+\.[^\s@]+)?$/, message: 'Invalid email address' },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="email"
                        label="Email"
                        fullWidth
                        size="small"
                        error={!!rowErrors?.email}
                        helperText={(rowErrors?.email as any)?.message}
                      />
                    )}
                  />

                  <Controller
                    name={`contacts.${index}.phone` as any}
                    control={control as any}
                    render={({ field }) => (
                      <PhoneField
                        value={field.value}
                        onChange={field.onChange}
                        label="Phone"
                        size="small"
                        fullWidth
                        error={!!rowErrors?.phone}
                        helperText={(rowErrors?.phone as any)?.message}
                      />
                    )}
                  />

                  {/* Location selector — only shown when there are locations configured */}
                  {locations && locations.length > 0 && (
                    <Controller
                      name={`contacts.${index}.locationId` as any}
                      control={control as any}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          select
                          label="Location"
                          size="small"
                          fullWidth
                          value={field.value ?? ''}
                          SelectProps={{
                            renderValue: (val) => {
                              if (!val) return <em style={{ color: 'inherit', opacity: 0.5 }}>No location</em>;
                              return locations.find((l) => l.localId === val)?.tag ?? 'Unknown location';
                            },
                          }}
                        >
                          <MenuItem value=""><em>No location</em></MenuItem>
                          {locations.filter((l) => l.localId).map((l) => (
                            <MenuItem key={l.localId} value={l.localId}>
                              <Box>
                                <Typography variant="body2">{l.tag || 'Untitled location'}</Typography>
                                {(l.line1 || l.city) && (
                                  <Typography variant="caption" color="text.secondary">
                                    {[l.line1, l.city, l.postalCode].filter(Boolean).join(', ')}
                                  </Typography>
                                )}
                              </Box>
                            </MenuItem>
                          ))}
                        </TextField>
                      )}
                    />
                  )}
                </Box>

                {index < fields.length - 1 && <Divider sx={{ mt: 2 }} />}
              </Box>
            );
          })}
        </Box>
        </Box>
      )}
    </Box>
  );
}

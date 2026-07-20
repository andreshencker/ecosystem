'use client';

import React, { useRef } from 'react';
import { Controller, useFieldArray, type Control, type FieldErrors } from 'react-hook-form';
import Box        from '@mui/material/Box';
import Button     from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper      from '@mui/material/Paper';
import TextField  from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon          from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

// ─── Form row shape ───────────────────────────────────────────────────────────

export interface LocationFormRow {
  _id?:       string;   // real DB id — undefined for new entries
  /**
   * Stable local identifier used within the form session.
   * For existing locations: equals the DB _id (so it's also used as locationId in contacts).
   * For new (unsaved) locations: a freshly generated UUID.
   * Never changes within a session, so contact → location references remain valid.
   */
  localId:    string;
  tag:        string;
  country:    string;
  line1:      string;
  line2:      string;   // empty string for null
  city:       string;
  postalCode: string;
  state:      string;   // empty string for null
}

export const EMPTY_LOCATION_ROW: Omit<LocationFormRow, 'localId'> = {
  tag: '', country: '', line1: '', line2: '', city: '', postalCode: '', state: '',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors:  FieldErrors<any>;
  /**
   * Called instead of the default remove when the user clicks delete.
   * The parent form uses this to detect contacts assigned to the location
   * and show a confirmation dialog. If not provided, deletion proceeds immediately.
   * `onConfirm` must be called by the parent when deletion is approved.
   */
  onBeforeRemove?: (index: number, localId: string, onConfirm: () => void) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CustomerLocationsFieldArray({ control, errors, onBeforeRemove }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { fields, append, remove } = useFieldArray({ control, name: 'locations' });
  // Cast to access localId
  const typedFields = fields as (LocationFormRow & { id: string })[];

  function addLocation() {
    append({ ...EMPTY_LOCATION_ROW, localId: crypto.randomUUID() });
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);
  }

  function handleRemove(index: number) {
    const localId = typedFields[index]?.localId ?? '';
    if (onBeforeRemove) {
      onBeforeRemove(index, localId, () => remove(index));
    } else {
      remove(index);
    }
  }

  return (
    <Box>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={0.5}>
        <Box>
          <Typography variant="subtitle2">Customer Locations</Typography>
          <Typography variant="caption" color="text.secondary">
            Physical locations — head office, warehouse, branch, etc.
          </Typography>
        </Box>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={addLocation}
          sx={{ ml: 1, flexShrink: 0, mt: 0.25 }}
        >
          Add Location
        </Button>
      </Box>

      {fields.length === 0 ? (
        <Typography variant="body2" color="text.disabled" sx={{ py: 1 }}>
          No locations added yet.
        </Typography>
      ) : (
        <Box
          ref={scrollRef}
          sx={{
            maxHeight: { xs: 'none', sm: 480 },
            overflowY: { xs: 'visible', sm: 'auto' },
            overflowX: 'hidden',
            pr:        { xs: 0, sm: 0.5 },
          }}
        >
          {typedFields.map((field, index) => (
            <Paper key={field.id} variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>

              {/* ── Card header ──────────────────────────────────────── */}
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                  Location {index + 1}
                </Typography>
                <IconButton size="small" color="error" onClick={() => handleRemove(index)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>

              <Box display="flex" flexDirection="column" gap={1.5}>

                {/* Tag */}
                <Controller
                  name={`locations.${index}.tag`}
                  control={control}
                  rules={{
                    required: 'Tag is required',
                    maxLength: { value: 100, message: 'Max 100 characters' },
                  }}
                  render={({ field: f }) => (
                    <TextField
                      {...f}
                      label="Tag"
                      required
                      size="small"
                      fullWidth
                      placeholder="Warehouse, Head Office, Point of Sale 1 …"
                      error={!!(errors as any).locations?.[index]?.tag}
                      helperText={(errors as any).locations?.[index]?.tag?.message}
                    />
                  )}
                />

                {/* Country */}
                <Controller
                  name={`locations.${index}.country`}
                  control={control}
                  rules={{
                    required: 'Country is required',
                    maxLength: { value: 100, message: 'Max 100 characters' },
                  }}
                  render={({ field: f }) => (
                    <TextField
                      {...f}
                      label="Country"
                      required
                      size="small"
                      fullWidth
                      placeholder="Australia"
                      error={!!(errors as any).locations?.[index]?.country}
                      helperText={(errors as any).locations?.[index]?.country?.message}
                    />
                  )}
                />

                {/* Address Line 1 */}
                <Controller
                  name={`locations.${index}.line1`}
                  control={control}
                  rules={{
                    required: 'Address Line 1 is required',
                    maxLength: { value: 200, message: 'Max 200 characters' },
                  }}
                  render={({ field: f }) => (
                    <TextField
                      {...f}
                      label="Address Line 1"
                      required
                      size="small"
                      fullWidth
                      error={!!(errors as any).locations?.[index]?.line1}
                      helperText={(errors as any).locations?.[index]?.line1?.message}
                    />
                  )}
                />

                {/* Address Line 2 */}
                <Controller
                  name={`locations.${index}.line2`}
                  control={control}
                  rules={{ maxLength: { value: 200, message: 'Max 200 characters' } }}
                  render={({ field: f }) => (
                    <TextField
                      {...f}
                      label="Address Line 2"
                      size="small"
                      fullWidth
                      placeholder="Suite, Level, Unit (optional)"
                      error={!!(errors as any).locations?.[index]?.line2}
                      helperText={(errors as any).locations?.[index]?.line2?.message}
                    />
                  )}
                />

                {/* City / Postcode / State */}
                <Box display="flex" gap={1} flexWrap={{ xs: 'wrap', sm: 'nowrap' }}>
                  <Controller
                    name={`locations.${index}.city`}
                    control={control}
                    rules={{
                      required: 'City is required',
                      maxLength: { value: 100, message: 'Max 100 chars' },
                    }}
                    render={({ field: f }) => (
                      <TextField
                        {...f}
                        label="City / Suburb"
                        required
                        size="small"
                        sx={{ flex: 2, minWidth: { xs: '100%', sm: 0 } }}
                        error={!!(errors as any).locations?.[index]?.city}
                        helperText={(errors as any).locations?.[index]?.city?.message}
                      />
                    )}
                  />
                  <Controller
                    name={`locations.${index}.postalCode`}
                    control={control}
                    rules={{
                      required: 'Postcode is required',
                      maxLength: { value: 20, message: 'Max 20 chars' },
                    }}
                    render={({ field: f }) => (
                      <TextField
                        {...f}
                        label="Postcode"
                        required
                        size="small"
                        sx={{ flex: 1, minWidth: { xs: '48%', sm: 0 } }}
                        error={!!(errors as any).locations?.[index]?.postalCode}
                        helperText={(errors as any).locations?.[index]?.postalCode?.message}
                      />
                    )}
                  />
                  <Controller
                    name={`locations.${index}.state`}
                    control={control}
                    rules={{ maxLength: { value: 100, message: 'Max 100 chars' } }}
                    render={({ field: f }) => (
                      <TextField
                        {...f}
                        label="State"
                        size="small"
                        sx={{ flex: 1, minWidth: { xs: '48%', sm: 0 } }}
                        error={!!(errors as any).locations?.[index]?.state}
                        helperText={(errors as any).locations?.[index]?.state?.message}
                      />
                    )}
                  />
                </Box>

              </Box>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
}

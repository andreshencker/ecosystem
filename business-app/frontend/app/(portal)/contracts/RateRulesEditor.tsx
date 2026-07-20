'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Controller, useFieldArray, type Control, type FieldErrors, type FieldValues } from 'react-hook-form';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import type { RateType } from '@/types/contract';
import { RATE_DAY_OPTIONS } from '@/types/contract';

// ─── Time conversion helpers ──────────────────────────────────────────────────

/**
 * Parse a 24-hour "HH:mm" string into 12-hour components.
 * Returns null for empty or invalid strings.
 *
 * Examples:
 *   "08:00" → { hour: 8,  minute: 0,  period: 'AM' }
 *   "12:00" → { hour: 12, minute: 0,  period: 'PM' }
 *   "17:30" → { hour: 5,  minute: 30, period: 'PM' }
 *   "00:00" → { hour: 12, minute: 0,  period: 'AM' }
 */
export function to12h(time: string): { hour: number; minute: number; period: 'AM' | 'PM' } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const h24 = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  return {
    hour:   h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24,
    minute: min,
    period: h24 < 12 ? 'AM' : 'PM',
  };
}

/**
 * Combine 12-hour components back into a 24-hour "HH:mm" string.
 *
 * Examples:
 *   (8,  0,  'AM') → "08:00"
 *   (12, 0,  'PM') → "12:00"
 *   (5,  30, 'PM') → "17:30"
 *   (12, 0,  'AM') → "00:00"
 */
export function to24h(hour: number, minute: number, period: 'AM' | 'PM'): string {
  const h24 = period === 'AM'
    ? (hour === 12 ? 0 : hour)
    : (hour === 12 ? 12 : hour + 12);
  return `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// ─── 12-hour time picker component ───────────────────────────────────────────

interface TimePicker12hProps {
  value:       string;
  onChange:    (v: string) => void;
  onBlur?:     () => void;
  label:       string;
  error?:      boolean;
  helperText?: string;
  disabled?:   boolean;
}

const HOUR_OPTIONS   = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => i);

function TimePicker12h({ value, onChange, onBlur, label, error, helperText, disabled }: TimePicker12hProps) {
  const parsed = value ? to12h(value) : null;

  const [hour,   setHour]   = useState<number | ''>(parsed?.hour   ?? '');
  const [minute, setMinute] = useState<number | ''>(parsed?.minute ?? '');
  const [period, setPeriod] = useState<'AM' | 'PM' | ''>(parsed?.period ?? '');

  // Sync when the form resets with a new value (e.g. opening edit drawer)
  const committedRef = useRef(value);
  useEffect(() => {
    if (value === committedRef.current) return;
    committedRef.current = value;
    const p = value ? to12h(value) : null;
    setHour(p?.hour   ?? '');
    setMinute(p?.minute ?? '');
    setPeriod(p?.period ?? '');
  }, [value]);

  function commit(h: number | '', m: number | '', p: 'AM' | 'PM' | '') {
    if (h !== '' && m !== '' && p !== '') {
      const v = to24h(h as number, m as number, p);
      committedRef.current = v;
      onChange(v);
    } else {
      committedRef.current = '';
      onChange('');
    }
  }

  const labelColor = error ? 'error.main' : 'text.secondary';

  return (
    <Box>
      <Typography variant="caption" color={labelColor} display="block" mb={0.75}>
        {label}
      </Typography>
      <Box display="flex" alignItems="center" gap={0.5}>
        {/* Hour */}
        <FormControl size="small" error={error} sx={{ width: 62 }}>
          <Select<number | ''>
            value={hour}
            onChange={(e) => {
              const h = e.target.value as number | '';
              setHour(h);
              commit(h, minute, period);
            }}
            onBlur={onBlur}
            displayEmpty
            disabled={disabled}
            renderValue={(v) => (v === '' ? '—' : String(v))}
          >
            {HOUR_OPTIONS.map((h) => (
              <MenuItem key={h} value={h}>{h}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Typography variant="body2" color="text.disabled" sx={{ userSelect: 'none' }}>:</Typography>

        {/* Minutes */}
        <FormControl size="small" error={error} sx={{ width: 66 }}>
          <Select<number | ''>
            value={minute}
            onChange={(e) => {
              const m = e.target.value as number | '';
              setMinute(m);
              commit(hour, m, period);
            }}
            onBlur={onBlur}
            displayEmpty
            disabled={disabled}
            renderValue={(v) => (v === '' ? '—' : String(v as number).padStart(2, '0'))}
          >
            {MINUTE_OPTIONS.map((m) => (
              <MenuItem key={m} value={m}>{String(m).padStart(2, '0')}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* AM / PM */}
        <FormControl size="small" error={error} sx={{ width: 76 }}>
          <Select<'AM' | 'PM' | ''>
            value={period}
            onChange={(e) => {
              const p = e.target.value as 'AM' | 'PM' | '';
              setPeriod(p);
              commit(hour, minute, p);
            }}
            onBlur={onBlur}
            displayEmpty
            disabled={disabled}
            renderValue={(v) => (v === '' ? '—' : v as string)}
          >
            <MenuItem value="AM">AM</MenuItem>
            <MenuItem value="PM">PM</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {error && helperText && (
        <FormHelperText error sx={{ mt: 0.5, mx: 0 }}>{helperText}</FormHelperText>
      )}
    </Box>
  );
}

export interface RateRuleFormValue {
  days:      string[];
  startTime: string;
  endTime:   string;
  hourlyRate: string;
}

export interface ContractFormWithRates {
  rateType:   RateType;
  rates:      RateRuleFormValue[];
  [key: string]: any;
}

interface RateRulesEditorProps {
  control:   Control<FieldValues>;
  errors:    FieldErrors<FieldValues>;
  rateType:  RateType;
  readonly?: boolean;
}

const DAY_LABEL: Record<string, string> = {
  all:       'All days',
  monday:    'Mon',
  tuesday:   'Tue',
  wednesday: 'Wed',
  thursday:  'Thu',
  friday:    'Fri',
  saturday:  'Sat',
  sunday:    'Sun',
};

function defaultRule(rateType: RateType): RateRuleFormValue {
  return {
    days:      rateType === 'fixed' ? ['all'] : [],
    startTime: '',
    endTime:   '',
    hourlyRate: '',
  };
}

export function RateRulesEditor({ control, errors, rateType, readonly }: RateRulesEditorProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'rates' });
  const ratesErrors = (errors as any).rates;

  const isFixed = rateType === 'fixed';
  const isTimeRange = rateType === 'variable_time_range';

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        <Typography variant="subtitle2">
          {isFixed ? 'Rate' : 'Rate Rules'}
        </Typography>
        {!isFixed && !readonly && (
          <Button size="small" startIcon={<AddIcon />} onClick={() => append(defaultRule(rateType))}>
            Add Rule
          </Button>
        )}
      </Box>

      {typeof ratesErrors?.message === 'string' && (
        <FormHelperText error sx={{ mb: 1 }}>{ratesErrors.message}</FormHelperText>
      )}

      {fields.length === 0 && (
        <Typography variant="body2" color="text.disabled">
          {isFixed
            ? 'Set the hourly rate below.'
            : 'Add at least one rate rule.'}
        </Typography>
      )}

      <Box display="flex" flexDirection="column" gap={2}>
        {fields.map((field, index) => (
          <Box
            key={field.id}
            sx={{
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              position: 'relative',
            }}
          >
            {!isFixed && !readonly && (
              <IconButton
                size="small"
                color="error"
                onClick={() => remove(index)}
                sx={{ position: 'absolute', top: 8, right: 8 }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            )}

            <Box display="flex" flexWrap="wrap" gap={1.5}>
              {/* Days — fixed shows read-only 'all', variable shows multi-select */}
              {isFixed ? (
                <Box>
                  <Typography variant="caption" color="text.secondary">Days</Typography>
                  <Box mt={0.5}><Chip label="All days" size="small" variant="outlined" /></Box>
                </Box>
              ) : (
                <Controller
                  name={`rates.${index}.days`}
                  control={control}
                  rules={{ validate: (v) => (v?.length > 0 ? true : 'Select at least one day') }}
                  render={({ field: f, fieldState }) => (
                    <FormControl size="small" error={!!fieldState.error} sx={{ minWidth: 200 }}>
                      <InputLabel>Days</InputLabel>
                      <Select
                        {...f}
                        multiple
                        disabled={readonly}
                        input={<OutlinedInput label="Days" />}
                        renderValue={(selected: string[]) => (
                          <Box display="flex" flexWrap="wrap" gap={0.5}>
                            {selected.map((v) => (
                              <Chip key={v} label={DAY_LABEL[v] ?? v} size="small" />
                            ))}
                          </Box>
                        )}
                      >
                        {RATE_DAY_OPTIONS.filter((o) => o.value !== 'all').map((o) => (
                          <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                        ))}
                      </Select>
                      {fieldState.error && (
                        <FormHelperText>{fieldState.error.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              )}

              {/* Time range fields — 12-hour AM/PM selectors */}
              {isTimeRange && (
                <>
                  <Controller
                    name={`rates.${index}.startTime`}
                    control={control}
                    rules={{ required: 'Required' }}
                    render={({ field: f, fieldState }) => (
                      <TimePicker12h
                        value={f.value}
                        onChange={f.onChange}
                        onBlur={f.onBlur}
                        label="Start Time"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        disabled={readonly}
                      />
                    )}
                  />
                  <Controller
                    name={`rates.${index}.endTime`}
                    control={control}
                    rules={{ required: 'Required' }}
                    render={({ field: f, fieldState }) => (
                      <TimePicker12h
                        value={f.value}
                        onChange={f.onChange}
                        onBlur={f.onBlur}
                        label="End Time"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        disabled={readonly}
                      />
                    )}
                  />
                </>
              )}

              {/* Hourly rate */}
              <Controller
                name={`rates.${index}.hourlyRate`}
                control={control}
                rules={{
                  required: 'Required',
                  min: { value: 0.01, message: 'Must be > 0' },
                }}
                render={({ field: f, fieldState }) => (
                  <TextField
                    {...f}
                    label="Hourly Rate ($)"
                    size="small"
                    type="number"
                    disabled={readonly}
                    inputProps={{ min: 0.01, step: 0.01 }}
                    sx={{ width: 140 }}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Box>
          </Box>
        ))}
      </Box>

      {/* For fixed: auto-add one rule if empty */}
      {isFixed && fields.length === 0 && !readonly && (
        <Box mt={1}>
          <Button size="small" variant="outlined" onClick={() => append(defaultRule('fixed'))}>
            Set Rate
          </Button>
        </Box>
      )}
    </Box>
  );
}

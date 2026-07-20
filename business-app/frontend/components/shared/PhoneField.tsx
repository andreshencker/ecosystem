'use client';

import React, { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';

// ─── Calling codes ────────────────────────────────────────────────────────────
// Add entries here to support more countries. Order determines dropdown order.

export interface CallingCode {
  code:    string; // e.g. "+61"
  label:   string; // e.g. "AU"
  country: string; // e.g. "Australia"
}

export const CALLING_CODES: CallingCode[] = [
  { code: '+61', label: 'AU', country: 'Australia' },
  { code: '+64', label: 'NZ', country: 'New Zealand' },
  { code: '+1',  label: 'US', country: 'United States / Canada' },
  { code: '+44', label: 'GB', country: 'United Kingdom' },
  { code: '+65', label: 'SG', country: 'Singapore' },
  { code: '+81', label: 'JP', country: 'Japan' },
];

const DEFAULT_CODE = '+61';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parsePhone(value: string): { dialCode: string; localNumber: string } {
  if (!value) return { dialCode: DEFAULT_CODE, localNumber: '' };
  // Match longest prefix first to avoid "+1" matching "+10..." prematurely
  const sorted = [...CALLING_CODES].sort((a, b) => b.code.length - a.code.length);
  for (const { code } of sorted) {
    if (value.startsWith(code)) {
      return { dialCode: code, localNumber: value.slice(code.length) };
    }
  }
  // Unknown prefix — display as-is under the default dial code
  return { dialCode: DEFAULT_CODE, localNumber: value };
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PhoneFieldProps {
  /** Full international format stored by the form, e.g. "+61412345678". */
  value: string;
  onChange: (value: string) => void;
  label?: string;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  placeholder?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PhoneField({
  value,
  onChange,
  label = 'Phone',
  size = 'small',
  fullWidth = true,
  error = false,
  helperText,
  disabled = false,
  placeholder = '412 345 678',
}: PhoneFieldProps) {
  const [dialCode,     setDialCode]     = useState(() => parsePhone(value).dialCode);
  const [localNumber,  setLocalNumber]  = useState(() => parsePhone(value).localNumber);

  // Tracks whether the most recent onChange was triggered by this component.
  // Used to skip syncing back from the form value — avoids stripping display
  // spaces that the user typed.
  const ownChangeRef = useRef(false);

  useEffect(() => {
    if (ownChangeRef.current) {
      ownChangeRef.current = false;
      return;
    }
    const parsed = parsePhone(value);
    setDialCode(parsed.dialCode);
    setLocalNumber(parsed.localNumber);
  }, [value]);

  function emit(code: string, num: string) {
    const stripped = num.replace(/\s/g, '');
    ownChangeRef.current = true;
    onChange(stripped ? `${code}${stripped}` : '');
  }

  function handleCodeChange(newCode: string) {
    setDialCode(newCode);
    emit(newCode, localNumber);
  }

  function handleNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    const num = e.target.value;
    setLocalNumber(num);
    emit(dialCode, num);
  }

  return (
    <FormControl fullWidth={fullWidth} size={size} error={error} disabled={disabled}>
      <InputLabel shrink>{label}</InputLabel>
      <OutlinedInput
        notched
        label={label}
        value={localNumber}
        onChange={handleNumberChange}
        placeholder={placeholder}
        inputProps={{ maxLength: 20 }}
        startAdornment={
          <Box display="flex" alignItems="center" sx={{ mr: 0.5, flexShrink: 0 }}>
            <Select
              value={dialCode}
              onChange={(e) => handleCodeChange(e.target.value as string)}
              variant="standard"
              disableUnderline
              disabled={disabled}
              sx={{
                fontSize: 'inherit',
                minWidth: 52,
                '& .MuiSelect-select': { py: 0, pr: '20px !important', pl: 0 },
                '& .MuiSelect-icon': { right: 0 },
              }}
              renderValue={(v) => (
                <Typography variant="body2" component="span" sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>
                  {v}
                </Typography>
              )}
            >
              {CALLING_CODES.map((c) => (
                <MenuItem key={c.code} value={c.code}>
                  <Typography variant="body2">
                    {c.label}&nbsp;
                    <Typography component="span" variant="caption" color="text.secondary">
                      {c.code} — {c.country}
                    </Typography>
                  </Typography>
                </MenuItem>
              ))}
            </Select>
            <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 0.5, borderColor: 'divider' }} />
          </Box>
        }
      />
      {helperText && <FormHelperText error={error}>{helperText}</FormHelperText>}
    </FormControl>
  );
}
